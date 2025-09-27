import json
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from app.simulator_models import SimulatorExercise, SimulatorStep, SimulatorSession, SimulatorProgress, SimulatorAction, SimulatorHint
from app.simulator_schemas import SimulatorStepResponse, SimulatorActionResponse, SimulatorHintResponse
from datetime import datetime

class SimulatorService:
    def __init__(self):
        self.exercises_db = self._initialize_default_exercises()
    
    def _initialize_default_exercises(self) -> Dict[str, Dict]:
        """Initialize default PEKIT-style exercises for each simulator type"""
        return {
            "windows10": {
                "file_management": {
                    "title": "Gestione File e Cartelle",
                    "description": "Esercizio di gestione file in Windows 10",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Apri Esplora File",
                            "description": "Clicca sull'icona di Esplora File nella barra delle applicazioni",
                            "target_element": ".taskbar-file-explorer",
                            "action_type": "click",
                            "success_criteria": {"window_opened": "file_explorer"},
                            "hint_text": "Cerca l'icona della cartella nella barra delle applicazioni in basso",
                            "points": 10
                        },
                        {
                            "step_number": 2,
                            "title": "Crea nuova cartella",
                            "description": "Crea una nuova cartella chiamata 'PEKIT'",
                            "target_element": ".file-explorer-new-folder",
                            "action_type": "right_click",
                            "success_criteria": {"folder_created": "PEKIT"},
                            "hint_text": "Fai clic destro in un'area vuota e seleziona 'Nuova cartella'",
                            "points": 15
                        },
                        {
                            "step_number": 3,
                            "title": "Rinomina cartella",
                            "description": "Rinomina la cartella da 'PEKIT' a 'PEKIT_CANDIDATO'",
                            "target_element": ".folder[data-name='PEKIT']",
                            "action_type": "right_click",
                            "expected_value": "PEKIT_CANDIDATO",
                            "success_criteria": {"folder_renamed": "PEKIT_CANDIDATO"},
                            "hint_text": "Fai clic destro sulla cartella e seleziona 'Rinomina'",
                            "points": 15
                        },
                        {
                            "step_number": 4,
                            "title": "Mostra estensioni file",
                            "description": "Attiva la visualizzazione delle estensioni dei file",
                            "target_element": ".view-menu",
                            "action_type": "click",
                            "success_criteria": {"extensions_visible": True},
                            "hint_text": "Vai nel menu Visualizza e cerca l'opzione per le estensioni",
                            "points": 20
                        }
                    ]
                }
            },
            "word": {
                "document_formatting": {
                    "title": "Formattazione Documento Word",
                    "description": "Esercizio di formattazione base in Microsoft Word",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Imposta margini normali",
                            "description": "Imposta i margini del documento su 'Normali'",
                            "target_element": ".layout-tab",
                            "action_type": "click",
                            "success_criteria": {"margins": "normal"},
                            "hint_text": "Vai nella scheda Layout e cerca l'opzione Margini",
                            "points": 15
                        },
                        {
                            "step_number": 2,
                            "title": "Imposta interlinea 1,5",
                            "description": "Cambia l'interlinea del paragrafo a 1,5",
                            "target_element": ".home-tab .line-spacing",
                            "action_type": "click",
                            "success_criteria": {"line_spacing": 1.5},
                            "hint_text": "Nella scheda Home, cerca l'icona dell'interlinea",
                            "points": 15
                        },
                        {
                            "step_number": 3,
                            "title": "Giustifica il testo",
                            "description": "Applica la giustificazione al paragrafo selezionato",
                            "target_element": ".home-tab .justify-text",
                            "action_type": "click",
                            "success_criteria": {"text_align": "justify"},
                            "hint_text": "Nella scheda Home, cerca i pulsanti di allineamento",
                            "points": 10
                        },
                        {
                            "step_number": 4,
                            "title": "Inserisci intestazione",
                            "description": "Inserisci un'intestazione con numero di pagina",
                            "target_element": ".insert-tab .header",
                            "action_type": "click",
                            "success_criteria": {"header_inserted": True, "page_number": True},
                            "hint_text": "Vai nella scheda Inserisci e cerca l'opzione Intestazione",
                            "points": 20
                        }
                    ]
                }
            },
            "excel": {
                "data_analysis": {
                    "title": "Analisi Dati Excel",
                    "description": "Esercizio di analisi dati e formule in Excel",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Ordina per Cognome",
                            "description": "Ordina la tabella per la colonna 'Cognome' in ordine crescente",
                            "target_element": ".data-tab .sort",
                            "action_type": "click",
                            "success_criteria": {"sorted_by": "Cognome", "order": "asc"},
                            "hint_text": "Seleziona la tabella e vai nella scheda Dati",
                            "points": 15
                        },
                        {
                            "step_number": 2,
                            "title": "Applica filtro",
                            "description": "Applica un filtro per mostrare solo le presenze > 10",
                            "target_element": ".data-tab .filter",
                            "action_type": "click",
                            "success_criteria": {"filter_applied": "Presenze > 10"},
                            "hint_text": "Usa l'opzione Filtro automatico nella scheda Dati",
                            "points": 20
                        },
                        {
                            "step_number": 3,
                            "title": "Inserisci formula SOMMA",
                            "description": "Inserisci una formula SOMMA nella cella C10",
                            "target_element": ".cell[data-cell='C10']",
                            "action_type": "type",
                            "expected_value": "=SOMMA(C2:C9)",
                            "success_criteria": {"formula": "SUM", "range": "C2:C9"},
                            "hint_text": "Clicca sulla cella C10 e digita la formula SOMMA",
                            "points": 20
                        },
                        {
                            "step_number": 4,
                            "title": "Crea grafico",
                            "description": "Crea un grafico a colonne con i dati selezionati",
                            "target_element": ".insert-tab .chart-column",
                            "action_type": "click",
                            "success_criteria": {"chart_type": "column", "chart_created": True},
                            "hint_text": "Seleziona i dati e vai nella scheda Inserisci",
                            "points": 25
                        }
                    ]
                }
            },
            "powerpoint": {
                "presentation_design": {
                    "title": "Creazione Presentazione PowerPoint",
                    "description": "Esercizio di creazione e design presentazione",
                    "steps": [
                        {
                            "step_number": 1,
                            "title": "Applica layout",
                            "description": "Applica il layout 'Titolo e contenuto' alla diapositiva",
                            "target_element": ".design-tab .layout-title-content",
                            "action_type": "click",
                            "success_criteria": {"layout": "title_content"},
                            "hint_text": "Vai nella scheda Progettazione e cerca i layout",
                            "points": 10
                        },
                        {
                            "step_number": 2,
                            "title": "Inserisci immagine",
                            "description": "Inserisci un'immagine nella diapositiva 2",
                            "target_element": ".insert-tab .image",
                            "action_type": "click",
                            "success_criteria": {"image_inserted": True, "slide": 2},
                            "hint_text": "Vai alla diapositiva 2 e usa la scheda Inserisci",
                            "points": 15
                        },
                        {
                            "step_number": 3,
                            "title": "Imposta transizione",
                            "description": "Applica la transizione 'Dissolvenza' a tutte le diapositive",
                            "target_element": ".transitions-tab .fade",
                            "action_type": "click",
                            "success_criteria": {"transition": "fade", "apply_to_all": True},
                            "hint_text": "Vai nella scheda Transizioni e seleziona Dissolvenza",
                            "points": 15
                        },
                        {
                            "step_number": 4,
                            "title": "Avvia presentazione",
                            "description": "Avvia la presentazione dalla diapositiva corrente",
                            "target_element": ".slideshow-tab .from-current",
                            "action_type": "click",
                            "success_criteria": {"slideshow_started": True, "from_current": True},
                            "hint_text": "Usa la scheda Presentazione o premi F5",
                            "points": 10
                        }
                    ]
                }
            }
        }
    
    def get_exercise_by_type(self, simulator_type: str, exercise_name: str) -> Optional[Dict]:
        """Get exercise definition by simulator type and name"""
        return self.exercises_db.get(simulator_type, {}).get(exercise_name)
    
    def create_exercise_from_template(self, db: Session, simulator_type: str, exercise_name: str) -> Optional[str]:
        """Create a new exercise in database from template"""
        template = self.get_exercise_by_type(simulator_type, exercise_name)
        if not template:
            return None
        
        exercise = SimulatorExercise(
            title=template["title"],
            description=template["description"],
            simulator_type=simulator_type,
            difficulty_level="base"
        )
        
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        
        for step_data in template["steps"]:
            step = SimulatorStep(
                exercise_id=exercise.exercise_id,
                step_number=step_data["step_number"],
                title=step_data["title"],
                description=step_data["description"],
                target_element=step_data["target_element"],
                action_type=step_data["action_type"],
                expected_value=step_data.get("expected_value"),
                success_criteria=step_data["success_criteria"],
                hint_text=step_data.get("hint_text"),
                points=step_data.get("points", 10)
            )
            db.add(step)
        
        db.commit()
        return exercise.exercise_id
    
    def validate_action(self, db: Session, action_data: Dict, step: SimulatorStep) -> tuple[bool, int, str]:
        """Validate if an action meets the step's success criteria"""
        success_criteria = step.success_criteria
        is_correct = True
        score_delta = 0
        feedback = ""
        
        if step.action_type == "click":
            if action_data.get("target_element") == step.target_element:
                score_delta = step.points
                feedback = "Azione corretta!"
            else:
                is_correct = False
                feedback = "Elemento sbagliato. Riprova."
        
        elif step.action_type == "type":
            if action_data.get("input_value") == step.expected_value:
                score_delta = step.points
                feedback = "Testo inserito correttamente!"
            else:
                is_correct = False
                feedback = f"Testo errato. Atteso: {step.expected_value}"
        
        elif step.action_type == "right_click":
            if action_data.get("target_element") == step.target_element:
                score_delta = step.points
                feedback = "Click destro eseguito correttamente!"
            else:
                is_correct = False
                feedback = "Click destro sull'elemento sbagliato."
        
        return is_correct, score_delta, feedback
    
    def get_next_step(self, db: Session, session_id: str, participant_id: str) -> Optional[SimulatorStepResponse]:
        """Get the next step for a participant in a session"""
        progress = db.query(SimulatorProgress).filter(
            SimulatorProgress.session_id == session_id,
            SimulatorProgress.participant_id == participant_id
        ).first()
        
        if not progress:
            return None
        
        session = db.query(SimulatorSession).filter(
            SimulatorSession.session_id == session_id
        ).first()
        
        if not session:
            return None
        
        next_step = db.query(SimulatorStep).filter(
            SimulatorStep.exercise_id == session.exercise_id,
            SimulatorStep.step_number == progress.current_step
        ).first()
        
        if not next_step:
            return None
        
        return SimulatorStepResponse.from_orm(next_step)
    
    def apply_hint_penalty(self, hint_level: int) -> int:
        """Calculate penalty for using hints"""
        penalties = {1: 2, 2: 5, 3: 10}  # Text, highlight, animation
        return penalties.get(hint_level, 0)

simulator_service = SimulatorService()
