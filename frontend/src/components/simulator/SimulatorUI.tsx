import React from 'react';
import { SimulatorStep, SimulatorProgress, SimulatorHint } from '../../types/simulator';

interface SimulatorUIProps {
  currentStep: SimulatorStep | null;
  progress: SimulatorProgress | null;
  feedback: string | null;
  isCorrect: boolean | null;
  showHint: SimulatorHint | null;
  timeRemaining: number;
  mode: 'training' | 'exam';
  onRequestHint: (level: number) => void;
  children: React.ReactNode;
}

export const SimulatorUI: React.FC<SimulatorUIProps> = ({
  currentStep,
  progress,
  feedback,
  isCorrect,
  showHint,
  timeRemaining,
  mode,
  onRequestHint,
  children,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="simulator-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="simulator-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div className="step-info">
          {currentStep && (
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Step {currentStep.step_number}: {currentStep.title}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {currentStep.description}
              </p>
            </div>
          )}
        </div>
        
        <div className="progress-info" style={{ textAlign: 'right' }}>
          {progress && (
            <div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                Punteggio: {progress.total_score}/{progress.max_possible_score}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Completamento: {Math.round(progress.completion_percentage)}%
              </div>
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
            ⏱️ {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`feedback-bar ${isCorrect ? 'success' : 'error'}`} style={{
          padding: '12px 20px',
          backgroundColor: isCorrect ? '#d4edda' : '#f8d7da',
          color: isCorrect ? '#155724' : '#721c24',
          borderBottom: `3px solid ${isCorrect ? '#28a745' : '#dc3545'}`,
          fontWeight: '500'
        }}>
          {isCorrect ? '✅' : '❌'} {feedback}
        </div>
      )}

      {showHint && (
        <div className="hint-overlay" style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          background: '#fff3cd',
          border: '2px solid #ffeaa7',
          borderRadius: '8px',
          padding: '16px',
          maxWidth: '300px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#856404' }}>
            💡 Suggerimento (-{showHint.penalty_applied} punti)
          </div>
          {showHint.hint_text && (
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#856404' }}>
              {showHint.hint_text}
            </p>
          )}
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            Suggerimenti rimanenti: {showHint.remaining_hints}
          </div>
        </div>
      )}

      <div className="simulator-content" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>

      {mode === 'training' && currentStep && (
        <div className="hint-controls" style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          zIndex: 1000
        }}>
          <button
            onClick={() => onRequestHint(1)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            💬 Testo
          </button>
          <button
            onClick={() => onRequestHint(2)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔍 Evidenzia
          </button>
          <button
            onClick={() => onRequestHint(3)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎯 Animazione
          </button>
        </div>
      )}
    </div>
  );
};
