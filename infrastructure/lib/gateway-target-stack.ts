import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

/**
 * Stack que agrega el GatewayTarget faltante al gateway MCP existente.
 * Conecta el AgentRuntime con el Gateway para que el chat funcione.
 */
export class GatewayTargetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const GATEWAY_ID   = 'agent-core-gateway-rd7jyrqzns'
    const RUNTIME_ID   = 'agent_core_agent-nAudq75gEv'
    const REGION       = 'us-east-1'

    // Endpoint HTTP del AgentRuntime
    const runtimeEndpoint = `https://${RUNTIME_ID}.runtime.bedrock-agentcore.${REGION}.amazonaws.com`

    new cdk.CfnResource(this, 'AgentGatewayTarget', {
      type: 'AWS::BedrockAgentCore::GatewayTarget',
      properties: {
        GatewayIdentifier: GATEWAY_ID,
        Name: 'agent-runtime-target',
        Description: 'Conecta el AgentRuntime al Gateway MCP',
        CredentialProviderConfigurations: [
          {
            CredentialProviderType: 'GATEWAY_IAM_ROLE',
            CredentialProvider: {
              IamCredentialProvider: {
                Service: 'bedrock-agentcore',
                Region: REGION,
              },
            },
          },
        ],
        TargetConfiguration: {
          Mcp: {
            McpServer: {
              Endpoint: runtimeEndpoint,
              ListingMode: 'DEFAULT',
            },
          },
        },
      },
    })

    new cdk.CfnOutput(this, 'GatewayTargetInfo', {
      value: `Gateway ${GATEWAY_ID} → Runtime ${runtimeEndpoint}`,
      description: 'Conexión Gateway → Runtime configurada',
    })
  }
}
