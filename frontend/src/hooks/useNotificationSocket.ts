import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../socket'
import type { Notification } from '../services/scheduler.service'

export const useNotificationSocket = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()
    let hasConnectedBefore = false

    const handleNewNotification = (notification: Notification) => {
      queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
        // Guard against a duplicate if a reconnect-resync and this socket
        // event both deliver the same notification.
        if (old.some((n) => n.id === notification.id)) return old
        return [notification, ...old]
      })
    }

    const handleConnect = () => {
      // Skip the very first connection — React Query already fetches on mount. Only resync here on a genuine reconnect (e.g. the user's internet dropped and came back), to catch anything missed while disconnected.
      if (hasConnectedBefore) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }
      hasConnectedBefore = true
    }

    socket.on('notification:new', handleNewNotification)
    socket.on('connect', handleConnect)

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('connect', handleConnect)
    }
  }, [queryClient])
}