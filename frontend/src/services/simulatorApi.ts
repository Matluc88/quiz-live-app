import { SimulatorExercise, SimulatorStep, SimulatorSession, SimulatorProgress, SimulatorAction, SimulatorActionResponse, SimulatorHint, SimulatorReport } from '../types/simulator';

const API_BASE = 'http://localhost:8000/api/simulator';

export class SimulatorAPI {
  static async createExerciseFromTemplate(simulatorType: string, exerciseName: string): Promise<{ exercise_id: string; message: string }> {
    const response = await fetch(`${API_BASE}/exercises/from-template?simulator_type=${simulatorType}&exercise_name=${exerciseName}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to create exercise: ${response.statusText}`);
    }
    return response.json();
  }

  static async listExercises(simulatorType?: string): Promise<SimulatorExercise[]> {
    const url = simulatorType 
      ? `${API_BASE}/exercises?simulator_type=${simulatorType}`
      : `${API_BASE}/exercises`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to list exercises: ${response.statusText}`);
    }
    return response.json();
  }

  static async getExerciseSteps(exerciseId: string): Promise<SimulatorStep[]> {
    const response = await fetch(`${API_BASE}/exercises/${exerciseId}/steps`);
    if (!response.ok) {
      throw new Error(`Failed to get exercise steps: ${response.statusText}`);
    }
    return response.json();
  }

  static async createSession(liveId: string, exerciseId: string, mode: 'training' | 'exam'): Promise<SimulatorSession> {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        live_id: liveId,
        exercise_id: exerciseId,
        mode: mode,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }
    return response.json();
  }

  static async joinSession(sessionId: string, participantId: string): Promise<{ message: string; progress: Record<string, unknown> }> {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}/join?participant_id=${participantId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to join session: ${response.statusText}`);
    }
    return response.json();
  }

  static async recordAction(action: SimulatorAction): Promise<SimulatorActionResponse> {
    const response = await fetch(`${API_BASE}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action),
    });
    if (!response.ok) {
      throw new Error(`Failed to record action: ${response.statusText}`);
    }
    return response.json();
  }

  static async getProgress(sessionId: string, participantId: string): Promise<SimulatorProgress> {
    const response = await fetch(`${API_BASE}/progress/${sessionId}/${participantId}`);
    if (!response.ok) {
      throw new Error(`Failed to get progress: ${response.statusText}`);
    }
    return response.json();
  }

  static async requestHint(participantId: string, stepId: string, hintLevel: number): Promise<SimulatorHint> {
    const response = await fetch(`${API_BASE}/hints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_id: participantId,
        step_id: stepId,
        hint_level: hintLevel,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to request hint: ${response.statusText}`);
    }
    return response.json();
  }

  static async getReport(sessionId: string, participantId: string): Promise<SimulatorReport> {
    const response = await fetch(`${API_BASE}/report/${sessionId}/${participantId}`);
    if (!response.ok) {
      throw new Error(`Failed to get report: ${response.statusText}`);
    }
    return response.json();
  }
}
