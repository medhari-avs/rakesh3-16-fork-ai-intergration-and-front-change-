import { useState, useEffect } from 'react';
import { X, Clock, AlignLeft, Video, Mail, User } from 'lucide-react';
import { format, addHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventModal({ isOpen, onClose, selectedDate, onSave, event = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hostName, setHostName] = useState(() => localStorage.getItem('guest_display_name') || '');
  const [inviteEmailsRaw, setInviteEmailsRaw] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setStartTime(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"));
        setHostName(event.host_name || localStorage.getItem('guest_display_name') || '');
        setInviteEmailsRaw((event.invite_emails || []).join(', '));
      } else {
        setTitle('');
        setDescription('');
        const start = selectedDate ? new Date(selectedDate) : new Date();
        start.setHours(new Date().getHours() + 1, 0, 0, 0);
        const end = addHours(start, 1);
        setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
        setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
        setHostName(localStorage.getItem('guest_display_name') || '');
        setInviteEmailsRaw('');
      }
    }
  }, [isOpen, event, selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const inviteEmails = inviteEmailsRaw
      .split(',')
      .map(s => s.trim())
      .filter(s => s.includes('@'));

    await onSave({
      id: event?.id,
      title: title || '(No title)',
      description,
      start_time: startTime,
      end_time: endTime,
      room_id: event?.room_id || undefined,
      host_name: hostName || 'Host',
      invite_emails: inviteEmails,
    });
    setIsSaving(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-50 bg-white">
              <h3 className="text-xl font-semibold text-gray-800">
                {event ? 'Edit Event' : 'New Event'}
              </h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Event Title</label>
                <input
                  type="text"
                  placeholder="Add title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder-gray-300"
                  autoFocus
                />
              </div>

              {/* Time */}
              <div className="flex items-start gap-4">
                <Clock size={20} className="text-gray-400 mt-8 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none w-full transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none w-full transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Host Name */}
              <div className="flex items-center gap-4">
                <User size={20} className="text-gray-400 shrink-0" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Your Name (Host)</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder-gray-300"
                  />
                </div>
              </div>

              {/* Add Shnoor Meeting */}
              <div className="flex items-center gap-4">
                <Video size={20} className="text-gray-400 shrink-0" />
                <button 
                  type="button"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-3 transform active:scale-95 text-sm"
                >
                  Add Shnoor Meeting Link
                </button>
              </div>

              {/* Invite Emails */}
              <div className="flex items-start gap-4">
                <Mail size={20} className="text-gray-400 mt-2.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                    Invite by Email <span className="normal-case font-normal text-gray-400">(comma-separated)</span>
                  </label>
                  <textarea
                    placeholder="alice@example.com, bob@example.com"
                    value={inviteEmailsRaw}
                    onChange={(e) => setInviteEmailsRaw(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none min-h-[80px] resize-none transition-all placeholder-gray-300"
                  />
                  {inviteEmailsRaw.trim() && (
                    <p className="text-xs text-emerald-600 ml-1">
                      ✉️ {inviteEmailsRaw.split(',').filter(s => s.trim().includes('@')).length} invite email(s) will be sent via Resend
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-4">
                <AlignLeft size={20} className="text-gray-400 mt-2.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    placeholder="Add description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none min-h-[80px] resize-none transition-all placeholder-gray-300"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-10 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xl shadow-blue-100 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
