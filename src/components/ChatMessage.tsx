'use client'

import { useEffect, useRef } from 'react'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface ChatMessageProps {
  message: Message
  userInitial: string
}

export default function ChatMessage({ message, userInitial }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm
        ${isUser
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
          : 'bg-gradient-to-br from-blue-700 to-blue-800 text-white'
        }`}
      >
        {isUser ? userInitial : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </div>

      {/* Burbuja */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed
          ${isUser
            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm'
            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
          }`}
        >
          {message.isLoading ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="agent-response"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
            />
          )}
        </div>

        {/* Timestamp */}
        {!message.isLoading && (
          <span className="text-xs text-slate-400 px-1">
            {message.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-blue-400 rounded-full animate-pulse-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  )
}

/** Convierte markdown básico a HTML seguro */
function formatMarkdown(text: string): string {
  return text
    // Bloques de código
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Negrita
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Cursiva
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Encabezados
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Listas
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Saltos de línea
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    // Envolver en párrafo
    .replace(/^(?!<[hup])(.+)/, '<p>$1</p>')
}
