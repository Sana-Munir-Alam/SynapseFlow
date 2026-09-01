// Simple in-memory store — Maps groupId to a Set of userIds
// This lives in server memory, not DB

export const onlineUsers = new Map<string, Set<string>>();

export const addUser = (groupId: string, userId: string) => {
  if (!onlineUsers.has(groupId)) {
    onlineUsers.set(groupId, new Set());
  }
  onlineUsers.get(groupId)!.add(userId);
};

export const removeUser = (groupId: string, userId: string) => {
  onlineUsers.get(groupId)?.delete(userId);
};

export const getOnlineCount = (groupId: string): number => {
  return onlineUsers.get(groupId)?.size ?? 0;
};

export const getOnlineUsers = (groupId: string): string[] => {
  return Array.from(onlineUsers.get(groupId) ?? []);
};