import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const connectingRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    let cancelled = false;

    import('socket.io-client').then(({ io: clientIo }) => {
      if (cancelled) return;

      const socket = clientIo(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setConnected(true);
        socketRef.current = socket;
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));

      connectingRef.current = socket;
    });

    return () => {
      cancelled = true;
      const s = socketRef.current || connectingRef.current;
      if (s) {
        s.close();
      }
      socketRef.current = null;
      connectingRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const emit = (event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, handler) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on(event, handler);
    }
    return () => {
      socket?.off(event, handler);
    };
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
