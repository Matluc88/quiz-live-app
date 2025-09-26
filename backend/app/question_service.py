import random
import hashlib
import json
from typing import List, Dict, Optional
from app.schemas import QuestionResponse

class QuestionService:
    def __init__(self):
        self.questions_db = {}
        self._load_sample_questions()
    
    def generate_question_hash(self, question_data: Dict) -> str:
        """Generate a unique hash for a question to prevent duplicates"""
        question_str = f"{question_data['question']}{question_data['options']}"
        return hashlib.md5(question_str.encode()).hexdigest()
    
    def get_available_topics(self, level: str) -> List[str]:
        """Get available topics for a given level"""
        return list(self.questions_db.get(level, {}).keys())
    
    def get_next_question(self, level: str, topic: Optional[str] = None, served_hashes: Optional[List[str]] = None, live_id: Optional[str] = None, db_session=None) -> Optional[QuestionResponse]:
        """
        Generate next question based on level and topic, avoiding served questions
        Checks session-specific questions first, then falls back to default database
        Uses intelligent fallback strategy for topic selection
        """
        if served_hashes is None:
            served_hashes = []
        
        served_hashes_set = set(served_hashes)
        
        if live_id and db_session:
            from app.models import SessionQuestion
            session_questions = db_session.query(SessionQuestion).filter(
                SessionQuestion.live_id == live_id,
                SessionQuestion.level == level
            ).all()
            
            if session_questions:
                if topic:
                    topic_questions = [sq for sq in session_questions if sq.topic == topic]
                else:
                    topic_questions = session_questions
                
                available_questions = []
                for sq in topic_questions:
                    if sq.question_hash not in served_hashes_set:
                        available_questions.append(sq.question_data)
                
                if available_questions:
                    selected_question = random.choice(available_questions)
                    return QuestionResponse(**selected_question)
        
        level_questions = self.questions_db.get(level, {})
        if not level_questions:
            return None
        
        if topic and topic in level_questions:
            available_questions = self._get_available_questions_for_topic(
                level_questions[topic], served_hashes_set
            )
            if available_questions:
                return QuestionResponse(**random.choice(available_questions))
        
        # Intelligent fallback: prioritize topics with more available questions
        topic_scores = []
        for topic_name, questions in level_questions.items():
            if topic_name == topic:  # Skip already tried topic
                continue
            available_count = len(self._get_available_questions_for_topic(questions, served_hashes_set))
            if available_count > 0:
                topic_scores.append((topic_name, available_count))
        
        if not topic_scores:
            return None
        
        topic_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Use weighted random selection favoring topics with more questions
        if len(topic_scores) == 1:
            selected_topic = topic_scores[0][0]
        else:
            top_topics = topic_scores[:3]
            weights = [score for _, score in top_topics]
            selected_topic = random.choices([name for name, _ in top_topics], weights=weights)[0]
        
        available_questions = self._get_available_questions_for_topic(
            level_questions[selected_topic], served_hashes_set
        )
        
        if available_questions:
            return QuestionResponse(**random.choice(available_questions))
        
        return None
    
    def _get_available_questions_for_topic(self, topic_questions: List[Dict], served_hashes_set: set) -> List[Dict]:
        """Helper method to get available questions for a topic"""
        available_questions = []
        for q in topic_questions:
            q_hash = self.generate_question_hash(q)
            if q_hash not in served_hashes_set:
                available_questions.append(q)
        return available_questions
    
    def get_question_hash(self, question: QuestionResponse) -> str:
        """Get hash for a question response"""
        question_data = {
            "question": question.question,
            "options": question.options
        }
        return self.generate_question_hash(question_data)
    
    def _load_sample_questions(self):
        """Load sample questions for development when no PDF is uploaded"""
        sample_questions = [
            {
                "topic": "Informatica di Base",
                "level": "base",
                "difficulty": 1,
                "question": "Quale di questi è un sistema operativo?",
                "options": ["A. Microsoft Word", "B. Windows 10", "C. Google Chrome", "D. Adobe Photoshop"],
                "answer_index": 1,
                "explain_brief": "Windows 10 è un sistema operativo",
                "explain_detailed": "Windows 10 è un sistema operativo sviluppato da Microsoft che gestisce le risorse hardware e software del computer",
                "source_refs": ["Corso di Informatica di Base"]
            },
            {
                "topic": "Informatica di Base", 
                "level": "base",
                "difficulty": 1,
                "question": "Cosa significa CPU?",
                "options": ["A. Computer Processing Unit", "B. Central Processing Unit", "C. Core Processing Unit", "D. Central Program Unit"],
                "answer_index": 1,
                "explain_brief": "CPU significa Central Processing Unit",
                "explain_detailed": "La CPU (Central Processing Unit) è il processore centrale del computer che esegue le istruzioni dei programmi",
                "source_refs": ["Corso di Informatica di Base"]
            },
            {
                "topic": "Programmazione",
                "level": "medio", 
                "difficulty": 2,
                "question": "Quale di questi è un linguaggio di programmazione?",
                "options": ["A. HTML", "B. CSS", "C. Python", "D. HTTP"],
                "answer_index": 2,
                "explain_brief": "Python è un linguaggio di programmazione",
                "explain_detailed": "Python è un linguaggio di programmazione ad alto livello, interpretato e orientato agli oggetti",
                "source_refs": ["Corso di Programmazione"]
            },
            {
                "topic": "Programmazione",
                "level": "avanzato",
                "difficulty": 3, 
                "question": "Cosa rappresenta il Big O notation O(n²)?",
                "options": ["A. Complessità lineare", "B. Complessità quadratica", "C. Complessità logaritmica", "D. Complessità costante"],
                "answer_index": 1,
                "explain_brief": "O(n²) rappresenta complessità quadratica",
                "explain_detailed": "La notazione Big O O(n²) indica che il tempo di esecuzione dell'algoritmo cresce quadraticamente rispetto alla dimensione dell'input",
                "source_refs": ["Corso di Algoritmi"]
            }
        ]
        
        for question in sample_questions:
            level = question.get('level', 'base')
            topic = question.get('topic', 'Generale')
            
            if level not in self.questions_db:
                self.questions_db[level] = {}
            
            if topic not in self.questions_db[level]:
                self.questions_db[level][topic] = []
            
            self.questions_db[level][topic].append(question)

question_service = QuestionService()
