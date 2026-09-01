import { Request, Response } from 'express';
import { addMember, checkExistingGroupById, checkExistingGroupByName, checkIfMember, createGroupAndSetAdmin, deleteGroupFromDB, getAllMembers, getMyGroupsFromDB, leaveGroupFromDB, searchGroupsByName } from '../services/dal/groups.dal';
import { checkGroupMembership, addNewSystemMessage, getMessageByIdWithSender } from '../services/dal/messages.dal';
import { getIO } from '../socket';

export const createGroup = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { name } = req.body;

    // Check for duplicate name before insert
    const existing = await checkExistingGroupByName(name)

    if (existing.length > 0) {
        return res.status(409).json({ message: 'A group with this name already exists' });
    }

    const result = await createGroupAndSetAdmin(name, userId)

    return res.status(201).json({ message: 'Group created', group: result });
};


export const searchGroups = async (req: Request, res: Response) => {
    const name = req.query.name as string;

    const cleanedName = name.trim().replace(/^(["'])(.*)\1$/, '$2').trim();

    const results = await searchGroupsByName(cleanedName)

    return res.status(200).json({ groups: results });
};


export const joinGroup = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const groupId = req.params.groupId as string;

    // Confirm the group exists
    const group = await checkExistingGroupById(groupId)

    if (group.length === 0) {
        return res.status(404).json({ message: 'Group not found' });
    }

    // Check if already a member
    const membership = await checkIfMember(userId, groupId)

    if (membership.length > 0) {
        return res.status(200).json({ message: 'Already a member' });
    }

    await addMember(userId, groupId)

    const systemMsg = await addNewSystemMessage(groupId, `${req.user!.username} has joined the group`);

    getIO().to(groupId).emit('new_message', {
        ...systemMsg[0],
        sender: null,
    });

    return res.status(201).json({ message: 'Joined group successfully' });
};

export const getGroupMembers = async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string;

    // Confirm group exists
    const group = await checkExistingGroupById(groupId)

    if (group.length === 0) {
        return res.status(404).json({ message: 'Group not found' });
    }

    const members = await getAllMembers(groupId)

    return res.status(200).json({
        group: group[0],
        members,
        total: members.length,
    });
};

export const getMyGroups = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await getMyGroupsFromDB(userId)
    return res.status(200).json({ groups: result });
};

export const leaveGroup = async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string;
    const userId = req.user!.id;

    const membership = await checkGroupMembership(groupId, userId)

    if (membership.length === 0) {
        return res.status(400).json({ message: 'You are not a member of this group' });
    }

    // Admin cannot leave — they must transfer ownership or delete the group
    if (membership[0].role === 'admin') {
        return res.status(400).json({ message: 'Admins cannot leave. Delete the group.' });
    }

    await leaveGroupFromDB(groupId, userId)

    const systemMsg = await addNewSystemMessage(groupId, `${req.user!.username} has left the group`);

    getIO().to(groupId).emit('new_message', {
        ...systemMsg[0],
        sender: null,
    });

    return res.status(200).json({ message: 'Left group successfully' });
};

export const deleteGroup = async (req: Request, res: Response) => {
    const groupId = req.params.groupId as string;

    const group = await checkExistingGroupById(groupId)

    if (group.length === 0) {
        return res.status(404).json({ message: 'Group not found' });
    }

    await deleteGroupFromDB(groupId)

    return res.status(200).json({ message: 'Group deleted successfully' });
};