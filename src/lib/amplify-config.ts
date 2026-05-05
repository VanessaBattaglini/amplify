import { Amplify } from 'aws-amplify'

// Sin singleton — Amplify.configure es idempotente si los valores no cambian
export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
        loginWith: {
          oauth: {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN!.replace('https://', ''),
            scopes: ['openid', 'email', 'profile'],
            redirectSignIn: [process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN!],
            redirectSignOut: [process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT!],
            responseType: 'code',
          },
        },
      },
    },
  })
}
