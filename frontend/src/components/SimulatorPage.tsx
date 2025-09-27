import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimulatorContainer } from './simulator/SimulatorContainer';
import { SimulatorReport } from '../types/simulator';

export const SimulatorPage: React.FC = () => {
  const { liveId, participantId } = useParams<{ liveId: string; participantId: string }>();
  const navigate = useNavigate();

  const handleComplete = (report: SimulatorReport) => {
    console.log('Simulator completed:', report);
    navigate(`/student/${liveId}`);
  };

  const handleError = (error: string) => {
    console.error('Simulator error:', error);
    alert(`Errore nel simulatore: ${error}`);
    navigate(`/student/${liveId}`);
  };

  if (!liveId || !participantId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Parametri mancanti</h2>
        <p>ID sessione o partecipante non valido.</p>
      </div>
    );
  }

  return (
    <SimulatorContainer
      liveId={liveId}
      participantId={participantId}
      onComplete={handleComplete}
      onError={handleError}
    />
  );
};
