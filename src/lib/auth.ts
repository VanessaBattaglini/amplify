import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth'

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() ?? null
  } catch {
    return null
  }
}

export async function getUser() {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

export async function logout() {
  await signOut()
}
