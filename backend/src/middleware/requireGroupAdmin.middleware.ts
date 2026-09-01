import { and, eq } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";
import { groupMembers } from "../db/schema";
import db from "../db/connection";
import { z } from "zod";

export const requireGroupAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const parsedParams = z
        .object({ groupId: z.string().uuid() })
        .safeParse(req.params);

    if (!parsedParams.success) {
        return res.status(400).json({
            message: "Invalid group id",
            errors: parsedParams.error.flatten().fieldErrors,
        });
    }

    const { groupId } = parsedParams.data;
    const userId = req.user!.id;

    const membership = await db
        .select({ role: groupMembers.role })
        .from(groupMembers)
        .where(
            and(
                eq(groupMembers.groupId, groupId),
                eq(groupMembers.userId, userId)
            )
        )
        .limit(1);

    if (membership.length === 0) {
        return res.status(403).json({ message: 'You are not a member of this group' });
    }

    if (membership[0].role !== 'admin') {
        return res.status(403).json({ message: 'Only group admins can access this' });
    }

    next();
};