import { eq } from "drizzle-orm"
import db from "../../db/connection"
import { refreshTokens } from "../../db/schema"
import env from "../../config/env"

export const insertRefreshToken = async (userId: string, hashedToken: string) => {
    try {
        return await db.insert(refreshTokens).values({
            userId,
            token: hashedToken,
            expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        }).returning()
    } catch (err) {
        console.error("insertRefreshToken failed:", err)
        throw new Error("Failed to insert refresh token")
    }
}

export const consumeRefreshToken = async (hashedToken: string) => {
    return await db.delete(refreshTokens).where(eq(refreshTokens.token, hashedToken)).returning()
}

export const deleteRefreshToken = async (tokenId: string) => {
    try {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId))
    } catch (err) {
        console.error("deleteRefreshToken failed:", err)
        throw new Error("Failed to delete refresh token")
    }
}

export const deleteRefreshTokensByUser = async (userId: string) => {
    try {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
    } catch (err) {
        console.error("deleteRefreshTokensByUser failed:", err)
        throw new Error("Failed to delete user's refresh tokens")
    }
}