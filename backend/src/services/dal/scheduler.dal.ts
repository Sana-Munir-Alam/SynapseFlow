import { and, eq, gte, lte, lt, inArray } from 'drizzle-orm'
import db from '../../db/connection'
import { events, notifications, studyPlans, studyPlanCourses, studyPlanSchedule, studyPlanLogDays } from '../../db/schema'
import type { NewEvent } from '../../db/schema/event.schema'
import type { DayStatus } from '../../db/schema/study_plan_log.schema'

// ---- Events ---------------------------------------------------------------

export const getEventsByUser = async (userId: string) => {
    return db.select().from(events).where(eq(events.userId, userId))
}

export const insertEvent = async (payload: NewEvent) => {
    const [created] = await db.insert(events).values(payload).returning()
    return created
}

export const removeEvent = async (eventId: string, userId: string) => {
    const [deleted] = await db
        .delete(events)
        .where(and(eq(events.id, eventId), eq(events.userId, userId)))
        .returning()
    return deleted
}

export const getEventsDueTomorrow = async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const start = new Date(tomorrow.setHours(0, 0, 0, 0))
    const end   = new Date(tomorrow.setHours(23, 59, 59, 999))
    return db.select().from(events).where(and(gte(events.date, start), lte(events.date, end)))
}

// ---- Study Plans ----------------------------------------------------------
// getStudyPlanByUser now joins courses and their schedule rows so callers

export type ScheduleEntry = { dayOfWeek: string; hours: number }

export type CourseEntry = {
    id:          string
    course:      string
    preparation: number
    priority:    string
    color:       string | null
    weeklyPlan:  ScheduleEntry[]
}

export type FullStudyPlan = {
    id:        string
    userId:    string
    name:      string | null
    createdAt: Date
    updatedAt: Date
    courses:   CourseEntry[]
}

export const getStudyPlanByUser = async (userId: string): Promise<FullStudyPlan | null> => {
    const [plan] = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.userId, userId))
    if (!plan) return null

    const courseRows = await db
        .select()
        .from(studyPlanCourses)
        .where(eq(studyPlanCourses.studyPlanId, plan.id))

    const scheduleRows = courseRows.length
        ? await db
              .select()
              .from(studyPlanSchedule)
              .where(
                  inArray(
                      studyPlanSchedule.studyPlanCourseId,
                      courseRows.map((c) => c.id)
                  )
              )
        : []

    const schedulesByCourseId = scheduleRows.reduce<Record<string, ScheduleEntry[]>>(
        (acc, row) => {
            if (!acc[row.studyPlanCourseId]) acc[row.studyPlanCourseId] = []
            acc[row.studyPlanCourseId].push({ dayOfWeek: row.dayOfWeek, hours: Number(row.hours) })
            return acc
        },
        {}
    )

    return {
        ...plan,
        courses: courseRows.map((c) => ({
            id:          c.id,
            course:      c.course,
            preparation: c.preparation,
            priority:    c.priority,
            color:       c.color,
            weeklyPlan:  schedulesByCourseId[c.id] ?? [],
        })),
    }
}

export type CourseInput = {
    course:      string
    preparation: number
    priority:    string
    color?:      string | null
    weeklyPlan:  ScheduleEntry[]
}

/**
 * Upsert the full study plan — creates or updates the plan row, then
 * replaces all course rows (delete-insert) so the caller never has to
 * diff the list manually.
 *
 * Transaction ensures the plan and all its courses are consistent.
 */
export const upsertStudyPlan = async (
    userId:  string,
    payload: { name?: string; courses: CourseInput[] }
): Promise<FullStudyPlan> => {
    return db.transaction(async (tx) => {
        // 1. Upsert the plan header row
        let planId: string
        const [existing] = await tx
            .select()
            .from(studyPlans)
            .where(eq(studyPlans.userId, userId))

        if (existing) {
            const [updated] = await tx
                .update(studyPlans)
                .set({ name: payload.name, updatedAt: new Date() })
                .where(eq(studyPlans.userId, userId))
                .returning()
            planId = updated.id
        } else {
            const [created] = await tx
                .insert(studyPlans)
                .values({ userId, name: payload.name })
                .returning()
            planId = created.id
        }

        // 2. Load existing course rows so we can DIFF instead of delete-insert.
        //    Preserving existing course IDs is critical: studyPlanLogDays FK-cascade
        //    deletes ALL logs whenever a course row is deleted, so we must never
        //    delete a course row that still exists in the new payload.
        const existingCourseRows = await tx
            .select()
            .from(studyPlanCourses)
            .where(eq(studyPlanCourses.studyPlanId, planId))

        const existingByName = new Map(existingCourseRows.map((r) => [r.course, r]))
        const incomingNames  = new Set(payload.courses.map((c) => c.course))

        // 3. Delete courses that were removed from the payload (this is intentional removal).
        const toDelete = existingCourseRows.filter((r) => !incomingNames.has(r.course))
        if (toDelete.length > 0) {
            await tx
                .delete(studyPlanCourses)
                .where(
                    inArray(
                        studyPlanCourses.id,
                        toDelete.map((r) => r.id)
                    )
                )
        }

        // 4. For each incoming course: UPDATE if it already exists, INSERT if new.
        const finalCourseRows: typeof existingCourseRows = []
        for (const c of payload.courses) {
            const existing = existingByName.get(c.course)
            if (existing) {
                // Update mutable fields — id is preserved, logs are safe.
                const [updated] = await tx
                    .update(studyPlanCourses)
                    .set({
                        preparation: c.preparation,
                        priority:    c.priority,
                        color:       c.color ?? null,
                        updatedAt:   new Date(),
                    })
                    .where(eq(studyPlanCourses.id, existing.id))
                    .returning()
                finalCourseRows.push(updated)
            } else {
                // Brand-new course — insert fresh row.
                const [inserted] = await tx
                    .insert(studyPlanCourses)
                    .values({
                        studyPlanId: planId,
                        course:      c.course,
                        preparation: c.preparation,
                        priority:    c.priority,
                        color:       c.color ?? null,
                    })
                    .returning()
                finalCourseRows.push(inserted)
            }
        }

        // 5. Replace schedule rows (weeklyPlan hours) for every course.
        //    studyPlanSchedule has NO log rows FK'd to it, so delete-insert is safe here.
        if (finalCourseRows.length > 0) {
            await tx
                .delete(studyPlanSchedule)
                .where(
                    inArray(
                        studyPlanSchedule.studyPlanCourseId,
                        finalCourseRows.map((r) => r.id)
                    )
                )

            const scheduleValues = finalCourseRows.flatMap((courseRow, i) =>
                (payload.courses[i].weeklyPlan ?? []).map((s) => ({
                    studyPlanCourseId: courseRow.id,
                    dayOfWeek:         s.dayOfWeek,
                    hours:             String(s.hours),
                }))
            )

            if (scheduleValues.length > 0) {
                await tx.insert(studyPlanSchedule).values(scheduleValues)
            }
        }

        // 6. Read back and return the full updated plan.
        const [plan] = await tx.select().from(studyPlans).where(eq(studyPlans.id, planId))
        const courseRows = await tx
            .select()
            .from(studyPlanCourses)
            .where(eq(studyPlanCourses.studyPlanId, planId))

        const scheduleRows = courseRows.length
            ? await tx
                  .select()
                  .from(studyPlanSchedule)
                  .where(
                      inArray(
                          studyPlanSchedule.studyPlanCourseId,
                          courseRows.map((c) => c.id)
                      )
                  )
            : []

        const schedulesByCourseId = scheduleRows.reduce<Record<string, ScheduleEntry[]>>(
            (acc, row) => {
                if (!acc[row.studyPlanCourseId]) acc[row.studyPlanCourseId] = []
                acc[row.studyPlanCourseId].push({ dayOfWeek: row.dayOfWeek, hours: Number(row.hours) })
                return acc
            },
            {}
        )

        return {
            ...plan,
            courses: courseRows.map((c) => ({
                id:          c.id,
                course:      c.course,
                preparation: c.preparation,
                priority:    c.priority,
                color:       c.color,
                weeklyPlan:  schedulesByCourseId[c.id] ?? [],
            })),
        }
    })
}

// ---- Notifications (LEFT JOIN with events) --------------------------------

export const getNotificationsWithEventDetails = async (userId: string) => {
    const rows = await db
        .select({
            id:         notifications.id,
            userId:     notifications.userId,
            eventId:    notifications.eventId,
            message:    notifications.message,
            isRead:     notifications.isRead,
            createdAt:  notifications.createdAt,
            eventTitle:  events.title,
            eventDate:   events.date,
            eventCourse: events.course,
        })
        .from(notifications)
        .leftJoin(events, eq(notifications.eventId, events.id))
        .where(eq(notifications.userId, userId))

    return rows.map((row) => ({
        id:       row.id,
        userId:   row.userId,
        eventId:  row.eventId,
        message:  row.message,
        isRead:   row.isRead,
        createdAt: row.createdAt,
        event: row.eventTitle ? { title: row.eventTitle, date: row.eventDate, course: row.eventCourse } : null,
    }))
}

export const insertNotification = async (userId: string, message: string, eventId?: string) => {
    const [created] = await db.insert(notifications).values({ userId, message, eventId }).returning()
    return created
}

export const notificationExistsForEventToday = async (eventId: string): Promise<boolean> => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const results = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.eventId, eventId), gte(notifications.createdAt, startOfDay)))
    return results.length > 0
}

export const markNotificationAsRead = async (notifId: string, userId: string) => {
    const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
        .returning()
    return updated
}

export const removeNotification = async (notifId: string, userId: string) => {
    const [deleted] = await db
        .delete(notifications)
        .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)))
        .returning()
    return deleted
}

export const removeAllNotifications = async (userId: string) => {
    await db.delete(notifications).where(eq(notifications.userId, userId))
}

// ---- Study Plan Logs ------------------------------------------------------

/** Returns the Monday of the current week at 00:00:00 UTC. */
export const getCurrentWeekStart = (): Date => {
    const now  = new Date()
    const day  = now.getUTCDay()               // 0=Sun
    const diff = day === 0 ? -6 : 1 - day      // shift to Monday
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
    return monday
}

/* Returns all log day rows for the current user, joined with course name for easy frontend consumption. */
export const getLogsByUser = async (userId: string) => {
    return db
        .select({
            id:                studyPlanLogDays.id,
            studyPlanCourseId: studyPlanLogDays.studyPlanCourseId,
            weekStart:         studyPlanLogDays.weekStart,
            dayOfWeek:         studyPlanLogDays.dayOfWeek,
            scheduledHours:    studyPlanLogDays.scheduledHours,
            status:            studyPlanLogDays.status,
            course:            studyPlanCourses.course,
            createdAt:         studyPlanLogDays.createdAt,
            updatedAt:         studyPlanLogDays.updatedAt,
        })
        .from(studyPlanLogDays)
        .innerJoin(
            studyPlanCourses,
            eq(studyPlanLogDays.studyPlanCourseId, studyPlanCourses.id)
        )
        .innerJoin(
            studyPlans,
            eq(studyPlanCourses.studyPlanId, studyPlans.id)
        )
        .where(eq(studyPlans.userId, userId))
}

/**
 * Upsert all 7 day-log rows for one course in one week.
 * Called with the studyPlanCourseId (uuid FK) — not a course name string.
 * scheduledHours and dayStatuses are parallel arrays indexed 0=Mon … 6=Sun.
 *
 * Uses a delete-insert pattern inside a transaction so each call is
 * idempotent and avoids 7 individual upsert round-trips.
 */
export const upsertWeeklyLog = async (
    studyPlanCourseId: string,
    weekStart:         Date,
    scheduledHours:    number[],       // length 7, index 0=Mon
    dayStatuses:       DayStatus[]     // length 7, index 0=Mon
) => {
    return db.transaction(async (tx) => {
        // Delete existing rows for this course+week
        await tx
            .delete(studyPlanLogDays)
            .where(
                and(
                    eq(studyPlanLogDays.studyPlanCourseId, studyPlanCourseId),
                    eq(studyPlanLogDays.weekStart, weekStart)
                )
            )

        // Insert one row per day
        const values = scheduledHours.map((hours, dayIndex) => ({
            studyPlanCourseId,
            weekStart,
            dayOfWeek:      dayIndex,                // 0=Mon … 6=Sun
            scheduledHours: String(hours),
            status:         dayStatuses[dayIndex] ?? null,
        }))

        return tx.insert(studyPlanLogDays).values(values).returning()
    })
}

/**
 * Delete all log rows for a specific course.
 * This is now mostly a fallback — the FK cascade on study_plan_courses
 * automatically deletes log rows when a course row is deleted.
 */
export const deleteLogsByCourse = async (studyPlanCourseId: string) => {
    await db
        .delete(studyPlanLogDays)
        .where(eq(studyPlanLogDays.studyPlanCourseId, studyPlanCourseId))
}

/** Cron job helper: delete log rows whose week started more than 31 days ago. */
export const deleteOldLogs = async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 31)
    await db
        .delete(studyPlanLogDays)
        .where(lt(studyPlanLogDays.weekStart, cutoff))
}