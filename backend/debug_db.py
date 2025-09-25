from app.database import get_db
from app.models import ServedQuestion, ParticipantProgress
from sqlalchemy.orm import Session

db = next(get_db())
participant_id = 'eeb8aaf6-089b-497c-8428-6ee644786230'

served = db.query(ServedQuestion).filter(ServedQuestion.participant_id == participant_id).all()
print(f'Deleting {len(served)} served questions for participant {participant_id}')
for sq in served:
    db.delete(sq)

progress = db.query(ParticipantProgress).filter(ParticipantProgress.participant_id == participant_id).first()
if progress:
    progress.total_served = 0
    progress.current_level = 'base'
    progress.theta = 20
    progress.correct_streak = 0
    progress.topic = None
    print(f'Reset progress for participant {participant_id}')

db.commit()
print('Database cleared and reset successfully')
