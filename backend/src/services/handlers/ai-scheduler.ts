// backend/src/services/handlers/ai-scheduler.ts
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import env from '../../config/env'
import { withRetry } from '../../utils/ai-chatbot.utils'

export interface CourseInput {
    course: string
    preparation: number
    priority: 'low' | 'medium' | 'high'
}

export interface EventInput {
    title: string
    course: string
    type: string
    date: string
    time?: string | null
}

export interface ScheduleEntry {
    dayOfWeek: string
    hours: number
}

export interface GeneratedCourseSchedule {
    course: string
    weeklyPlan: ScheduleEntry[]
    rationale: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Estimate how many hours an event blocks based on its type
function estimateBlockedHours(type: string, title: string): number {
    const lower = title.toLowerCase()

    // Multi-hour commitments
    if (['final', 'mid'].includes(type))         return 3   // exam + travel + recovery
    if (type === 'quiz')                          return 1.5
    if (type === 'project' || lower.includes('presentation') || lower.includes('viva')) return 2
    if (lower.includes('lab'))                    return 2
    if (type === 'assignment' || lower.includes('submission')) return 1

    // Default study/eval — treat as moderate
    return 1.5
}

function buildSystemPrompt(): string {
    return `You are an expert academic study planner. Your job is to generate realistic, balanced weekly study schedules for university students.

RULES (MUST follow strictly):
1. A student has 24 hours/day. Reserve: 7–8h sleep, 2h eating/personal care, 1.5h relaxation/exercise = ~13h reserved daily.
2. Maximum BASELINE available study hours: 8h on weekdays (Mon–Fri), 10h on weekends (Sat–Sun).
3. For days with BLOCKED TIME, reduce available hours proportionally using this scale:
   - Blocked < 1h  → reduce max by 0.5h only (light commitment, day still mostly free)
   - Blocked 1–2h  → reduce max by 1.5h (moderate commitment)
   - Blocked 2–4h  → reduce max by 3h (significant chunk of day gone)
   - Blocked > 4h  → reduce max by 5h (heavy day, treat gently)
   IMPORTANT: A 30-minute dentist appointment does NOT make the whole day unproductive. Only heavy multi-hour commitments should significantly reduce study time.
4. Courses with DEADLINES within 7 days get extra weight on days BEFORE the deadline (not the deadline day itself — student will be busy then).
5. High priority courses get 20–25% more hours than medium; medium gets 20–25% more than low.
6. Higher preparation % means LESS hours needed (student is already prepared).
7. Give at least 0.5h per active study day per course so sessions are meaningful.
8. Leave at least 1 day per week lighter (≤4h total study) for genuine rest.
9. Distribute courses fairly across days — no single course should dominate every day.
10. Output ONLY valid JSON, no markdown, no explanation outside the JSON.`
}

function buildUserPrompt(
    courses: CourseInput[],
    existingCourses: CourseInput[],
    events: EventInput[],
    today: string
): string {
    const todayDate = new Date(today)

    // Get day name for a date
    function getDayName(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
    }

    // Split events into two buckets:
    // 1. DEADLINES — academic events the student must prepare FOR
    // 2. COMMITMENTS — time-blocking events on specific days

    // general = non-academic commitment, goes to COMMITMENTS bucket automatically
    const DEADLINE_TYPES = ['assignment', 'quiz', 'mid', 'final', 'project']

    const upcomingDeadlines: EventInput[] = []
    const commitmentsThisWeek: {
        dayOfWeek: string
        title: string
        time: string | null
        blockedHours: number
    }[] = []

    for (const e of events) {
        const eventDate = new Date(e.date)
        const daysAway  = (eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)

        // Only care about events in the next 14 days
        if (daysAway < 0 || daysAway > 14) continue

        if (DEADLINE_TYPES.includes(e.type)) {
            // This is a deadline — student needs to study for it
            upcomingDeadlines.push(e)
        } else {
            // This is a time commitment — it blocks hours that day
            // Also include academic events that are commitments (evals, labs, submissions)
            const blocked = estimateBlockedHours(e.type, e.title)
            commitmentsThisWeek.push({
                dayOfWeek:    getDayName(e.date),
                title:        e.title,
                time:         e.time ?? null,
                blockedHours: blocked,
            })
        }
    }

    // Also add deadline-day itself as a commitment (student will be in exam, not studying)
    for (const e of upcomingDeadlines) {
        const daysAway = (new Date(e.date).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysAway <= 7) {
            commitmentsThisWeek.push({
                dayOfWeek:    getDayName(e.date),
                title:        `${e.title} (exam day)`,
                time:         e.time ?? null,
                blockedHours: estimateBlockedHours(e.type, e.title),
            })
        }
    }

    // Group commitments by day and sum blocked hours
    const blockedByDay: Record<string, { totalBlocked: number; events: string[] }> = {}
    for (const c of commitmentsThisWeek) {
        if (!blockedByDay[c.dayOfWeek]) {
            blockedByDay[c.dayOfWeek] = { totalBlocked: 0, events: [] }
        }
        blockedByDay[c.dayOfWeek].totalBlocked += c.blockedHours
        const timeLabel = c.time ? ` at ${c.time}` : ''
        blockedByDay[c.dayOfWeek].events.push(`${c.title}${timeLabel} (~${c.blockedHours}h)`)
    }

    const allCourses = [...existingCourses, ...courses]

    // Build the blocked days section for the prompt
    const blockedDaysText = Object.keys(blockedByDay).length > 0
        ? Object.entries(blockedByDay).map(([day, info]) =>
            `- ${day}: ${info.events.join(', ')} → total ~${info.totalBlocked}h blocked`
          ).join('\n')
        : '- None this week'

    const deadlinesText = upcomingDeadlines.length > 0
        ? upcomingDeadlines.map(e =>
            `- [${e.course}] ${e.title} (${e.type}) due ${e.date.split('T')[0]} (${getDayName(e.date)})`
          ).join('\n')
        : '- None'

    return `Today is ${today} (${new Date(today).toLocaleDateString('en-US', { weekday: 'long' })}).

COURSES TO SCHEDULE (generate weeklyPlan for these):
${courses.map(c => `- ${c.course}: priority=${c.priority}, preparation=${c.preparation}% done`).join('\n')}

${existingCourses.length > 0
    ? `EXISTING COURSES ALREADY IN SCHEDULE (factor their load into daily totals, do NOT output them):
${existingCourses.map(c => `- ${c.course}: priority=${c.priority}, preparation=${c.preparation}% done`).join('\n')}`
    : ''}

UPCOMING DEADLINES (study harder on days BEFORE these):
${deadlinesText}

BLOCKED TIME THIS WEEK (student already has commitments — adjust study hours accordingly):
${blockedDaysText}

GUIDANCE on blocked days:
- If a day has <1h blocked → barely reduce study (student is still mostly free)
- If a day has 1–2h blocked → reduce that day's study by ~1.5h from the max
- If a day has 2–4h blocked → reduce that day's study by ~3h from the max
- If a day has >4h blocked → treat that day very gently, minimal study

Generate a weekly study plan for each NEW course only.
Week runs Monday–Sunday. Hours as numbers (0–10, in 0.5 increments).

Target weekly hours per course (before adjusting for blocked days):
- High priority, 0% prep: ~18–22h/week
- Medium priority, 0% prep: ~13–17h/week
- Low priority, 0% prep: ~8–12h/week
Scale DOWN linearly with preparation% (100% prep = ~2h/week minimum).

Total study across ALL ${allCourses.length} courses must not exceed the adjusted daily max.

Respond with ONLY this JSON (no markdown, no backticks):
{
  "schedules": [
    {
      "course": "Course Name",
      "weeklyPlan": [
        { "dayOfWeek": "Monday", "hours": 2.5 },
        { "dayOfWeek": "Tuesday", "hours": 1.5 },
        { "dayOfWeek": "Wednesday", "hours": 2.0 },
        { "dayOfWeek": "Thursday", "hours": 2.5 },
        { "dayOfWeek": "Friday", "hours": 1.5 },
        { "dayOfWeek": "Saturday", "hours": 3.0 },
        { "dayOfWeek": "Sunday", "hours": 1.0 }
      ],
      "rationale": "Brief explanation including how blocked days were handled"
    }
  ]
}`
}

export async function generateAISchedule(
    newCourses: CourseInput[],
    existingCourses: CourseInput[],
    events: EventInput[]
): Promise<GeneratedCourseSchedule[]> {
    const today = new Date().toISOString().split('T')[0]

    const { text } = await withRetry(() =>
        generateText({
            model: google(env.GEMINI_MODEL),
            system: buildSystemPrompt(),
            prompt: buildUserPrompt(newCourses, existingCourses, events, today),
            maxOutputTokens: 2000,
        })
    )

    const clean = text.replace(/```json|```/g, '').trim()

    let parsed: { schedules: GeneratedCourseSchedule[] }
    try {
        parsed = JSON.parse(clean)
    } catch {
        throw new Error('AI returned malformed JSON. Please try again.')
    }

    if (!Array.isArray(parsed.schedules)) {
        throw new Error('AI response missing schedules array.')
    }

    return parsed.schedules.map(s => {
        const weeklyPlan = DAYS.map(day => {
            const entry = s.weeklyPlan?.find(
                (e: any) => e.dayOfWeek?.toLowerCase() === day.toLowerCase()
            )
            const raw   = Number(entry?.hours ?? 0)
            const hours = Math.min(10, Math.max(0, Math.round(raw * 2) / 2))
            return { dayOfWeek: day, hours }
        })

        return {
            course:     s.course,
            weeklyPlan,
            rationale:  s.rationale ?? '',
        }
    })
}