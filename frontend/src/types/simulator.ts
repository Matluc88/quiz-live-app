export interface SimulatorExercise {
  exercise_id: string;
  title: string;
  description?: string;
  simulator_type: 'windows10' | 'word' | 'excel' | 'powerpoint';
  difficulty_level: string;
  max_time_seconds: number;
  max_attempts: number;
  passing_threshold: number;
  created_at: string;
}

export interface SimulatorStep {
  step_id: string;
  exercise_id: string;
  step_number: number;
  title: string;
  description: string;
  target_element: string;
  action_type: 'click' | 'double_click' | 'right_click' | 'type' | 'drag' | 'key_combo';
  expected_value?: string;
  success_criteria: Record<string, unknown>;
  alternative_paths?: Array<Record<string, unknown>>;
  hint_text?: string;
  hint_highlight_selector?: string;
  hint_animation_path?: Array<Record<string, unknown>>;
  points: number;
  is_mandatory: boolean;
  timeout_seconds: number;
}

export interface SimulatorSession {
  session_id: string;
  live_id: string;
  exercise_id: string;
  mode: 'training' | 'exam';
  status: 'lobby' | 'running' | 'paused' | 'completed';
  created_at: string;
}

export interface SimulatorProgress {
  participant_id: string;
  session_id: string;
  current_step: number;
  completed_steps: string[];
  total_score: number;
  max_possible_score: number;
  hints_used: number;
  attempts_count: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completion_percentage: number;
}

export interface SimulatorAction {
  participant_id: string;
  session_id: string;
  step_id?: string;
  action_type: string;
  target_element?: string;
  coordinates?: { x: number; y: number };
  input_value?: string;
  latency_ms?: number;
  action_metadata?: Record<string, unknown>;
}

export interface SimulatorActionResponse {
  action_id: string;
  is_correct: boolean;
  score_delta: number;
  feedback_message?: string;
  next_step?: SimulatorStep;
  exercise_completed: boolean;
  total_score: number;
  hints_available: boolean;
}

export interface SimulatorHint {
  hint_text?: string;
  highlight_selector?: string;
  animation_path?: Array<Record<string, unknown>>;
  penalty_applied: number;
  remaining_hints: number;
}

export interface SimulatorReport {
  participant_id: string;
  participant_name: string;
  exercise_title: string;
  mode: string;
  total_score: number;
  max_possible_score: number;
  completion_percentage: number;
  time_taken_seconds: number;
  hints_used: number;
  attempts_count: number;
  status: string;
  step_breakdown: Array<{
    step_number: number;
    title: string;
    completed: boolean;
    attempts: number;
    score_earned: number;
    max_score: number;
  }>;
  action_replay: Array<{
    timestamp: string;
    action_type: string;
    target_element?: string;
    coordinates?: { x: number; y: number };
    input_value?: string;
    is_correct: boolean;
    score_delta: number;
    latency_ms?: number;
  }>;
}
