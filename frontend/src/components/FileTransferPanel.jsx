import React, { useState, useEffect, useRef } from 'react';

const CHUNK_SIZE = 16384; // 16KB safe buffer transmission chunks

export default function FileTransferPanel({ channel, role, onReset }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle', 'sending', 'receiving', 'complete', 'error'
  
  // Track the actual connection state reactively
  const [channelReadyState, setChannelReadyState] = useState(channel ? channel.readyState : 'connecting');

  // Receiver data aggregation stores
  const receivedChunks = useRef([]);
  const fileMetadata = useRef(null);
  const bytesReceived = useRef(0);

  // Clean wipe function to allow multiple files in one session
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
      if (typeof event.data === 'string') {
        try {
          const meta = JSON.parse(event.data);
          
          // Listen for a reset command from the sender
          if (meta.type === 'reset-session') {
            resetTransferState();
            return;
          }

          if (meta.type === 'metadata') {
            fileMetadata.current = meta;
            receivedChunks.current = [];
            bytesReceived.current = 0;
            setStatus('receiving');
            setProgress(0);
          }
        } catch (e) {
          console.error("Failed to parse metadata configuration payload string", e);
        }
      } else {
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

  // Sender triggers session refresh for both parties
  const handleSendAnother = () => {
    if (channel && channelReadyState === 'open') {
      channel.send(JSON.stringify({ type: 'reset-session' }));
    }
    resetTransferState();
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        📂 File Share System <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{role}</span>
      </h3>

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
        <div className="space-y-6">
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
                  Transmit Encrypted File
                </button>
              )}
            </div>
          )}

          {role === 'receiver' && status === 'idle' && (
            <div className="text-center p-8 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
              <span className="text-4xl block mb-2">⏳</span>
              <p className="text-sm text-purple-400 font-medium">Ready and listening for incoming files...</p>
              <p className="text-xs text-gray-400 mt-1">The sender can transmit data now.</p>
            </div>
          )}

          {(status === 'sending' || status === 'receiving') && (
            <div className="space-y-3">
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
              <p className="text-emerald-400 font-semibold text-lg">✓ Action Successful</p>
              <p className="text-gray-400 text-sm mt-1">Data packets transferred securely via point-to-point connection.</p>
              
              <div className="flex justify-center gap-4 mt-4">
                {role === 'sender' && (
                  <button 
                    onClick={handleSendAnother}
                    className="bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity shadow-md shadow-purple-500/20"
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
      )}
    </div>
  );
}