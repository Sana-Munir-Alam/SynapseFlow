import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { createGroup, searchGroups, joinGroup, getGroupMembers, getMyGroups, leaveGroup, deleteGroup } from '../services/chat.services';

interface ApiErrorResponse {
    message: string;
}

export const useSearchGroups = (name: string) => {
    return useQuery({
        queryKey: ['groups', 'search', name],
        queryFn: () => searchGroups(name),
        enabled: name.trim().length > 0,
        staleTime: 30_000,
    });
};

export const useGroupMembers = (groupId: string) => {
    return useQuery({
        queryKey: ['groups', groupId, 'members'],
        queryFn: () => getGroupMembers(groupId),
        enabled: !!groupId,
    });
};

export const useCreateGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => createGroup(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Group created successfully');
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? 'Failed to create group';
            toast.error(errorMessage);
        },
    });
};

export const useJoinGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (groupId: string) => joinGroup(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Joined group successfully');
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? 'Failed to join group';
            toast.error(errorMessage);
        },
    });
};

export const useMyGroups = () => {
    return useQuery({
        queryKey: ['groups', 'mine'],
        queryFn: getMyGroups,
        staleTime: 30_000,
    });
}

export const useLeaveGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (groupId: string) => leaveGroup(groupId),
        onSuccess: (_, groupId) => {
            queryClient.setQueryData(['groups', 'mine'], (old: any[] | undefined) => {
                if (!old) return old;
                return old.filter((group) => group.id !== groupId);
            });

            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Left group successfully');
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? 'Failed to leave group';
            toast.error(errorMessage);
        },
    });
};

export const useDeleteGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (groupId: string) => deleteGroup(groupId),
        onSuccess: (_, groupId) => {
            queryClient.setQueryData(['groups', 'mine'], (old: any[] | undefined) => {
                if (!old) return old;
                return old.filter((group) => group.id !== groupId);
            });

            queryClient.invalidateQueries({ queryKey: ['groups'] });
            toast.success('Group deleted successfully');
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
            const errorMessage = error.response?.data?.message ?? error.message ?? 'Failed to delete group';
            toast.error(errorMessage);
        },
    });
};