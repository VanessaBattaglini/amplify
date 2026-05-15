import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_AGENT_LAMBDA_URL = process.env.AGENT_LAMBDA_URL || ''
const LAMBDA_API_KEY           = process.env.LAMBDA_API_KEY   || ''

export async function POST(req: NextRequest) {
  console.log('─── /api/chat POST ───────────────────────────')

  try {
    const body = await req.json()
    const { message, sessionId, agentArn } = body

    const AGENT_LAMBDA_URL = DEFAULT_AGENT_LAMBDA_URL
    console.log('AGENT_LAMBDA_URL:', AGENT_LAMBDA_URL || '(vacío → modo mock)')
    console.log('message:', message)
    console.log('agentArn:', agentArn || '(usando ARN por defecto)')

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'El campo message es requerido' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')

    if (!AGENT_LAMBDA_URL) {
      console.log('→ Modo mock (sin AGENT_LAMBDA_URL)')
      return NextResponse.json({
        response: `[Mock] Recibí tu mensaje: "${message}". Configura AGENT_LAMBDA_URL para conectar con el agente real.`,
        sessionId,
      })
    }

    console.log(`→ Llamando Lambda en: ${AGENT_LAMBDA_URL}`)

    const lambdaResponse = await fetch(AGENT_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LAMBDA_API_KEY,
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ message, sessionId, ...(agentArn ? { agentArn } : {}) }),
    })

    console.log('Lambda status:', lambdaResponse.status)

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text()
      console.error('Lambda error body:', errorText)
      return NextResponse.json(
        { error: `Error del agente: ${lambdaResponse.status} - ${errorText}` },
        { status: lambdaResponse.status }
      )
    }

    const data = await lambdaResponse.json()
    console.log('Lambda response OK:', JSON.stringify(data).slice(0, 200))
    return NextResponse.json(data)

  } catch (err: unknown) {
    console.error('API route exception:', err)
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
