import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, Play, Pause, Square, Lock, BarChart3 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ParticipantStatus {
  participant_id: string
  nome: string
  cognome: string
  current_level: string
  theta: number
  total_served: number
  correct_percentage: number
  topic?: string
}

interface LiveSession {
  live_id: string
  code: string
  title?: string
  status: string
  locked: boolean
  created_at: string
}

export default function TeacherDashboard() {
  const { liveId } = useParams()
  const [session, setSession] = useState<LiveSession | null>(null)
  const [participants, setParticipants] = useState<ParticipantStatus[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadSessionDetails = useCallback(async () => {
    if (!liveId) return

    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/details`)
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error('Error loading session details:', error)
    }
  }, [liveId])

  const loadParticipants = useCallback(async () => {
    if (!liveId) return

    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/participants`)
      if (response.ok) {
        const data = await response.json()
        setParticipants(data)
      }
    } catch (error) {
      console.error('Error loading participants:', error)
    }
  }, [liveId])

  useEffect(() => {
    if (!liveId) return

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const wsUrl = `${WS_URL}/ws/teacher/${liveId}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'lobby.update':
          loadParticipants()
          break
      }
    }

    ws.onclose = () => {
      setConnected(false)
    }

    loadSessionDetails()
    loadParticipants()

    return () => {
      ws.close()
    }
  }, [liveId, loadSessionDetails, loadParticipants])

  const handleStartSession = async () => {
    if (!liveId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/start`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'running' } : null)
      } else if (response.status === 400) {
        const errorData = await response.json()
        alert(errorData.detail || 'Cannot start session. Please upload a PDF file first to generate questions.')
      } else {
        alert('Error starting session. Please try again.')
      }
    } catch (error) {
      console.error('Error starting session:', error)
      alert('Error starting session. Please make sure you have uploaded a PDF file first.')
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSession = async () => {
    if (!liveId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/pause`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'paused' } : null)
      }
    } catch (error) {
      console.error('Error pausing session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResumeSession = async () => {
    if (!liveId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/resume`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'running' } : null)
      }
    } catch (error) {
      console.error('Error resuming session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndSession = async () => {
    if (!liveId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/end`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'ended' } : null)
      }
    } catch (error) {
      console.error('Error ending session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLockSession = async () => {
    if (!liveId) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/live/${liveId}/lock`, {
        method: 'POST',
      })

      if (response.ok) {
        setSession(prev => prev ? { ...prev, locked: true } : null)
      }
    } catch (error) {
      console.error('Error locking session:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lobby': return 'bg-yellow-100 text-yellow-800'
      case 'running': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-orange-100 text-orange-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'base': return 'bg-blue-100 text-blue-800'
      case 'medio': return 'bg-yellow-100 text-yellow-800'
      case 'avanzato': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard Docente
              </h1>
              {session && (
                <p className="text-gray-600 mt-1">
                  Codice Sessione: <span className="font-mono text-lg font-bold">{session.code}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connesso' : 'Disconnesso'}
              </span>
            </div>
          </div>

          {/* Session Controls */}
          <div className="flex gap-2 flex-wrap">
            {session?.status === 'lobby' && (
              <Button onClick={handleStartSession} disabled={loading} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Avvia Sessione
              </Button>
            )}
            
            {session?.status === 'running' && (
              <Button onClick={handlePauseSession} disabled={loading} variant="outline" className="flex items-center gap-2">
                <Pause className="w-4 h-4" />
                Pausa
              </Button>
            )}
            
            {session?.status === 'paused' && (
              <Button onClick={handleResumeSession} disabled={loading} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Riprendi
              </Button>
            )}
            
            {(session?.status === 'running' || session?.status === 'paused') && (
              <Button onClick={handleEndSession} disabled={loading} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Termina
              </Button>
            )}
            
            {session?.status === 'lobby' && !session?.locked && (
              <Button onClick={handleLockSession} disabled={loading} variant="outline" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Blocca Ingressi
              </Button>
            )}

            {session && (
              <Badge className={getStatusColor(session.status)}>
                {session.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{participants.length}</div>
                  <div className="text-sm text-gray-600">Partecipanti</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {participants.length > 0 
                      ? Math.round(participants.reduce((sum, p) => sum + p.correct_percentage, 0) / participants.length)
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Media Corrette</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-yellow-500 rounded"></div>
                <div>
                  <div className="text-2xl font-bold">
                    {participants.filter(p => p.current_level === 'medio' || p.current_level === 'avanzato').length}
                  </div>
                  <div className="text-sm text-gray-600">Livello Avanzato</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded"></div>
                <div>
                  <div className="text-2xl font-bold">
                    {participants.length > 0 
                      ? Math.round(participants.reduce((sum, p) => sum + p.total_served, 0) / participants.length)
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Media Domande</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Partecipanti ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun partecipante ancora</p>
              </div>
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.participant_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {participant.nome} {participant.cognome}
                        </div>
                        {participant.topic && (
                          <div className="text-sm text-gray-600">
                            Topic: {participant.topic}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">{participant.total_served}/50</div>
                        <div className="text-xs text-gray-600">Domande</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm font-medium">{participant.correct_percentage}%</div>
                        <div className="text-xs text-gray-600">Corrette</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm font-medium">{participant.theta}</div>
                        <div className="text-xs text-gray-600">Theta</div>
                      </div>

                      <Badge className={getLevelColor(participant.current_level)}>
                        {participant.current_level}
                      </Badge>

                      <div className="w-24">
                        <Progress value={(participant.total_served / 50) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
