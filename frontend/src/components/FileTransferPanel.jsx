import React, { useState, useEffect, useRef } from 'react';

const CHUNK_SIZE = 16384; // 16KB safe buffer transmission chunks

export default function FileTransferPanel({ channel, role, onReset }) {
  // File Transfer States
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); 
  const [channelReadyState, setChannelReadyState] = useState(channel ? channel.readyState : 'connecting');

  // Chat States
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);

  // Receiver data aggregation stores
  const receivedChunks = useRef([]);
  const fileMetadata = useRef(null);
  const bytesReceived = useRef(0);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetTransferState = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    receivedChunks.current = [];
    fileMetadata.current = null;
    bytesReceived.current = 0;
  };

  useEffect(() => {
    if (!channel) {
      setChannelReadyState('connecting');
      return;
    }

    setChannelReadyState(channel.readyState);

    const handleOpen = () => setChannelReadyState('open');
    const handleClose = () => setChannelReadyState('closed');

    const handleMessage = (event) => {
      // Handle Strings (Chat, Metadata, Commands)
      if (typeof event.data === 'string') {
        try {
          const meta = JSON.parse(event.data);
          
          // 1. Handle Incoming Chat Message
          if (meta.type === 'chat') {
            setMessages(prev => [...prev, { 
              text: meta.text, 
              sender: 'Peer', 
              time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
            }]);
            return;
          }

          // 2. Handle Reset Command
          if (meta.type === 'reset-session') {
            resetTransferState();
            return;
          }

          // 3. Handle File Metadata
          if (meta.type === 'metadata') {
            fileMetadata.current = meta;
            receivedChunks.current = [];
            bytesReceived.current = 0;
            setStatus('receiving');
            setProgress(0);
          }
        } catch (e) {
          console.error("Failed to parse string payload", e);
        }
      } 
      // Handle Binary Data (File Chunks)
      else {
        receivedChunks.current.push(event.data);
        bytesReceived.current += event.data.byteLength;
        
        if (fileMetadata.current) {
          const percent = Math.round((bytesReceived.current / fileMetadata.current.size) * 100);
          setProgress(percent);

          if (bytesReceived.current >= fileMetadata.current.size) {
            const blob = new Blob(receivedChunks.current, { type: fileMetadata.current.mime });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileMetadata.current.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setStatus('complete');
          }
        }
      }
    };

    channel.addEventListener('open', handleOpen);
    channel.addEventListener('close', handleClose);
    channel.onmessage = handleMessage;

    return () => {
      channel.removeEventListener('open', handleOpen);
      channel.removeEventListener('close', handleClose);
      channel.onmessage = null;
    };
  }, [channel]);

  // --- FILE SENDING LOGIC ---
  const sendFileData = () => {
    if (!file || !channel || channelReadyState !== 'open') return;

    setStatus('sending');
    setProgress(0);

    channel.send(JSON.stringify({
      type: 'metadata',
      name: file.name,
      size: file.size,
      mime: file.type
    }));

    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (!e.target || !e.target.result) return;
      
      channel.send(e.target.result);
      offset += e.target.result.byteLength;
      
      const percent = Math.round((offset / file.size) * 100);
      setProgress(percent);

      if (offset < file.size) {
        if (channel.bufferedAmount > 16000000) { 
          setTimeout(readNextChunk, 100);
        } else {
          readNextChunk();
        }
      } else {
        setStatus('complete');
      }
    };

    function readNextChunk() {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    }

    readNextChunk();
  };

  const handleSendAnother = () => {
    if (channel && channelReadyState === 'open') {
      channel.send(JSON.stringify({ type: 'reset-session' }));
    }
    resetTransferState();
  };

  // --- CHAT SENDING LOGIC ---
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !channel || channelReadyState !== 'open') return;

    // Send securely over WebRTC data channel
    channel.send(JSON.stringify({ type: 'chat', text: chatInput }));

    // Add to local UI
    setMessages(prev => [...prev, { 
      text: chatInput, 
      sender: 'You', 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    }]);
    setChatInput('');
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          📂 Secure Transfer <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{role}</span>
        </h3>
        {channelReadyState === 'open' && (
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            E2E Encrypted
          </span>
        )}
      </div>

      {!channel && (
        <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          Waiting for direct peer-to-peer secure channel handshake approval...
        </p>
      )}

      {channel && channelReadyState !== 'open' && (
        <p className="text-gray-400 text-sm bg-white/5 p-4 rounded-xl animate-pulse">
          Connecting encrypted local peer channel... ({channelReadyState})
        </p>
      )}

      {channel && channelReadyState === 'open' && (
        <div className="space-y-8">
          
          {/* ================= FILE TRANSFER SECTION ================= */}
          <div>
            {role === 'sender' && status === 'idle' && (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-2xl p-8 transition-colors bg-black/20">
                <input 
                  type="file" 
                  id="file-select" 
                  className="hidden" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                />
                <label htmlFor="file-select" className="cursor-pointer text-center">
                  <span className="text-4xl block mb-2">📥</span>
                  <span className="text-sm text-purple-400 font-medium underline">Click to choose local file</span>
                  {file && <span className="block mt-3 text-white font-semibold">{file.name} ({Math.round(file.size / 1024)} KB)</span>}
                </label>
                
                {file && (
                  <button 
                    onClick={sendFileData}
                    className="mt-6 bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Transmit File
                  </button>
                )}
              </div>
            )}

            {role === 'receiver' && status === 'idle' && (
              <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
                <span className="text-4xl block mb-2">⏳</span>
                <p className="text-sm text-purple-400 font-medium">Ready and listening for incoming files...</p>
              </div>
            )}

            {(status === 'sending' || status === 'receiving') && (
              <div className="space-y-3 p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium capitalize">{status}...</span>
                  <span className="text-purple-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-white/5">
                  <div className="bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] h-3 transition-all duration-100" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            {status === 'complete' && (
              <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <p className="text-emerald-400 font-semibold text-lg">✓ Transfer Successful</p>
                <div className="flex justify-center gap-4 mt-4">
                  {role === 'sender' && (
                    <button 
                      onClick={handleSendAnother}
                      className="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Send Another File
                    </button>
                  )}
                  <button 
                    onClick={onReset}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Leave Room
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= ENCRYPTED P2P CHAT SECTION ================= */}
          <div className="border-t border-white/10 pt-8">
            <h4 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              💬 Direct P2P Chat
            </h4>
            
            <div className="flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden h-64">
              {/* Message History Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Connection secure. Send a message to start chatting.
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.sender} • {msg.time}</span>
                      <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${
                        msg.sender === 'You' 
                          ? 'bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white rounded-br-none' 
                          : 'bg-white/10 text-gray-200 border border-white/5 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <form onSubmit={sendChatMessage} className="bg-white/5 border-t border-white/10 p-2 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type an encrypted message..."
                  className="flex-1 bg-transparent text-sm text-white px-3 py-2 outline-none placeholder-gray-500"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}