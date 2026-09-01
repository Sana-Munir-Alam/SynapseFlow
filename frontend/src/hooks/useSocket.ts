import { useEffect } from 'react';
import { getSocket } from '../socket';
import { useCurrentUser } from './useCurrentUser';

// Manages socket connection lifecycle
// Connect when user is logged in, disconnect when they log out
export const useSocket = () => {
  const { data } = useCurrentUser();
  const user = data?.user;

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]); // reconnect if user changes

  return getSocket();
};