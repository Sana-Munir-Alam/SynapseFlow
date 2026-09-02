import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const refresh_tokens = pgTable("refresh-tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: varchar("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type RefreshToken = typeof refresh_tokens.$inferSelect
export type newRefreshToken = typeof refresh_tokens.$inferInsert

export const insertRefreshTokenSchema = createInsertSchema(refresh_tokens)
export const selectRefreshTokenSchema = createSelectSchema(refresh_tokens)

export default refresh_tokens