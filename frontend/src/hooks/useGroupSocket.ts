import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getSocket } from '../socket';
import { useCurrentUser } from './useCurrentUser';

interface Message {
  id: string;
  groupId: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  sender: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  isSystem?: boolean;
}

// Call this when user opens a group chat
// Handles join/leave room and all message events for that group
export const useGroupSocket = (groupId: string | null) => {
  const queryClient = useQueryClient();
  const { data } = useCurrentUser();
  const userId = data?.user?.id;

  useEffect(() => {
    if (!groupId || !userId) return;

    const socket = getSocket();

    // Join the room
    socket.emit('join_group', groupId);

    // New Message
    // Instead of invalidating and refetching, append directly to cache
    socket.on('new_message', (message: Message) => {
      queryClient.setQueryData(
        ['messages', groupId],
        (old: any) => {
          if (!old) return old;

          // Messages are in pages — append to the last page
          const pages = [...old.pages];
          const lastPage = pages[pages.length - 1];

          pages[pages.length - 1] = {
            ...lastPage,
            messages: [...lastPage.messages, message],
          };

          return { ...old, pages };
        }
      );
    });

    // Message Deleted For Everyone
    // Find the message in cache and mark it as deleted
    socket.on('message_deleted', ({ messageId }: { messageId: string; groupId: string }) => {
      queryClient.setQueryData(
        ['messages', groupId],
        (old: any) => {
          if (!old) return old;

          const pages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === messageId
                ? { ...m, deletedAt: new Date().toISOString() }
                : m
            ),
          }));

          return { ...old, pages };
        }
      );
    });

    // Online Count
    socket.on('online_count', ({ count }: { groupId: string; count: number }) => {
      queryClient.setQueryData(['online_count', groupId], count);
    });

    // AI Typing State
    socket.on('ai_typing', ({ groupId: eventGroupId, isTyping }: { groupId: string; isTyping: boolean }) => {
      if (eventGroupId === groupId) {
        queryClient.setQueryData(['ai_typing', groupId], isTyping);
      }
    });


    return () => {
      // Leave room when user navigates away
      socket.emit('leave_group', groupId);
      socket.off('new_message');
      socket.off('message_deleted');
      socket.off('online_count');
      socket.off('ai_typing');
    };
  }, [groupId, userId]);
};