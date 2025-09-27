from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SimulatorExerciseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    simulator_type: str  # 'windows10', 'word', 'excel', 'powerpoint'
    difficulty_level: str = 'base'
    max_time_seconds: int = 1800
    max_attempts: int = 3
    passing_threshold: float = 0.7

class SimulatorExerciseResponse(BaseModel):
    exercise_id: str
    title: str
    description: Optional[str]
    simulator_type: str
    difficulty_level: str
    max_time_seconds: int
    max_attempts: int
    passing_threshold: float
    created_at: datetime

    class Config:
        from_attributes = True

class SimulatorStepCreate(BaseModel):
    exercise_id: str
    step_number: int
    title: str
    description: str
    target_element: str
    action_type: str
    expected_value: Optional[str] = None
    success_criteria: Dict[str, Any]
    alternative_paths: Optional[List[Dict[str, Any]]] = None
    hint_text: Optional[str] = None
    hint_highlight_selector: Optional[str] = None
    hint_animation_path: Optional[List[Dict[str, Any]]] = None
    points: int = 10
    is_mandatory: bool = True
    timeout_seconds: int = 60

class SimulatorStepResponse(BaseModel):
    step_id: str
    exercise_id: str
    step_number: int
    title: str
    description: str
    target_element: str
    action_type: str
    expected_value: Optional[str]
    success_criteria: Dict[str, Any]
    alternative_paths: Optional[List[Dict[str, Any]]]
    hint_text: Optional[str]
    hint_highlight_selector: Optional[str]
    hint_animation_path: Optional[List[Dict[str, Any]]]
    points: int
    is_mandatory: bool
    timeout_seconds: int

    class Config:
        from_attributes = True

class SimulatorSessionCreate(BaseModel):
    live_id: str
    exercise_id: str
    mode: str  # 'training', 'exam'

class SimulatorSessionResponse(BaseModel):
    session_id: str
    live_id: str
    exercise_id: str
    mode: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SimulatorActionRequest(BaseModel):
    participant_id: str
    session_id: str
    step_id: Optional[str] = None
    action_type: str
    target_element: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    input_value: Optional[str] = None
    latency_ms: Optional[int] = None
    action_metadata: Optional[Dict[str, Any]] = None

class SimulatorActionResponse(BaseModel):
    action_id: str
    is_correct: bool
    score_delta: int
    feedback_message: Optional[str] = None
    next_step: Optional[SimulatorStepResponse] = None
    exercise_completed: bool = False
    total_score: int
    hints_available: bool = True

class SimulatorProgressResponse(BaseModel):
    participant_id: str
    session_id: str
    current_step: int
    completed_steps: List[str]
    total_score: int
    max_possible_score: int
    hints_used: int
    attempts_count: int
    status: str
    completion_percentage: float

    class Config:
        from_attributes = True

class SimulatorHintRequest(BaseModel):
    participant_id: str
    step_id: str
    hint_level: int  # 1=text, 2=highlight, 3=animation

class SimulatorHintResponse(BaseModel):
    hint_text: Optional[str] = None
    highlight_selector: Optional[str] = None
    animation_path: Optional[List[Dict[str, Any]]] = None
    penalty_applied: int
    remaining_hints: int

class SimulatorReportResponse(BaseModel):
    participant_id: str
    participant_name: str
    exercise_title: str
    mode: str
    total_score: int
    max_possible_score: int
    completion_percentage: float
    time_taken_seconds: int
    hints_used: int
    attempts_count: int
    status: str
    step_breakdown: List[Dict[str, Any]]
    action_replay: List[Dict[str, Any]]
