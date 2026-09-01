import { Request, Response } from "express";
import { addNewMessage, checkAdminAuthority, checkGroupMembership, checkIfAlreadyDeleted, checkMessageDeletionAuthority, checkMessageExists, deleteMessageForEveryone, deleteMsgForMe, fetchMessages, filterDeletedMessages, getMessageByIdWithSender } from "../services/dal/messages.dal";
import { handleGroupChatAIRequest } from "../services/handlers/ai-group-chat";
import { handleDocumentRAGRequest } from "../services/handlers/rag-search";
import { getIO } from "../socket";

export const sendMessage = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const groupId = req.params.groupId as string;

    // Only group members can send messages
    const membership = await checkGroupMembership(groupId, userId)

    if (membership.length === 0) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }

    const [createdMessage] = await addNewMessage(groupId, userId, req.body.content)

    const [message] = await getMessageByIdWithSender(createdMessage.id)

    // Broadcast the message immediately to the room from the backend
    getIO().to(groupId).emit('new_message', message);

    res.status(201).json({ message });

    if(req.body.content?.startsWith("@ai")){
        handleGroupChatAIRequest(groupId, req.body.content.slice(3).trim())
        .catch(console.error)
    }

    if(req.body.content?.startsWith("@docs")){
        handleDocumentRAGRequest(userId, req.body.content.slice(5).trim(), groupId)
        .catch(console.error)
    }

    return res;
};

export const getMessages = async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string;
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string

    // Only members can read messages
    const membership = await checkGroupMembership(groupId, userId)

    if (membership.length === 0) {
        return res.status(403).json({ message: "You are not a member of this group" });
    }

    // Fetch messages that haven't been soft-deleted for everyone
    // and haven't been personally deleted by this user
    const rows = await fetchMessages(groupId, limit, cursor)

    // Filter out messages the user personally deleted
    const userDeletions = await filterDeletedMessages(userId)

    const deletedForMe = new Set(userDeletions.map((d) => d.messageId));

    const filtered = rows.filter((m) => !deletedForMe.has(m.id));

    filtered.reverse();

    return res.status(200).json({
        messages: filtered,
        // If we got a full page, there are likely more messages
        hasMore: rows.length === limit,
        // Client uses this as the next cursor
        nextCursor: rows.length === limit ? rows[rows.length - 1].createdAt : null,
    });
};

export const deleteForMe = async (req: Request, res: Response) => {
    const messageId = req.params.messageId as string;
    const userId = req.user!.id;

    // Confirm message exists
    const message = await checkMessageExists(messageId)

    if (message.length === 0) {
        return res.status(404).json({ message: "Message not found" });
    }

    const existing = await checkIfAlreadyDeleted(userId, messageId)

    if (existing.length > 0) {
        return res.status(200).json({ message: "Already deleted" });
    }

    await deleteMsgForMe(userId, messageId);

    return res.status(200).json({ message: "Message deleted for you" });
};

export const deleteForEveryone = async (req: Request, res: Response) => {
    const messageId = req.params.messageId as string;
    const userId = req.user!.id;

    // Fetch the message with its groupId so we can check admin status
    const message = await checkMessageDeletionAuthority(messageId)

    if (message.length === 0) {
        return res.status(404).json({ message: "Message not found" });
    }

    const msg = message[0];

    if (msg.deletedAt) {
        return res.status(200).json({ message: "Already deleted for everyone" });
    }

    // Allow if: user is the message author OR user is a group admin
    const isAuthor = msg.userId === userId;

    const adminCheck = await checkAdminAuthority(userId, msg)

    const isAdmin = adminCheck[0]?.role === "admin";

    if (!isAuthor && !isAdmin) {
        return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await deleteMessageForEveryone(messageId)

    getIO().to(msg.groupId).emit('message_deleted', { messageId, groupId: msg.groupId });

    return res.status(200).json({ message: "Message deleted for everyone" });
};