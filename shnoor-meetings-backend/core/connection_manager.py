from typing import Dict, List, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps a room_id to a list of active websocket connections
        # Example: {"room1": [client1, client2], ...}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Keeps track of the user/client id associated with a websocket for a room
        # Example: {"room1": {websocket: "user_1"}}
        self.user_records: Dict[str, Dict[WebSocket, str]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, client_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
            self.user_records[room_id] = {}
            
        self.active_connections[room_id].append(websocket)
        self.user_records[room_id][websocket] = client_id
        
        logger.info(f"Client {client_id} joined room {room_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            
            if websocket in self.user_records.get(room_id, {}):
                del self.user_records[room_id][websocket]
                
            # Clean up empty rooms
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                del self.user_records[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict, sender: WebSocket = None):
        """
        Broadcasts a message to all users in the room, optionally excluding the sender.
        """
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logger.error(f"Error sending message to client: {e}")

manager = ConnectionManager()
