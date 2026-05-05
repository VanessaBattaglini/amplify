import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    AGENT_LAMBDA_URL: process.env.AGENT_LAMBDA_URL || '(no definida)',
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
