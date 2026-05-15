import { NextResponse } from 'next/server'

const AGENT_LAMBDA_URL = process.env.AGENT_LAMBDA_URL || ''
const LAMBDA_API_KEY   = process.env.LAMBDA_API_KEY   || ''

export async function GET() {
  if (!AGENT_LAMBDA_URL) {
    return NextResponse.json({ error: 'AGENT_LAMBDA_URL no configurada' }, { status: 500 })
  }

  const agentsUrl = AGENT_LAMBDA_URL.replace(/\/chat$/, '/agents')

  try {
    const res = await fetch(agentsUrl, {
      method: 'GET',
      headers: { 'x-api-key': LAMBDA_API_KEY },
    })
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
