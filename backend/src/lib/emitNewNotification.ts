import { getIO } from '../socket'
import type { Notification } from '../db/schema/notification.schema'

export const emitNewNotification = (userId: string, notification: Notification): void => {
  try {
    getIO().to(`user:${userId}`).emit('notification:new', notification)
  } catch (err) {
    console.warn('[emitNewNotification] Socket not ready:', err)
  }
}