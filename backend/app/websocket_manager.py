from fastapi import WebSocket
from typing import Dict, List
import json
import uuid

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.participant_connections: Dict[str, WebSocket] = {}
        self.teacher_connections: Dict[str, WebSocket] = {}
        self.session_code_to_live_id: Dict[str, str] = {}
    
    async def connect_participant(self, websocket: WebSocket, session_code: str, participant_id: str):
        await websocket.accept()
        if session_code not in self.active_connections:
            self.active_connections[session_code] = []
        self.active_connections[session_code].append(websocket)
        self.participant_connections[participant_id] = websocket
        print(f"Participant {participant_id} connected to session {session_code}")
    
    async def connect_teacher(self, websocket: WebSocket, live_id: str):
        await websocket.accept()
        self.teacher_connections[live_id] = websocket
        print(f"Teacher connected to session {live_id}")
    
    def disconnect_participant(self, session_code: str, participant_id: str):
        if participant_id in self.participant_connections:
            websocket = self.participant_connections[participant_id]
            if session_code in self.active_connections and websocket in self.active_connections[session_code]:
                self.active_connections[session_code].remove(websocket)
            del self.participant_connections[participant_id]
            print(f"Participant {participant_id} disconnected from session {session_code}")
    
    def disconnect_teacher(self, live_id: str):
        if live_id in self.teacher_connections:
            del self.teacher_connections[live_id]
            print(f"Teacher disconnected from session {live_id}")
    
    async def send_to_participant(self, participant_id: str, message: dict):
        if participant_id in self.participant_connections:
            websocket = self.participant_connections[participant_id]
            try:
                await websocket.send_text(json.dumps(message))
                print(f"Sent message to participant {participant_id}: {message['type']}")
            except Exception as e:
                print(f"Failed to send message to participant {participant_id}: {e}")
                del self.participant_connections[participant_id]
    
    async def send_to_teacher(self, live_id: str, message: dict):
        if live_id in self.teacher_connections:
            websocket = self.teacher_connections[live_id]
            try:
                await websocket.send_text(json.dumps(message))
                print(f"Sent message to teacher {live_id}: {message['type']}")
            except Exception as e:
                print(f"Failed to send message to teacher {live_id}: {e}")
                del self.teacher_connections[live_id]
    
    async def broadcast_to_session(self, live_id: str, message: dict, session_code: str | None = None):
        await self.send_to_teacher(live_id, message)
        
        if session_code and session_code in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_code]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Failed to broadcast to participant: {e}")
                    disconnected.append(connection)
            
            for connection in disconnected:
                self.active_connections[session_code].remove(connection)
            
            print(f"Broadcasted {message['type']} to {len(self.active_connections[session_code])} participants in session {session_code}")
        else:
            print(f"No session code provided or no participants in session {session_code}")

manager = ConnectionManager()
