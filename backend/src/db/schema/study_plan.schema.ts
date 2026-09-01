import { pgTable, uuid, varchar, integer, numeric, timestamp, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

// ---- study_plans ----------------------------------------------------------
// One row per user — the top-level plan container.

export const studyPlans = pgTable('study_plans', {
    id:        uuid('id').primaryKey().defaultRandom(),
    userId:    uuid('user_id')
                   .references(() => users.id, { onDelete: 'cascade' })
                   .notNull(),
    name:      varchar('name', { length: 100 }).default('My Study Plan'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type StudyPlan    = typeof studyPlans.$inferSelect
export type NewStudyPlan = typeof studyPlans.$inferInsert

export const insertStudyPlanSchema = createInsertSchema(studyPlans)
export const selectStudyPlanSchema = createSelectSchema(studyPlans)

export default studyPlans

// ---- study_plan_courses ---------------------------------------------------
// One row per course inside a study plan.
// FK: study_plan_id → study_plans.id (cascade delete)

export const studyPlanCourses = pgTable('study_plan_courses', {
    id:          uuid('id').primaryKey().defaultRandom(),
    studyPlanId: uuid('study_plan_id')
                     .references(() => studyPlans.id, { onDelete: 'cascade' })
                     .notNull(),
    course:      varchar('course', { length: 150 }).notNull(),
    preparation: integer('preparation').notNull().default(0),  // 0–100 %
    priority:    varchar('priority', { length: 10 }).notNull().default('medium'), // low | medium | high
    color:       varchar('color', { length: 10 }),             // hex color for UI chart
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    unique().on(t.studyPlanId, t.course),
])

export type StudyPlanCourse    = typeof studyPlanCourses.$inferSelect
export type NewStudyPlanCourse = typeof studyPlanCourses.$inferInsert

export const insertStudyPlanCourseSchema = createInsertSchema(studyPlanCourses)
export const selectStudyPlanCourseSchema = createSelectSchema(studyPlanCourses)

// ---- study_plan_schedule --------------------------------------------------
// One row per (course, day-of-week) — the weekly hour allocation.
// FK: study_plan_course_id → study_plan_courses.id (cascade delete)

export const studyPlanSchedule = pgTable('study_plan_schedule', {
    id:                uuid('id').primaryKey().defaultRandom(),
    studyPlanCourseId: uuid('study_plan_course_id')
                           .references(() => studyPlanCourses.id, { onDelete: 'cascade' })
                           .notNull(),
    dayOfWeek:         varchar('day_of_week', { length: 10 }).notNull(), // 'Monday' … 'Sunday'
    hours:             numeric('hours', { precision: 4, scale: 1 }).notNull(),
}, (t) => [
    unique().on(t.studyPlanCourseId, t.dayOfWeek),
])

export type StudyPlanSchedule    = typeof studyPlanSchedule.$inferSelect
export type NewStudyPlanSchedule = typeof studyPlanSchedule.$inferInsert

export const insertStudyPlanScheduleSchema = createInsertSchema(studyPlanSchedule)
export const selectStudyPlanScheduleSchema = createSelectSchema(studyPlanSchedule)