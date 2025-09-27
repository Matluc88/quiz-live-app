import React, { useState, useEffect } from 'react';
import { SimulatorEngine } from './SimulatorEngine';
import { SimulatorUI } from './SimulatorUI';
import { Windows10Simulator } from './Windows10Simulator';
import { WordSimulator } from './WordSimulator';
import { ExcelSimulator } from './ExcelSimulator';
import { PowerPointSimulator } from './PowerPointSimulator';
import { SimulatorAPI } from '../../services/simulatorApi';
import { SimulatorExercise, SimulatorSession, SimulatorReport } from '../../types/simulator';

interface SimulatorContainerProps {
  liveId: string;
  participantId: string;
  onComplete: (report: SimulatorReport) => void;
  onError: (error: string) => void;
}

export const SimulatorContainer: React.FC<SimulatorContainerProps> = ({
  liveId,
  participantId,
  onComplete,
  onError,
}) => {
  const [exercises, setExercises] = useState<SimulatorExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<SimulatorExercise | null>(null);
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const [mode, setMode] = useState<'training' | 'exam'>('training');
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'selection' | 'simulator'>('selection');

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setIsLoading(true);
      
      const exerciseTypes = ['windows10', 'word', 'excel', 'powerpoint'];
      const exerciseNames = [
        'file_management',
        'document_formatting', 
        'data_analysis',
        'presentation_design'
      ];

      for (let i = 0; i < exerciseTypes.length; i++) {
        try {
          await SimulatorAPI.createExerciseFromTemplate(exerciseTypes[i], exerciseNames[i]);
        } catch (error) {
          console.warn(`Failed to create exercise ${exerciseNames[i]}:`, error);
        }
      }

      const allExercises = await SimulatorAPI.listExercises();
      setExercises(allExercises);
    } catch (error) {
      onError(`Failed to load exercises: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startExercise = async (exercise: SimulatorExercise, selectedMode: 'training' | 'exam') => {
    try {
      setIsLoading(true);
      
      const newSession = await SimulatorAPI.createSession(liveId, exercise.exercise_id, selectedMode);
      await SimulatorAPI.joinSession(newSession.session_id, participantId);
      
      setSession(newSession);
      setSelectedExercise(exercise);
      setMode(selectedMode);
      setCurrentView('simulator');
    } catch (error) {
      onError(`Failed to start exercise: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = (report: SimulatorReport) => {
    setCurrentView('selection');
    setSession(null);
    setSelectedExercise(null);
    onComplete(report);
  };

  const renderSimulator = () => {
    if (!selectedExercise || !session) return null;

    const simulatorProps = {
      sessionId: session.session_id,
      participantId,
      mode,
      onComplete: handleComplete,
      onError,
    };

    return (
      <SimulatorEngine {...simulatorProps}>
        {(engineProps) => (
          <SimulatorUI
            {...engineProps}
            mode={mode}
            onRequestHint={engineProps.requestHint}
          >
            {selectedExercise.simulator_type === 'windows10' && (
              <Windows10Simulator
                recordAction={engineProps.recordAction}
                showHint={engineProps.showHint}
              />
            )}
            {selectedExercise.simulator_type === 'word' && (
              <WordSimulator
                recordAction={engineProps.recordAction}
                showHint={engineProps.showHint}
              />
            )}
            {selectedExercise.simulator_type === 'excel' && (
              <ExcelSimulator
                recordAction={engineProps.recordAction}
                showHint={engineProps.showHint}
              />
            )}
            {selectedExercise.simulator_type === 'powerpoint' && (
              <PowerPointSimulator
                recordAction={engineProps.recordAction}
                showHint={engineProps.showHint}
              />
            )}
          </SimulatorUI>
        )}
      </SimulatorEngine>
    );
  };

  const renderExerciseSelection = () => (
    <div className="exercise-selection" style={{
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          color: '#2c3e50',
          marginBottom: '16px'
        }}>
          Simulatori PEKIT
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#6c757d',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Scegli un esercizio per iniziare la simulazione interattiva. 
          Potrai praticare con interfacce fedeli di Windows 10 e Office.
        </p>
      </div>

      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          fontSize: '18px',
          color: '#6c757d'
        }}>
          Caricamento esercizi...
        </div>
      ) : (
        <div className="exercises-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {exercises.map((exercise) => (
            <div
              key={exercise.exercise_id}
              className="exercise-card"
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #e9ecef',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{
                fontSize: '48px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {exercise.simulator_type === 'windows10' && '🖥️'}
                {exercise.simulator_type === 'word' && '📄'}
                {exercise.simulator_type === 'excel' && '📊'}
                {exercise.simulator_type === 'powerpoint' && '📽️'}
              </div>
              
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px',
                textAlign: 'center',
                color: '#2c3e50'
              }}>
                {exercise.title}
              </h3>
              
              <p style={{
                fontSize: '14px',
                color: '#6c757d',
                marginBottom: '16px',
                textAlign: 'center',
                minHeight: '40px'
              }}>
                {exercise.description || 'Esercizio pratico interattivo'}
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#6c757d'
              }}>
                <span>⏱️ {Math.round(exercise.max_time_seconds / 60)} min</span>
                <span>🎯 {Math.round(exercise.passing_threshold * 100)}%</span>
                <span>🔄 {exercise.max_attempts} tentativi</span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => startExercise(exercise, 'training')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#138496'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
                >
                  🎓 Training
                </button>
                <button
                  onClick={() => startExercise(exercise, 'exam')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                >
                  📝 Esame
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#2c3e50'
        }}>
          ℹ️ Modalità di esercizio
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#17a2b8' }}>
              🎓 Training
            </h4>
            <ul style={{ fontSize: '14px', color: '#6c757d', margin: 0, paddingLeft: '20px' }}>
              <li>Feedback immediato su ogni azione</li>
              <li>Suggerimenti progressivi disponibili</li>
              <li>Nessun limite di tempo rigido</li>
              <li>Ideale per imparare e praticare</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#dc3545' }}>
              📝 Esame
            </h4>
            <ul style={{ fontSize: '14px', color: '#6c757d', margin: 0, paddingLeft: '20px' }}>
              <li>Valutazione finale al completamento</li>
              <li>Suggerimenti limitati con penalità</li>
              <li>Tempo limitato per ogni step</li>
              <li>Modalità di certificazione</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (currentView === 'simulator') {
    return renderSimulator();
  }

  return renderExerciseSelection();
};
