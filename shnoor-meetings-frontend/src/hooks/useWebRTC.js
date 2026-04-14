import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [participantsMetadata, setParticipantsMetadata] = useState({});
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [activeJoinRequests, setActiveJoinRequests] = useState([]); // {id, name}
  
  const isHost = useRef(localStorage.getItem(`meeting_host_${roomId}`) === 'true');
  
  const clientId = useRef(Math.random().toString(36).substring(7));
  const ws = useRef(null);
  const peerConnections = useRef({});
  const originalStream = useRef(null);
  const activeStreamsRef = useRef([]); // Track all streams to ensure they are stopped

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Initialize Media and WebSocket Setup
  useEffect(() => {
    const startConnection = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        originalStream.current = stream;
        activeStreamsRef.current.push(stream);
        setLocalStream(stream);

        ws.current = new WebSocket(`ws://localhost:8000/ws/${roomId}/${clientId.current}`);

        ws.current.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          handleSignalingData(msg, stream);
        };
      } catch (err) {
        console.error("Error accessing media devices.", err);
        setMediaError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Media Device Error');
      }
    };

    startConnection();

    return () => {
      console.log("Cleaning up WebRTC session and stopping all media tracks...");
      
      // Stop every track in every stream we've opened
      activeStreamsRef.current.forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.label} (${track.kind})`);
          });
        }
      });
      activeStreamsRef.current = [];

      if (ws.current) {
        ws.current.close();
      }
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [roomId]);

  const createPeerConnection = (senderId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks to the connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Handle incoming ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          target: senderId,
          candidate: event.candidate,
        });
      }
    };

    // Handle remote tracks mapping them into the UI state
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [senderId]: event.streams[0],
      }));
    };

    peerConnections.current[senderId] = pc;
    return pc;
  };

  const handleSignalingData = async (data, stream) => {
    const { type, sender, target } = data;

    // Ignore messages sent by ourselves or directed to someone else
    if (sender === clientId.current) return;
    if (target && target !== clientId.current) return;

    switch (type) {
      case 'user-joined':
        // A new user joined, let's create a PC and send them an offer
        const pc = createPeerConnection(sender, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessage({ type: 'offer', target: sender, offer });
        
        // If our hand is raised, tell the new user
        if (isHandRaised) {
          sendSignalingMessage({ type: 'raise-hand' });
        }
        break;

      case 'offer':
        const pcOffer = createPeerConnection(sender, stream);
        await pcOffer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pcOffer.createAnswer();
        await pcOffer.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', target: sender, answer });
        break;

      case 'answer':
        const pcAnswer = peerConnections.current[sender];
        if (pcAnswer && pcAnswer.signalingState !== 'stable') {
          await pcAnswer.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        break;

      case 'ice-candidate':
        const pcIce = peerConnections.current[sender];
        if (pcIce) {
          try {
            await pcIce.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding received ice candidate', e);
          }
        }
        break;

      case 'user-left':
        if (peerConnections.current[sender]) {
          peerConnections.current[sender].close();
          delete peerConnections.current[sender];
          
          setRemoteStreams((prev) => {
            const newStreams = { ...prev };
            delete newStreams[sender];
            return newStreams;
          });

          setParticipantsMetadata((prev) => {
            const newMeta = { ...prev };
            delete newMeta[sender];
            return newMeta;
          });
        }
        break;

      case 'chat':
        addMessage({ sender: data.sender, text: data.text });
        break;

      case 'raise-hand':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], isHandRaised: true }
        }));
        break;

      case 'lower-hand':
        setParticipantsMetadata(prev => ({
          ...prev,
          [sender]: { ...prev[sender], isHandRaised: false }
        }));
        break;

      case 'join-request':
        if (isHost.current) {
          setActiveJoinRequests(prev => {
            if (prev.find(r => r.id === sender)) return prev;
            return [...prev, { id: sender, name: data.name || 'Anonymous' }];
          });
        }
        break;

      case 'admit':
        if (target === clientId.current) {
          // Trigger a callback or state change to navigate
          window.dispatchEvent(new CustomEvent('meeting-admitted', { detail: { roomId } }));
        }
        break;

      default:
        break;
    }
  };

  const admitParticipant = (participantId) => {
    sendSignalingMessage({ type: 'admit', target: participantId });
    setActiveJoinRequests(prev => prev.filter(r => r.id !== participantId));
  };

  const requestToJoin = (name) => {
    sendSignalingMessage({ type: 'join-request', name });
  };

  const sendSignalingMessage = (msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        activeStreamsRef.current.push(screenStream);
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track on all peer connections
        Object.values(peerConnections.current).forEach(pc => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        // Handle the case where user stops sharing via browser UI
        screenTrack.onended = () => {
          stopScreenShare(screenTrack);
        };

        setLocalStream(screenStream);
        setIsSharingScreen(true);
      } else {
        const screenTrack = localStream.getVideoTracks()[0];
        stopScreenShare(screenTrack);
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopScreenShare = (screenTrack) => {
    if (screenTrack) screenTrack.stop();
    
    const camTrack = originalStream.current.getVideoTracks()[0];
    
    // Switch back to camera on all connections
    Object.values(peerConnections.current).forEach(pc => {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(camTrack);
      }
    });

    setLocalStream(originalStream.current);
    setIsSharingScreen(false);
  };

  const toggleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    sendSignalingMessage({ type: newState ? 'raise-hand' : 'lower-hand' });
  };

  const sendChatMessage = (text) => {
    const msgData = { type: 'chat', text };
    sendSignalingMessage(msgData);
    addMessage({ sender: 'Me', text }); // optimistic local update
  };

  return {
    localStream,
    remoteStreams,
    messages,
    participantsMetadata,
    isSharingScreen,
    isHandRaised,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleRaiseHand,
    sendChatMessage,
    admitParticipant,
    requestToJoin,
    activeJoinRequests,
    isHost: isHost.current,
    mediaError
  };
}
