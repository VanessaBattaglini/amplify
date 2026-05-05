'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithRedirect, getCurrentUser } from 'aws-amplify/auth'
import { Amplify } from 'aws-amplify'
import { Hub } from 'aws-amplify/utils'

const COGNITO_CONFIG = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!.replace('https://', ''),
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN!],
          redirectSignOut: [process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT!],
          responseType: 'code' as const,
        },
      },
    },
  },
}

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Completando autenticación...')
  const done = useRef(false)
  const processing = useRef(false)

  useEffect(() => {
    if (processing.current) return
    processing.current = true

    const finish = (path: string) => {
      if (done.current) return
      done.current = true
      router.replace(path)
    }

    // Configurar Amplify
    Amplify.configure(COGNITO_CONFIG)

    console.log('[callback] URL:', window.location.href)

    // Hub listener
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      console.log('[callback Hub]', payload.event)
      if (payload.event === 'signInWithRedirect') {
        setStatus('¡Autenticado! Entrando...')
        unsubscribe()
        finish('/chat')
      }
      if (payload.event === 'signInWithRedirect_failure') {
        console.error('[callback] OAuth falló')
        unsubscribe()
        finish('/login')
      }
    })

    // Llamar signInWithRedirect() sin argumentos — esto dispara el procesamiento del callback
    const processCallback = async () => {
      try {
        console.log('[callback] llamando signInWithRedirect() para procesar el code...')
        await signInWithRedirect()
        // Si llega aquí sin error, el callback se procesó
        console.log('[callback] signInWithRedirect() completó')
      } catch (err) {
        console.error('[callback] signInWithRedirect() error:', err)
        // Puede fallar si ya fue procesado — intentar getCurrentUser
        try {
          await getCurrentUser()
          console.log('[callback] usuario ya autenticado')
          unsubscribe()
          finish('/chat')
        } catch {
          unsubscribe()
          finish('/login')
        }
      }
    }

    processCallback()

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      console.log('[callback] timeout de 15s')
      unsubscribe()
      finish('/login')
    }, 15000)

    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600 gap-4">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-white text-sm opacity-75">{status}</p>
      <p className="text-white text-xs opacity-40">Revisa la consola (F12)</p>
    </div>
  )
}
