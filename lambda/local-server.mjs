import { createServer } from 'http'
import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

const PORT        = 3001
const REGION      = 'us-east-1'
const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:us-east-1:881424867190:runtime/agent_core_agent-nAudq75gEv'
const HOST        = `bedrock-agentcore.${REGION}.amazonaws.com`
const PATH        = `/runtimes/${encodeURIComponent(RUNTIME_ARN)}/invocations`
const API_KEY     = process.env.LAMBDA_API_KEY || ''

async function invokeRuntime(message, sessionId) {
  const credentials = await fromNodeProviderChain()()
  const body = JSON.stringify({ prompt: message })

  const signer = new SignatureV4({
    credentials,
    region: REGION,
    service: 'bedrock-agentcore',
    sha256: Sha256,
  })

  const request = {
    method: 'POST',
    hostname: HOST,
    path: PATH,
    headers: {
      'Content-Type': 'application/json',
      'host': HOST,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId || crypto.randomUUID(),
    },
    body,
  }

  const signed = await signer.sign(request)

  console.log(`[invoke] POST https://${HOST}${PATH}`)
  console.log(`[invoke] prompt: "${message}"`)

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: signed.headers,
    body,
  })

  console.log(`[invoke] status: ${res.status}`)

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Runtime error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  console.log(`[invoke] response:`, JSON.stringify(data).slice(0, 300))

  // Extraer texto de la respuesta
  const content = data?.result?.content
  if (Array.isArray(content)) {
    const text = content.filter(c => c.text).map(c => c.text).join('\n')
    if (text) return text
  }
  if (typeof data?.result === 'string') return data.result
  return JSON.stringify(data)
}

// ── HTTP Server ──────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }
  if (req.method !== 'POST')    { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }

  // Validar API Key
  const incomingKey = req.headers['x-api-key']
  if (API_KEY && incomingKey !== API_KEY) {
    res.writeHead(401)
    res.end(JSON.stringify({ error: 'API key inválida o ausente' }))
    return
  }

  let body = ''
  req.on('data', chunk => (body += chunk))
  req.on('end', async () => {
    try {
      const { message, sessionId } = JSON.parse(body)
      if (!message) { res.writeHead(400); res.end(JSON.stringify({ error: 'message requerido' })); return }

      const responseText = await invokeRuntime(message, sessionId)
      res.writeHead(200)
      res.end(JSON.stringify({ response: responseText, sessionId }))
    } catch (err) {
      console.error('[ERROR]', err.message)
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`\n🚀 Lambda local → http://localhost:${PORT}`)
  console.log(`   Runtime: https://${HOST}${PATH}\n`)
})
