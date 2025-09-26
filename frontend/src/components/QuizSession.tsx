import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle, XCircle, BookOpen } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Question {
  topic: string
  level: string
  difficulty: number
  question: string
  options: string[]
  explain_brief: string
  explain_detailed: string
  source_refs: string[]
}

interface AnswerResponse {
  correct: boolean
  next_action: string
  explanation?: string
  total_served: number
  current_level: string
  theta: number
}

export default function QuizSession() {
  const { code, participantId } = useParams()
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [lastResult, setLastResult] = useState<AnswerResponse | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)

  const getNextQuestion = useCallback(async () => {
    if (!code || !participantId) {
      console.log('Missing code or participantId:', { code, participantId })
      return
    }

    console.log('Fetching next question for:', { code, participantId })

    try {
      const response = await fetch(`${API_URL}/api/session/next?participant_id=${participantId}&session_code=${code}`, {
        method: 'POST',
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const question = await response.json()
        console.log('Received question:', question)
        setCurrentQuestion(question)
        setTimeLeft(30)
        setSelectedAnswer(null)
        setShowResult(false)
        setShowExplanation(false)
      } else if (response.status === 400) {
        console.log('Maximum questions reached, finishing quiz')
        setFinished(true)
      } else {
        const errorText = await response.text()
        console.error('API error:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error getting next question:', error)
    }
  }, [code, participantId])

  const handleSubmitAnswer = useCallback(async (retryCount = 0) => {
    if (!code || !participantId || selectedAnswer === null) return

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/session/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participant_id: participantId,
          session_code: code,
          answer_index: selectedAnswer,
          elapsed_ms: 30000 - (timeLeft * 1000)
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setLastResult(result)
        setShowResult(true)
        console.log('Answer submitted successfully:', result)

        if (result.next_action === 'explanation_required') {
          setShowExplanation(true)
        } else if (result.next_action === 'finished') {
          setFinished(true)
        }
      } else {
        console.error('Answer submission failed:', response.status, await response.text())
        if (retryCount < 2) {
          console.log(`Retrying answer submission (attempt ${retryCount + 1}/3)`)
          setTimeout(() => handleSubmitAnswer(retryCount + 1), 1000)
          return
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      if (retryCount < 2) {
        console.log(`Retrying answer submission after error (attempt ${retryCount + 1}/3)`)
        setTimeout(() => handleSubmitAnswer(retryCount + 1), 1000)
        return
      }
    } finally {
      setLoading(false)
    }
  }, [code, participantId, selectedAnswer, timeLeft])

  useEffect(() => {
    if (!code || !participantId) return

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isComponentMounted = true
    let reconnectAttempts = 0

    const connect = () => {
      if (!isComponentMounted) return

      const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
      const wsUrl = `${WS_URL}/ws/participant/${code}/${participantId}`
      
      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!isComponentMounted) return
          reconnectAttempts = 0
          console.log(`Quiz WebSocket connected for participant ${participantId}`)
        }

        ws.onmessage = (event) => {
          if (!isComponentMounted) return
          
          try {
            const data = JSON.parse(event.data)
            console.log(`Quiz received message:`, data.type)
            
            switch (data.type) {
              case 'round.start':
                setCurrentQuestion(data.question)
                setTimeLeft(data.timer || 30)
                setSelectedAnswer(null)
                setShowResult(false)
                setShowExplanation(false)
                break
              case 'live.end':
                setFinished(true)
                break
            }
          } catch (error) {
            console.error('Error parsing Quiz WebSocket message:', error)
          }
        }

        ws.onclose = (event) => {
          if (!isComponentMounted) return
          
          console.log(`Quiz WebSocket closed for participant ${participantId}:`, event.code, event.reason)
          
          if (event.code !== 1000 && reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
            console.log(`Quiz attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`)
            
            reconnectTimeout = setTimeout(() => {
              if (isComponentMounted) {
                reconnectAttempts++
                connect()
              }
            }, delay)
          }
        }

        ws.onerror = (error) => {
          console.error('Quiz WebSocket error:', error)
        }

      } catch (error) {
        console.error('Error creating Quiz WebSocket:', error)
        if (isComponentMounted && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectTimeout = setTimeout(() => {
            if (isComponentMounted) {
              reconnectAttempts++
              connect()
            }
          }, delay)
        }
      }
    }

    connect()
    getNextQuestion()

    return () => {
      isComponentMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting')
      }
    }
  }, [code, participantId]) // Removed getNextQuestion from dependencies to prevent unnecessary reconnections

  useEffect(() => {
    if (timeLeft > 0 && currentQuestion && !showResult) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      handleSubmitAnswer()
    }
  }, [timeLeft, currentQuestion, showResult, handleSubmitAnswer])

  const handleContinue = () => {
    if (lastResult?.next_action === 'finished') {
      setFinished(true)
    } else {
      getNextQuestion()
    }
  }

  const handleRequestBrief = () => {
    setShowExplanation(true)
  }

  if (finished) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Quiz Completato!
            </h1>
            <p className="text-lg text-gray-600">
              Hai completato tutte le domande disponibili.
            </p>
          </div>

          {lastResult && (
            <Card>
              <CardHeader>
                <CardTitle>Risultati Finali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {lastResult.total_served}
                    </div>
                    <div className="text-sm text-gray-600">Domande Totali</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {lastResult.current_level}
                    </div>
                    <div className="text-sm text-gray-600">Livello Raggiunto</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento domanda...</p>
        </div>
      </div>
    )
  }

  if (showExplanation && currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Spiegazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Risposta Corretta:</h3>
                <p className="text-blue-800">
                  {currentQuestion.options[1]} {/* This should be the correct answer */}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Spiegazione Dettagliata:</h3>
                <p className="text-gray-700 leading-relaxed">
                  {currentQuestion.explain_detailed}
                </p>
              </div>

              <div className="text-sm text-gray-500">
                <strong>Fonte:</strong> {currentQuestion.source_refs.join(', ')}
              </div>

              <Button onClick={handleContinue} className="w-full">
                Continua
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showResult && lastResult) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {lastResult.correct ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                {lastResult.correct ? 'Risposta Corretta!' : 'Risposta Errata'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{lastResult.total_served}/50</div>
                  <div className="text-sm text-gray-600">Domande</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{lastResult.current_level}</div>
                  <div className="text-sm text-gray-600">Livello</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{lastResult.theta}</div>
                  <div className="text-sm text-gray-600">Theta</div>
                </div>
              </div>

              {lastResult.correct ? (
                <div className="space-y-3">
                  <p className="text-green-700">
                    Ottimo lavoro! Puoi continuare con la prossima domanda.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleContinue} className="flex-1">
                      Continua
                    </Button>
                    <Button onClick={handleRequestBrief} variant="outline">
                      Breve Ripasso
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-red-700">
                    {lastResult.explanation}
                  </p>
                  <Button onClick={() => setShowExplanation(true)} className="w-full">
                    Leggi Spiegazione Dettagliata
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <Badge variant="outline">
              {currentQuestion.topic} - {currentQuestion.level}
            </Badge>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-600'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
          <Progress value={(30 - timeLeft) / 30 * 100} className="h-2" />
        </div>

        {/* Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedAnswer === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {option}
              </button>
            ))}

            <Button
              onClick={() => handleSubmitAnswer()}
              disabled={selectedAnswer === null || loading}
              className="w-full mt-6"
            >
              {loading ? 'Invio in corso...' : 'Conferma Risposta'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
