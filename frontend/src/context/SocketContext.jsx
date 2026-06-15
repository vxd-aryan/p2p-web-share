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
  // useMemo prevents the socket from rebuilding and breaking the connection on every render
  const socket = useMemo(() => {
    return io('http://localhost:8080', {
      transports: ['websocket'], // Forces WebSocket connection instantly
      autoConnect: true
    });
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};