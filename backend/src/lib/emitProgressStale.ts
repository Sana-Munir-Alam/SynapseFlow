import { getIO } from '../socket';

export const emitProgressStale = (userId: string): void => {
  try {
    getIO().to(`user:${userId}`).emit('progress:stale');
  } catch (err) {
    console.warn('[emitProgressStale] Socket not ready:', err);
  }
};