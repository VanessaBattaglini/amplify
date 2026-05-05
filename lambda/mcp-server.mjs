#!/usr/bin/env node
/**
 * Servidor MCP para Kiro — expone el AgentRuntime como una tool MCP.
 * Usa credenciales AWS del CLI (no necesita JWT de Cognito).
 *
 * Protocolo: JSON-RPC 2.0 sobre stdio (estándar MCP)
 * Uso en mcp.json: { "command": "node", "args": ["ruta/a/mcp-server.mjs"] }
 */

import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

const REGION      = 'us-east-1'
const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:us-east-1:881424867190:runtime/agent_core_agent-nAudq75gEv'
const HOST        = `bedrock-agentcore.${REGION}.amazonaws.com`
const PATH        = `/runtimes/${encodeURIComponent(RUNTIME_ARN)}/invocations`

// Sesión persistente para mantener contexto de conversación
let currentSessionId = crypto.randomUUID()

async function invokeAgent(prompt, sessionId) {
  const credentials = await fromNodeProviderChain()()
  const body = JSON.stringify({ prompt })

  const signer = new SignatureV4({
    credentials,
    region: REGION,
    service: 'bedrock-agentcore',
    sha256: Sha256,
  })

  const signed = await signer.sign({
    method: 'POST',
    hostname: HOST,
    path: PATH,
    headers: {
      'Content-Type': 'application/json',
      'host': HOST,
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': sessionId,
    },
    body,
  })

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers: signed.headers,
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Runtime error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const content = data?.result?.content
  if (Array.isArray(content)) {
    return content.filter(c => c.text).map(c => c.text).join('\n')
  }
  return JSON.stringify(data?.result || data)
}

// ── MCP Protocol (JSON-RPC 2.0 sobre stdio) ──────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function error(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

const TOOLS = [
  {
    name: 'ask_agent',
    description: 'Envía un mensaje al agente conversacional AgentCore y obtiene una respuesta. El agente mantiene contexto de la conversación.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'El mensaje o pregunta para el agente',
        },
        new_session: {
          type: 'boolean',
          description: 'Si es true, inicia una nueva sesión de conversación (borra el contexto anterior)',
        },
      },
      required: ['prompt'],
    },
  },
]

async function handleRequest(req) {
  const { id, method, params } = req

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'agentcore-mcp', version: '1.0.0' },
        },
      })
      break

    case 'notifications/initialized':
      // No response needed
      break

    case 'tools/list':
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
      break

    case 'tools/call': {
      const { name, arguments: args } = params || {}

      if (name !== 'ask_agent') {
        error(id, -32601, `Tool desconocida: ${name}`)
        break
      }

      const { prompt, new_session } = args || {}
      if (!prompt) {
        error(id, -32602, 'El campo prompt es requerido')
        break
      }

      if (new_session) {
        currentSessionId = crypto.randomUUID()
      }

      try {
        const response = await invokeAgent(prompt, currentSessionId)
        send({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: response }],
          },
        })
      } catch (err) {
        send({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        })
      }
      break
    }

    default:
      error(id, -32601, `Método no soportado: ${method}`)
  }
}

// Leer JSON-RPC desde stdin línea por línea
let buffer = ''
const pending = []
process.stdin.setEncoding('utf8')
process.stdin.on('data', async (chunk) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop()

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const req = JSON.parse(trimmed)
      const p = handleRequest(req)
      pending.push(p)
    } catch (e) {
      process.stderr.write(`Parse error: ${e.message}\n`)
    }
  }
})

process.stdin.on('end', async () => {
  // Procesar línea incompleta si quedó algo en el buffer
  if (buffer.trim()) {
    try {
      const req = JSON.parse(buffer.trim())
      pending.push(handleRequest(req))
    } catch {}
  }
  // Esperar que todos los requests pendientes terminen
  await Promise.all(pending)
  process.exit(0)
})
process.stderr.write(`AgentCore MCP server iniciado. Runtime: ${RUNTIME_ARN}\n`)
