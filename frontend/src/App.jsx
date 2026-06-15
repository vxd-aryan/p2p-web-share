import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import RoomSetup from './components/RoomSetup';
import TransferDashboard from './components/TransferDashboard';

function AppContent() {
  const socket = useSocket();
  const [view, setView] = useState('landing'); 
  const [roomId, setRoomId] = useState(null);
  const [role, setRole] = useState(null);
  const [peerStatus, setPeerStatus] = useState('waiting');
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    const onRoomCreated = ({ roomId, role }) => { setRoomId(roomId); setRole(role); setView('room'); setPeerStatus('waiting'); setGlobalError(''); };
    const onRoomJoined = ({ roomId, role }) => { setRoomId(roomId); setRole(role); setView('room'); setPeerStatus('connected'); setGlobalError(''); };
    const onPeerJoined = () => setPeerStatus('connected');
    const onPeerDisconnected = () => { setPeerStatus('waiting'); setView('landing'); setRoomId(null); setRole(null); };
    const onRoomError = (msg) => setGlobalError(msg);

    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('peer-joined', onPeerJoined);
    socket.on('peer-disconnected', onPeerDisconnected);
    socket.on('room-error', onRoomError);

    return () => {
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('peer-joined', onPeerJoined);
      socket.off('peer-disconnected', onPeerDisconnected);
      socket.off('room-error', onRoomError);
    };
  }, [socket]);

  const handleSetup = (id, selectedRole) => {
    if (selectedRole === 'sender') {
      socket.emit('create-room', id);
    } else {
      socket.emit('join-room', id);
    }
  };

  const handleLeaveRoom = () => {
    socket.disconnect();
    socket.connect();
    setView('landing');
    setRoomId(null);
    setRole(null);
    setPeerStatus('waiting');
    setGlobalError('');
  };

  return (
    <div className="h-screen w-full bg-[#0B1020] font-sans text-white overflow-hidden relative flex flex-col">
      {globalError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-md z-50 flex items-center gap-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          {globalError}
        </div>
      )}
      
      {view === 'landing' ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <RoomSetup onSetup={handleSetup} />
          </div>
        </div>
      ) : (
        <TransferDashboard roomId={roomId} peerStatus={peerStatus} role={role} onLeave={handleLeaveRoom} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}