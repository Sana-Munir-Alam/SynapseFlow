import { api } from '../lib/axios';

// Group API
export const createGroup = async (name: string) => {
    const { data } = await api.post('/chat/groups', { name });
    return data;
};

export const searchGroups = async (name: string) => {
    const { data } = await api.get('/chat/groups/search', { params: { name } });
    return data.groups;
};

export const joinGroup = async (groupId: string) => {
    const { data } = await api.post(`/chat/groups/${groupId}/join`);
    return data;
};

export const getGroupMembers = async (groupId: string) => {
    const { data } = await api.get(`/chat/groups/${groupId}/members`);
    return data;
};

// Message API
export const getMessages = async (groupId: string, cursor?: string) => {
    const { data } = await api.get(`/chat/groups/${groupId}/messages`, {
        params: { cursor, limit: 20 },
    });
    return data; // { messages, hasMore, nextCursor }
};

export const sendMessage = async (groupId: string, content: string) => {
    const { data } = await api.post(`/chat/groups/${groupId}/messages`, { content });
    return data.message;
};

export const deleteForMe = async (groupId: string, messageId: string) => {
    const { data } = await api.delete(`/chat/groups/${groupId}/messages/${messageId}`);
    return data;
};

export const deleteForEveryone = async (groupId: string, messageId: string) => {
    const { data } = await api.delete(`/chat/groups/${groupId}/messages/${messageId}/everyone`);
    return data;
};

export const getMyGroups = async () => {
    const { data } = await api.get(`/chat/groups/my-groups`);
    return data.groups;
}

export const leaveGroup = async (groupId: string) => {
    const { data } = await api.delete(`/chat/groups/${groupId}/leave`)
    return data;
}

export const deleteGroup = async (groupId: string) => {
    const { data } = await api.delete(`/chat/groups/${groupId}`)
    return data;
}

