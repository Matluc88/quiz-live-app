from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.models import Base

class SimulatorExercise(Base):
    __tablename__ = "simulator_exercises"
    
    exercise_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    simulator_type = Column(String, nullable=False)  # 'windows10', 'word', 'excel', 'powerpoint'
    difficulty_level = Column(String, nullable=False, default='base')  # 'base', 'medio', 'avanzato'
    max_time_seconds = Column(Integer, default=1800)  # 30 minutes default
    max_attempts = Column(Integer, default=3)
    passing_threshold = Column(Float, default=0.7)  # 70% to pass
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SimulatorStep(Base):
    __tablename__ = "simulator_steps"
    
    step_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exercise_id = Column(String, ForeignKey('simulator_exercises.exercise_id'), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    target_element = Column(String, nullable=False)  # CSS selector or element identifier
    action_type = Column(String, nullable=False)  # 'click', 'double_click', 'right_click', 'type', 'drag', 'key_combo'
    expected_value = Column(String, nullable=True)  # For text input or validation
    success_criteria = Column(JSON, nullable=False)  # Validation rules
    alternative_paths = Column(JSON, nullable=True)  # Alternative valid approaches
    hint_text = Column(Text, nullable=True)
    hint_highlight_selector = Column(String, nullable=True)
    hint_animation_path = Column(JSON, nullable=True)  # Animation coordinates
    points = Column(Integer, default=10)
    is_mandatory = Column(Boolean, default=True)
    timeout_seconds = Column(Integer, default=60)
    
    exercise = relationship("SimulatorExercise")

class SimulatorSession(Base):
    __tablename__ = "simulator_sessions"
    
    session_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    live_id = Column(String, ForeignKey('live_sessions.live_id'), nullable=False)
    exercise_id = Column(String, ForeignKey('simulator_exercises.exercise_id'), nullable=False)
    mode = Column(String, nullable=False)  # 'training', 'exam'
    status = Column(String, nullable=False, default='lobby')  # 'lobby', 'running', 'paused', 'completed'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    exercise = relationship("SimulatorExercise")

class SimulatorProgress(Base):
    __tablename__ = "simulator_progress"
    
    participant_id = Column(String, ForeignKey('participants.participant_id'), primary_key=True)
    session_id = Column(String, ForeignKey('simulator_sessions.session_id'), primary_key=True)
    current_step = Column(Integer, default=1)
    completed_steps = Column(JSON, default=list)  # List of completed step IDs
    total_score = Column(Integer, default=0)
    max_possible_score = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)
    attempts_count = Column(Integer, default=0)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default='not_started')  # 'not_started', 'in_progress', 'completed', 'failed'
    
    participant = relationship("Participant")
    session = relationship("SimulatorSession")

class SimulatorAction(Base):
    __tablename__ = "simulator_actions"
    
    action_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id = Column(String, ForeignKey('participants.participant_id'), nullable=False)
    session_id = Column(String, ForeignKey('simulator_sessions.session_id'), nullable=False)
    step_id = Column(String, ForeignKey('simulator_steps.step_id'), nullable=True)
    action_type = Column(String, nullable=False)  # 'click', 'type', 'key', 'drag', 'focus_loss', 'resize'
    target_element = Column(String, nullable=True)
    coordinates = Column(JSON, nullable=True)  # {x, y} for click/drag actions
    input_value = Column(String, nullable=True)  # For text input
    is_correct = Column(Boolean, nullable=True)
    score_delta = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    latency_ms = Column(Integer, nullable=True)  # Time since last action
    action_metadata = Column(JSON, nullable=True)  # Additional context data
    
    participant = relationship("Participant")
    session = relationship("SimulatorSession")
    step = relationship("SimulatorStep")

class SimulatorHint(Base):
    __tablename__ = "simulator_hints"
    
    hint_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    participant_id = Column(String, ForeignKey('participants.participant_id'), nullable=False)
    step_id = Column(String, ForeignKey('simulator_steps.step_id'), nullable=False)
    hint_level = Column(Integer, nullable=False)  # 1=text, 2=highlight, 3=animation
    penalty_applied = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    participant = relationship("Participant")
    step = relationship("SimulatorStep")
