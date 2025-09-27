import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import StudentLobby from './components/StudentLobby'
import QuizSession from './components/QuizSession'
import TeacherDashboard from './components/TeacherDashboard'
import { SimulatorPage } from './components/SimulatorPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/student/:code" element={<StudentLobby />} />
          <Route path="/quiz/:code/:participantId" element={<QuizSession />} />
          <Route path="/simulator/:liveId/:participantId" element={<SimulatorPage />} />
          <Route path="/teacher/:liveId" element={<TeacherDashboard />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
