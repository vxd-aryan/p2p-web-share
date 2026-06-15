import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export function useWebRTC(roomId, peerStatus, role) {
  const socket = useSocket();
  const pc = useRef(null);
  const [dataChannel, setDataChannel] = useState(null);
  const [iceState, setIceState] = useState('new');
  const [connState, setConnState] = useState('new');

  useEffect(() => {
    if (peerStatus !== 'connected' || !roomId) return;

    // 1. Initialize Peer Connection with free public STUN servers
    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Track states for debugging
    pc.current.oniceconnectionstatechange = () => setIceState(pc.current?.iceConnectionState || 'failed');
    pc.current.onconnectionstatechange = () => setConnState(pc.current?.connectionState || 'failed');

    // Send local ICE candidates to the other peer via signaling server
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('new-ice-candidate', { candidate: event.candidate, roomId });
      }
    };

    // 2. Setup Data Channel based on Role
    if (role === 'sender') {
      const channel = pc.current.createDataChannel('file-transfer', { ordered: true });
      setupDataChannelHandlers(channel);
    } else {
      pc.current.ondatachannel = (event) => {
        setupDataChannelHandlers(event.channel);
      };
    }

    function setupDataChannelHandlers(channel) {
      channel.binaryType = 'arraybuffer';
      setDataChannel(channel);
    }

    // 3. WebRTC Negotiation Handshake Dance
    if (role === 'sender') {
      pc.current.createOffer()
        .then(offer => pc.current.setLocalDescription(offer))
        .then(() => {
          socket.emit('video-offer', { sdp: pc.current.localDescription, roomId });
        });
    }

    // Socket listeners for signaling handshakes
    socket.on('video-offer', async (data) => {
      if (role === 'receiver' && pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        socket.emit('video-answer', { sdp: pc.current.localDescription, roomId });
      }
    });

    socket.on('video-answer', async (data) => {
      if (role === 'sender' && pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    socket.on('new-ice-candidate', async (data) => {
      if (pc.current && data.candidate) {
        try {
          await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    return () => {
      socket.off('video-offer');
      socket.off('video-answer');
      socket.off('new-ice-candidate');
      if (pc.current) {
        pc.current.close();
        pc.current = null;
      }
      setDataChannel(null);
    };
  }, [roomId, peerStatus, role, socket]);

  return { iceState, connState, dataChannel };
}