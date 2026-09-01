import { useQuery } from '@tanstack/react-query';

// Simple hook to read AI typing state from cache
// Gets populated by the ai_typing socket event
export const useAITyping = (groupId: string | null) => {
  const { data = false } = useQuery({
    queryKey: ['ai_typing', groupId ?? ''],
    queryFn: async () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
  });

  return data;
};
