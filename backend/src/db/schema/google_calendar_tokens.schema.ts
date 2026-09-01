import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import users from './user.schema'

export const googleCalendarTokens = pgTable('google_calendar_tokens', {
    id:           uuid('id').primaryKey().defaultRandom(),
    userId:       uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
    accessToken:  text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    expiresAt:    timestamp('expires_at').notNull(),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
})

export type GoogleCalendarToken    = typeof googleCalendarTokens.$inferSelect
export type NewGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert

export default googleCalendarTokens