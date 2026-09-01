import { and, eq, ilike } from "drizzle-orm";
import db from "../../db/connection";
import { groupMembers, groups, users } from "../../db/schema";

export const checkExistingGroupByName = async (name: string) => {
    return await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.name, name.trim()))
        .limit(1);
}

export const checkExistingGroupById = async (id: string) => {
    return await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.id, id))
        .limit(1);
}

export const getGroupById = async (groupId: string) => {
    return await db
        .select({ 
            name: groups.name
        })
        .from(groups)
        .where(eq(groups.id, groupId))
        .limit(1);
}

// transaction
export const createGroupAndSetAdmin = async (name: string, userId: string) => {
    return await db.transaction(async (tx) => {
        const [group] = await tx
            .insert(groups)
            .values({ name: name.trim(), createdBy: userId })
            .returning();

        await tx.insert(groupMembers).values({
            groupId: group.id,
            userId,
            role: 'admin', // creator is always admin
        });

        return group;
    });
}

export const searchGroupsByName = async (name: string) => {
    return db
        .select({
            id: groups.id,
            name: groups.name,
            createdAt: groups.createdAt,
        })
        .from(groups)
        .where(ilike(groups.name, `%${name}%`))
        .limit(20);
}

export const checkIfMember = async (userId: string, groupId: string) => {
    return await db
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(
            and(
                eq(groupMembers.groupId, groupId),
                eq(groupMembers.userId, userId)
            )
        )
        .limit(1);
}

export const addMember = async (userId: string, groupId: string) => {
    return await db.insert(groupMembers).values({ groupId, userId, role: 'member' })
}

export const getAllMembers = async (groupId: string) => {
    return await db
        .select({
            memberId: groupMembers.id,
            userId: users.id,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName,
            role: groupMembers.role,
            joinedAt: groupMembers.joinedAt,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, groupId))
        .orderBy(groupMembers.joinedAt);
}

export const getMyGroupsFromDB = async (userId: string) => {
    return await db
        .select({
            id: groups.id,
            name: groups.name,
            role: groupMembers.role,
        })
        .from(groupMembers)
        .innerJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(eq(groupMembers.userId, userId));
}

export const leaveGroupFromDB = async (groupId: string, userId: string) => {
    return await db
        .delete(groupMembers)
        .where(
            and(
                eq(groupMembers.groupId, groupId),
                eq(groupMembers.userId, userId)
            )
        );
}

export const deleteGroupFromDB = async (groupId: string) => {
    return await db
        .delete(groups)
        .where(eq(groups.id, groupId));
}

