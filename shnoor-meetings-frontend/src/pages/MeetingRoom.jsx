import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoGrid from '../components/VideoGrid';
import MeetingControls from '../components/MeetingControls';
import { Send, Users, Info, Video, MessageSquare, Search, Brain, CheckSquare, Download, Clock, Paperclip, FileText } from 'lucide-react';
import { askGemini } from '../services/geminiService';

export default function MeetingRoom() {
  const { id: roomId } = useParams();
  const {
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
    sendCaptionMessage,
    isHost,
    mediaError
  } = useWebRTC(roomId);

  const [activeTab, setActiveTab] = useState(null); // 'people', 'ai', 'memory'
  
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [currentCaptionText, setCurrentCaptionText] = useState('');
  // Accumulate the full spoken transcript so AI can reference it
  const [captionHistory, setCaptionHistory] = useState([]);
  
  // AI, Chat, and Memory
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isCaptionsOnRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, messages, activeTab]);

  const handleGlobalChatSubmit = (e) => {
    e.preventDefault();
    if (!globalChatInput.trim()) return;
    sendChatMessage(globalChatInput.trim());
    setGlobalChatInput('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // In a real application, POST to your FastAPI backend here.
    // For now we mock the successful upload URL locally.
    const mockFileUrl = URL.createObjectURL(file); 
    const message = `[FILE: ${file.name}](${mockFileUrl})`;
    sendChatMessage(message);
  };

  // Listen for captions from remote participants and accumulate in history
  useEffect(() => {
    const handleNewCaption = (e) => {
      const text = e.detail;
      setCurrentCaptionText(text);
      // Append remote captions to global history so AI can see what others said
      if (text) {
        setCaptionHistory(prev => {
          const last = prev[prev.length - 1];
          if (last?.speaker === 'Participant' && last?.text === text) return prev;
          return [...prev, { speaker: 'Participant', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        });
      }
    };
    window.addEventListener('new-caption', handleNewCaption);
    return () => window.removeEventListener('new-caption', handleNewCaption);
  }, []);

  // Auto-clear the displayed caption pill after 5 seconds of silence (but keep in history)
  useEffect(() => {
    if (!currentCaptionText) return;
    const timer = setTimeout(() => setCurrentCaptionText(''), 5000);
    return () => clearTimeout(timer);
  }, [currentCaptionText]);

  useEffect(() => {
    isCaptionsOnRef.current = isCaptionsOn;

    if (isCaptionsOn) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech Recognition API not supported in this browser.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        const caption = final || interim;
        setCurrentCaptionText(caption);
        sendCaptionMessage(caption);
        // Accumulate final (confirmed) captions into the persistent history log for AI context
        if (final) {
          setCaptionHistory(prev => [...prev, { 
            speaker: 'You', 
            text: final.trim(), 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }]);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.error('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (isCaptionsOnRef.current) {
          try { recognition.start(); } catch(e) {}
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start Speech Recognition', e);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch(e) {}
        recognitionRef.current = null;
      }
      setCurrentCaptionText('');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch(e) {}
        recognitionRef.current = null;
      }
    };
  }, [isCaptionsOn]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    alert('Meeting code copied to clipboard!');
  };

  const captureSnapshot = async () => {
    if (!localStream) return null;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    video.srcObject = localStream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        video.pause();
        video.srcObject = null;
        resolve(dataUrl);
      };
    });
  };

  const handleTakeSnapshot = async () => {
    const dataUrl = await captureSnapshot();
    if (dataUrl) {
      setMemories(prev => [...prev, {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'snapshot',
        image: dataUrl,
        text: 'Manual Snapshot'
      }]);
      setActiveTab('memory'); // Instantly switch to the memory tab so the user sees it!
    }
  };

  const addMemory = (text, type = 'note', imageBase64 = null) => {
    setMemories(prev => [...prev, {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      text,
      image: imageBase64
    }]);
  };

  const handleAssistantSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    let currentInput = aiInput.trim();
    setAiInput('');
    setAssistantMessages(prev => [...prev, { sender: 'Me', text: currentInput }]);
    setAiIsTyping(true);

    const isTakeNote = currentInput.toLowerCase().includes('take a note');
    const isExtractTask = currentInput.toLowerCase().includes('task');
    let snapshotBase64 = null;
    
    // Check if the user specifically asked to take an inline snapshot instantly
    if (isTakeNote || currentInput.toLowerCase().includes('screenshot') || currentInput.toLowerCase().includes('see this')) {
      snapshotBase64 = await captureSnapshot();
    }

    // GATHER ALL HISTORICAL VISION MEMORIES
    // The user wants the AI to recall and scan ALL past screenshots natively.
    const historicalImages = memories
      .filter(m => m.image) // Get all memories with a screenshot
      .map(m => m.image); // Extract just the base64 data
    
    // If we took a flash snapshot just now, append it to the batch so the AI sees everything
    const allImagesToAnalyze = [...historicalImages];
    if (snapshotBase64) {
      allImagesToAnalyze.push(snapshotBase64);
    }

    try {
      // --- BUILD RICH AI CONTEXT FROM ALL MEETING DATA SOURCES ---

      // 1. SPOKEN TRANSCRIPT: Full history of everything said (You + Participants) via captions
      const spokenTranscript = captionHistory.length > 0
        ? captionHistory.map(c => `[${c.time}] ${c.speaker}: ${c.text}`).join('\n')
        : 'No spoken transcript yet — captions may not be enabled.';

      // 2. GROUP CHAT: All text messages sent in the meeting Chat tab
      const chatTranscript = messages.length > 0
        ? messages.map(m => `[Chat] ${m.sender === 'Me' ? 'You' : m.sender}: ${m.text}`).join('\n')
        : 'No group chat messages yet.';

      // 3. MEMORY LOG: Text summaries of all saved notes & tasks  
      const memoryLog = memories.length > 0
        ? memories.map(m => `[${m.time}][${m.type.toUpperCase()}] ${m.text}`).join('\n')
        : 'No memory notes saved yet.';

      const context = `You are an intelligent AI meeting assistant with access to the full context of this live video call.

=== SPOKEN TRANSCRIPT (Live Captions) ===
${spokenTranscript}

=== GROUP CHAT MESSAGES ===
${chatTranscript}

=== MEMORY LOG (Saved Notes & Tasks) ===
${memoryLog}

=== VISUAL CONTEXT ===
You have access to ${allImagesToAnalyze.length} screenshot(s) taken during this meeting. Analyse them carefully if the user asks visual questions.

Use ALL of the above context to give the most accurate, helpful, and context-aware response possible. If the user is asking about something that was said, look in the Spoken Transcript first.`;
      
      const answer = await askGemini(currentInput, context, allImagesToAnalyze);
      
      setAssistantMessages(prev => [...prev, { sender: 'AI', text: answer, image: snapshotBase64 }]);
      
      if (isTakeNote || isExtractTask) {
        addMemory(answer, isExtractTask ? 'task' : 'note', snapshotBase64);
      }

    } catch (e) {
      const isQuota = e.message === 'API_QUOTA_EXCEEDED';
      setAssistantMessages(prev => [...prev, { 
        sender: 'AI', 
        text: isQuota 
          ? '⚠️ API quota exceeded for today. The free-tier API key has hit its daily limit. Please try again tomorrow, or replace the API key in geminiService.js with a new one from https://aistudio.google.com/apikey'
          : `Sorry, I had trouble responding: ${e.message}`
      }]);
    } finally {
      setAiIsTyping(false);
    }
  };

  // Filter memories based on search query
  const filteredMemories = memories.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.time.includes(searchQuery)
  );

  return (
    <div className="h-screen w-full bg-[#131417] flex flex-col overflow-hidden text-[#e2e3e8] font-sans">
      {/* Top Header */}
      <header className="w-full p-6 flex items-center justify-between z-10 bg-[#131417]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-xl tracking-wide hidden sm:block">Shnoor Meetings</span>
          <span className="text-gray-400 text-sm bg-[#1e2025] px-4 py-2 rounded-lg border border-gray-800 ml-4 hidden md:inline-flex items-center cursor-pointer hover:bg-gray-800 transition">
            Code: {roomId} <Info size={14} className="ml-2" />
          </span>
        </div>
        <div className="flex items-center text-gray-400 bg-[#1e2025] px-4 py-2 rounded-lg border border-gray-800">
          <Users size={16} className="mr-2" /> 
          <span className="font-medium text-sm">{1 + Object.keys(remoteStreams).length}</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-6 pb-2 relative w-full h-full gap-4">
        
        {/* Main Video Grid */}
        <div className="flex-1 flex flex-col transition-all duration-300 w-full min-w-0">
          <div className="flex-1 rounded-2xl overflow-hidden relative flex items-center justify-center p-2 bg-black shadow-2xl border border-gray-900">
            {!localStream ? (
              <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
                <div className={`p-8 rounded-full bg-gray-800 ${!mediaError ? 'animate-pulse' : ''} border border-gray-700 transition-all`}>
                  <Video size={48} className={mediaError ? 'text-red-500' : 'text-blue-500'} />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2 text-white">
                    {mediaError ? 'Camera/Mic Access Failed' : 'Ready to join?'}
                  </h3>
                  <p className="text-gray-400 max-w-sm">
                    {mediaError 
                      ? `We couldn't access your hardware: ${mediaError}. Please check your browser permissions.`
                      : 'We are requesting access to your camera and microphone. Please click "Allow" in the browser prompt.'}
                  </p>
                  {mediaError && (
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg transition-all transform active:scale-95"
                    >
                      Retry Access
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <VideoGrid 
                localStream={localStream} 
                remoteStreams={remoteStreams} 
                participantsMetadata={participantsMetadata}
                localHandRaised={isHandRaised}
              />
            )}
            
            {/* Captions Overlay — floating pill at bottom left */}
            {isCaptionsOn && currentCaptionText && (
              <div className="absolute bottom-6 left-6 bg-[#212328]/95 backdrop-blur-md px-5 py-3 rounded-2xl max-w-xl text-left shadow-2xl z-20 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 shrink-0 shadow-lg border border-gray-600"></div>
                <p className="text-[#e2e3e8] text-[15px] font-medium tracking-wide">
                  <span className="mr-2 text-gray-400 inline-block align-middle">•</span>
                  {currentCaptionText}
                </p>
              </div>
            )}
          </div>
          
          {/* Floating Action Menu aligned bottom center */}
          <MeetingControls 
            roomId={roomId}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onToggleScreenShare={toggleScreenShare}
            onToggleRaiseHand={toggleRaiseHand}
            onToggleCaptions={() => setIsCaptionsOn(!isCaptionsOn)}
            onTakeSnapshot={handleTakeSnapshot}
            isSharingScreen={isSharingScreen}
            isHandRaised={isHandRaised}
            isCaptionsOn={isCaptionsOn}
            toggleRightPanel={(tab) => {
               setActiveTab(activeTab === tab ? null : tab);
            }}
          />
        </div>

        {/* Sliding Right Sidebar - Merging tabs */}
        {activeTab && (
          <aside className="w-[400px] flex flex-col bg-[#1e2025] rounded-2xl shadow-xl overflow-hidden border border-gray-800 shrink-0 h-[calc(100vh-200px)]">
            {/* Tabs Header */}
            <div className="flex bg-[#2a2d33] text-sm font-semibold py-1.5 px-1.5 rounded-xl mx-4 mt-4 gap-1 z-10">
               <button 
                 onClick={() => setActiveTab('people')}
                 className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${activeTab === 'people' ? 'bg-[#3b3d44] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 People
               </button>
               <button 
                 onClick={() => setActiveTab('chat')}
                 className={`flex-1 py-1.5 rounded-lg capitalize transition-colors ${activeTab === 'chat' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-indigo-500' : 'text-gray-400 hover:text-white'}`}
               >
                 Chat
               </button>
               <button 
                 onClick={() => setActiveTab('ai')}
                 className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-blue-500' : 'text-gray-400 border-b-2 border-transparent hover:text-white'}`}
               >
                 AI Assistant
               </button>
               <button 
                 onClick={() => setActiveTab('memory')}
                 className={`flex-1 py-1.5 rounded-lg transition-colors ${activeTab === 'memory' ? 'bg-[#3b3d44] text-white shadow-sm font-bold border-b-2 border-emerald-500' : 'text-gray-400 hover:text-white'}`}
               >
                 Memory
               </button>
            </div>
            
            {/* Global Chat / Messaging Content */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 pb-0 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4 space-y-4">
                      <div className="p-4 bg-gray-800 rounded-full mb-2 opacity-50 shadow-md">
                        <MessageSquare className="text-gray-400" size={32} />
                      </div>
                      <p>Welcome to the group chat. Say hi or share files with the room!</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isFile = m.text.startsWith('[FILE:');
                      const fileName = isFile ? m.text.substring(m.text.indexOf(' ')+1, m.text.indexOf(']')) : null;
                      const fileUrl = isFile ? m.text.substring(m.text.indexOf('(')+1, m.text.indexOf(')')) : null;

                      return (
                        <div key={idx} className={`flex flex-col gap-1 ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-medium text-gray-500">{m.sender === 'Me' ? 'You' : m.sender}</span>
                          </div>
                          
                          {isFile ? (
                             <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm flex items-center gap-2 cursor-pointer ${m.sender === 'Me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#2a2d33] text-indigo-100 rounded-tl-none border border-gray-700 hover:bg-gray-700'}`}>
                               <FileText size={18} />
                               <span className="truncate">{fileName}</span>
                             </a>
                          ) : (
                             <div className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm ${m.sender === 'Me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#2a2d33] text-indigo-100 rounded-tl-none border border-gray-700'}`}>
                               {m.text}
                             </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4">
                  <form onSubmit={handleGlobalChatSubmit} className="bg-[#2a2d33] rounded-2xl flex items-center shadow-inner border border-gray-700 focus-within:border-indigo-500 transition-colors px-2">
                    <button type="button" onClick={() => document.getElementById('file-upload').click()} className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-gray-700">
                      <Paperclip size={18} />
                    </button>
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                    
                    <input
                      type="text"
                      value={globalChatInput}
                      onChange={(e) => setGlobalChatInput(e.target.value)}
                      placeholder="Message everyone..."
                      className="flex-1 bg-transparent border-none outline-none text-[#e2e3e8] py-3 px-2 placeholder-gray-500 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!globalChatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl disabled:opacity-30 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>
            )}
            
            {/* AI Assistant Content */}
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 pb-0 space-y-6">
                  {assistantMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4 space-y-4">
                      <div className="p-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full mb-2 opacity-50 shadow-lg shadow-blue-900/50">
                        <Brain className="text-white" size={32} />
                      </div>
                      <p>Ask a question about the meeting, or type "Take a note" to save something to Memory.</p>
                      <div className="flex flex-wrap gap-2 justify-center mt-2">
                        <button onClick={() => setAiInput('Summarize the meeting')} className="bg-[#2a2d33] border border-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-[#3b3d44] transition">Summarize</button>
                        <button onClick={() => setAiInput('What are my tasks?')} className="bg-[#2a2d33] border border-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-[#3b3d44] transition">List Tasks</button>
                        <button onClick={() => setAiInput('Take a note of this screenshot')} className="bg-[#2a2d33] border border-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-[#3b3d44] transition">Screenshot & Note</button>
                      </div>
                    </div>
                  ) : (
                    assistantMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col gap-1 ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {m.sender !== 'Me' && <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-md shadow-blue-500/20">AI</div>}
                          <span className="text-[11px] text-gray-500">{m.sender === 'Me' ? 'You' : m.sender}</span>
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-[14px] max-w-[85%] leading-relaxed shadow-sm ${m.sender === 'Me' ? 'bg-[#3b3d44] text-white rounded-tr-none' : 'bg-[#2a2d33] text-blue-100 rounded-tl-none border border-gray-700'}`}>
                          {m.text}
                          {m.image && <img src={m.image} alt="snapshot" className="mt-2 rounded-lg border border-gray-600 w-full object-cover" />}
                        </div>
                      </div>
                    ))
                  )}
                  {aiIsTyping && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs italic">
                      <div className="w-6 h-6 rounded-full bg-blue-600/50 animate-pulse flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                      Thinking...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4">
                  <form onSubmit={handleAssistantSubmit} className="bg-[#2a2d33] rounded-2xl flex items-center shadow-inner border border-gray-700 focus-within:border-blue-500 transition-colors">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask the AI Assistant..."
                      className="flex-1 bg-transparent border-none outline-none text-[#e2e3e8] py-4 px-5 placeholder-gray-500 text-sm"
                      disabled={aiIsTyping}
                    />
                    <button
                      type="submit"
                      disabled={!aiInput.trim() || aiIsTyping}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl disabled:opacity-30 transition-colors m-2"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Memory Content */}
            {(activeTab === 'memory') && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2a2d33]">
                  <div className="flex items-center gap-3 bg-[#2a2d33] py-2 px-4 rounded-lg focus-within:ring-1 focus-within:ring-emerald-500">
                    <Search size={16} className="text-gray-400" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search past memories..."
                      className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {filteredMemories.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center">
                      <div className="p-4 bg-[#2a2d33] rounded-full mb-3 opacity-50">
                        <CheckSquare className="text-gray-400" size={24} />
                      </div>
                      <p>{searchQuery ? "No memories match your search." : "No memories yet. Ask the AI to take a note!"}</p>
                    </div>
                  ) : (
                    filteredMemories.map((mem) => (
                      <div key={mem.id} className="bg-[#2a2d33] border border-gray-700 p-4 rounded-xl shadow-sm hover:border-gray-500 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                            mem.type === 'snapshot' ? 'bg-indigo-500/20 text-indigo-400' :
                            mem.type === 'task' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {mem.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12}/> {mem.time}</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed mb-2">{mem.text}</p>
                        {mem.image && (
                           <div className="mt-3 rounded-lg overflow-hidden border border-gray-700 relative">
                             <img src={mem.image} alt="Memory Snapshot" className="w-full object-cover" />
                           </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-[#2a2d33] flex justify-center">
                   <button className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors">
                     <Download size={14}/> Export Memory Log
                   </button>
                </div>
              </div>
            )}

            {/* People Content */}
            {activeTab === 'people' && (
              <div className="flex-1 overflow-y-auto p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">In Call</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 px-3 hover:bg-[#2a2d33] rounded-xl cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        You
                      </div>
                      <span className="text-[15px] font-medium text-gray-200">You {isHost ? '(Host)' : ''}</span>
                    </div>
                  </div>
                  {Object.keys(remoteStreams).map(peerId => (
                    <div key={peerId} className="flex items-center justify-between py-2 px-3 hover:bg-[#2a2d33] rounded-xl cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#3b3d44] border border-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold shadow-sm">
                          U
                        </div>
                        <span className="text-[15px] font-medium text-gray-200">Participant</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
