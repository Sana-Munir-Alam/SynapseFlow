import { pgTable, uuid, smallint, numeric, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { studyPlanCourses } from './study_plan.schema'

// ---- day status enum ------------------------------------------------------

export const dayStatusEnum = pgEnum('day_status', [
    'complete',
    'missed',
    'less_than',
    'greater_than',
])

// ---- study_plan_log_days --------------------------------------------------
// One row per (study_plan_course, week_start, day_of_week).
// FK: study_plan_course_id → study_plan_courses.id (cascade delete)
//     Cascade-deletes all log rows when a course is removed.
// User is derived via: study_plan_log_days.study_plan_course_id
//                      → study_plan_courses.study_plan_id
//                      → study_plans.user_id

export const studyPlanLogDays = pgTable('study_plan_log_days', {
    id:                uuid('id').primaryKey().defaultRandom(),
    studyPlanCourseId: uuid('study_plan_course_id')
                           .references(() => studyPlanCourses.id, { onDelete: 'cascade' })
                           .notNull(),
    weekStart:         timestamp('week_start').notNull(),
    dayOfWeek:         smallint('day_of_week').notNull(),          // 0=Mon … 6=Sun
    scheduledHours:    numeric('scheduled_hours', { precision: 4, scale: 1 }).notNull(),
    status:            dayStatusEnum('status'),                    // null = not yet marked
    createdAt:         timestamp('created_at').notNull().defaultNow(),
    updatedAt:         timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    unique().on(t.studyPlanCourseId, t.weekStart, t.dayOfWeek),
])

export type StudyPlanLogDay    = typeof studyPlanLogDays.$inferSelect
export type NewStudyPlanLogDay = typeof studyPlanLogDays.$inferInsert

export type DayStatus = 'complete' | 'missed' | 'less_than' | 'greater_than' | null

export const insertStudyPlanLogDaySchema = createInsertSchema(studyPlanLogDays)
export const selectStudyPlanLogDaySchema = createSelectSchema(studyPlanLogDays)

export default studyPlanLogDays