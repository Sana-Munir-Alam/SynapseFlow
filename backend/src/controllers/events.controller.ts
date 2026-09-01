import type { Request, Response } from 'express'
import { getEventsByUser, getNotificationsWithEventDetails, getStudyPlanByUser, getCurrentWeekStart, getLogsByUser, insertEvent, markNotificationAsRead, removeAllNotifications, removeEvent, removeNotification, upsertStudyPlan, upsertWeeklyLog, type CourseInput, } from '../services/dal/scheduler.dal'
import { generateAISchedule } from '../services/handlers/ai-scheduler'
import { emitProgressStale } from '../lib/emitProgressStale'

// ---- Events ---------------------------------------------------------------

export const getEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const data   = await getEventsByUser(userId)
        return res.status(200).json(data)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch events' })
    }
}

export const createEvent = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { title, course, type, priority, date, time } = req.body

        const event = await insertEvent({
            userId,
            title,
            course,
            type,
            priority,
            date: new Date(date),
            time,
        })

        return res.status(201).json(event)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to create event' })
    }
}

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const userId  = req.user!.id
        const id      = req.params.id as string
        const deleted = await removeEvent(id, userId)
        if (!deleted) return res.status(404).json({ message: 'Event not found' })
        return res.status(200).json({ message: 'Event deleted' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to delete event' })
    }
}

// ---- Study Plans ----------------------------------------------------------

export const getStudyPlan = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const plan   = await getStudyPlanByUser(userId)
        return res.status(200).json(plan)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch study plan' })
    }
}

export const saveStudyPlan = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { name, courses } = req.body

        if (!Array.isArray(courses)) {
            return res.status(400).json({ message: 'courses must be an array' })
        }

        // Accept both legacy { day, hours } and current { dayOfWeek, hours } shapes.
        const courseInputs: CourseInput[] = courses.map((c: any) => ({
            course:      c.course,
            preparation: c.preparation ?? 0,
            priority:    c.priority ?? 'medium',
            color:       c.color ?? null,
            weeklyPlan:  (c.weeklyPlan ?? []).map((s: any) => ({
                dayOfWeek: s.dayOfWeek ?? s.day,
                hours:     s.hours,
            })),
        }))

        const hasInvalidSchedule = courseInputs.some((c) =>
            c.weeklyPlan.some((s) => typeof s.dayOfWeek !== 'string' || s.dayOfWeek.length === 0 || typeof s.hours !== 'number')
        )
        if (hasInvalidSchedule) {
            return res.status(400).json({ message: 'Invalid weeklyPlan items. Expected { dayOfWeek, hours } (or legacy { day, hours }).' })
        }

        const plan = await upsertStudyPlan(userId, { name, courses: courseInputs })
        return res.status(200).json(plan)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to save study plan' })
    }
}

// ---- AI Schedule Generation -----------------------------------------------

/**
 * POST /scheduler/ai-generate
 *
 * Body:
 *   newCourses:      { course, preparation, priority }[]   — courses to schedule now
 *   existingCourses: { course, preparation, priority }[]   — already-confirmed courses (load balancing)
 *   events:          { title, course, type, date, time }[] — user's upcoming events/deadlines
 *
 * Returns:
 *   { schedules: { course, weeklyPlan: { dayOfWeek, hours }[], rationale }[] }
 */
export const generateScheduleWithAI = async (req: Request, res: Response) => {
    try {
        const { newCourses, existingCourses = [], events = [] } = req.body

        if (!Array.isArray(newCourses) || newCourses.length === 0) {
            return res.status(400).json({ message: 'newCourses must be a non-empty array' })
        }

        for (const c of newCourses) {
            if (!c.course || typeof c.preparation !== 'number' || !['low', 'medium', 'high'].includes(c.priority)) {
                return res.status(400).json({ message: 'Each course needs: course (string), preparation (number 0–100), priority (low|medium|high)' })
            }
        }

        const schedules = await generateAISchedule(newCourses, existingCourses, events)
        return res.status(200).json({ schedules })
    } catch (err: any) {
        console.error('[AI Scheduler]', err)
        return res.status(500).json({ message: err?.message ?? 'Failed to generate AI schedule' })
    }
}

// ---- Notifications --------------------------------------------------------

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const data   = await getNotificationsWithEventDetails(userId)
        return res.status(200).json(
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        )
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch notifications' })
    }
}

export const markRead = async (req: Request, res: Response) => {
    try {
        const userId  = req.user!.id
        const id      = req.params.id as string
        const updated = await markNotificationAsRead(id, userId)
        if (!updated) return res.status(404).json({ message: 'Notification not found' })
        return res.status(200).json(updated)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to mark notification as read' })
    }
}

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId  = req.user!.id
        const id      = req.params.id as string
        const deleted = await removeNotification(id, userId)
        if (!deleted) return res.status(404).json({ message: 'Notification not found' })
        return res.status(200).json({ message: 'Notification deleted' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to delete notification' })
    }
}

export const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        await removeAllNotifications(userId)
        return res.status(200).json({ message: 'All notifications cleared' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to clear notifications' })
    }
}

// ---- Study Plan Logs ------------------------------------------------------

export const getPlanLogs = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const logs   = await getLogsByUser(userId)
        return res.status(200).json(logs)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to fetch plan logs' })
    }
}

export const savePlanLogs = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id
        const { studyPlanCourseId, scheduledHours, dayStatuses } = req.body

        if (
            !studyPlanCourseId ||
            !Array.isArray(scheduledHours) ||
            !Array.isArray(dayStatuses)
        ) {
            return res.status(400).json({
                message: 'studyPlanCourseId, scheduledHours, dayStatuses are required',
            })
        }

        // Use the weekStart sent by the client (computed in local time) so that
        // users in non-UTC timezones (e.g. UTC+5 at 12:15am) store logs under
        // the correct local week rather than the UTC week which may differ by a day.
        // Fall back to server UTC calculation only if client didn't send it.
        let weekStart: Date
        if (req.body.weekStart) {
            // Parse the YYYY-MM-DD string as midnight UTC so the stored timestamp
            // matches what the frontend's startsWith() filter expects.
            weekStart = new Date(req.body.weekStart + 'T00:00:00.000Z')
        } else {
            weekStart = getCurrentWeekStart()
        }
        const saved     = await upsertWeeklyLog(studyPlanCourseId, weekStart, scheduledHours, dayStatuses)
        emitProgressStale(userId)
        return res.status(200).json(saved)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to save plan logs' })
    }
}

export const deleteCourseData = async (req: Request, res: Response) => {
    try {
        const { studyPlanCourseId } = req.body

        if (!studyPlanCourseId) {
            return res.status(400).json({ message: 'studyPlanCourseId is required' })
        }

        // A single delete — the FK cascades handle everything else
        const { studyPlanCourses } = await import('../db/schema')
        const { eq } = await import('drizzle-orm')
        const db = (await import('../db/connection')).default

        const [deleted] = await db
            .delete(studyPlanCourses)
            .where(eq(studyPlanCourses.id, studyPlanCourseId))
            .returning()

        if (!deleted) return res.status(404).json({ message: 'Course not found' })

        return res.status(200).json({ message: 'Course deleted' })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: 'Failed to delete course data' })
    }
}