import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'
import events from './event.schema'
import studyPlanLogDays from './study_plan_log.schema'

export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    eventId: uuid('event_id')
        .references(() => events.id, { onDelete: 'cascade' }),    // nullable — notification may not be tied to event
    // Used for "falling behind your study plan" notifications.
    studyPlanLogId: uuid('study_plan_log_id')
        .references(() => studyPlanLogDays.id, { onDelete: 'cascade',}),
    message: varchar('message', { length: 500 }).notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export const insertNotificationSchema = createInsertSchema(notifications)
export const selectNotificationSchema = createSelectSchema(notifications)

export default notifications