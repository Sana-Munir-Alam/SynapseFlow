import { io, Socket } from 'socket.io-client';

// Single socket instance for the entire app
// withCredentials sends the HTTP-only cookie automatically
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL, {
      withCredentials: true, // sends cookie — required for auth
      autoConnect: false,    // we control when to connect
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};