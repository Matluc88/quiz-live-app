import random
import hashlib
import json
from typing import List, Dict, Optional
from app.schemas import QuestionResponse

class QuestionService:
    def __init__(self):
        self.questions_db = {}
    
    def generate_question_hash(self, question_data: Dict) -> str:
        """Generate a unique hash for a question to prevent duplicates"""
        question_str = f"{question_data['question']}{question_data['options']}"
        return hashlib.md5(question_str.encode()).hexdigest()
    
    def get_available_topics(self, level: str) -> List[str]:
        """Get available topics for a given level"""
        return list(self.questions_db.get(level, {}).keys())
    
    def get_next_question(self, level: str, topic: Optional[str] = None, served_hashes: Optional[List[str]] = None) -> Optional[QuestionResponse]:
        """
        Generate next question based on level and topic, avoiding served questions
        """
        if served_hashes is None:
            served_hashes = []
            
        level_questions = self.questions_db.get(level, {})
        if not level_questions:
            return None
            
        if not topic:
            available_topics = list(level_questions.keys())
            if not available_topics:
                return None
            topic = random.choice(available_topics)
        
        topic_questions = level_questions.get(topic, [])
        if not topic_questions:
            return None
            
        available_questions = []
        for q in topic_questions:
            q_hash = self.generate_question_hash(q)
            if q_hash not in served_hashes:
                available_questions.append(q)
        
        if not available_questions:
            for other_topic in level_questions.keys():
                if other_topic != topic:
                    other_questions = level_questions[other_topic]
                    for q in other_questions:
                        q_hash = self.generate_question_hash(q)
                        if q_hash not in served_hashes:
                            available_questions.append(q)
            
        if not available_questions:
            return None
            
        selected_question = random.choice(available_questions)
        
        return QuestionResponse(**selected_question)
    
    def get_question_hash(self, question: QuestionResponse) -> str:
        """Get hash for a question response"""
        question_data = {
            "question": question.question,
            "options": question.options
        }
        return self.generate_question_hash(question_data)

question_service = QuestionService()
