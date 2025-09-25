from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, CheckConstraint, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Participant(Base):
    __tablename__ = "participants"
    
    participant_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, nullable=True)
    corso = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LiveSession(Base):
    __tablename__ = "live_sessions"
    
    live_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=True)
    status = Column(String, nullable=False, default='lobby')
    locked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('lobby','running','paused','ended')", name='check_status'),
    )

class LiveParticipant(Base):
    __tablename__ = "live_participants"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    live_id = Column(String, ForeignKey('live_sessions.live_id'), nullable=False)
    participant_id = Column(String, ForeignKey('participants.participant_id'), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    
    live_session = relationship("LiveSession")
    participant = relationship("Participant")

class ParticipantProgress(Base):
    __tablename__ = "participant_progress"
    
    participant_id = Column(String, ForeignKey('participants.participant_id'), primary_key=True)
    live_id = Column(String, ForeignKey('live_sessions.live_id'), primary_key=True)
    current_level = Column(String, nullable=False, default='base')
    theta = Column(Integer, default=20)
    topic = Column(String, nullable=True)
    correct_streak = Column(Integer, default=0)
    total_served = Column(Integer, default=0)
    
    participant = relationship("Participant")
    live_session = relationship("LiveSession")
    
    __table_args__ = (
        CheckConstraint("current_level IN ('base','medio','avanzato')", name='check_level'),
    )

class ServedQuestion(Base):
    __tablename__ = "served_questions"
    
    participant_id = Column(String, ForeignKey('participants.participant_id'), primary_key=True)
    question_hash = Column(String, primary_key=True)
    question_data = Column(JSON)
    
    participant = relationship("Participant")

class LiveAnswer(Base):
    __tablename__ = "live_answers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    live_id = Column(String, ForeignKey('live_sessions.live_id'), nullable=False)
    participant_id = Column(String, ForeignKey('participants.participant_id'), nullable=False)
    question_json = Column(JSON, nullable=False)
    answer_index = Column(Integer, nullable=True)
    correct = Column(Boolean, nullable=True)
    elapsed_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    live_session = relationship("LiveSession")
    participant = relationship("Participant")
