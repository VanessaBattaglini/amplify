#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { FrontendStack } from '../lib/frontend-stack'

const app = new cdk.App()

new FrontendStack(app, 'AgentCoreFrontendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '881424867190',
    region:  process.env.CDK_DEFAULT_REGION  || 'us-east-1',
  },
  description: 'Lambda proxy + API Gateway para el frontend AgentCore',
})
