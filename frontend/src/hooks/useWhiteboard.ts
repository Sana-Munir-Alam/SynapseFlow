import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export const useWhiteboard = (groupId: string) => {
    return useQuery({
        queryKey: ['whiteboard', groupId],
        queryFn: async () => {
            const { data } = await api.get(`/board/${groupId}`);
            return data.data;
        },
        enabled: !!groupId,
        staleTime: Infinity, // Keep whiteboard data in cache indefinitely unless manually invalidated
    });
};

export const useUpdateWhiteboard = (groupId: string) => {
    return useMutation({
        mutationFn: async (snapshot: any) => {
            const { data } = await api.put(`/board/${groupId}`, snapshot);
            return data;
        },
    });
};
