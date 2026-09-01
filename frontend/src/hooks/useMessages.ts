import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteForEveryone, deleteForMe, getMessages, sendMessage } from '../services/chat.services';

export const useMessages = (groupId: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', groupId],
    queryFn: ({ pageParam }) => getMessages(groupId, pageParam as string | undefined),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined,
    enabled: !!groupId,
  });
};

export const useSendMessage = (groupId: string) => {
  return useMutation({
    mutationFn: (content: string) => sendMessage(groupId, content),
    onError: (error: any) => {
      if (error?.response?.status === 429) {
        toast.error("Please wait 5 seconds before sending another message.");
        return;
      }
      toast.error(error?.message || "Something went wrong");
    }
  });
};

export const useDeleteForMe = (groupId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteForMe(groupId, messageId),
    onSuccess: () => {
      // Delete for me is local only — no socket needed, just refetch for this user
      queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
      toast.success("Message deleted for you");
    },
    onError(err: any) {
      if(err?.response.status === 403){
        toast.error("You are not authorized to delete this message");
      }
      else if(err?.response.status === 404){
        toast.error("Message not found");
      }
      else {
        toast.error(err?.message || "Something went wrong");
      }
    }
  });
};

export const useDeleteForEveryone = (groupId: string) => {
  return useMutation({
    mutationFn: (messageId: string) => deleteForEveryone(groupId, messageId), // keep groupId
    onSuccess: () => {
      toast.success("Message deleted for everyone");
    },
    onError(err: any) {
      if(err?.response.status === 403){
        toast.error("You are not authorized to delete this message");
      }
      else if(err?.response.status === 404){
        toast.error("Message not found");
      }
      else {
        toast.error(err?.message || "Something went wrong");
      }
    }
  });
};