import type { Request, Response } from "express";
import db from "../db/connection";
import { whiteboards } from "../db/schema";
import { eq } from "drizzle-orm";
import { checkGroupMembership } from "../services/dal/messages.dal";

export const getWhiteboard = async (req: Request, res: Response) => {
    try {
        const groupId = req.params.groupId as string;
        const [board] = await db.select().from(whiteboards).where(eq(whiteboards.groupId, groupId));

        // Return 200 with null data if not found, rather than 404
        return res.status(200).json({
            success: true,
            data: board || null
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
}

export const getWhiteboardByGroupId = async (groupId: string) => {
    try {
        const [board] = await db.select().from(whiteboards).where(eq(whiteboards.groupId, groupId));

        return {
            success: true,
            data: board || null
        };
    } catch (err) {
        console.log(err);
        return {
            success: false,
            error: "Internal server error"
        };
    }
}


export const updateWhiteboard = async (req: Request, res: Response) => {

    try {
        const groupId = req.params.groupId as string;
        const userId = req.user?.id as string;

        // Only group members can update the whiteboard
        const membership = await checkGroupMembership(groupId, userId)

        if (membership.length === 0) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        const snapshot = req.body;

        const [board] = await db.select().from(whiteboards).where(eq(whiteboards.groupId, groupId));
        
        if (!board) {
            // Create new board if it doesn't exist
            await db.insert(whiteboards).values({
                boardId: crypto.randomUUID(), // Using random UUID for boardId
                groupId,
                snapshot,
                updatedAt: new Date()
            });
        } else {
            // Update existing board
            await db.update(whiteboards)
                .set({ snapshot, updatedAt: new Date() })
                .where(eq(whiteboards.groupId, groupId));
        }
        
        return res.status(200).json({
            success: true,
            message: "Board updated successfully"
        });
    } catch (err) {

        console.log(err);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
}
