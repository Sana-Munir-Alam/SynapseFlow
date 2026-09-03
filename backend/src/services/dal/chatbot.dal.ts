import { and, eq, gt, lt } from "drizzle-orm";
import crypto from "crypto";
import db from "../../db/connection";
import type { NewChatbotMessage } from "../../db/schema/chatbot_messages.schema";
import chatbot_messages from "../../db/schema/chatbot_messages.schema";
import ragResponseCache from "../../db/schema/rag_response_cache.schema";

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

// ---- RAG response cache ----------------------------------------------------
// Caches answers to "chat with your docs" questions — the standalone chatbot's
// @docs mode and the group chat's @docs command. NOT used for ordinary
// conversational chat, since those replies depend on conversation history and
// caching them would return stale, out-of-context answers.

const RAG_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

// Lowercases and collapses whitespace so trivially different phrasing of the same question ("What is a stack?" vs "what is a stack?") hits the same cache entry.
export const normalizeQuery = (query: string): string => {
    return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

const hashQuery = (normalizedQuery: string, fileIds: string[]): string => {
    const sortedIds = [...new Set(fileIds)].sort()
    return crypto.createHash('sha256').update(`${normalizedQuery}|${sortedIds.join(',')}`).digest('hex')
}

export const getCachedRAGResponse = async (userId: string, normalizedQuery: string, fileIds: string[]): Promise<string | null> => {
    const queryHash = hashQuery(normalizedQuery, fileIds)
    const cutoff = new Date(Date.now() - RAG_CACHE_TTL_MS)

    const [hit] = await db
        .select({ response: ragResponseCache.response })
        .from(ragResponseCache)
        .where(
            and(
                eq(ragResponseCache.userId, userId),
                eq(ragResponseCache.queryHash, queryHash),
                gt(ragResponseCache.createdAt, cutoff)
            )
        )
        .orderBy(ragResponseCache.createdAt)
        .limit(1)

    return hit?.response ?? null
}

export const setCachedRAGResponse = async (userId: string, normalizedQuery: string, fileIds: string[], response: string): Promise<void> => {
    const queryHash = hashQuery(normalizedQuery, fileIds)
    await db.insert(ragResponseCache).values({
        userId,
        queryHash,
        query: normalizedQuery,
        response,
    })
}

// Optional cleanup — delete cache rows older than the TTL so the table doesn't grow unbounded with entries nobody will ever hit again. */
export const deleteExpiredRAGCache = async () => {
    const cutoff = new Date(Date.now() - RAG_CACHE_TTL_MS)
    await db.delete(ragResponseCache).where(lt(ragResponseCache.createdAt, cutoff))
}