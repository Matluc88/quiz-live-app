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
