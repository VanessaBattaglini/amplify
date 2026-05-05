import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import * as path from 'path'

// Valores del stack AgentCoreStack existente
const RUNTIME_ARN    = 'arn:aws:bedrock-agentcore:us-east-1:881424867190:runtime/agent_core_agent-nAudq75gEv'
const USER_POOL_ID   = 'us-east-1_iIs4B18d1'
const CLIENT_ID      = '7d2bi3uo090vhg8fhfmj9ds80m'
const COGNITO_DOMAIN = 'https://agent-core-867190.auth.us-east-1.amazoncognito.com'

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ── Lambda proxy: Next.js API route → AgentRuntime ───────────────
    const agentProxyLambda = new lambda.Function(this, 'AgentProxyLambda', {
      functionName: 'agent-core-proxy',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda'), {
        exclude: ['local-server.mjs', 'mcp-server.mjs'],
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        RUNTIME_ARN: RUNTIME_ARN,
      },
      description: 'Proxy HTTP entre el frontend Next.js y el AgentRuntime de BedrockAgentCore',
    })

    // Permisos para invocar el AgentRuntime
    agentProxyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'InvokeAgentRuntime',
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore:InvokeAgentRuntime',
          'bedrock-agentcore:InvokeRuntime',
        ],
        resources: [RUNTIME_ARN],
      })
    )

    // ── API Gateway HTTP ──────────────────────────────────────────────
    const httpApi = new apigateway.HttpApi(this, 'AgentProxyApi', {
      apiName: 'agent-core-proxy-api',
      description: 'API Gateway para proxy Lambda → AgentRuntime',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    })

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'AgentProxyIntegration',
      agentProxyLambda
    )

    httpApi.addRoutes({
      path: '/chat',
      methods: [apigateway.HttpMethod.POST],
      integration: lambdaIntegration,
    })

    // ── Outputs ───────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'LambdaProxyUrl', {
      value: `${httpApi.url}chat`,
      description: 'URL de la Lambda proxy — usar como AGENT_LAMBDA_URL en Amplify',
      exportName: 'AgentCoreLambdaProxyUrl',
    })

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: agentProxyLambda.functionName,
      description: 'Nombre de la Lambda proxy',
    })

    new cdk.CfnOutput(this, 'AmplifyEnvVars', {
      value: JSON.stringify({
        NEXT_PUBLIC_COGNITO_USER_POOL_ID: USER_POOL_ID,
        NEXT_PUBLIC_COGNITO_CLIENT_ID: CLIENT_ID,
        NEXT_PUBLIC_COGNITO_DOMAIN: COGNITO_DOMAIN,
        NEXT_PUBLIC_COGNITO_REGION: this.region,
        NEXT_PUBLIC_REDIRECT_SIGN_IN: 'https://TU_DOMINIO_AMPLIFY/auth/callback',
        NEXT_PUBLIC_REDIRECT_SIGN_OUT: 'https://TU_DOMINIO_AMPLIFY',
        AGENT_LAMBDA_URL: `${httpApi.url}chat`,
      }),
      description: 'Variables de entorno para configurar en Amplify (actualizar URLs)',
    })
  }
}
