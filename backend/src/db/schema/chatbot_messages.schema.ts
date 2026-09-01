import {
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import users from './user.schema'

export const chatbotMessageRoleEnum = pgEnum('chatbot_message_role', ['user', 'assistant'])

export const chatbot_messages = pgTable("chatbot_messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: chatbotMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
})

export type ChatbotMessage = typeof chatbot_messages.$inferSelect
export type NewChatbotMessage = typeof chatbot_messages.$inferInsert
export const insertChatbotMessageSchema = createInsertSchema(chatbot_messages)
export const selectChatbotMessageSchema = createSelectSchema(chatbot_messages)

export default chatbot_messages