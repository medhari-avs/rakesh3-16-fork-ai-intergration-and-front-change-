# 🤝 Shnoor Meetings — Developer Handoff Document

> Send this entire document to your friend/colleague so they can pick up exactly where you left off.

---

## 📁 Project Overview

**Shnoor Meetings** is a Google Meet–style video conferencing web app built with:
- **Frontend**: React + Vite + TailwindCSS (port 5173)
- **Backend**: Python FastAPI + WebSockets (port 8000)
- **Database**: Supabase (PostgreSQL in the cloud — no local DB needed)
- **AI**: Google Gemini API (in-meeting AI assistant + vision memory)
- **Email**: Resend.com (calendar invite emails)

---

## 🔑 API Keys & Credentials Needed

The new developer needs to fill in / replace these values. All secrets go in:
`shnoor-meetings-backend/.env`

### 1. Supabase Database — ✅ ALREADY SET
```
DATABASE_URL=postgresql://postgres:f%26XxxAyMUja3gTw@db.tasukgcvogwcdkiztpfg.supabase.co:5432/postgres
```
> This is live. The 3 tables (meetings, meeting_participants, calendar_events) are already created on Supabase.

---

### 2. Resend Email API — ✅ ALREADY SET
```
RESEND_API_KEY=re_SxhEATrQ_9xwrx4NJEpW1evoU4AkD4hU8
```
> Used to send calendar invite emails. Works now for testing.  
> ⚠️ **Limitation**: In free mode, can only send to verified email addresses.  
> To send to anyone → verify a custom domain at resend.com/domains.

---

### 3. Google Gemini API Key — ⚠️ NEEDS NEW KEY (quota may be exhausted)

**Location**: `shnoor-meetings-frontend/src/services/geminiService.js` — Line 1:
```js
const API_KEY = 'AIzaSyCDJvrZGqCwGJE38unuSAa7uaN3gmJp4TY'; // Replace with your new key
```

**How to get a new key** (free):
1. Go to https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy and paste it into line 1 above

> Used for: In-meeting AI assistant, meeting summarization, vision/screenshot memory analysis.

---

### 4. App URL (for email invite links)
```
APP_URL=http://localhost:5173
```
> Change this to your deployed URL or ngrok URL when running for someone outside your network.
> Example: `APP_URL=https://abc123.ngrok.io`

---

## ✅ What Is Already Built (Completed Features)

| Feature | Status | Where |
|---|---|---|
| WebRTC video calls (multi-participant) | ✅ Done | `useWebRTC.js` |
| Signaling server (WebSockets) | ✅ Done | `routers/signaling.py` |
| Lobby page with camera/mic preview | ✅ Done | `LobbyPage.jsx` |
| **Guest name field** (required before joining) | ✅ Done | `LobbyPage.jsx` |
| Name is recorded in DB when joining | ✅ Done | `meeting.py → /join` |
| PostgreSQL database (Supabase) | ✅ Done | `core/database.py` |
| Meetings API (create/join/leave/end/history) | ✅ Done | `routers/meeting.py` |
| **Calls page** — real DB history (host, participants, time) | ✅ Done | `CallsPage.jsx` |
| Calendar API | ✅ Done | `routers/calendar.py` |
| Calendar UI (Month/Week/Day views) | ✅ Done | `CalendarPage.jsx` |
| **Email invite sending** via Resend | ✅ Done | `calendar.py → send_invite_emails()` |
| **EventModal** — host name + invite emails fields | ✅ Done | `EventModal.jsx` |
| In-meeting AI assistant (Gemini) | ✅ Done | `MeetingRoom.jsx + geminiService.js` |
| Vision memory (screenshot + AI analysis) | ✅ Done | `MeetingRoom.jsx` |
| Live captions (browser Speech Recognition) | ✅ Done | `MeetingRoom.jsx` |
| Group chat in meeting | ✅ Done | `MeetingRoom.jsx` |
| Screen sharing | ✅ Done | `useWebRTC.js` |
| Raise hand | ✅ Done | `useWebRTC.js` |
| Video effects (filter presets) | ✅ Done | `LobbyPage.jsx` |
| Landing page with "New Meeting" dropdown | ✅ Done | `LandingPage.jsx` |
| Left Meeting page | ✅ Done | `LeftMeetingPage.jsx` |

---

## 🚧 Planned Future Features (Not Yet Built)

These were discussed but intentionally left for later:

### HIGH PRIORITY
1. **User Authentication** — Currently guest mode only (name in localStorage).  
   Plan: Add Supabase Auth or JWT login so users have persistent accounts.

2. **Resend Custom Domain** — Currently can only send emails to verified addresses.  
   Plan: Add a verified domain at resend.com/domains so invites go to any email.

3. **Meeting Recording** — No recording feature yet.  
   Plan: Use MediaRecorder API to record the call and save to Supabase Storage.

4. **Persistent Chat** — Group chat messages disappear when the meeting ends.  
   Plan: Save chat messages to a `meeting_messages` table in Supabase.

### MEDIUM PRIORITY
5. **Faster-Whisper Transcription** — The backend has `transcribe.py` set up but the  
   faster-whisper model may need GPU or take time to load. The browser Speech  
   Recognition API is being used as a fallback right now.  
   Plan: Get a machine with GPU or use a cloud Whisper API instead.

6. **Deployment / Production** — Currently runs only on localhost.  
   Plan: Deploy backend to Render.com/Railway, frontend to Vercel/Netlify,  
   and update `APP_URL` in `.env` + update all `localhost:8000` references to the real URL.

7. **"Rejoin" UX Polish** — Active meetings show a Rejoin button on Calls page.  
   But there's no persistent session tracking (if you close the tab, you're gone).  

8. **Participant names in Meeting Room** — The "People" tab shows "Participant"  
   instead of real names for remote users. Names are in the DB but need to be  
   broadcast via WebSocket signaling so each peer can display the real name.

### LOW PRIORITY / NICE TO HAVE
9. **Calendar → Auto-generate unique room IDs** — When scheduling a meeting,  
   it should auto-generate and save a unique room ID tied to the event, and   
   include that join link in the invite email automatically.

10. **File sharing in chat** — Currently mocks a local blob URL. Files aren't  
    uploaded to a server so recipients can't actually download them.

11. **Push notifications** — No browser notification when someone joins your meeting.

---

## 🏃 How to Run the Project

### Backend
```powershell
cd "shnoor-meetings-backend"
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```powershell
cd "shnoor-meetings-frontend"
npm install
npm run dev
```

Then open: **http://localhost:5173**

---

## 🗂️ File Structure (Key Files)

```
meet/
├── shnoor-meetings-backend/
│   ├── .env                    ← ALL secrets go here (never commit!)
│   ├── main.py                 ← FastAPI app entry point
│   ├── core/
│   │   ├── database.py         ← Supabase PostgreSQL connection + table init
│   │   └── connection_manager.py ← WebSocket room manager
│   └── routers/
│       ├── meeting.py          ← Meetings CRUD + history API
│       ├── calendar.py         ← Calendar events + Resend email invites
│       ├── signaling.py        ← WebRTC signaling (WebSockets)
│       └── transcribe.py       ← Whisper transcription (partially set up)
│
└── shnoor-meetings-frontend/
    └── src/
        ├── services/
        │   └── geminiService.js  ← Gemini API key lives here (line 1)
        ├── hooks/
        │   └── useWebRTC.js      ← Core WebRTC + WebSocket logic
        ├── pages/
        │   ├── LandingPage.jsx   ← Home screen
        │   ├── LobbyPage.jsx     ← Camera preview + name input
        │   ├── MeetingRoom.jsx   ← The actual call room
        │   ├── CallsPage.jsx     ← Meeting history (from DB)
        │   └── CalendarPage.jsx  ← Schedule meetings
        └── components/
            ├── EventModal.jsx    ← Create/edit calendar events + email invites
            └── MeetingControls.jsx ← In-call control bar
```

---

## ⚠️ Important Notes for the New Developer

1. **Never commit `.env`** — It's in `.gitignore`. Contains the DB password and API keys.
2. **The DB is shared** — Supabase is live. Any meetings you create will appear in the real database. Be careful with test data.
3. **Gemini quota** — The free Gemini API key has a daily limit (~1,500 requests/day). If AI stops responding, get a new key from aistudio.google.com/apikey.
4. **Resend email limit** — Free tier: 100 emails/day, 3,000/month. More than enough for development.
5. **WebRTC only works on LAN** — For two people on different networks to call each other, you need a TURN server. Currently works on localhost and same WiFi.
