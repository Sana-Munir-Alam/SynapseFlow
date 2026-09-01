import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../socket'

export const useRealtimeProgress = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleProgressStale = () => {
      queryClient.invalidateQueries({
        queryKey: ['progress-overview'],
        refetchType: 'active',
      })
    }

    socket.on('progress:stale', handleProgressStale)

    return () => {
      socket.off('progress:stale', handleProgressStale)
    }
  }, [queryClient])
}