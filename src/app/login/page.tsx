'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithRedirect, getCurrentUser } from 'aws-amplify/auth'
import { configureAmplify } from '@/lib/amplify-config'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    configureAmplify()
    getCurrentUser()
      .then(() => router.replace('/chat'))
      .catch(() => setLoading(false))
  }, [router])

  const handleGoogleLogin = async () => {
    setSigningIn(true)
    try {
      // Limpiar cualquier estado OAuth previo que pueda estar bloqueando
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('oauth') || key.includes('OAuth') || key.includes('inflight')) {
          localStorage.removeItem(key)
        }
      })
      await signInWithRedirect({ provider: 'Google' })
    } catch (err) {
      console.error('Error al iniciar sesión:', err)
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-800 to-orange-500">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 p-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500 opacity-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl" />
      </div>

      {/* Card de login */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-700 px-8 py-10 text-center">
          {/* Logo / ícono */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-15 rounded-2xl mb-4 backdrop-blur-sm">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AgentCore</h1>
          <p className="text-blue-200 mt-2 text-sm">Tu asistente de inteligencia artificial</p>
        </div>

        {/* Cuerpo */}
        <div className="px-8 py-10">
          <p className="text-slate-600 text-center text-sm mb-8">
            Inicia sesión para comenzar a chatear con el agente
          </p>

          {/* Botón Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {signingIn ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="group-hover:text-orange-600 transition-colors">
              {signingIn ? 'Redirigiendo...' : 'Continuar con Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">acceso seguro</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Info de seguridad */}
          <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Autenticación gestionada por <strong>AWS Cognito</strong>. Tus credenciales nunca son almacenadas por esta aplicación.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-400">
            Powered by{' '}
            <span className="text-orange-500 font-semibold">Bedrock AgentCore</span>
            {' '}·{' '}
            <span className="text-blue-600 font-semibold">AWS</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
