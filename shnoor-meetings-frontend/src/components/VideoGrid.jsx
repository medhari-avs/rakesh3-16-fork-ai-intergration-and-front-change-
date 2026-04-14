import { useEffect, useRef } from 'react';

function VideoPlayer({ stream, isLocal = false, isHandRaised = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 group flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
      />
      
      {/* Hand Raised Indicator */}
      {isHandRaised && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white p-2 rounded-full shadow-lg animate-bounce border-2 border-yellow-400 z-10">
          <span className="text-xl">✋</span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-lg text-white text-sm font-semibold tracking-wide border border-white/10 shadow-lg">
          {isLocal ? 'You' : 'Participant'}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

export default function VideoGrid({ localStream, remoteStreams, participantsMetadata = {}, localHandRaised = false }) {
  const totalStreams = 1 + Object.keys(remoteStreams).length;
  
  // Dynamic grid configuration
  let gridClass = 'grid-cols-1 max-w-4xl';
  if (totalStreams === 2) gridClass = 'grid-cols-1 md:grid-cols-2 max-w-6xl';
  else if (totalStreams >= 3 && totalStreams <= 4) gridClass = 'grid-cols-2 max-w-6xl';
  else if (totalStreams > 4) gridClass = 'grid-cols-2 lg:grid-cols-3 max-w-7xl';

  return (
    <div className="w-full h-full flex items-center justify-center p-4 overflow-y-auto">
      <div className={`grid gap-6 w-full ${gridClass} mx-auto items-center justify-items-center`}>
        <VideoPlayer 
          stream={localStream} 
          isLocal={true} 
          isHandRaised={localHandRaised}
        />
        
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <VideoPlayer 
            key={peerId} 
            stream={stream} 
            isHandRaised={participantsMetadata[peerId]?.isHandRaised}
          />
        ))}
      </div>
    </div>
  );
}
