import { NextResponse } from 'next/server'

// Llama a la Lambda proxy que tiene credenciales IAM para el control plane
const AGENT_LAMBDA_URL = process.env.AGENT_LAMBDA_URL || ''

export async function GET() {
  if (!AGENT_LAMBDA_URL) {
    return NextResponse.json({ error: 'AGENT_LAMBDA_URL no configurada' }, { status: 500 })
  }

  // La URL de la Lambda es https://xxx.execute-api.../chat
  // Reemplazamos /chat por /agents
  const agentsUrl = AGENT_LAMBDA_URL.replace(/\/chat$/, '/agents')

  try {
    const res = await fetch(agentsUrl, { method: 'GET' })
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Error del servidor' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
