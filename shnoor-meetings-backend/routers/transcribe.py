import os
import aiofiles
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from faster_whisper import WhisperModel
import asyncio
from core.connection_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize the Whisper model (using smaller model for speed/free usage)
# You can change to 'base' or 'small' if you have more RAM/VRAM
MODEL_SIZE = "tiny"
# Using cpu for broader compatibility. Change to "cuda" if Nvidia GPU is available
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

@router.websocket("/ws/transcribe/{room_id}/{client_id}")
async def websocket_transcribe_endpoint(websocket: WebSocket, room_id: str, client_id: str):
    """
    WebSocket endpoint dedicated to receiving audio blobs,
    transcribing them via Whisper, and broadcasting the captions.
    """
    await websocket.accept()
    logger.info(f"Transcription connection opened for {client_id} in {room_id}")

    try:
        while True:
            # Receive audio chunk as bytes
            audio_bytes = await websocket.receive_bytes()
            
            # Temporary file path (in production use unique IDs or in-memory tempfiles)
            temp_file = f"temp_{client_id}.webm"
            
            async with aiofiles.open(temp_file, "wb") as f:
                await f.write(audio_bytes)

            try:
                # Transcribe the audio
                segments, info = model.transcribe(temp_file, beam_size=5)
                text = " ".join([segment.text for segment in segments]).strip()
                
                if text:
                    # Broadcast the subtitle via the main signaling manager
                    caption_msg = {
                        "type": "caption",
                        "client_id": client_id,
                        "text": text
                    }
                    await manager.broadcast_to_room(room_id, caption_msg)
            except Exception as e:
                logger.error(f"Transcription error: {e}")
            
    except WebSocketDisconnect:
        logger.info(f"Transcription client {client_id} disconnected.")
    except Exception as e:
        logger.error(f"Transcribe websocket error: {e}")
    finally:
        # Cleanup temp file
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except:
                pass
