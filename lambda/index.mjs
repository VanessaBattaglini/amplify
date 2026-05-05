/**
 * Lambda proxy de producción.
 * Invoca el AgentRuntime de BedrockAgentCore usando SigV4.
 * Soporta agentArn dinámico para cambiar de agente desde el frontend.
 */

import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'

const DEFAULT_RUNTIME_ARN = process.env.RUNTIME_ARN
const REGION = process.env.AWS_REGION || 'us-east-1'
const HOST   = `bedrock-agentcore.${REGION}.amazonaws.com`

function getCredentials() {
  return {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken:    process.env.AWS_SESSION_TOKEN,
  }
}

async function invokeRuntime(message, sessionId, runtimeArn) {
  const arn  = runtimeArn || DEFAULT_RUNTIME_ARN
  const path = `/runtimes/${encodeURIComponent(arn)}/invocations`
  const body = JSON.stringify({ prompt: message })

  const signer = new SignatureV4({
    credentials: getCredentials(),
    region: REGION,
    service: 'bedrock-agentcore',
    sha256: Sha256,
  })

  const signed = await signer.sign({
    method: 'POST',
    hostname: HOST,
    path,
    headers: {
      'Content-Type': 'application/json',
      'host': HOST,
      ...(sessionId ? { 'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId } : {}),
    },
    body,
  })

  const res = await fetch(`https://${HOST}${path}`, {
    method: 'POST',
    headers: signed.headers,
    body,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Runtime error (${res.status}): ${errText}`)
  }

  const data = await res.json()

  const content = data?.result?.content
  if (Array.isArray(content)) {
    const text = content.filter(c => c.text).map(c => c.text).join('\n')
    if (text) return text
  }
  if (typeof data?.result === 'string') return data.result
  return JSON.stringify(data?.result || data)
}

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {})
    const { message, sessionId, agentArn } = body

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'El campo message es requerido' }) }
    }

    const responseText = await invokeRuntime(message, sessionId, agentArn)
    return { statusCode: 200, headers, body: JSON.stringify({ response: responseText, sessionId }) }

  } catch (err) {
    console.error('Lambda handler error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Error interno' }) }
  }
}
