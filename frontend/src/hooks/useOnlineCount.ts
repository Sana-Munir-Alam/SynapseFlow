import { useQuery } from '@tanstack/react-query';

// Simple hook to read online count from cache
// Gets populated by the online_count socket event
export const useOnlineCount = (groupId: string | null) => {
  const { data = 0 } = useQuery({
    queryKey: ['online_count', groupId ?? ''],
    queryFn: async () => 0,
    enabled: false,
    initialData: 0,
    staleTime: Infinity,
  });

  return data;
};