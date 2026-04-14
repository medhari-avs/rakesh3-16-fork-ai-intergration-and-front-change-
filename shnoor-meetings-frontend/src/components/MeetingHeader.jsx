import { Menu, HelpCircle, MessageSquare, Settings, Grid, User, X, Info, Monitor, Mic, Video } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export default function MeetingHeader() {
  const currentTime = format(new Date(), 'HH:mm • EEE, d MMM');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white text-gray-700 border-b border-gray-100 h-16 shadow-sm">
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">S</span>
          </div>
          <span className="text-xl font-medium text-gray-600 tracking-tight">
            Shnoor <span className="font-normal text-gray-500">International LLC</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="text-gray-500 mr-4 font-medium hidden md:block">
          {currentTime}
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600">
            <HelpCircle size={22} />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600">
            <MessageSquare size={22} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
            title="Settings"
          >
            <Settings size={22} />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600">
            <Grid size={22} />
          </button>
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center ml-2 border-2 border-white shadow-sm cursor-pointer">
            <User size={20} className="text-white" />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <Settings className="text-blue-600" size={24} />
                <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Info Section */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Shnoor International LLC Platform</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    Welcome to the secure corporate meeting environment. All connections are encrypted via WebRTC.
                    Current Version: 1.0.4-beta.
                  </p>
                </div>
              </div>

              {/* Mock Devices */}
              <div className="space-y-4">
                <h3 className="text-gray-700 font-medium border-b pb-2">Audio & Video Devices</h3>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Mic className="text-gray-500" size={20} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Default Microphone</div>
                      <div className="text-xs text-gray-500">System Default</div>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 font-medium hover:underline">Change</button>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Video className="text-gray-500" size={20} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Default Camera</div>
                      <div className="text-xs text-gray-500">System Default</div>
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 font-medium hover:underline">Change</button>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Monitor className="text-gray-500" size={20} />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Hardware Acceleration</div>
                      <div className="text-xs text-gray-500">Enabled for better performance</div>
                    </div>
                  </div>
                  <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
