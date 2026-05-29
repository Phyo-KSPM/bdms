export const AUTH_STORAGE_KEY = "bdms-auth-session"

export const DEMO_CREDENTIALS = {
  username: "admin",
  password: "demo123",
} as const

export type AuthSession = {
  username: string
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (parsed && typeof parsed.username === "string" && parsed.username.length > 0) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function writeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
