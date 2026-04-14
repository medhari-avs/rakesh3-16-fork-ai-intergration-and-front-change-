import { Search, MoreVertical, PhoneIncoming, PhoneOutgoing, User } from 'lucide-react';
import MeetingHeader from '../components/MeetingHeader';
import MeetingSidebar from '../components/MeetingSidebar';

const CALL_HISTORY = [
  { id: 1, name: '+91 75696 76233', type: 'outgoing', time: '0 minutes ago', avatar: null },
  { id: 2, name: 'Satyajit Ray', type: 'incoming', time: '2 hours ago', avatar: 'SR' },
  { id: 3, name: '+91 99887 76655', type: 'missed', time: 'Yesterday', avatar: null },
  { id: 4, name: 'Project Sync', type: 'outgoing', time: '2 days ago', avatar: 'PS' },
];

export default function CallsPage() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <MeetingHeader />
      
      <div className="flex flex-1 overflow-hidden">
        <MeetingSidebar />
        
        <main className="flex-1 flex flex-col items-center bg-white overflow-y-auto pt-8 px-4 md:px-0">
          {/* Search Bar Area */}
          <div className="w-full max-w-2xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 rounded-2xl p-4 mb-12 flex items-center gap-4 group transition-all hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="text-gray-400 group-focus-within:text-blue-600 transition-colors" size={24} />
            <input 
              type="text" 
              placeholder="Search contacts or dial a number" 
              className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium"
            />
          </div>

          {/* History Section */}
          <div className="w-full max-w-3xl px-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">History</h2>
            
            <div className="space-y-3">
              {CALL_HISTORY.map((call) => (
                <div 
                  key={call.id} 
                  className="flex items-center gap-4 bg-white hover:bg-gray-50 p-4 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                    call.avatar ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    {call.avatar || <User size={24} />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-gray-800 font-semibold">{call.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {call.type === 'incoming' && <PhoneIncoming size={14} className="text-emerald-500" />}
                      {call.type === 'outgoing' && <PhoneOutgoing size={14} className="text-blue-500" />}
                      {call.type === 'missed' && <PhoneIncoming size={14} className="text-red-500" />}
                      <span className="text-xs text-gray-400 font-medium capitalize">
                        {call.type} call • {call.time}
                      </span>
                    </div>
                  </div>
                  
                  <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={20} />
                  </button>
                </div>
              ))}
            </div>
            
            {CALL_HISTORY.length === 0 && (
              <div className="text-center py-20">
                <div className="text-gray-300 mb-4 flex justify-center">
                  <PhoneOutgoing size={64} />
                </div>
                <p className="text-gray-400 font-medium">No recent call history</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
