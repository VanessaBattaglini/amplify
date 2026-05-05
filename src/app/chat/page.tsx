'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth'
import { configureAmplify } from '@/lib/amplify-config'
import ChatMessage, { Message } from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import Sidebar from '@/components/Sidebar'
import { v4 as uuidv4 } from 'uuid'

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy tu asistente de IA potenciado por **Bedrock AgentCore**. ¿En qué puedo ayudarte hoy?',
  timestamp: new Date(),
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sessionId] = useState(() => uuidv4())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Verificar autenticación
  useEffect(() => {
    configureAmplify()
    getCurrentUser()
      .then((user) => {
        setUserEmail(user.signInDetails?.loginId || '')
        // El nombre viene de los atributos de Cognito
        fetchAuthSession().then((session) => {
          const payload = session.tokens?.idToken?.payload
          const name = (payload?.['name'] as string) ||
                       (payload?.['given_name'] as string) ||
                       (payload?.['email'] as string) ||
                       'Usuario'
          setUserName(name)
        })
      })
      .catch(() => router.replace('/login'))
  }, [router])

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async (content: string) => {
    if (isLoading) return

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    // Agregar indicador de carga del agente
    const loadingId = uuidv4()
    const loadingMessage: Message = {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setIsLoading(true)

    try {
      // Obtener token JWT de Cognito
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const replyText = data.response || data.message || data.content || 'Sin respuesta del agente.'

      // Reemplazar el mensaje de carga con la respuesta real
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: replyText, isLoading: false, timestamp: new Date() }
            : m
        )
      )
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Error desconocido'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                content: `⚠️ Error al contactar al agente: ${errorText}`,
                isLoading: false,
                timestamp: new Date(),
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId])

  const handleNewChat = () => {
    setMessages([{ ...WELCOME_MESSAGE, id: uuidv4(), timestamp: new Date() }])
  }

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  const userInitial = userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
      />

      {/* Área principal del chat */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            <div>
              <h2 className="text-slate-800 font-semibold text-sm">Agente Conversacional</h2>
              <p className="text-slate-400 text-xs">Bedrock AgentCore · MCP Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Sesión autenticada
          </div>
        </header>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              userInitial={userInitial}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
          <ChatInput onSend={handleSend} disabled={isLoading} />
          <p className="text-center text-xs text-slate-400 mt-2">
            El agente puede cometer errores. Verifica información importante.
          </p>
        </div>
      </main>
    </div>
  )
}
