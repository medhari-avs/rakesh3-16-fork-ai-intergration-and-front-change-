# Implementation Plan: Multiplayer Global Chat Tab

The sidebar currently supports `People`, `AI Assistant`, and `Memory`. As requested, we will re-integrate a dedicated **Group Chat** tab situated directly between People and AI Assistant. This tab will serve as the real-time communication hub for all participants in the video call.

## Proposed Changes

### 1. Sidebar Tab Structure
The core right-hand panel header will be updated to support four distinct, compact tabs:
1. **People:** Participant list and host controls.
2. **Chat:** The new multiplayer group chat workspace.
3. **AI:** Your personal, private generative AI assistant.
4. **Memory:** The visual snapshot and transcript timeline.

### 2. Group Chat Interface Design
* **Real-time Syncing:** We will utilize the existing `useWebRTC` hook's `messages` array and `sendChatMessage` function. This leverages the WebRTC DataChannels/WebSockets currently set up, instantly broadcasting text to everyone in the room.
* **UI Components:**
  - A scrollable message history.
  - Distinctly styled text bubbles (blue for "You", dark gray for others).
  - A sticky input bar at the bottom with a paperclip icon (for attachments).

### 3. "Share Context Details and Files"
You mentioned wanting users to be able to share files and context details in this chat. 
* Sending text is natively supported by the current WebSocket architecture.
* However, sending **raw files** (like PDFs or large images) directly through WebRTC signaling WebSocket strings is extremely unstable and often crashes the connection.

## Open Question For You

> [!CAUTION]
> To implement File Sharing realistically, we need to clarify backend support:

1. **File Uploads:** Do you already have a FastAPI backend endpoint built (e.g., `/upload`) that can accept file uploads and return a downloadable URL? 
   * **If YES:** I will build an upload button that sends the file to your backend, gets the URL, and posts the URL in the chat automatically.
   * **If NO:** To keep the application stable right now, should I build the Chat tab for **Text Only** messaging, letting users manually paste URLs to Google Drive/Dropbox links when they want to share files?

Let me know your preference for file sharing and I will build out the new Group Chat tab!
