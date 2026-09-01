import {
    pgTable, uuid, varchar, timestamp
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const reset_tokens = pgTable("reset-tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").references(() => users.id, {onDelete: 'cascade'}).notNull(),
    token: varchar("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
})

export type Token = typeof reset_tokens.$inferSelect
export type newToken = typeof reset_tokens.$inferInsert

export const insertTokenSchema = createInsertSchema(reset_tokens)
export const selectTokenSchema = createSelectSchema(reset_tokens)

export default reset_tokens

