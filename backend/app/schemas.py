from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ParticipantCreate(BaseModel):
    nome: str
    cognome: str
    email: Optional[str] = None
    corso: Optional[str] = None

class ParticipantResponse(BaseModel):
    participant_id: str
    nome: str
    cognome: str
    email: Optional[str]
    corso: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LiveSessionCreate(BaseModel):
    title: Optional[str] = None

class LiveSessionResponse(BaseModel):
    live_id: str
    code: str
    title: Optional[str]
    status: str
    locked: bool
    created_at: datetime

    class Config:
        from_attributes = True

class JoinSessionRequest(BaseModel):
    nome: str
    cognome: str
    email: Optional[str] = None
    corso: Optional[str] = None

class QuestionResponse(BaseModel):
    topic: str
    level: str
    difficulty: int
    question: str
    options: List[str]
    explain_brief: str
    explain_detailed: str
    source_refs: List[str]

class AnswerRequest(BaseModel):
    participant_id: str
    session_code: str
    answer_index: int
    elapsed_ms: int

class AnswerResponse(BaseModel):
    correct: bool
    next_action: str  # "continue", "explanation_required", "finished"
    explanation: Optional[str] = None
    total_served: int
    current_level: str
    theta: int

class ParticipantStatus(BaseModel):
    participant_id: str
    nome: str
    cognome: str
    current_level: str
    theta: int
    total_served: int
    correct_percentage: float
    topic: Optional[str]
