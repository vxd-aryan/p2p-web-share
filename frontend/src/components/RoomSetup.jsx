import React, { useState } from 'react';

export default function RoomSetup({ onSetup }) {
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    onSetup(generateRoomId(), 'sender');
  };

  const handleJoinRoom = () => {
    if (roomIdToJoin.trim()) {
      onSetup(roomIdToJoin.trim(), 'receiver');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* --- NAVBAR --- */}
        <nav className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center font-bold shadow-lg shadow-purple-500/30">
              P
            </div>
            <h1 className="text-xl font-bold text-white">
              P2P Web Share
            </h1>
          </div>
        </nav>

        {/* --- HERO SECTION --- */}
        <div className="max-w-3xl mt-16">
          <h1 className="text-6xl font-bold leading-tight text-white">
            Share files <span className="text-purple-400">directly</span>
          </h1>
          
          <p className="mt-6 text-gray-400 text-lg">
            No servers. No uploads. Just browser-to-browser secure transfers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            {/* Create Room Button */}
            <button 
              onClick={handleCreateRoom}
              className="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-8 py-4 rounded-2xl font-semibold hover:scale-105 transition shadow-lg shadow-purple-500/30 text-white"
            >
              Create Room
            </button>
            
            {/* Join Room Input Group */}
            <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1 focus-within:border-purple-500 transition-colors max-w-md">
              <input 
                type="text" 
                placeholder="Enter Room ID" 
                value={roomIdToJoin}
                onChange={(e) => setRoomIdToJoin(e.target.value)}
                className="bg-transparent text-white placeholder-gray-500 px-4 py-2 outline-none w-full"
              />
              <button 
                onClick={handleJoinRoom}
                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl font-semibold transition text-white shrink-0"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* --- FEATURES SECTION --- */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 pb-12">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-bold text-lg text-white">Secure</h3>
            <p className="text-gray-400 mt-2">SHA-256 verification and encrypted transfers.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-lg text-white">Fast</h3>
            <p className="text-gray-400 mt-2">Direct browser-to-browser communication.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition">
            <div className="text-4xl mb-3">🌐</div>
            <h3 className="font-bold text-lg text-white">Peer-to-Peer</h3>
            <p className="text-gray-400 mt-2">No cloud storage and no file uploads.</p>
          </div>
        </div>

      </div>
    </div>
  );
}