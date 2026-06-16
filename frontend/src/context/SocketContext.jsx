import React, { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  // Automatically switches between production Render URL and local testing
  const BACKEND_URL = import.meta.env.PROD
    ? 'https://p2p-web-share-5irp.onrender.com' // 👈 Paste your Render URL here (no trailing slash)
    : 'http://localhost:8080';

  // useMemo prevents the socket from rebuilding and breaking the connection on every render
  const socket = useMemo(() => {
    return io(BACKEND_URL, {
      transports: ['websocket'], // Forces WebSocket connection instantly
      autoConnect: true
    });
  }, [BACKEND_URL]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};