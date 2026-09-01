import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const eventTypeEnum = pgEnum('event_type', [
    'assignment',
    'quiz',
    'mid',
    'final',
    'project',
    'study',
    'general',
])

export const priorityEnum = pgEnum('priority_level', [
    'low',
    'medium',
    'high'
])

export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    course: varchar('course', { length: 100 }).notNull(),
    type: eventTypeEnum('type').notNull(),
    priority: priorityEnum('priority').notNull().default('medium'),
    date: timestamp('date').notNull(),
    time: varchar('time', { length: 10 }),              // e.g. "14:00"
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

export const insertEventSchema = createInsertSchema(events)
export const selectEventSchema = createSelectSchema(events)

export default events