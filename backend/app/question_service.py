import random
import hashlib
import json
from typing import List, Dict, Optional
from app.schemas import QuestionResponse

class QuestionService:
    def __init__(self):
        self.questions_db = {
            "base": {
                "Reti": [
                    {
                        "topic": "Reti",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Quale dei seguenti protocolli è orientato alla connessione?",
                        "options": ["A. UDP", "B. TCP", "C. ICMP", "D. ARP"],
                        "answer_index": 1,
                        "explain_brief": "TCP è orientato alla connessione e garantisce consegna affidabile dei dati attraverso un handshake a tre vie.",
                        "explain_detailed": "TCP (Transmission Control Protocol) stabilisce una connessione tra mittente e destinatario prima di trasmettere dati. Utilizza un handshake a tre vie (SYN, SYN-ACK, ACK) per stabilire la connessione e garantisce la consegna ordinata e affidabile dei pacchetti. UDP invece è connectionless e non garantisce la consegna.",
                        "source_refs": ["reti_tcp_2024#chunk_07"]
                    },
                    {
                        "topic": "Reti",
                        "level": "base", 
                        "difficulty": 1,
                        "question": "Qual è il numero di porta standard per HTTP?",
                        "options": ["A. 21", "B. 25", "C. 80", "D. 443"],
                        "answer_index": 2,
                        "explain_brief": "HTTP utilizza la porta 80 come standard per le comunicazioni web non crittografate.",
                        "explain_detailed": "La porta 80 è la porta standard assegnata al protocollo HTTP (HyperText Transfer Protocol) per le comunicazioni web. La porta 443 è invece utilizzata per HTTPS (HTTP sicuro), la porta 21 per FTP e la porta 25 per SMTP. Queste assegnazioni sono standardizzate dalla IANA.",
                        "source_refs": ["reti_porte_2024#chunk_12"]
                    },
                    {
                        "topic": "Reti",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Quale protocollo viene utilizzato per la risoluzione dei nomi di dominio?",
                        "options": ["A. DHCP", "B. DNS", "C. FTP", "D. SMTP"],
                        "answer_index": 1,
                        "explain_brief": "DNS (Domain Name System) traduce i nomi di dominio in indirizzi IP.",
                        "explain_detailed": "Il DNS è un sistema distribuito che traduce i nomi di dominio leggibili dall'uomo (come www.example.com) negli indirizzi IP numerici necessari per la comunicazione di rete. Utilizza una struttura gerarchica di server DNS per risolvere le query.",
                        "source_refs": ["reti_dns_2024#chunk_05"]
                    },
                    {
                        "topic": "Reti",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Quale classe di indirizzi IP ha il range 192.168.x.x?",
                        "options": ["A. Classe A", "B. Classe B", "C. Classe C", "D. Classe D"],
                        "answer_index": 2,
                        "explain_brief": "192.168.x.x appartiene alla Classe C degli indirizzi IP privati.",
                        "explain_detailed": "Gli indirizzi 192.168.0.0/16 sono riservati per uso privato secondo RFC 1918 e appartengono alla Classe C. Questi indirizzi non sono instradabili su Internet e sono utilizzati per reti locali private.",
                        "source_refs": ["reti_ip_2024#chunk_09"]
                    },
                    {
                        "topic": "Reti",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Cosa significa l'acronimo LAN?",
                        "options": ["A. Large Area Network", "B. Local Area Network", "C. Long Access Network", "D. Limited Access Network"],
                        "answer_index": 1,
                        "explain_brief": "LAN significa Local Area Network, una rete locale limitata geograficamente.",
                        "explain_detailed": "Una LAN (Local Area Network) è una rete di computer che copre un'area geografica limitata, tipicamente un edificio o un campus. Le LAN sono caratterizzate da alta velocità, bassa latenza e sono sotto il controllo di una singola organizzazione.",
                        "source_refs": ["reti_topologie_2024#chunk_02"]
                    }
                ],
                "Programmazione": [
                    {
                        "topic": "Programmazione",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Quale di questi è un linguaggio di programmazione interpretato?",
                        "options": ["A. C", "B. C++", "C. Python", "D. Rust"],
                        "answer_index": 2,
                        "explain_brief": "Python è un linguaggio interpretato che esegue il codice riga per riga attraverso un interprete.",
                        "explain_detailed": "Python è un linguaggio di programmazione interpretato, il che significa che il codice viene eseguito direttamente dall'interprete senza bisogno di una fase di compilazione separata. C, C++ e Rust sono linguaggi compilati che richiedono la trasformazione del codice sorgente in codice macchina prima dell'esecuzione.",
                        "source_refs": ["prog_linguaggi_2024#chunk_03"]
                    },
                    {
                        "topic": "Programmazione",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Cosa rappresenta il termine 'variabile' in programmazione?",
                        "options": ["A. Un valore costante", "B. Un contenitore per dati", "C. Un tipo di funzione", "D. Un errore di sintassi"],
                        "answer_index": 1,
                        "explain_brief": "Una variabile è un contenitore che può memorizzare e modificare dati durante l'esecuzione del programma.",
                        "explain_detailed": "In programmazione, una variabile è un'area di memoria identificata da un nome che può contenere dati di vario tipo. Il valore di una variabile può essere modificato durante l'esecuzione del programma, a differenza delle costanti che mantengono sempre lo stesso valore.",
                        "source_refs": ["prog_variabili_2024#chunk_01"]
                    },
                    {
                        "topic": "Programmazione",
                        "level": "base",
                        "difficulty": 1,
                        "question": "Quale struttura di controllo permette di ripetere un blocco di codice?",
                        "options": ["A. if-else", "B. switch", "C. for", "D. return"],
                        "answer_index": 2,
                        "explain_brief": "Il ciclo 'for' è una struttura di controllo che permette di ripetere un blocco di codice un numero determinato di volte.",
                        "explain_detailed": "Il ciclo 'for' è una struttura di controllo iterativa che permette di eseguire ripetutamente un blocco di codice. È particolarmente utile quando si conosce in anticipo il numero di iterazioni da eseguire o quando si deve iterare su una collezione di elementi.",
                        "source_refs": ["prog_cicli_2024#chunk_04"]
                    }
                ]
            },
            "medio": {
                "Reti": [
                    {
                        "topic": "Reti",
                        "level": "medio",
                        "difficulty": 2,
                        "question": "Nel modello OSI, a quale livello opera il protocollo TCP?",
                        "options": ["A. Livello 3 (Network)", "B. Livello 4 (Transport)", "C. Livello 5 (Session)", "D. Livello 6 (Presentation)"],
                        "answer_index": 1,
                        "explain_brief": "TCP opera al livello 4 (Transport) del modello OSI, gestendo la comunicazione end-to-end tra processi.",
                        "explain_detailed": "Nel modello OSI a 7 livelli, TCP (Transmission Control Protocol) opera al livello 4 chiamato Transport Layer. Questo livello è responsabile della comunicazione end-to-end tra processi su host diversi, gestendo segmentazione, controllo di flusso, controllo degli errori e riassemblaggio dei dati.",
                        "source_refs": ["reti_osi_2024#chunk_15"]
                    }
                ],
                "Programmazione": [
                    {
                        "topic": "Programmazione", 
                        "level": "medio",
                        "difficulty": 2,
                        "question": "Qual è la complessità temporale dell'algoritmo di ordinamento QuickSort nel caso medio?",
                        "options": ["A. O(n)", "B. O(n log n)", "C. O(n²)", "D. O(2^n)"],
                        "answer_index": 1,
                        "explain_brief": "QuickSort ha complessità O(n log n) nel caso medio grazie alla strategia divide-et-impera.",
                        "explain_detailed": "QuickSort utilizza una strategia divide-et-impera che nel caso medio divide l'array in due parti approssimativamente uguali. Questo porta a una profondità di ricorsione di log n livelli, e ad ogni livello vengono effettuate n operazioni di confronto e scambio, risultando in una complessità O(n log n).",
                        "source_refs": ["algo_sorting_2024#chunk_08"]
                    }
                ]
            },
            "avanzato": {
                "Reti": [
                    {
                        "topic": "Reti",
                        "level": "avanzato", 
                        "difficulty": 3,
                        "question": "Quale algoritmo di routing utilizza il concetto di 'distance vector'?",
                        "options": ["A. OSPF", "B. RIP", "C. BGP", "D. IS-IS"],
                        "answer_index": 1,
                        "explain_brief": "RIP (Routing Information Protocol) utilizza l'algoritmo distance vector per determinare i percorsi ottimali.",
                        "explain_detailed": "RIP utilizza l'algoritmo Bellman-Ford distance vector dove ogni router mantiene una tabella con la distanza (numero di hop) verso ogni destinazione. I router si scambiano periodicamente le loro tabelle di routing con i vicini. OSPF e IS-IS utilizzano invece algoritmi link-state, mentre BGP usa path vector.",
                        "source_refs": ["reti_routing_2024#chunk_22"]
                    }
                ],
                "Programmazione": [
                    {
                        "topic": "Programmazione",
                        "level": "avanzato",
                        "difficulty": 3, 
                        "question": "Nel pattern Observer, qual è il ruolo del Subject?",
                        "options": ["A. Osserva i cambiamenti negli Observer", "B. Notifica i cambiamenti agli Observer", "C. Implementa la logica di business", "D. Gestisce la persistenza dei dati"],
                        "answer_index": 1,
                        "explain_brief": "Il Subject mantiene una lista di Observer e li notifica automaticamente quando il suo stato cambia.",
                        "explain_detailed": "Nel pattern Observer, il Subject (o Observable) è l'oggetto che viene osservato. Mantiene una lista di Observer registrati e fornisce metodi per aggiungere, rimuovere e notificare gli Observer. Quando il suo stato interno cambia, il Subject notifica automaticamente tutti gli Observer registrati chiamando il loro metodo update().",
                        "source_refs": ["design_patterns_2024#chunk_18"]
                    }
                ]
            }
        }
    
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
        """
        if served_hashes is None:
            served_hashes = []
        
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
                    if sq.question_hash not in served_hashes:
                        available_questions.append(sq.question_data)
                
                if available_questions:
                    selected_question = random.choice(available_questions)
                    return QuestionResponse(**selected_question)
        
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
