import { and, desc, eq, lt } from "drizzle-orm";
import db from "../../db/connection";
import { groupMembers, users } from "../../db/schema";
import messages, { Message, messageDeletions } from "../../db/schema/messages.schema";

export const checkGroupMembership = async (groupId: string, userId: string) => {
    return await db
        .select({ id: groupMembers.id, role: groupMembers.role })
        .from(groupMembers)
        .where(
            and(
                eq(groupMembers.groupId, groupId),
                eq(groupMembers.userId, userId)
            )
        )
        .limit(1);
}

export const addNewMessage = async (
  groupId: string, 
  userId: string | null, 
  content: string, 
  senderType: 'user' | 'ai' = 'user'
) => {
    return await db
        .insert(messages)
        .values({ groupId, userId, content, senderType })
        .returning();
}

export const addNewSystemMessage = async (groupId: string, content: string) => {
    return await db
        .insert(messages)
        .values({ groupId, content, senderType: 'user', isSystem: true })
        .returning();
}


export const getMessageByIdWithSender = async (messageId: string) => {
    return await db
        .select({
            id: messages.id,
            groupId: messages.groupId,
            content: messages.content,
            createdAt: messages.createdAt,
            deletedAt: messages.deletedAt,
            senderType: messages.senderType,
            isSystem: messages.isSystem,
            sender: {
                id: users.id,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,
            },
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        .where(eq(messages.id, messageId))
        .limit(1);
}

export const fetchMessages = async (groupId: string, limit: number, cursor?: string) => {
    return await db
        .select({
            id: messages.id,
            content: messages.content,
            createdAt: messages.createdAt,
            deletedAt: messages.deletedAt, // non-null = deleted for everyone
            senderType: messages.senderType,
            isSystem: messages.isSystem,
            sender: {
                id: users.id,
                username: users.username,
                firstName: users.firstName,
                lastName: users.lastName,
            },
        })
        .from(messages)
        .leftJoin(users, eq(messages.userId, users.id))
        // Exclude messages this user deleted for themselves
        .where(
            and(
                eq(messages.groupId, groupId),
                // If cursor provided, fetch messages older than cursor
                cursor ? lt(messages.createdAt, new Date(cursor)) : undefined,
            )
        )
        .orderBy(desc(messages.createdAt))
        .limit(limit);
}

export const filterDeletedMessages = async (userId: string) => {
    return await db
        .select({ messageId: messageDeletions.messageId })
        .from(messageDeletions)
        .where(eq(messageDeletions.userId, userId));
}

export const checkMessageExists = async (messageId: string) => {
    return await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
}

export const checkIfAlreadyDeleted = async (userId: string, messageId: string) => {
    return await db
        .select({ id: messageDeletions.id })
        .from(messageDeletions)
        .where(
            and(
                eq(messageDeletions.messageId, messageId),
                eq(messageDeletions.userId, userId)
            )
        )
        .limit(1);
}

export const deleteMsgForMe = async (userId: string, messageId: string) => {
    return await db.insert(messageDeletions).values({ messageId, userId })
}

export const checkMessageDeletionAuthority = async (messageId: string) => {
    return await db
        .select({
            id: messages.id,
            userId: messages.userId,
            groupId: messages.groupId,
            deletedAt: messages.deletedAt,
        })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
}

export const checkAdminAuthority = async (userId: string, msg: Pick<Message, 'groupId'>) => {
    return await db
        .select({ role: groupMembers.role })
        .from(groupMembers)
        .where(
            and(
                eq(groupMembers.groupId, msg.groupId!),
                eq(groupMembers.userId, userId)
            )
        )
        .limit(1);
}

export const deleteMessageForEveryone = async (messageId: string) => {
    return await db
        .update(messages)
        .set({ deletedAt: new Date() })
        .where(eq(messages.id, messageId));
}
