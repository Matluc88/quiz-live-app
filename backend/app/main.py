from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import random
import string
import uuid
import asyncio
import os
import PyPDF2
from openai import OpenAI
import json

from app.database import get_db, create_tables
from app.models import LiveSession, Participant, LiveParticipant, ParticipantProgress, ServedQuestion, LiveAnswer
from app.schemas import LiveSessionCreate, LiveSessionResponse, ParticipantCreate, ParticipantResponse, JoinSessionRequest, QuestionResponse, AnswerRequest, AnswerResponse, ParticipantStatus, PDFUploadResponse
from app.question_service import question_service
from app.websocket_manager import manager

app = FastAPI(title="Quiz Live API", version="1.0.0")

create_tables()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

os.makedirs("uploads", exist_ok=True)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

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
    
    websocket_participant_id = str(uuid.uuid4())
    
    participant = Participant(
        participant_id=websocket_participant_id,
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
    
    if not question_service.questions_db:
        raise HTTPException(
            status_code=400, 
            detail="No questions available. Please upload a PDF file first to generate questions."
        )
    
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
                served_hashes=served_hashes
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
                
                await manager.send_to_participant(str(lp.participant_id), {
                    "type": "round.start",
                    "question": question_data,
                    "timer": 30,
                    "question_number": progress.total_served
                })
    
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
        served_hashes=served_hashes
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
async def upload_pdf(file: UploadFile = File(...)):
    """Upload PDF and generate questions using OpenAI"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File size too large (max 10MB)")
    
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
            
            if level not in question_service.questions_db:
                question_service.questions_db[level] = {}
            
            if topic not in question_service.questions_db[level]:
                question_service.questions_db[level][topic] = []
            
            question_service.questions_db[level][topic].append(question)
            topics_added.add(topic)
            questions_added += 1
        
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
