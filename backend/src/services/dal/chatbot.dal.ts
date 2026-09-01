import { eq } from "drizzle-orm";
import db from "../../db/connection";
import type { NewChatbotMessage } from "../../db/schema/chatbot_messages.schema";
import chatbot_messages from "../../db/schema/chatbot_messages.schema";

export const getPreviousMessages = async (userId: string) => {
    return db
        .select()
        .from(chatbot_messages)
        .where(eq(chatbot_messages.userId, userId))
        .orderBy(chatbot_messages.createdAt)
        .limit(20)
}

export const saveChatbotMessage = async (
    userId: string,
    role: NewChatbotMessage['role'],
    content: string
) => {
    return await db.insert(chatbot_messages).values({ userId, role, content })
}