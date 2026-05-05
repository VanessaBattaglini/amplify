'use client'

import { LogOut, MessageSquare, Plus } from 'lucide-react'

interface SidebarProps {
  userName: string
  userEmail: string
  onNewChat: () => void
  onLogout: () => void
}

export default function Sidebar({ userName, userEmail, onNewChat, onLogout }: SidebarProps) {
  const initial = userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || 'U'

  return (
    <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-blue-900 to-blue-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">AgentCore</h1>
            <p className="text-blue-300 text-xs">Asistente IA</p>
          </div>
        </div>
      </div>

      {/* Nuevo chat */}
      <div className="px-4 py-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo chat
        </button>
      </div>

      {/* Historial (placeholder) */}
      <div className="flex-1 px-4 overflow-y-auto">
        <p className="text-blue-400 text-xs font-medium uppercase tracking-wider mb-2 px-1">Recientes</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-700 bg-opacity-50 cursor-pointer">
            <MessageSquare className="w-4 h-4 text-blue-300 flex-shrink-0" />
            <span className="text-blue-100 text-sm truncate">Chat actual</span>
          </div>
        </div>
      </div>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-blue-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName || 'Usuario'}</p>
            <p className="text-blue-300 text-xs truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-700 rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
