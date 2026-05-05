# AgentCore Frontend

Chat con Next.js + AWS Amplify conectado a Bedrock AgentCore via MCP.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Auth**: AWS Cognito + Google OAuth (reutiliza el User Pool existente)
- **API**: Next.js API Route → Lambda proxy → AgentCore MCP Gateway
- **Infra**: CDK (TypeScript)
- **Hosting**: AWS Amplify

---

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno (ya configuradas con tus valores reales)
# .env.local ya existe con los valores del stack AgentCoreStack

# 3. Levantar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> En modo local, si `AGENT_LAMBDA_URL` está vacío, la API devuelve respuestas mock.

---

## Deploy en AWS

### Paso 1 — Deploy de la infraestructura (Lambda + API Gateway + Amplify App)

```bash
cd infrastructure
npm install
npx cdk deploy
```

Esto crea:
- **Lambda proxy** que traduce HTTP → MCP
- **API Gateway HTTP** que expone la Lambda
- **Amplify App** lista para conectar tu repositorio

### Paso 2 — Conectar repositorio a Amplify

Antes de hacer deploy del CDK, actualiza `infrastructure/lib/frontend-stack.ts`:

```typescript
sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
  owner: 'TU_USUARIO_GITHUB',      // ← tu usuario
  repository: 'agent-core-frontend', // ← nombre del repo
  oauthToken: cdk.SecretValue.secretsManager('github-token'),
}),
```

Y crea el secret en AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name github-token \
  --secret-string "ghp_TU_TOKEN_AQUI"
```

### Paso 3 — Actualizar Callback URLs de Cognito

Después del deploy, el output `AmplifyDefaultDomain` te dará la URL real.
Actualiza el stack `AgentCoreStack` con esa URL en los `CallbackURLs` del cliente Cognito.

---

## Estructura del proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Redirect root → /login o /chat
│   │   ├── login/page.tsx    # Pantalla de login con Google
│   │   ├── chat/page.tsx     # Chat principal
│   │   └── api/chat/route.ts # API route → Lambda proxy
│   ├── components/
│   │   ├── ChatMessage.tsx   # Burbuja de mensaje
│   │   ├── ChatInput.tsx     # Input con auto-resize
│   │   └── Sidebar.tsx       # Sidebar con nav y usuario
│   └── lib/
│       ├── amplify-config.ts # Configuración de Amplify/Cognito
│       └── auth.ts           # Helpers de autenticación
├── lambda/
│   └── index.mjs             # Lambda proxy MCP
└── infrastructure/
    ├── bin/app.ts
    └── lib/frontend-stack.ts # CDK Stack completo
```
