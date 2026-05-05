import { NextResponse } from 'next/server'
import { BedrockAgentCoreControlClient, ListAgentRuntimesCommand, ListAgentRuntimesCommandOutput } from '@aws-sdk/client-bedrock-agentcore-control'

export async function GET() {
  try {
    const client = new BedrockAgentCoreControlClient({ region: 'us-east-1' })
    const output: ListAgentRuntimesCommandOutput = await client.send(new ListAgentRuntimesCommand({}))

    const agents = (output.agentRuntimes ?? []).map((a) => ({
      id:          a.agentRuntimeId   ?? '',
      arn:         a.agentRuntimeArn  ?? '',
      name:        a.agentRuntimeName ?? 'Sin nombre',
      description: a.description      || 'Sin descripción',
      status:      a.status           ?? 'UNKNOWN',
      version:     a.agentRuntimeVersion ?? '1',
    }))

    return NextResponse.json({ agents })
  } catch (err: unknown) {
    console.error('Error listando agentes:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
