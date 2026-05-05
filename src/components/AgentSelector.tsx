'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Bot, CheckCircle2, Loader2 } from 'lucide-react'

export interface Agent {
  id: string
  arn: string
  name: string
  description: string
  status: string
  version: string
}

interface AgentSelectorProps {
  selectedArn: string
  onSelect: (agent: Agent) => void
}

export default function AgentSelector({ selectedArn, onSelect }: AgentSelectorProps) {
  const [agents, setAgents]     = useState<Agent[]>([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        if (data.agents) {
          setAgents(data.agents)
          // Si no hay selección previa, seleccionar el primero automáticamente
          if (!selectedArn && data.agents.length > 0) {
            onSelect(data.agents[0])
          }
        } else {
          setError(data.error || 'Error cargando agentes')
        }
      })
      .catch(() => setError('No se pudieron cargar los agentes'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = agents.find(a => a.arn === selectedArn)

  return (
    <div className="relative">
      <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-2 px-1">Agente activo</p>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading || !!error}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-800 hover:bg-blue-700 border border-blue-600 rounded-xl text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 text-blue-300 animate-spin flex-shrink-0" />
        ) : (
          <Bot className="w-4 h-4 text-orange-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {loading ? (
            <span className="text-blue-300 text-xs">Cargando agentes...</span>
          ) : error ? (
            <span className="text-red-400 text-xs truncate">{error}</span>
          ) : selected ? (
            <span className="text-white text-xs font-medium truncate block">{selected.name}</span>
          ) : (
            <span className="text-blue-300 text-xs">Seleccionar agente</span>
          )}
        </div>
        {!loading && !error && (
          <ChevronDown className={`w-3.5 h-3.5 text-blue-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && agents.length > 0 && (
        <>
          {/* Overlay para cerrar */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-blue-900 border border-blue-600 rounded-xl shadow-xl overflow-hidden">
            {agents.map((agent) => {
              const isSelected = agent.arn === selectedArn
              const isReady    = agent.status === 'READY'
              return (
                <button
                  key={agent.id}
                  onClick={() => { onSelect(agent); setOpen(false) }}
                  disabled={!isReady}
                  className={`w-full text-left px-3 py-3 flex items-start gap-2.5 transition-colors border-b border-blue-800 last:border-0
                    ${isSelected ? 'bg-blue-700' : 'hover:bg-blue-800'}
                    ${!isReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isSelected
                      ? <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      : <Bot className="w-4 h-4 text-blue-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-xs font-medium truncate">{agent.name}</span>
                      {!isReady && (
                        <span className="text-yellow-400 text-xs">({agent.status})</span>
                      )}
                    </div>
                    <p className="text-blue-300 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
