import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, Wifi } from 'lucide-react'

interface Participant {
  participant_id: string
  nome: string
  cognome: string
}

export default function StudentLobby() {
  const { code } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const participantId = searchParams.get('participantId')
  
  const [participants, setParticipants] = useState<Participant[]>([])
  const [status, setStatus] = useState('lobby')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  useEffect(() => {
    if (!participantId || !code) return

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isComponentMounted = true

    const connect = () => {
      if (!isComponentMounted) return

      const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
      const wsUrl = `${WS_URL}/ws/participant/${code}/${participantId}`
      
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!isComponentMounted) return
          setConnected(true)
          setReconnectAttempts(0)
          console.log(`Student WebSocket connected to session ${code}`)
        }

        ws.onmessage = (event) => {
          if (!isComponentMounted) return
          
          try {
            const data = JSON.parse(event.data)
            console.log(`Student received message:`, data.type)
            
            switch (data.type) {
              case 'lobby.update':
                setParticipants(data.participants)
                break
              case 'live.start':
                setStatus('starting')
                setCountdown(data.countdown)
                break
              case 'round.start':
                navigate(`/quiz/${code}/${participantId}`)
                break
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = (event) => {
          if (!isComponentMounted) return
          
          setConnected(false)
          console.log(`Student WebSocket closed for session ${code}:`, event.code, event.reason)
          
          if (event.code !== 1000 && reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000) // Exponential backoff, max 10s
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`)
            
            reconnectTimeout = setTimeout(() => {
              if (isComponentMounted) {
                setReconnectAttempts(prev => prev + 1)
                connect()
              }
            }, delay)
          }
        }

        ws.onerror = (error) => {
          console.error('Student WebSocket error:', error)
        }

      } catch (error) {
        console.error('Error creating WebSocket:', error)
        if (isComponentMounted && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectTimeout = setTimeout(() => {
            if (isComponentMounted) {
              setReconnectAttempts(prev => prev + 1)
              connect()
            }
          }, delay)
        }
      }
    }

    connect()

    return () => {
      isComponentMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting')
      }
    }
  }, [participantId, code]) // Removed navigate from dependencies to prevent unnecessary reconnections

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sessione {code}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wifi className={`w-4 h-4 ${connected ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connesso' : 'Disconnesso'}
            </span>
          </div>
          
          {status === 'lobby' && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              In attesa di iniziare...
            </Badge>
          )}
          
          {status === 'starting' && countdown !== null && (
            <div className="text-center">
              <Badge variant="default" className="text-xl px-6 py-3 mb-4">
                Il quiz inizia tra {countdown} secondi
              </Badge>
              <div className="text-6xl font-bold text-blue-600 animate-pulse">
                {countdown}
              </div>
            </div>
          )}
        </div>

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
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>In attesa di altri partecipanti...</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {participants.map((participant) => (
                  <div
                    key={participant.participant_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      participant.participant_id === participantId
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className="font-medium">
                      {participant.nome} {participant.cognome}
                    </span>
                    {participant.participant_id === participantId && (
                      <Badge variant="default">Tu</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {status === 'lobby' && (
          <div className="mt-6 text-center text-gray-600">
            <p>Attendi che il docente avvii il quiz.</p>
            <p className="text-sm mt-2">
              La sessione inizierà automaticamente per tutti i partecipanti.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
