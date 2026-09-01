import { and, eq } from 'drizzle-orm';
import { Server } from 'socket.io';
import { db } from '../../db/connection';
import { groupMembers } from '../../db/schema/groupMember.schema';
import { AuthenticatedSocket } from '..';
import { addUser, getOnlineCount, onlineUsers, removeUser } from '../store/onlineUsers';

export const registerPresenceHandlers = (
  io: Server,
  socket: AuthenticatedSocket
) => {
  const userId = socket.data.user.id;

  // Client emits this when user opens a group chat
  socket.on('join_group', async (groupId: string) => {
    // Verify the user is actually a member of this group
    // Never trust the client — always verify against DB
    const membership = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      socket.emit('error', { message: 'You are not a member of this group' });
      return;
    }

    // Join the socket.io room for this group
    socket.join(groupId);

    // Track in memory
    addUser(groupId, userId);

    // Tell everyone in the room the online count updated
    io.to(groupId).emit('online_count', {
      groupId,
      count: getOnlineCount(groupId),
    });

    console.log(`${socket.data.user.username} joined room ${groupId}`);
  });

  // Client emits this when user navigates away from a group chat
  socket.on('leave_group', (groupId: string) => {
    socket.leave(groupId);
    removeUser(groupId, userId);

    io.to(groupId).emit('online_count', {
      groupId,
      count: getOnlineCount(groupId),
    });

    console.log(`${socket.data.user.username} left room ${groupId}`);
  });

  // Fires automatically when socket connection drops
  // We need to remove the user from ALL rooms they were in
  socket.on('disconnect', () => {
    // Loop through all groups, remove this user wherever they appear
    for (const [groupId, users] of onlineUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        io.to(groupId).emit('online_count', { groupId, count: users.size });
      }
    }
  });
};