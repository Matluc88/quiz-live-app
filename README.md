# Quiz Live - Sistema di Quiz Interattivo

Un'applicazione web che permette a un docente di presentare live un quiz di informatica a più corsisti contemporaneamente, con generazione automatica di domande, percorsi adattivi e sincronizzazione in tempo reale.

## 🎯 Caratteristiche Principali

- **Quiz Live Multi-Utente**: Sessioni sincronizzate con lobby in tempo reale
- **Percorso Adattivo**: Domande personalizzate basate sulle performance del corsista
- **WebSocket Real-time**: Aggiornamenti istantanei per tutti i partecipanti
- **Dashboard Docente**: Controllo completo della sessione e monitoraggio partecipanti
- **Domande Progressive**: Sistema di livelli (base, medio, avanzato) con difficoltà crescente

## 🏗️ Architettura

### Backend (FastAPI)
- **Framework**: FastAPI con SQLAlchemy ORM
- **Database**: SQLite in-memory per sviluppo
- **WebSocket**: Comunicazione real-time bidirezionale
- **API RESTful**: Endpoint per gestione sessioni e domande

### Frontend (React)
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router DOM
- **Icons**: Lucide React

## 🚀 Setup e Installazione

### Prerequisiti
- Python 3.12+
- Node.js 18+
- Poetry (per gestione dipendenze Python)
- pnpm (per gestione dipendenze Node.js)

### Backend Setup

```bash
cd backend
poetry install
poetry run fastapi dev app/main.py
```

Il backend sarà disponibile su `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
pnpm install
pnpm run dev
```

Il frontend sarà disponibile su `http://localhost:5173`

## 📊 Flusso dell'Applicazione

### Per il Docente
1. Crea una nuova sessione live (genera codice a 6 cifre)
2. Condivide il codice con i corsisti
3. Monitora l'ingresso dei partecipanti nella lobby
4. Avvia la sessione con countdown sincronizzato
5. Controlla il progresso e può mostrare soluzioni

### Per il Corsista
1. Inserisce nome, cognome e codice sessione
2. Entra nella lobby e attende l'avvio
3. Riceve domande personalizzate in base al livello
4. Risponde entro il tempo limite
5. Riceve feedback e spiegazioni dettagliate

## 🧠 Sistema Adattivo

- **Livelli**: base → medio → avanzato
- **Progressione**: 2 risposte corrette consecutive = livello successivo
- **Penalità**: Risposta errata = spiegazione obbligatoria + stessa difficoltà
- **Limite**: Massimo 50 domande per corsista
- **Tracking**: Theta score, streak corrette, argomenti coperti

## 🔗 API Endpoints

### Sessioni Live
- `POST /api/live/create` - Crea nuova sessione
- `POST /api/live/{code}/join` - Partecipa alla sessione
- `POST /api/live/{live_id}/start` - Avvia sessione
- `GET /api/live/{live_id}/participants` - Lista partecipanti

### Quiz e Domande
- `POST /api/session/next` - Ottieni prossima domanda adattiva
- `POST /api/session/answer` - Invia risposta e ricevi feedback

### WebSocket
- `/ws/participant/{session_code}/{participant_id}` - Connessione corsista
- `/ws/teacher/{live_id}` - Connessione docente

## 📁 Struttura del Progetto

```
quiz-live-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app principale
│   │   ├── models.py            # Modelli database SQLAlchemy
│   │   ├── schemas.py           # Schemi Pydantic
│   │   ├── database.py          # Configurazione database
│   │   ├── question_service.py  # Servizio gestione domande
│   │   └── websocket_manager.py # Gestione WebSocket
│   ├── pyproject.toml           # Dipendenze Poetry
│   └── debug_db.py             # Script debug database
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomePage.tsx     # Pagina principale
│   │   │   ├── TeacherDashboard.tsx # Dashboard docente
│   │   │   ├── StudentLobby.tsx # Lobby corsista
│   │   │   └── QuizSession.tsx  # Interfaccia quiz
│   │   ├── App.tsx              # Router principale
│   │   └── main.tsx            # Entry point
│   ├── package.json            # Dipendenze npm
│   └── vite.config.ts          # Configurazione Vite
└── README.md                   # Documentazione
```

## 🎮 Come Usare

1. **Avvia Backend e Frontend** (vedi sezioni setup sopra)
2. **Vai su** `http://localhost:5173`
3. **Come Docente**: 
   - Clicca "Docente" → "Crea Sessione" 
   - Condividi il codice generato
   - Clicca "Avvia Sessione" quando pronti
4. **Come Corsista**:
   - Clicca "Corsista" → Inserisci codice e dati
   - Attendi l'avvio del docente
   - Rispondi alle domande nel tempo limite

## 🔧 Sviluppo

### Aggiungere Nuove Domande
Modifica `backend/app/question_service.py` e aggiungi domande al database hardcoded seguendo il formato:

```python
{
    "topic": "Argomento",
    "level": "base|medio|avanzato", 
    "difficulty": 1-5,
    "question": "Testo domanda?",
    "options": ["A. Opzione 1", "B. Opzione 2", "C. Opzione 3", "D. Opzione 4"],
    "answer_index": 1,  # Indice risposta corretta (0-3)
    "explain_brief": "Spiegazione breve (80-120 parole)",
    "explain_detailed": "Spiegazione dettagliata (180-260 parole)",
    "source_refs": ["fonte#chunk"]
}
```

### Debug Database
Usa `python debug_db.py` per ispezionare/resettare lo stato del database durante lo sviluppo.

## 📝 TODO / Roadmap

- [ ] Integrazione con PostgreSQL + pgvector per produzione
- [ ] Sistema RAG per generazione automatica domande
- [ ] Report e analytics avanzati
- [ ] Autenticazione e gestione utenti persistente
- [ ] Deploy automatizzato con Docker
- [ ] Test automatizzati (pytest + Playwright)
- [ ] Modalità offline e sincronizzazione

## 🤝 Contribuire

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit delle modifiche (`git commit -m 'Aggiunge nuova funzionalità'`)
4. Push del branch (`git push origin feature/nuova-funzionalita`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

---

**Sviluppato con ❤️ per l'educazione interattiva**
