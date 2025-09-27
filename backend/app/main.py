from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
import random
import string
import uuid
import asyncio
import os
import PyPDF2
from openai import OpenAI
import json

from app.database import get_db, create_tables
from app.models import LiveSession, Participant, LiveParticipant, ParticipantProgress, ServedQuestion, LiveAnswer, SessionQuestion
from app.schemas import LiveSessionCreate, LiveSessionResponse, ParticipantCreate, ParticipantResponse, JoinSessionRequest, QuestionResponse, AnswerRequest, AnswerResponse, ParticipantStatus, PDFUploadResponse
from app.question_service import question_service
from app.websocket_manager import manager
from app.simulator_schemas import (
    SimulatorExerciseCreate, SimulatorExerciseResponse, SimulatorStepResponse,
    SimulatorSessionCreate, SimulatorSessionResponse, SimulatorActionRequest, 
    SimulatorActionResponse, SimulatorProgressResponse, SimulatorHintRequest,
    SimulatorHintResponse, SimulatorReportResponse
)
from app.simulator_models import (
    SimulatorExercise, SimulatorStep, SimulatorSession, SimulatorProgress,
    SimulatorAction, SimulatorHint
)
from app.simulator_service import simulator_service

app = FastAPI(title="Quiz Live API", version="1.0.0")

create_tables()

openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key and openai_api_key != "your_openai_api_key_here":
    openai_client = OpenAI(api_key=openai_api_key)
else:
    openai_client = None
    print("Warning: OpenAI API key not configured. PDF upload functionality will be disabled.")

os.makedirs("uploads", exist_ok=True)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

async def _send_question_to_new_participant(participant_id: str, question_data: dict, question_number: int):
    """Send question to new participant with delay to ensure WebSocket is ready"""
    await asyncio.sleep(1)
    try:
        await manager.send_to_participant(participant_id, {
            "type": "round.start",
            "question": question_data,
            "timer": 30,
            "question_number": question_number
        })
        print(f"Sent delayed question to new participant {participant_id}")
    except Exception as e:
        print(f"Failed to send delayed question to participant {participant_id}: {e}")

def generate_session_code() -> str:
    """Generate a 6-digit session code"""
    return ''.join(random.choices(string.digits, k=6))

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/live/{live_id}/details", response_model=LiveSessionResponse)
async def get_session_details(live_id: str, db: Session = Depends(get_db)):
    """Get session details including code"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return live_session

@app.post("/api/live/create", response_model=LiveSessionResponse)
async def create_live_session(session_data: LiveSessionCreate, db: Session = Depends(get_db)):
    """Create a new live session"""
    code = generate_session_code()
    
    while db.query(LiveSession).filter(LiveSession.code == code).first():
        code = generate_session_code()
    
    live_session = LiveSession(
        code=code,
        title=session_data.title,
        status='lobby'
    )
    
    db.add(live_session)
    db.commit()
    db.refresh(live_session)
    
    return live_session

@app.post("/api/live/{code}/join", response_model=ParticipantResponse)
async def join_live_session(code: str, join_data: JoinSessionRequest, db: Session = Depends(get_db)):
    """Join a live session with participant data"""
    live_session = db.query(LiveSession).filter(LiveSession.code == code).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if live_session.locked:
        raise HTTPException(status_code=403, detail="Session is locked")
    
    if live_session.status not in ['lobby', 'running']:
        raise HTTPException(status_code=400, detail="Session is not accepting participants")
    
    participant = Participant(
        nome=join_data.nome,
        cognome=join_data.cognome,
        email=join_data.email,
        corso=join_data.corso
    )
    
    db.add(participant)
    db.commit()
    db.refresh(participant)
    
    live_participant = LiveParticipant(
        live_id=live_session.live_id,
        participant_id=participant.participant_id
    )
    
    db.add(live_participant)
    
    progress = ParticipantProgress(
        participant_id=participant.participant_id,
        live_id=live_session.live_id,
        current_level='base',
        theta=20,
        topic=None,
        correct_streak=0,
        total_served=0
    )
    
    db.add(progress)
    db.commit()
    
    participants = db.query(Participant).join(LiveParticipant).filter(
        LiveParticipant.live_id == live_session.live_id
    ).all()
    
    await manager.broadcast_to_session(str(live_session.live_id), {
        "type": "lobby.update",
        "participants": [
            {
                "participant_id": str(p.participant_id),
                "nome": p.nome,
                "cognome": p.cognome
            } for p in participants
        ]
    })
    
    # If session is running, send question immediately to new participant
    if live_session.status == 'running':
        served = db.query(ServedQuestion).filter(
            ServedQuestion.participant_id == participant.participant_id
        ).all()
        served_hashes = [sq.question_hash for sq in served]
        
        question = question_service.get_next_question(
            level=progress.current_level,
            topic=progress.topic,
            served_hashes=served_hashes,
            live_id=live_session.live_id,
            db_session=db
        )
        
        if question:
            question_hash = question_service.get_question_hash(question)
            served_question = ServedQuestion(
                participant_id=participant.participant_id,
                question_hash=question_hash,
                question_data=question.dict()
            )
            db.add(served_question)
            
            progress.total_served += 1
            if not progress.topic:
                progress.topic = question.topic
            
            db.commit()
            
            question_data = question.dict()
            question_data.pop('answer_index', None)
            
            import asyncio
            asyncio.create_task(_send_question_to_new_participant(
                str(participant.participant_id), question_data, progress.total_served
            ))
    
    return participant

@app.post("/api/live/{live_id}/lock")
async def lock_session(live_id: str, db: Session = Depends(get_db)):
    """Lock a session to prevent new participants"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    live_session.locked = True
    db.commit()
    
    return {"status": "locked"}

@app.post("/api/live/{live_id}/start")
async def start_session(live_id: str, db: Session = Depends(get_db)):
    """Start a live session with countdown"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    live_session.status = 'running'
    db.commit()
    
    # Broadcast countdown to all participants
    await manager.broadcast_to_session(live_id, {
        "type": "live.start",
        "countdown": 5
    }, session_code=live_session.code)
    
    await asyncio.sleep(5)
    
    participants = db.query(LiveParticipant).filter(LiveParticipant.live_id == live_id).all()
    
    for lp in participants:
        progress = db.query(ParticipantProgress).filter(
            ParticipantProgress.participant_id == lp.participant_id,
            ParticipantProgress.live_id == live_id
        ).first()
        
        if progress and progress.total_served < 50:
            served = db.query(ServedQuestion).filter(
                ServedQuestion.participant_id == lp.participant_id
            ).all()
            served_hashes = [sq.question_hash for sq in served]
            
            question = question_service.get_next_question(
                level=progress.current_level,
                topic=progress.topic,
                served_hashes=served_hashes,
                live_id=live_id,
                db_session=db
            )
            
            if question:
                question_hash = question_service.get_question_hash(question)
                served_question = ServedQuestion(
                    participant_id=lp.participant_id,
                    question_hash=question_hash,
                    question_data=question.dict()  # Store full question data
                )
                db.add(served_question)
                
                progress.total_served += 1
                if not progress.topic:
                    progress.topic = question.topic
                
                db.commit()
                
                question_data = question.dict()
                question_data.pop('answer_index', None)  # Remove correct answer
                
                try:
                    await manager.send_to_participant(str(lp.participant_id), {
                        "type": "round.start",
                        "question": question_data,
                        "timer": 30,
                        "question_number": progress.total_served
                    })
                    print(f"Sent question to participant {lp.participant_id}")
                except Exception as e:
                    print(f"Failed to send question to participant {lp.participant_id}: {e}")
    
    return {"status": "started"}

@app.post("/api/live/{live_id}/pause")
async def pause_session(live_id: str, db: Session = Depends(get_db)):
    """Pause a live session"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    live_session.status = 'paused'
    db.commit()
    
    await manager.broadcast_to_session(live_id, {
        "type": "live.pause"
    })
    
    return {"status": "paused"}

@app.post("/api/live/{live_id}/resume")
async def resume_session(live_id: str, db: Session = Depends(get_db)):
    """Resume a paused session"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    live_session.status = 'running'
    db.commit()
    
    await manager.broadcast_to_session(live_id, {
        "type": "live.resume"
    })
    
    return {"status": "resumed"}

@app.post("/api/live/{live_id}/end")
async def end_session(live_id: str, db: Session = Depends(get_db)):
    """End a live session"""
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    live_session.status = 'ended'
    db.commit()
    
    participants = db.query(Participant).join(LiveParticipant).filter(
        LiveParticipant.live_id == live_id
    ).all()
    
    report_data = []
    for participant in participants:
        answers = db.query(LiveAnswer).filter(
            LiveAnswer.live_id == live_id,
            LiveAnswer.participant_id == participant.participant_id
        ).all()
        
        total_answers = len(answers)
        correct_answers = len([a for a in answers if a.correct])
        percentage = (correct_answers / total_answers * 100) if total_answers > 0 else 0
        
        progress = db.query(ParticipantProgress).filter(
            ParticipantProgress.participant_id == participant.participant_id,
            ParticipantProgress.live_id == live_id
        ).first()
        
        report_data.append({
            "participant_id": str(participant.participant_id),
            "nome": participant.nome,
            "cognome": participant.cognome,
            "total_questions": total_answers,
            "correct_answers": correct_answers,
            "percentage": round(percentage, 1),
            "final_level": progress.current_level if progress else "base",
            "final_theta": progress.theta if progress else 20
        })
    
    await manager.broadcast_to_session(live_id, {
        "type": "live.end",
        "report": report_data
    })
    
    return {"status": "ended", "report": report_data}

@app.post("/api/session/next", response_model=QuestionResponse)
async def get_next_question(participant_id: str, session_code: str, db: Session = Depends(get_db)):
    """Get next adaptive question for a participant"""
    live_session = db.query(LiveSession).filter(LiveSession.code == session_code).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    progress = db.query(ParticipantProgress).filter(
        ParticipantProgress.participant_id == participant_id,
        ParticipantProgress.live_id == live_session.live_id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Participant progress not found")
    
    if progress.total_served >= 50:
        raise HTTPException(status_code=400, detail="Maximum questions reached")
    
    served = db.query(ServedQuestion).filter(
        ServedQuestion.participant_id == participant_id
    ).all()
    served_hashes = [sq.question_hash for sq in served]
    
    question = question_service.get_next_question(
        level=progress.current_level,
        topic=progress.topic,
        served_hashes=served_hashes,
        live_id=live_session.live_id,
        db_session=db
    )
    
    if not question:
        raise HTTPException(status_code=404, detail="No more questions available")
    
    question_hash = question_service.get_question_hash(question)
    served_question = ServedQuestion(
        participant_id=participant_id,
        question_hash=question_hash,
        question_data=question.dict()  # Store full question data
    )
    db.add(served_question)
    
    progress.total_served += 1
    if not progress.topic:
        progress.topic = question.topic
    
    db.commit()
    
    return question

@app.post("/api/session/answer", response_model=AnswerResponse)
async def submit_answer(answer_data: AnswerRequest, db: Session = Depends(get_db)):
    """Submit answer and get adaptive response"""
    live_session = db.query(LiveSession).filter(LiveSession.code == answer_data.session_code).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    progress = db.query(ParticipantProgress).filter(
        ParticipantProgress.participant_id == answer_data.participant_id,
        ParticipantProgress.live_id == live_session.live_id
    ).first()
    
    if not progress:
        raise HTTPException(status_code=404, detail="Participant progress not found")
    
    served = db.query(ServedQuestion).filter(
        ServedQuestion.participant_id == answer_data.participant_id
    ).order_by(ServedQuestion.question_hash.desc()).first()
    
    if not served:
        raise HTTPException(status_code=400, detail="No question to answer")
    
    # Validate the answer against the stored question data
    question_data = served.question_data
    correct_answer_index = question_data.get('answer_index', 0)
    is_correct = answer_data.answer_index == correct_answer_index
    
    live_answer = LiveAnswer(
        live_id=live_session.live_id,
        participant_id=answer_data.participant_id,
        question_json={"simplified": "demo"},  # Would store full question
        answer_index=answer_data.answer_index,
        correct=is_correct,
        elapsed_ms=answer_data.elapsed_ms
    )
    
    db.add(live_answer)
    
    if is_correct:
        progress.correct_streak += 1
        progress.theta = min(100, progress.theta + 5)
        
        if progress.correct_streak >= 2:
            if progress.current_level == 'base':
                progress.current_level = 'medio'
            elif progress.current_level == 'medio':
                progress.current_level = 'avanzato'
            progress.correct_streak = 0
    else:
        progress.correct_streak = 0
        progress.theta = max(0, progress.theta - 3)
    
    db.commit()
    
    next_action = "continue"
    explanation = None
    
    if not is_correct:
        next_action = "explanation_required"
        explanation = "Risposta errata. Leggi la spiegazione dettagliata prima di continuare."
    
    if progress.total_served >= 50:
        next_action = "finished"
    
    answers = db.query(LiveAnswer).filter(
        LiveAnswer.participant_id == answer_data.participant_id,
        LiveAnswer.live_id == live_session.live_id
    ).all()
    
    total_answers = len(answers)
    correct_answers = len([a for a in answers if a.correct])
    correct_percentage = (correct_answers / total_answers * 100) if total_answers > 0 else 0
    
    return AnswerResponse(
        correct=is_correct,
        next_action=next_action,
        explanation=explanation,
        total_served=progress.total_served,
        current_level=progress.current_level,
        theta=progress.theta
    )

@app.get("/api/live/{live_id}/participants", response_model=List[ParticipantStatus])
async def get_participants_status(live_id: str, db: Session = Depends(get_db)):
    """Get status of all participants in a session"""
    participants = db.query(Participant).join(LiveParticipant).filter(
        LiveParticipant.live_id == live_id
    ).all()
    
    status_list = []
    for participant in participants:
        progress = db.query(ParticipantProgress).filter(
            ParticipantProgress.participant_id == participant.participant_id,
            ParticipantProgress.live_id == live_id
        ).first()
        
        answers = db.query(LiveAnswer).filter(
            LiveAnswer.participant_id == participant.participant_id,
            LiveAnswer.live_id == live_id
        ).all()
        
        total_answers = len(answers)
        correct_answers = len([a for a in answers if a.correct])
        correct_percentage = (correct_answers / total_answers * 100) if total_answers > 0 else 0
        
        status_list.append(ParticipantStatus(
            participant_id=participant.participant_id,
            nome=participant.nome,
            cognome=participant.cognome,
            current_level=progress.current_level if progress else "base",
            theta=progress.theta if progress else 20,
            total_served=progress.total_served if progress else 0,
            correct_percentage=round(correct_percentage, 1),
            topic=progress.topic if progress else None
        ))
    
    return status_list

@app.websocket("/ws/participant/{session_code}/{participant_id}")
async def websocket_participant(websocket: WebSocket, session_code: str, participant_id: str):
    await manager.connect_participant(websocket, session_code, participant_id)
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        manager.disconnect_participant(session_code, participant_id)

@app.websocket("/ws/teacher/{live_id}")
async def websocket_teacher(websocket: WebSocket, live_id: str):
    await manager.connect_teacher(websocket, live_id)
    try:
        while True:
            data = await websocket.receive_text()
            pass
    except WebSocketDisconnect:
        manager.disconnect_teacher(live_id)

@app.post("/api/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...), live_id: str = Form(...), db: Session = Depends(get_db)):
    """Upload PDF and generate questions using OpenAI"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File size too large (max 10MB)")
    
    live_session = db.query(LiveSession).filter(LiveSession.live_id == live_id).first()
    if not live_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        pdf_text = ""
        with open(file_path, "rb") as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            for page in pdf_reader.pages:
                pdf_text += page.extract_text() + "\n"
        
        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        prompt = f"""
Analizza il seguente testo e genera domande quiz in formato JSON. 
Crea domande di diversi livelli di difficoltà (base, medio, avanzato) e identifica i topic principali.

Formato richiesto per ogni domanda:
{{
    "topic": "nome del topic",
    "level": "base|medio|avanzato", 
    "difficulty": 1-3,
    "question": "testo della domanda",
    "options": ["A. opzione1", "B. opzione2", "C. opzione3", "D. opzione4"],
    "answer_index": 0-3,
    "explain_brief": "spiegazione breve",
    "explain_detailed": "spiegazione dettagliata",
    "source_refs": ["riferimento_al_documento"]
}}

Genera almeno 10 domande distribuite sui diversi livelli.

Testo da analizzare:
{pdf_text[:4000]}
"""
        
        if openai_client is None:
            raise HTTPException(status_code=503, detail="OpenAI API not configured. PDF upload functionality is disabled.")
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sei un esperto nella creazione di quiz educativi. Genera domande accurate e ben strutturate."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        questions_text = response.choices[0].message.content
        
        import re
        json_match = re.search(r'\[.*\]', questions_text, re.DOTALL)
        if json_match:
            questions_json = json_match.group()
            questions = json.loads(questions_json)
        else:
            questions = json.loads(questions_text)
        
        topics_added = set()
        questions_added = 0
        
        for question in questions:
            level = question.get('level', 'base')
            topic = question.get('topic', 'Generale')
            
            question_hash = question_service.generate_question_hash(question)
            
            session_question = SessionQuestion(
                live_id=live_session.live_id,
                question_data=question,
                question_hash=question_hash,
                level=level,
                topic=topic
            )
            
            db.add(session_question)
            topics_added.add(topic)
            questions_added += 1
        
        db.commit()
        
        os.remove(file_path)
        
        return PDFUploadResponse(
            filename=file.filename,
            questions_generated=questions_added,
            topics=list(topics_added),
            message=f"Successfully generated {questions_added} questions from {file.filename}"
        )
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error parsing OpenAI response")
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.post("/api/simulator/exercises", response_model=SimulatorExerciseResponse)
async def create_simulator_exercise(exercise: SimulatorExerciseCreate, db: Session = Depends(get_db)):
    """Create a new simulator exercise"""
    try:
        db_exercise = SimulatorExercise(**exercise.dict())
        db.add(db_exercise)
        db.commit()
        db.refresh(db_exercise)
        return db_exercise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/simulator/exercises", response_model=List[SimulatorExerciseResponse])
async def list_simulator_exercises(simulator_type: Optional[str] = None, db: Session = Depends(get_db)):
    """List all simulator exercises, optionally filtered by type"""
    try:
        query = db.query(SimulatorExercise)
        if simulator_type:
            query = query.filter(SimulatorExercise.simulator_type == simulator_type)
        exercises = query.all()
        return exercises
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulator/exercises/from-template")
async def create_exercise_from_template(
    simulator_type: str, 
    exercise_name: str, 
    db: Session = Depends(get_db)
):
    """Create an exercise from predefined template"""
    try:
        exercise_id = simulator_service.create_exercise_from_template(db, simulator_type, exercise_name)
        if not exercise_id:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"exercise_id": exercise_id, "message": "Exercise created from template"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/simulator/exercises/{exercise_id}/steps", response_model=List[SimulatorStepResponse])
async def get_exercise_steps(exercise_id: str, db: Session = Depends(get_db)):
    """Get all steps for an exercise"""
    try:
        steps = db.query(SimulatorStep).filter(
            SimulatorStep.exercise_id == exercise_id
        ).order_by(SimulatorStep.step_number).all()
        return steps
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulator/sessions", response_model=SimulatorSessionResponse)
async def create_simulator_session(session: SimulatorSessionCreate, db: Session = Depends(get_db)):
    """Create a new simulator session"""
    try:
        live_session = db.query(LiveSession).filter(LiveSession.live_id == session.live_id).first()
        if not live_session:
            raise HTTPException(status_code=404, detail="Live session not found")
        
        exercise = db.query(SimulatorExercise).filter(SimulatorExercise.exercise_id == session.exercise_id).first()
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")
        
        db_session = SimulatorSession(**session.dict())
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/simulator/sessions/{session_id}", response_model=SimulatorSessionResponse)
async def get_simulator_session(session_id: str, db: Session = Depends(get_db)):
    """Get simulator session details"""
    try:
        session = db.query(SimulatorSession).filter(SimulatorSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulator/sessions/{session_id}/join")
async def join_simulator_session(session_id: str, participant_id: str, db: Session = Depends(get_db)):
    """Join a participant to a simulator session"""
    try:
        session = db.query(SimulatorSession).filter(SimulatorSession.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        participant = db.query(Participant).filter(Participant.participant_id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.session_id == session_id,
            SimulatorProgress.participant_id == participant_id
        ).first()
        
        if not progress:
            exercise = db.query(SimulatorExercise).filter(SimulatorExercise.exercise_id == session.exercise_id).first()
            steps = db.query(SimulatorStep).filter(SimulatorStep.exercise_id == session.exercise_id).all()
            max_score = sum(step.points for step in steps)
            
            progress = SimulatorProgress(
                participant_id=participant_id,
                session_id=session_id,
                max_possible_score=max_score,
                start_time=datetime.utcnow()
            )
            db.add(progress)
            db.commit()
        
        return {"message": "Joined simulator session successfully", "progress": progress}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulator/actions", response_model=SimulatorActionResponse)
async def record_simulator_action(action: SimulatorActionRequest, db: Session = Depends(get_db)):
    """Record and evaluate a simulator action"""
    try:
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.session_id == action.session_id,
            SimulatorProgress.participant_id == action.participant_id
        ).first()
        
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found")
        
        session = db.query(SimulatorSession).filter(SimulatorSession.session_id == action.session_id).first()
        current_step = db.query(SimulatorStep).filter(
            SimulatorStep.exercise_id == session.exercise_id,
            SimulatorStep.step_number == progress.current_step
        ).first()
        
        # Validate action
        is_correct = False
        score_delta = 0
        feedback = "Action recorded"
        
        if current_step:
            is_correct, score_delta, feedback = simulator_service.validate_action(
                db, action.dict(), current_step
            )
        
        db_action = SimulatorAction(
            participant_id=action.participant_id,
            session_id=action.session_id,
            step_id=current_step.step_id if current_step else None,
            action_type=action.action_type,
            target_element=action.target_element,
            coordinates=action.coordinates,
            input_value=action.input_value,
            is_correct=is_correct,
            score_delta=score_delta,
            latency_ms=action.latency_ms,
            action_metadata=action.action_metadata
        )
        db.add(db_action)
        
        if is_correct and current_step:
            progress.total_score += score_delta
            progress.completed_steps = progress.completed_steps or []
            if current_step.step_id not in progress.completed_steps:
                progress.completed_steps.append(current_step.step_id)
            progress.current_step += 1
        
        db.commit()
        
        next_step = simulator_service.get_next_step(db, action.session_id, action.participant_id)
        exercise_completed = next_step is None
        
        if exercise_completed:
            progress.status = "completed"
            progress.end_time = datetime.utcnow()
            db.commit()
        
        return SimulatorActionResponse(
            action_id=db_action.action_id,
            is_correct=is_correct,
            score_delta=score_delta,
            feedback_message=feedback,
            next_step=next_step,
            exercise_completed=exercise_completed,
            total_score=progress.total_score,
            hints_available=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/simulator/progress/{session_id}/{participant_id}", response_model=SimulatorProgressResponse)
async def get_simulator_progress(session_id: str, participant_id: str, db: Session = Depends(get_db)):
    """Get participant progress in simulator session"""
    try:
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.session_id == session_id,
            SimulatorProgress.participant_id == participant_id
        ).first()
        
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found")
        
        completion_percentage = 0
        if progress.max_possible_score > 0:
            completion_percentage = (progress.total_score / progress.max_possible_score) * 100
        
        return SimulatorProgressResponse(
            participant_id=progress.participant_id,
            session_id=progress.session_id,
            current_step=progress.current_step,
            completed_steps=progress.completed_steps or [],
            total_score=progress.total_score,
            max_possible_score=progress.max_possible_score,
            hints_used=progress.hints_used,
            attempts_count=progress.attempts_count,
            status=progress.status,
            completion_percentage=completion_percentage
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulator/hints", response_model=SimulatorHintResponse)
async def request_simulator_hint(hint_request: SimulatorHintRequest, db: Session = Depends(get_db)):
    """Request a hint for current step"""
    try:
        step = db.query(SimulatorStep).filter(SimulatorStep.step_id == hint_request.step_id).first()
        if not step:
            raise HTTPException(status_code=404, detail="Step not found")
        
        penalty = simulator_service.apply_hint_penalty(hint_request.hint_level)
        
        hint = SimulatorHint(
            participant_id=hint_request.participant_id,
            step_id=hint_request.step_id,
            hint_level=hint_request.hint_level,
            penalty_applied=penalty
        )
        db.add(hint)
        
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.participant_id == hint_request.participant_id
        ).first()
        if progress:
            progress.hints_used += 1
            progress.total_score = max(0, progress.total_score - penalty)
        
        db.commit()
        
        hint_response = SimulatorHintResponse(
            penalty_applied=penalty,
            remaining_hints=3 - progress.hints_used if progress else 3
        )
        
        if hint_request.hint_level >= 1:
            hint_response.hint_text = step.hint_text
        if hint_request.hint_level >= 2:
            hint_response.highlight_selector = step.hint_highlight_selector
        if hint_request.hint_level >= 3:
            hint_response.animation_path = step.hint_animation_path
        
        return hint_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/simulator/report/{session_id}/{participant_id}", response_model=SimulatorReportResponse)
async def get_simulator_report(session_id: str, participant_id: str, db: Session = Depends(get_db)):
    """Generate comprehensive report for participant's simulator session"""
    try:
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.session_id == session_id,
            SimulatorProgress.participant_id == participant_id
        ).first()
        
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found")
        
        participant = db.query(Participant).filter(Participant.participant_id == participant_id).first()
        session = db.query(SimulatorSession).filter(SimulatorSession.session_id == session_id).first()
        exercise = db.query(SimulatorExercise).filter(SimulatorExercise.exercise_id == session.exercise_id).first()
        
        actions = db.query(SimulatorAction).filter(
            SimulatorAction.session_id == session_id,
            SimulatorAction.participant_id == participant_id
        ).order_by(SimulatorAction.timestamp).all()
        
        time_taken = 0
        if progress.start_time and progress.end_time:
            time_taken = int((progress.end_time - progress.start_time).total_seconds())
        
        steps = db.query(SimulatorStep).filter(SimulatorStep.exercise_id == exercise.exercise_id).all()
        step_breakdown = []
        for step in steps:
            step_actions = [a for a in actions if a.step_id == step.step_id]
            step_breakdown.append({
                "step_number": step.step_number,
                "title": step.title,
                "completed": step.step_id in (progress.completed_steps or []),
                "attempts": len(step_actions),
                "score_earned": sum(a.score_delta for a in step_actions if a.score_delta > 0),
                "max_score": step.points
            })
        
        action_replay = []
        for action in actions:
            action_replay.append({
                "timestamp": action.timestamp.isoformat(),
                "action_type": action.action_type,
                "target_element": action.target_element,
                "coordinates": action.coordinates,
                "input_value": action.input_value,
                "is_correct": action.is_correct,
                "score_delta": action.score_delta,
                "latency_ms": action.latency_ms
            })
        
        completion_percentage = 0
        if progress.max_possible_score > 0:
            completion_percentage = (progress.total_score / progress.max_possible_score) * 100
        
        return SimulatorReportResponse(
            participant_id=participant_id,
            participant_name=f"{participant.nome} {participant.cognome}",
            exercise_title=exercise.title,
            mode=session.mode,
            total_score=progress.total_score,
            max_possible_score=progress.max_possible_score,
            completion_percentage=completion_percentage,
            time_taken_seconds=time_taken,
            hints_used=progress.hints_used,
            attempts_count=progress.attempts_count,
            status=progress.status,
            step_breakdown=step_breakdown,
            action_replay=action_replay
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
