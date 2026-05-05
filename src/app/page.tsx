'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from 'aws-amplify/auth'
import { configureAmplify } from '@/lib/amplify-config'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    configureAmplify()
    getCurrentUser()
      .then(() => router.replace('/chat'))
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-orange-600">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
