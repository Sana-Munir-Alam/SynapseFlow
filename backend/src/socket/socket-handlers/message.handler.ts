import { Server } from 'socket.io';
import { AuthenticatedSocket } from '..';

export const registerMessageHandlers = (
  io: Server,
  socket: AuthenticatedSocket
) => {
  // All message socket logic is now handled directly via REST controllers
  // to avoid race conditions and redundant DB checks.
};