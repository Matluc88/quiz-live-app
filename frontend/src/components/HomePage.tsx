import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, GraduationCap, Play } from 'lucide-react'
import { PDFUpload } from './PDFUpload'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HomePage() {
  const navigate = useNavigate()
  const [sessionCode, setSessionCode] = useState('')
  const [studentForm, setStudentForm] = useState({
    nome: '',
    cognome: '',
    email: '',
    corso: ''
  })
  const [teacherForm, setTeacherForm] = useState({
    title: ''
  })
  const [loading, setLoading] = useState(false)

  const handleStudentJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionCode || !studentForm.nome || !studentForm.cognome) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${sessionCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentForm),
      })

      if (response.ok) {
        const participant = await response.json()
        navigate(`/student/${sessionCode}?participantId=${participant.participant_id}`)
      } else {
        const error = await response.json()
        alert(error.detail || 'Errore durante l\'accesso alla sessione')
      }
    } catch {
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleTeacherCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch(`${API_URL}/api/live/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teacherForm),
      })

      if (response.ok) {
        const session = await response.json()
        navigate(`/teacher/${session.live_id}`)
      } else {
        alert('Errore durante la creazione della sessione')
      }
    } catch {
      alert('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Quiz Live
        </h1>
        <p className="text-xl text-gray-600">
          Sistema di quiz interattivo con domande adattive
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Corsista
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Docente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Partecipa al Quiz
                </CardTitle>
                <CardDescription>
                  Inserisci il codice della sessione e i tuoi dati per partecipare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleStudentJoin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Codice Sessione (6 cifre)
                    </label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value)}
                      maxLength={6}
                      className="text-center text-2xl font-mono"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nome *
                      </label>
                      <Input
                        type="text"
                        value={studentForm.nome}
                        onChange={(e) => setStudentForm({...studentForm, nome: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cognome *
                      </label>
                      <Input
                        type="text"
                        value={studentForm.cognome}
                        onChange={(e) => setStudentForm({...studentForm, cognome: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email (opzionale)
                    </label>
                    <Input
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Classe/Corso (opzionale)
                    </label>
                    <Input
                      type="text"
                      value={studentForm.corso}
                      onChange={(e) => setStudentForm({...studentForm, corso: e.target.value})}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !sessionCode || !studentForm.nome || !studentForm.cognome}
                  >
                    {loading ? 'Accesso in corso...' : 'Entra nella Sessione'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teacher">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Crea Nuova Sessione
                  </CardTitle>
                  <CardDescription>
                    Avvia una nuova sessione di quiz per i tuoi corsisti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTeacherCreate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Titolo Sessione (opzionale)
                      </label>
                      <Input
                        type="text"
                        placeholder="Quiz di Informatica - Modulo 1"
                        value={teacherForm.title}
                        onChange={(e) => setTeacherForm({...teacherForm, title: e.target.value})}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {loading ? 'Creazione in corso...' : 'Crea Sessione'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <PDFUpload />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
