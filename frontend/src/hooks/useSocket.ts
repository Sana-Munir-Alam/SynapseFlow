import { useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import { useCurrentUser } from './useCurrentUser';
import { api } from '../lib/axios';

// Manages socket connection lifecycle
// Connect when user is logged in, disconnect when they log out
export const useSocket = () => {
  const { data } = useCurrentUser();
  const user = data?.user;
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', async (err) => {
      console.error('Socket connection error:', err.message);

      // The socket authenticates off the same httpOnly access-token cookie
      // as REST calls, but has no path to axios's refresh interceptor. If
      // the cookie aged out while the tab was idle, every automatic
      // reconnect attempt keeps sending the same stale cookie forever.
      // Refresh it once here, then let socket.io's own retry logic pick
      // up the fresh cookie on its next scheduled attempt.
      const isAuthError = err.message === 'Authentication required' || err.message === 'Invalid token';
      if (isAuthError && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          await api.post('/auth/refresh');
        } catch (refreshErr) {
          console.error('Socket auth refresh failed — session may be fully expired:', refreshErr);
        } finally {
          isRefreshingRef.current = false;
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return getSocket();
};