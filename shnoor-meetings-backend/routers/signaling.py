import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws/{room_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    """
    WebSocket endpoint for handling WebRTC signaling and real-time chat for a specific room.
    """
    await manager.connect(websocket, room_id, client_id)
    
    # Notify other users in the room that a new user joined
    await manager.broadcast_to_room(room_id, {
        "type": "user-joined",
        "client_id": client_id,
        "message": f"User {client_id} joined the meeting"
    }, sender=websocket)

    try:
        while True:
            # We expect JSON payloads containing signaling data (offers, answers, ice candidates)
            # or custom messages (like chat).
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            target_id = data.get("target")

            # Basic structured message forwarding:
            # If target is specified, in a more complex setup you might send it ONLY to the target.
            # Here we broadcast to the room, letting the client-side ignore irrelevant messages.
            # However, for WebRTC it's best if we map target_id to specific websockets.
            # To keep it simple, we will broadcast everyone and include the 'sender' and 'target'.
            
            message_to_send = {
                "type": msg_type,
                "sender": client_id,
                **data
            }
            
            if target_id:
                # Optionally implement direct routing through manager.user_records
                pass

            # Broadcast the WebRTC signaling / Chat to others in the room
            await manager.broadcast_to_room(room_id, message_to_send, sender=websocket)

            # --- AI Chatbot Interception ---
            if msg_type == "chat" and data.get("text", "").lower().startswith("@ai"):
                # Simulate answering as Shnoor AI
                prompt = data.get("text")[3:].strip()
                ai_response_text = f"Beep boop! This is Shnoor AI. You asked: '{prompt}'. (Insert LLM logic here!)"
                
                # Send the response back to EVERYONE in the room (including the sender of the prompt)
                ai_message = {
                    "type": "chat",
                    "sender": "Shnoor AI ✨",
                    "text": ai_response_text
                }
                
                # We broadcast to others
                await manager.broadcast_to_room(room_id, ai_message)
                # And we must explicitly send it to the requesting websocket too since we omitted it in broadcast
                await websocket.send_json(ai_message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        # Notify others that this user left
        await manager.broadcast_to_room(room_id, {
            "type": "user-left",
            "client_id": client_id,
            "message": f"User {client_id} left the meeting"
        })
        logger.info(f"Client {client_id} disconnected from room {room_id}")
    except Exception as e:
        logger.error(f"Error in websocket for client {client_id}: {e}")
        manager.disconnect(websocket, room_id)
