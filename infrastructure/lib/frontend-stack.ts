import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import * as path from 'path'

const RUNTIME_ARN    = 'arn:aws:bedrock-agentcore:us-east-1:881424867190:runtime/agent_core_agent-nAudq75gEv'
const USER_POOL_ID   = 'us-east-1_iIs4B18d1'
const CLIENT_ID      = '7d2bi3uo090vhg8fhfmj9ds80m'
const COGNITO_DOMAIN = 'https://agent-core-867190.auth.us-east-1.amazoncognito.com'

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ── Lambda proxy con bundle automático (esbuild) ──────────────
    const agentProxyLambda = new lambdaNodejs.NodejsFunction(this, 'AgentProxyLambda', {
      functionName: 'agent-core-proxy',
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../lambda/index.mjs'),
      handler: 'handler',
      projectRoot: path.join(__dirname, '../../lambda'),
      depsLockFilePath: path.join(__dirname, '../../lambda/package-lock.json'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        RUNTIME_ARN: RUNTIME_ARN,
      },
      bundling: {
        minify: false,
        sourceMap: false,
        target: 'node20',
        format: lambdaNodejs.OutputFormat.ESM,
        nodeModules: ['@smithy/signature-v4', '@aws-crypto/sha256-js'],
        externalModules: [],
      },
      description: 'Proxy HTTP entre el frontend Next.js y el AgentRuntime de BedrockAgentCore',
    })

    agentProxyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'InvokeAgentRuntime',
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock-agentcore:InvokeAgentRuntime',
          'bedrock-agentcore:InvokeRuntime',
        ],
        resources: [
          RUNTIME_ARN,
          `${RUNTIME_ARN}/runtime-endpoint/*`,
          // Permitir invocar cualquier runtime de la cuenta
          `arn:aws:bedrock-agentcore:${this.region}:${this.account}:runtime/*`,
        ],
      })
    )

    // ── API Gateway HTTP ──────────────────────────────────────────
    const httpApi = new apigateway.HttpApi(this, 'AgentProxyApi', {
      apiName: 'agent-core-proxy-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    })

    httpApi.addRoutes({
      path: '/chat',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('AgentProxyIntegration', agentProxyLambda),
    })

    // ── Outputs ───────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'LambdaProxyUrl', {
      value: `${httpApi.url}chat`,
      description: 'URL de la Lambda proxy',
      exportName: 'AgentCoreLambdaProxyUrl',
    })

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: agentProxyLambda.functionName,
    })

    new cdk.CfnOutput(this, 'AmplifyEnvVars', {
      value: JSON.stringify({
        NEXT_PUBLIC_COGNITO_USER_POOL_ID: USER_POOL_ID,
        NEXT_PUBLIC_COGNITO_CLIENT_ID: CLIENT_ID,
        NEXT_PUBLIC_COGNITO_DOMAIN: COGNITO_DOMAIN,
        NEXT_PUBLIC_COGNITO_REGION: this.region,
        NEXT_PUBLIC_REDIRECT_SIGN_IN: 'https://main.d32mm4yvz4jkah.amplifyapp.com/auth/callback',
        NEXT_PUBLIC_REDIRECT_SIGN_OUT: 'https://main.d32mm4yvz4jkah.amplifyapp.com',
        AGENT_LAMBDA_URL: `${httpApi.url}chat`,
      }),
    })
  }
}
