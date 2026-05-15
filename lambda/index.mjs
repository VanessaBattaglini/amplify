/**
 * Lambda proxy de producción.
 * Rutas:
 *   GET  /agents  — lista los AgentRuntimes de la cuenta
 *   POST /chat    — invoca un AgentRuntime con SigV4
 */

import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'

const DEFAULT_RUNTIME_ARN = process.env.RUNTIME_ARN
const REGION = process.env.AWS_REGION || 'us-east-1'
const HOST   = `bedrock-agentcore.${REGION}.amazonaws.com`
const CONTROL_HOST = `bedrock-agentcore-control.${REGION}.amazonaws.com`

function getCredentials() {
  return {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken:    process.env.AWS_SESSION_TOKEN,
  }
}

// ── Listar agentes via control plane ─────────────────────────────
async function listAgents() {
  const path = '/runtimes/'

  const signer = new SignatureV4({
    credentials: getCredentials(),
    region: REGION,
    service: 'bedrock-agentcore',
    sha256: Sha256,
  })

  const signed = await signer.sign({
    method: 'POST',
    hostname: CONTROL_HOST,
    path,
    headers: {
      'Content-Type': 'application/json',
      'host': CONTROL_HOST,
    },
    body: '',
  })

  const res = await fetch(`https://${CONTROL_HOST}${path}`, {
    method: 'POST',
    headers: signed.headers,
    body: '',
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Control plane error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const runtimes = data?.agentRuntimes ?? []

  return runtimes.map(a => ({
    id:          a.agentRuntimeId      ?? '',
    arn:         a.agentRuntimeArn     ?? '',
    name:        a.agentRuntimeName    ?? 'Sin nombre',
    description: a.description         || 'Sin descripción',
    status:      a.status              ?? 'UNKNOWN',
    version:     a.agentRuntimeVersion ?? '1',
  }))
}

// ── Invocar AgentRuntime ──────────────────────────────────────────
async function invokeRuntime(payload, sessionId, runtimeArn) {
  const arn  = runtimeArn || DEFAULT_RUNTIME_ARN
  const path = `/runtimes/${encodeURIComponent(arn)}/invocations`
  const body = JSON.stringify(payload)

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
    if (text) return cleanText(text)
  }
  if (typeof data?.result === 'string') return cleanText(data.result)
  return cleanText(JSON.stringify(data?.result || data))
}

/**
 * Construye el payload que se envía al agente.
 *
 * Soporta dos formatos de entrada:
 *
 * 1. Prompt directo (chat normal):
 *    { message: "texto libre", sessionId, agentArn }
 *
 * 2. Trigger estructurado (agentes con actions):
 *    { action: "analyze_deployment", issue_key: "CD-123", sessionId, agentArn }
 *    { action: "analyze_deployment", issue: "CD-123", ... }  ← "issue" se mapea a "issue_key"
 */
function buildPayload(body) {
  const { message, action, issue_key, issue } = body

  // Formato 1 — prompt directo
  if (message) {
    return { prompt: message }
  }

  // Formato 2 — trigger estructurado
  if (action) {
    return {
      action,
      issue_key: issue_key || issue || '',
    }
  }

  return null
}

// Limpia strings con escapes dobles que devuelven algunos agentes HTTP
function cleanText(text) {
  try {
    // Si el texto es un JSON string escapado, lo desenvuelve
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') return parsed.trim()
  } catch {
    // No era JSON, devolver tal cual
  }
  return text.trim()
}

// ── Handler principal ─────────────────────────────────────────────
export const handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  const method = event.requestContext?.http?.method
  const routePath = event.requestContext?.http?.path ?? event.rawPath ?? ''

  // Preflight CORS
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  // ── Validar API Key ───────────────────────────────────────────
  const API_KEY = process.env.API_KEY
  const incomingKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key']

  if (!API_KEY || incomingKey !== API_KEY) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'API key inválida o ausente' }),
    }
  }

  try {
    // GET /agents — listar agentes
    if (method === 'GET' && routePath.includes('/agents')) {
      const agents = await listAgents()
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ agents }) }
    }

    // POST /analyze — endpoint M2M para triggers estructurados o prompt libre
    // Formato 1: { message: "texto libre", agentArn?, sessionId? }
    // Formato 2: { action, issue_key, agentArn?, sessionId? }
    // Acciones: analyze_deployment | analyze_epic | default (resumen)
    if (method === 'POST' && routePath.includes('/analyze')) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {})
      const { action, issue_key, issue, sessionId, agentArn } = body

      const payload = buildPayload(body)

      if (!payload) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Se requiere "message" (prompt libre) o "action" + "issue_key" (trigger estructurado)',
          }),
        }
      }

      const responseText = await invokeRuntime(payload, sessionId, agentArn)
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          response: responseText,
          sessionId,
          ...(action    ? { action }                              : {}),
          ...(issue_key || issue ? { issue_key: issue_key || issue } : {}),
        }),
      }
    }

    // POST /chat — invocar agente (chat normal del frontend)
    if (method === 'POST' && routePath.includes('/chat')) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || {})
      const { sessionId, agentArn } = body

      const payload = buildPayload(body)

      if (!payload) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Se requiere "message" (prompt directo) o "action" + "issue_key" (trigger estructurado)',
          }),
        }
      }

      const responseText = await invokeRuntime(payload, sessionId, agentArn)
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ response: responseText, sessionId }) }
    }

    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Ruta no encontrada' }) }

  } catch (err) {
    console.error('Lambda handler error:', err)
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message || 'Error interno' }) }
  }
}
