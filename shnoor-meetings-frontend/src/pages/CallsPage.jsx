import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreVertical, PhoneOutgoing, Video, Users, Clock, Crown, RefreshCw } from 'lucide-react';
import MeetingHeader from '../components/MeetingHeader';
import MeetingSidebar from '../components/MeetingSidebar';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-orange-500',
  'bg-pink-600', 'bg-teal-600', 'bg-indigo-600', 'bg-rose-600',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CallsPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/meetings/history');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const filtered = history.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.room_id.toLowerCase().includes(q) ||
      m.host_name.toLowerCase().includes(q) ||
      (m.participants || []).some(p => p.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-screen bg-white">
      <MeetingHeader />

      <div className="flex flex-1 overflow-hidden">
        <MeetingSidebar />

        <main className="flex-1 flex flex-col items-center bg-white overflow-y-auto pt-8 px-4 md:px-0">
          {/* Search + Refresh */}
          <div className="w-full max-w-2xl flex items-center gap-3 mb-10">
            <div className="flex-1 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-gray-100 rounded-2xl p-4 flex items-center gap-4 group transition-all hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="text-gray-400 group-focus-within:text-blue-600 transition-colors shrink-0" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by host, participant or room ID..."
                className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium text-sm"
              />
            </div>
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* History Section */}
          <div className="w-full max-w-3xl px-4 pb-12">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
              History {!loading && !error && `· ${filtered.length} meeting${filtered.length !== 1 ? 's' : ''}`}
            </h2>

            {/* Loading Skeleton */}
            {loading && (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="text-center py-16">
                <div className="text-red-400 mb-3 flex justify-center"><PhoneOutgoing size={48} /></div>
                <p className="text-gray-500 font-medium mb-2">Failed to load history</p>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <button onClick={fetchHistory} className="px-5 py-2.5 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="text-gray-200 mb-4 flex justify-center"><Video size={64} /></div>
                <p className="text-gray-400 font-medium">
                  {searchQuery ? 'No meetings match your search' : 'No meetings yet — start your first one!'}
                </p>
              </div>
            )}

            {/* Meeting Cards */}
            {!loading && !error && (
              <div className="space-y-3">
                {filtered.map((meeting) => (
                  <div
                    key={meeting.room_id}
                    className="group flex items-start gap-4 bg-white hover:bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-default"
                  >
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0 ${avatarColor(meeting.host_name)}`}>
                      {initials(meeting.host_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-800 font-semibold truncate">
                          {meeting.host_name}'s Meeting
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          meeting.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {meeting.status}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} /> {formatRelativeTime(meeting.created_at)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Crown size={12} className="text-yellow-500" /> {meeting.host_name}
                        </span>
                        {meeting.participants && meeting.participants.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Users size={12} />
                            <span className="truncate max-w-[200px]">
                              {meeting.participants.slice(0, 3).join(', ')}
                              {meeting.participants.length > 3 && ` +${meeting.participants.length - 3} more`}
                            </span>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-300 mt-1 font-mono truncate">{meeting.room_id}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {meeting.status === 'active' && (
                        <button
                          onClick={() => navigate(`/room/${meeting.room_id}`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow transition-colors"
                        >
                          <Video size={13} /> Rejoin
                        </button>
                      )}
                      <button className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
