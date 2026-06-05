import {
  authenticateUser,
  getRoleById,
  getPermissionsForRole,
  getSecuritySettings,
  getUserById,
  getUserByUsername,
  type Permission,
  type User,
  type UserRole,
  userHasPermission,
  ensureUserStoreReady,
} from "@/lib/user-store"

export const AUTH_STORAGE_KEY = "bdms-auth-session"

/** @deprecated Use user-store seed credentials instead */
export const DEMO_CREDENTIALS = {
  username: "admin",
  password: "demo123",
} as const

export type AuthSession = {
  userId: string
  username: string
  displayName: string
  role: UserRole
  loggedInAt: string
}

function isValidRoleId(roleId: string) {
  return typeof roleId === "string" && roleId.length > 0 && Boolean(getRoleById(roleId))
}

function migrateLegacySession(raw: unknown): AuthSession | null {
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>
  if (
    typeof record.userId === "string" &&
    typeof record.username === "string" &&
    typeof record.displayName === "string" &&
    typeof record.role === "string" &&
    record.role.length > 0 &&
    isValidRoleId(record.role) &&
    typeof record.loggedInAt === "string"
  ) {
    return {
      userId: record.userId,
      username: record.username,
      displayName: record.displayName,
      role: record.role,
      loggedInAt: record.loggedInAt,
    }
  }

  if (typeof record.username === "string" && record.username.length > 0) {
    const user =
      getUserByUsername(record.username) ??
      (record.username === DEMO_CREDENTIALS.username
        ? getUserByUsername("admin")
        : undefined)
    if (!user) return null
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loggedInAt: new Date().toISOString(),
    }
  }

  return null
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
    return migrateLegacySession(JSON.parse(raw))
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

export function login(username: string, password: string): AuthSession | null {
  ensureUserStoreReady()
  const user = authenticateUser(username, password)
  if (!user) return null

  const session: AuthSession = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  }
  writeAuthSession(session)
  return session
}

export function getCurrentUser(): User | null {
  const session = readAuthSession()
  if (!session) return null
  return getUserById(session.userId) ?? null
}

export function getSessionPermissions(session: AuthSession | null): Permission[] {
  if (!session) return []
  return getPermissionsForRole(session.role)
}

export function hasPermission(
  session: AuthSession | null,
  permission: Permission
): boolean {
  if (!session) return false
  return userHasPermission({ role: session.role }, permission)
}

export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true
  const settings = getSecuritySettings()
  const elapsedMs = Date.now() - new Date(session.loggedInAt).getTime()
  return elapsedMs > settings.sessionTimeoutMinutes * 60 * 1000
}
