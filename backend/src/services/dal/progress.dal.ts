import { and, eq, sql } from 'drizzle-orm'
import db from '../../db/connection'
import { achievementDefinitions, userAchievements } from '../../db/schema/progress.schema'

type AchievementCategory = 'schedule' | 'mcq' | 'flashcard' | 'streak' | 'engagement'

type BadgeSeed = {
    slug: string
    title: string
    description: string
    category: AchievementCategory
    icon: string
    targetValue: number
    sortOrder: number
}

const BADGE_SEEDS: BadgeSeed[] = [
    { slug: 'weekly-schedule-perfect', title: 'Perfect Study Week', description: 'Complete every scheduled study session in a calendar week.', category: 'schedule', icon: 'calendar-check', targetValue: 100, sortOrder: 10 },
    { slug: 'schedule-25-completions', title: 'Schedule Finisher', description: 'Complete 25 scheduled study sessions.', category: 'schedule', icon: 'check-circle', targetValue: 25, sortOrder: 20 },
    { slug: 'mcq-80-accuracy', title: 'Quiz Sharp Shooter', description: 'Reach at least 80% MCQ accuracy with 20 or more attempts.', category: 'mcq', icon: 'target', targetValue: 80, sortOrder: 30 },
    { slug: 'mcq-100-attempts', title: 'Question Crusher', description: 'Attempt 100 MCQs.', category: 'mcq', icon: 'brain', targetValue: 100, sortOrder: 40 },
    { slug: 'flashcard-80-mastery', title: 'Flashcard Mastery', description: 'Reach at least 80% familiar cards across completed flashcard sessions.', category: 'flashcard', icon: 'layers', targetValue: 80, sortOrder: 50 },
    { slug: 'flashcard-250-reviewed', title: 'Revision Machine', description: 'Review 250 flashcards.', category: 'flashcard', icon: 'repeat', targetValue: 250, sortOrder: 60 },
    { slug: 'streak-7-days', title: '7-Day Streak', description: 'Stay active for 7 consecutive study days.', category: 'streak', icon: 'flame', targetValue: 7, sortOrder: 70 },
    { slug: 'streak-30-days', title: '30-Day Streak', description: 'Stay active for 30 consecutive study days.', category: 'streak', icon: 'flame-kindling', targetValue: 30, sortOrder: 80 },
    { slug: 'engagement-10-files', title: 'Resource Builder', description: 'Upload 10 learning material files.', category: 'engagement', icon: 'file-stack', targetValue: 10, sortOrder: 90 },
    { slug: 'engagement-5-courses', title: 'Organized Learner', description: 'Create 5 course workspaces.', category: 'engagement', icon: 'books', targetValue: 5, sortOrder: 100 },
]

const percent = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0
const num = (value: unknown) => Number(value ?? 0)

const rowsOf = <T = any>(result: any): T[] => Array.isArray(result) ? result : (result?.rows ?? [])

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const previousMonths = (count: number) => {
    const end = new Date()
    end.setDate(1)
    end.setHours(0, 0, 0, 0)
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(end)
        d.setMonth(end.getMonth() - (count - 1 - i))
        return monthKey(d)
    })
}

const getCurrentWeekStart = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const start = new Date(now)
    start.setDate(now.getDate() + diff)
    start.setHours(0, 0, 0, 0)
    return start
}

const ensureAchievementDefinitions = async () => {
    await db.transaction(async (tx) => {
        for (const badge of BADGE_SEEDS) {
            const [existing] = await tx
                .select()
                .from(achievementDefinitions)
                .where(eq(achievementDefinitions.slug, badge.slug))

            if (existing) {
                await tx
                    .update(achievementDefinitions)
                    .set({
                        title: badge.title,
                        description: badge.description,
                        category: badge.category,
                        icon: badge.icon,
                        targetValue: badge.targetValue,
                        sortOrder: badge.sortOrder,
                        updatedAt: new Date(),
                    })
                    .where(eq(achievementDefinitions.slug, badge.slug))
            } else {
                await tx.insert(achievementDefinitions).values(badge)
            }
        }
    })
}

type ActivityStats = {
    totalScheduled: number
    completedScheduled: number   // complete + greater_than
    missedScheduled: number      // missed
    lessThanScheduled: number    // less_than
    currentWeekScheduled: number
    currentWeekCompleted: number // complete + greater_than for the current week
    mcqAttempts: number
    mcqCorrect: number
    flashcardReviewed: number
    flashcardFamiliar: number
    filesUploaded: number
    coursesCreated: number
    currentStreak: number
    longestStreak: number
}

const getActivityStats = async (userId: string): Promise<ActivityStats> => {
    const weekStart = getCurrentWeekStart()

    const [schedule] = rowsOf(await db.execute(sql`
        select
            count(*)::int as total_scheduled,
            count(*) filter (where spld.status in ('complete', 'greater_than'))::int as completed_scheduled,
            count(*) filter (where spld.status = 'missed')::int as missed_scheduled,
            count(*) filter (where spld.status = 'less_than')::int as less_than_scheduled,
            count(*) filter (where spld.week_start = ${weekStart})::int as current_week_scheduled,
            count(*) filter (where spld.week_start = ${weekStart} and spld.status in ('complete', 'greater_than'))::int as current_week_completed
        from study_plan_log_days spld
        join study_plan_courses spc on spc.id = spld.study_plan_course_id
        join study_plans sp on sp.id = spc.study_plan_id
        where sp.user_id = ${userId}
    `))

    const [mcq] = rowsOf(await db.execute(sql`
        select
            count(*)::int as attempts,
            count(*) filter (where is_correct = true)::int as correct
        from mcq_attempts
        where user_id = ${userId}
    `))

    const [flashcard] = rowsOf(await db.execute(sql`
        select
            coalesce(sum(total_cards), 0)::int as reviewed,
            coalesce(sum(familiar_count), 0)::int as familiar
        from flashcard_sessions
        where user_id = ${userId} and completed_at is not null
    `))

    const [engagement] = rowsOf(await db.execute(sql`
        select
            (select count(cf.id)::int from course_files cf join courses c on c.id = cf.course_id where c.user_id = ${userId}) as files_uploaded,
            (select count(*)::int from courses where user_id = ${userId}) as courses_created
    `))

    const streakDayRows = rowsOf<{ day: string }>(await db.execute(sql`
        select (spld.week_start::date + (spld.day_of_week * interval '1 day'))::date::text as day
        from study_plan_log_days spld
        join study_plan_courses spc on spc.id = spld.study_plan_course_id
        join study_plans sp on sp.id = spc.study_plan_id
        where sp.user_id = ${userId}
          and spld.status is not null
        group by day
        having
            count(*) > 0
            and count(*) filter (where spld.status in ('complete', 'greater_than')) = count(*)
        order by day desc
    `))

    const streakDays = streakDayRows.map((row) => row.day)
    const streakSet = new Set(streakDays)

    // Current streak: walk backwards from today — use local date string, not UTC
    let currentStreak = 0
    const cursor = new Date()
    const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }
    while (streakSet.has(toLocalDateStr(cursor))) {
        currentStreak += 1
        cursor.setDate(cursor.getDate() - 1)
    }

    // Longest streak: walk the sorted-asc list
    let longestStreak = 0
    let running = 0
    let prev: string | null = null
    for (const day of [...streakDays].reverse()) {   // reverse → ascending order
        if (!prev) {
            running = 1
        } else {
            // Compare date strings directly — no UTC conversion needed
            const prevDate = new Date(prev + 'T12:00:00')  // noon avoids DST issues
            const currDate = new Date(day + 'T12:00:00')
            const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000)
            running = diffDays === 1 ? running + 1 : 1
        }
        longestStreak = Math.max(longestStreak, running)
        prev = day
    }

    return {
        totalScheduled:      num(schedule?.total_scheduled),
        completedScheduled:  num(schedule?.completed_scheduled),
        missedScheduled:     num(schedule?.missed_scheduled),
        lessThanScheduled:   num(schedule?.less_than_scheduled),
        currentWeekScheduled: num(schedule?.current_week_scheduled),
        currentWeekCompleted: num(schedule?.current_week_completed),
        mcqAttempts:         num(mcq?.attempts),
        mcqCorrect:          num(mcq?.correct),
        flashcardReviewed:   num(flashcard?.reviewed),
        flashcardFamiliar:   num(flashcard?.familiar),
        filesUploaded:       num(engagement?.files_uploaded),
        coursesCreated:      num(engagement?.courses_created),
        currentStreak,
        longestStreak,
    }
}

const computeBadgeProgress = (slug: string, stats: ActivityStats) => {
    const mcqAccuracy = percent(stats.mcqCorrect, stats.mcqAttempts)
    const flashcardMastery = percent(stats.flashcardFamiliar, stats.flashcardReviewed)
    const currentWeekCompletion = percent(stats.currentWeekCompleted, stats.currentWeekScheduled)

    switch (slug) {
        case 'weekly-schedule-perfect': return stats.currentWeekScheduled > 0 ? currentWeekCompletion : 0
        case 'schedule-25-completions': return stats.completedScheduled
        case 'mcq-80-accuracy': return stats.mcqAttempts >= 20 ? mcqAccuracy : Math.min(79, Math.round((stats.mcqAttempts / 20) * 80))
        case 'mcq-100-attempts': return stats.mcqAttempts
        case 'flashcard-80-mastery': return stats.flashcardReviewed > 0 ? flashcardMastery : 0
        case 'flashcard-250-reviewed': return stats.flashcardReviewed
        case 'streak-7-days': return stats.currentStreak
        case 'streak-30-days': return stats.currentStreak
        case 'engagement-10-files': return stats.filesUploaded
        case 'engagement-5-courses': return stats.coursesCreated
        default: return 0
    }
}

const syncUserAchievements = async (userId: string, stats: ActivityStats) => {
    await ensureAchievementDefinitions()
    return db.transaction(async (tx) => {
        const definitions = await tx.select().from(achievementDefinitions)
        for (const definition of definitions) {
            const progressValue = computeBadgeProgress(definition.slug, stats)
            const earned = progressValue >= definition.targetValue
            if (!earned) continue

            const [existing] = await tx
                .select()
                .from(userAchievements)
                .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, definition.id)))

            if (existing) {
                await tx
                    .update(userAchievements)
                    .set({ progressValue, metadata: JSON.stringify({ syncedAt: new Date().toISOString() }) })
                    .where(eq(userAchievements.id, existing.id))
            } else {
                await tx.insert(userAchievements).values({
                    userId,
                    achievementId: definition.id,
                    progressValue,
                    metadata: JSON.stringify({ syncedAt: new Date().toISOString() }),
                })
            }
        }
    })
}

export const getProgressOverview = async (userId: string) => {
    const stats = await getActivityStats(userId)
    await syncUserAchievements(userId, stats)

    const months = previousMonths(6)

    const monthlyRows = rowsOf<any>(await db.execute(sql`
        with months as (
            select to_char(generate_series(
                date_trunc('month', now()) - interval '5 months',
                date_trunc('month', now()),
                interval '1 month'
            ), 'YYYY-MM') as month
        ), schedule as (
            select to_char(spld.week_start, 'YYYY-MM') as month,
                   count(*)::int as scheduled,
                   count(*) filter (where spld.status in ('complete', 'greater_than'))::int as completed,
                   count(*) filter (where spld.status = 'missed')::int as missed
            from study_plan_log_days spld
            join study_plan_courses spc on spc.id = spld.study_plan_course_id
            join study_plans sp on sp.id = spc.study_plan_id
            where sp.user_id = ${userId}
            group by 1
        ), mcq as (
            select to_char(attempted_at, 'YYYY-MM') as month,
                   count(*)::int as attempts,
                   count(*) filter (where is_correct = true)::int as correct
            from mcq_attempts
            where user_id = ${userId}
            group by 1
        ), flashcards as (
            select to_char(completed_at, 'YYYY-MM') as month,
                   coalesce(sum(total_cards), 0)::int as reviewed,
                   coalesce(sum(familiar_count), 0)::int as familiar
            from flashcard_sessions
            where user_id = ${userId} and completed_at is not null
            group by 1
        )
        select
            months.month,
            coalesce(schedule.scheduled, 0)::int as scheduled,
            coalesce(schedule.completed, 0)::int as completed,
            coalesce(schedule.missed, 0)::int as missed,
            coalesce(mcq.attempts, 0)::int as mcq_attempts,
            coalesce(mcq.correct, 0)::int as mcq_correct,
            coalesce(flashcards.reviewed, 0)::int as flashcards_reviewed,
            coalesce(flashcards.familiar, 0)::int as flashcards_familiar
        from months
        left join schedule on schedule.month = months.month
        left join mcq on mcq.month = months.month
        left join flashcards on flashcards.month = months.month
        order by months.month
    `))

    const monthly = months.map((month) => {
        const row = monthlyRows.find((r: any) => r.month === month) ?? {}
        const scheduled = num(row.scheduled)
        const completed = num(row.completed)
        const missed = num(row.missed)
        const attempts = num(row.mcq_attempts)
        const correct = num(row.mcq_correct)
        const reviewed = num(row.flashcards_reviewed)
        const familiar = num(row.flashcards_familiar)

        return {
            month,
            scheduled,
            completed,
            missed,
            completionRate: percent(completed, scheduled),
            mcqAttempts: attempts,
            mcqAccuracy: percent(correct, attempts),
            flashcardsReviewed: reviewed,
            flashcardMastery: percent(familiar, reviewed),
        }
    })

    const courseRows = rowsOf<any>(await db.execute(sql`
        select
            c.id as course_id,
            c.name as course_name,
            count(distinct cf.id)::int as files_count,
            count(distinct f.id)::int as flashcards_count,
            count(distinct m.id)::int as mcqs_count,
            count(distinct ma.id)::int as mcq_attempts,
            count(distinct ma.id) filter (where ma.is_correct = true)::int as mcq_correct,
            coalesce(sum(fs.familiar_count), 0)::int as familiar_count,
            coalesce(sum(fs.total_cards), 0)::int as flashcard_reviewed
        from courses c
        left join course_files cf on cf.course_id = c.id
        left join flashcards f on f.course_id = c.id
        left join mcqs m on m.course_id = c.id
        left join mcq_attempts ma on ma.mcq_id = m.id and ma.user_id = c.user_id
        left join flashcard_sessions fs on fs.course_id = c.id and fs.user_id = c.user_id and fs.completed_at is not null
        where c.user_id = ${userId}
        group by c.id, c.name
        order by c.created_at desc
    `))

    const trendRows = rowsOf<any>(await db.execute(sql`
        with days as (
            select generate_series(
                date_trunc('day', now()) - interval '29 days',
                date_trunc('day', now()),
                interval '1 day'
            )::date as day
        ), activity as (
            select date_trunc('day', spld.updated_at)::date as day, count(*)::int as events
            from study_plan_log_days spld
            join study_plan_courses spc on spc.id = spld.study_plan_course_id
            join study_plans sp on sp.id = spc.study_plan_id
            where sp.user_id = ${userId} and spld.status is not null
            group by 1
            union all
            select date_trunc('day', attempted_at)::date as day, count(*)::int as events
            from mcq_attempts
            where user_id = ${userId}
            group by 1
            union all
            select date_trunc('day', completed_at)::date as day, count(*)::int as events
            from flashcard_sessions
            where user_id = ${userId} and completed_at is not null
            group by 1
        )
        select days.day::text as date, coalesce(sum(activity.events), 0)::int as activity_count
        from days
        left join activity on activity.day = days.day
        group by days.day
        order by days.day
    `))

    const badgeRows = await db
        .select({
            id: achievementDefinitions.id,
            slug: achievementDefinitions.slug,
            title: achievementDefinitions.title,
            description: achievementDefinitions.description,
            category: achievementDefinitions.category,
            icon: achievementDefinitions.icon,
            targetValue: achievementDefinitions.targetValue,
            sortOrder: achievementDefinitions.sortOrder,
            earnedAt: userAchievements.earnedAt,
            progressValue: userAchievements.progressValue,
        })
        .from(achievementDefinitions)
        .leftJoin(userAchievements, and(
            eq(userAchievements.achievementId, achievementDefinitions.id),
            eq(userAchievements.userId, userId),
        ))

    const badges = badgeRows
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((badge) => {
            const liveProgress = computeBadgeProgress(badge.slug, stats)
            return {
                id: badge.id,
                slug: badge.slug,
                title: badge.title,
                description: badge.description,
                category: badge.category,
                icon: badge.icon,
                targetValue: badge.targetValue,
                progressValue: Math.max(liveProgress, badge.progressValue ?? 0),
                earned: Boolean(badge.earnedAt),
                earnedAt: badge.earnedAt,
            }
        })

    return {
        summary: {
            scheduleCompletionRate: percent(stats.completedScheduled, stats.totalScheduled),
            completedScheduledSessions: stats.completedScheduled,   // complete + greater_than
            totalScheduledSessions: stats.totalScheduled,
            missedScheduledSessions: stats.missedScheduled,
            lessThanScheduledSessions: stats.lessThanScheduled,
            currentWeekCompletionRate: percent(stats.currentWeekCompleted, stats.currentWeekScheduled),
            mcqAccuracy: percent(stats.mcqCorrect, stats.mcqAttempts),
            mcqAttempts: stats.mcqAttempts,
            flashcardMasteryRate: percent(stats.flashcardFamiliar, stats.flashcardReviewed),
            flashcardsReviewed: stats.flashcardReviewed,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            filesUploaded: stats.filesUploaded,
            coursesCreated: stats.coursesCreated,
            badgesEarned: badges.filter((badge) => badge.earned).length,
            totalBadges: badges.length,
        },
        monthly,
        dailyActivity: trendRows.map((row) => ({ date: row.date.slice(0, 10), activityCount: num(row.activity_count) })),
        courseBreakdown: courseRows.map((row) => ({
            courseId: row.course_id,
            courseName: row.course_name,
            filesCount: num(row.files_count),
            flashcardsCount: num(row.flashcards_count),
            mcqsCount: num(row.mcqs_count),
            mcqAttempts: num(row.mcq_attempts),
            mcqAccuracy: percent(num(row.mcq_correct), num(row.mcq_attempts)),
            flashcardMastery: percent(num(row.familiar_count), num(row.flashcard_reviewed)), // ← ADD
        })),
        badges,
    }
}