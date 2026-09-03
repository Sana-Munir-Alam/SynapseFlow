import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core'
import users from './user.schema'

export const ragResponseCache = pgTable('rag_response_cache', {
    id:        uuid('id').primaryKey().defaultRandom(),
    userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    queryHash: varchar('query_hash', { length: 64 }).notNull(), // sha256 hex of the normalized query
    query:     text('query').notNull(),                        // kept for debugging/inspection
    response:  text('response').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type RagResponseCache = typeof ragResponseCache.$inferSelect
export type NewRagResponseCache = typeof ragResponseCache.$inferInsert

export default ragResponseCache