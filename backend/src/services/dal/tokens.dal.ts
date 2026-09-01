import { eq } from "drizzle-orm"
import db from "../../db/connection"
import { reset_tokens } from "../../db/schema"


export const insertToken = async (id: string, hashedToken: string) => {
    try {
        return await db.insert(reset_tokens).values({
            userId: id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
        }).returning()
    }
    catch (err) {
        console.error("insertToken failed:", err)
        throw new Error("Failed to insert reset token")
    }
}

export const deleteToken = async (tokenId: string) => {
    try {
        await db.delete(reset_tokens).where(eq(reset_tokens.id, tokenId))
    }
    catch (err) {
        console.error("deleteToken failed:", err)
        throw new Error("Failed to delete reset token")
    }
}

export const getToken = async (hashedToken: string) => {
    return await db.select().from(reset_tokens).where(eq(reset_tokens.token, hashedToken))

}