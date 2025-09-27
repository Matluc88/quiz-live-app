#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, LiveSession, Participant
from app.database import engine, SessionLocal

def create_demo_data():
    """Create demo live session and participant for simulator testing"""
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        existing_session = db.query(LiveSession).filter(LiveSession.live_id == "demo").first()
        if existing_session:
            print("Demo live session already exists")
        else:
            demo_session = LiveSession(
                live_id="demo",
                code="DEMO01",
                title="Demo Simulator Session",
                status="running"
            )
            db.add(demo_session)
            print("Created demo live session")
        
        existing_participant = db.query(Participant).filter(Participant.participant_id == "demo-user").first()
        if existing_participant:
            print("Demo participant already exists")
        else:
            demo_participant = Participant(
                participant_id="demo-user",
                nome="Demo",
                cognome="User",
                email="demo@example.com",
                corso="PEKIT Simulator"
            )
            db.add(demo_participant)
            print("Created demo participant")
        
        db.commit()
        print("Demo data creation completed successfully")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating demo data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_data()
