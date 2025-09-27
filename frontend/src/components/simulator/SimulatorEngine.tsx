import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulatorStep, SimulatorAction, SimulatorActionResponse, SimulatorProgress, SimulatorHint, SimulatorReport } from '../../types/simulator';
import { SimulatorAPI } from '../../services/simulatorApi';

interface SimulatorEngineProps {
  sessionId: string;
  participantId: string;
  mode: 'training' | 'exam';
  onComplete: (report: SimulatorReport) => void;
  onError: (error: string) => void;
  children: (props: SimulatorEngineChildProps) => React.ReactNode;
}

interface SimulatorEngineChildProps {
  currentStep: SimulatorStep | null;
  progress: SimulatorProgress | null;
  recordAction: (action: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => Promise<void>;
  requestHint: (hintLevel: number) => Promise<SimulatorHint | null>;
  feedback: string | null;
  isCorrect: boolean | null;
  showHint: SimulatorHint | null;
  timeRemaining: number;
  isCompleted: boolean;
}

export const SimulatorEngine: React.FC<SimulatorEngineProps> = ({
  sessionId,
  participantId,
  mode,
  onComplete,
  onError,
  children,
}) => {
  const [currentStep, setCurrentStep] = useState<SimulatorStep | null>(null);
  const [progress, setProgress] = useState<SimulatorProgress | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState<SimulatorHint | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [lastActionTime, setLastActionTime] = useState<number>(Date.now());
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      const progressData = await SimulatorAPI.getProgress(sessionId, participantId);
      setProgress(progressData);
      
      if (progressData.status === 'completed') {
        setIsCompleted(true);
        const report = await SimulatorAPI.getReport(sessionId, participantId);
        onComplete(report);
      }
    } catch (error) {
      onError(`Failed to load progress: ${error}`);
    }
  }, [sessionId, participantId, onComplete, onError]);

  const recordAction = useCallback(async (actionData: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => {
    try {
      const now = Date.now();
      const latency = now - lastActionTime;
      
      const action: SimulatorAction = {
        ...actionData,
        participant_id: participantId,
        session_id: sessionId,
        latency_ms: latency,
      };

      const response: SimulatorActionResponse = await SimulatorAPI.recordAction(action);
      
      setLastActionTime(now);
      setIsCorrect(response.is_correct);
      setFeedback(response.feedback_message || null);
      
      if (mode === 'training') {
        setTimeout(() => {
          setFeedback(null);
          setIsCorrect(null);
        }, 3000);
      }
      
      if (response.next_step) {
        setCurrentStep(response.next_step);
        setTimeRemaining(response.next_step.timeout_seconds);
        startStepTimer(response.next_step.timeout_seconds);
      }
      
      if (response.exercise_completed) {
        setIsCompleted(true);
        const report = await SimulatorAPI.getReport(sessionId, participantId);
        onComplete(report);
      }
      
      await loadProgress();
    } catch (error) {
      onError(`Failed to record action: ${error}`);
    }
  }, [sessionId, participantId, mode, lastActionTime, onComplete, onError, loadProgress]);

  const requestHint = useCallback(async (hintLevel: number): Promise<SimulatorHint | null> => {
    if (!currentStep) return null;
    
    try {
      const hint = await SimulatorAPI.requestHint(participantId, currentStep.step_id, hintLevel);
      setShowHint(hint);
      
      setTimeout(() => {
        setShowHint(null);
      }, 10000);
      
      await loadProgress();
      return hint;
    } catch (error) {
      onError(`Failed to request hint: ${error}`);
      return null;
    }
  }, [currentStep, participantId, onError, loadProgress]);

  const startStepTimer = useCallback((seconds: number) => {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
    }
    
    stepTimerRef.current = setTimeout(() => {
      if (mode === 'training') {
        setFeedback('Tempo scaduto per questo step. Prova il prossimo!');
      }
    }, seconds * 1000);
  }, [mode]);

  useEffect(() => {
    loadProgress();
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [loadProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordAction({
          action_type: 'focus_loss',
          action_metadata: { timestamp: Date.now(), type: 'visibility_change' }
        });
      }
    };

    const handleResize = () => {
      recordAction({
        action_type: 'resize',
        coordinates: { x: window.innerWidth, y: window.innerHeight },
        action_metadata: { timestamp: Date.now() }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [recordAction]);

  return (
    <>
      {children({
        currentStep,
        progress,
        recordAction,
        requestHint,
        feedback,
        isCorrect,
        showHint,
        timeRemaining,
        isCompleted,
      })}
    </>
  );
};
