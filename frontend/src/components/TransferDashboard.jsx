import React, { useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import FileTransferPanel from './FileTransferPanel';

export default function TransferDashboard({ roomId, peerStatus, role, onLeave }) {
  const { iceState, connState, dataChannel } = useWebRTC(roomId, peerStatus, role);
  const isConnected = peerStatus === 'connected';
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    const link = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* --- NAVBAR --- */}
        <nav className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center font-bold shadow-lg shadow-purple-500/30">
              P
            </div>
            <h1 className="text-xl font-bold cursor-pointer hover:text-purple-400 transition-colors" onClick={onLeave}>
              P2P Web Share
            </h1>
          </div>
        </nav>

        {/* --- WAITING ROOM (Only shows before connection) --- */}
        {!isConnected && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mt-16 max-w-3xl mx-auto shadow-2xl">
            <h2 className="text-3xl font-bold mb-6">
              {role === 'sender' ? 'Create Share Room' : 'Join Share Room'}
            </h2>

            {/* Connection Pulse Status */}
            <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-white/5 border border-white/5">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
              <span className="text-amber-400 font-medium tracking-wide">Waiting for peer to connect...</span>
            </div>

            {/* Room Link Input */}
            {role === 'sender' && (
              <div>
                <label className="text-gray-400 text-sm font-medium">Room Link</label>
                <div className="flex mt-3 gap-3">
                  <input
                    readOnly
                    type="text"
                    value={`${window.location.origin}/?room=${roomId}`}
                    className="flex-1 bg-slate-900/50 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    onClick={copyRoomLink}
                    className="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-8 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30"
                  >
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TRANSFER PANEL MOUNT --- */}
        <div className="mt-8 max-w-3xl mx-auto">
          <FileTransferPanel 
            channel={dataChannel} 
            roomId={roomId} 
            role={role} 
            onReset={onLeave} 
          />
        </div>

      </div>
    </div>
  );
}