import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_ID = 'agent-core-gateway-rd7jyrqzns'
const REGION = 'us-east-1'
const endpoint = `https://${GATEWAY_ID}.gateway.bedrock-agentcore.${REGION}.amazonaws.com/mcp`

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Falta Authorization header' }, { status: 401 })
  }

  const sessionId = 'debug-session-' + Date.now()

  // initialize
  const initRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, 'x-amz-mcp-session-id': sessionId },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'debug', version: '1.0' } } })
  })
  const initData = await initRes.json()
  const activeSid = initRes.headers.get('x-amz-mcp-session-id') || sessionId

  // tools/list
  const listRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, 'x-amz-mcp-session-id': activeSid },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  })
  const listData = await listRes.json()

  return NextResponse.json({ initStatus: initRes.status, initData, listStatus: listRes.status, listData })
}
