import { z } from "zod"

const USER_STORAGE_KEY = "bdms-users"
const ROLE_STORAGE_KEY = "bdms-roles"
const SECURITY_SETTINGS_KEY = "bdms-security-settings"
const AUDIT_LOG_KEY = "bdms-audit-log"

export const PermissionSchema = z.enum([
  "users.manage",
  "dashboard.read",
  "donors.read",
  "donors.write",
  "donors.delete",
  "screening.read",
  "screening.write",
  "donations.read",
  "donations.write",
  "donations.delete",
  "inventory.read",
  "inventory.write",
  "reports.read",
  "data.reset",
])

export type Permission = z.infer<typeof PermissionSchema>

export const ALL_PERMISSIONS = PermissionSchema.options

export const RoleDefinitionSchema = z.object({
  id: z.string().min(1),
  labelEn: z.string().min(1),
  labelMm: z.string().min(1),
  permissions: z.array(PermissionSchema),
  locked: z.boolean().optional(),
})

export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>

/** Role id assigned to users */
export type UserRole = string

export const UserStatusSchema = z.enum(["active", "inactive"])

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3),
  displayName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().min(1),
  status: UserStatusSchema,
  password: z.string().min(6),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>

export const SecuritySettingsSchema = z.object({
  minPasswordLength: z.number().int().min(6).max(32),
  requireUppercase: z.boolean(),
  requireNumber: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(15).max(480),
  maxLoginAttempts: z.number().int().min(3).max(10),
})

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  target: z.string().optional(),
  details: z.string().optional(),
})

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

export const PERMISSION_LABELS: Record<Permission, { en: string; mm: string }> =
  {
    "users.manage": {
      en: "Manage users & security",
      mm: "အသုံးပြုသူ နှင့် လုံခြုံရေး စီမံခန့်ခွဲ",
    },
    "dashboard.read": { en: "View dashboard", mm: "Dashboard ကြည့်ရှု" },
    "donors.read": { en: "View donors", mm: "Donor များ ကြည့်ရှု" },
    "donors.write": { en: "Manage donors", mm: "Donor များ စီမံခန့်ခွဲ" },
    "donors.delete": { en: "Delete donors", mm: "Donor များ ဖျက်ရန်" },
    "screening.read": {
      en: "View screening",
      mm: "စစ်ဆေးမှု ကြည့်ရှု",
    },
    "screening.write": {
      en: "Manage screening",
      mm: "စစ်ဆေးမှု စီမံခန့်ခွဲ",
    },
    "donations.read": {
      en: "View donations",
      mm: "လှူဒါန်းမှု ကြည့်ရှု",
    },
    "donations.write": {
      en: "Manage donations",
      mm: "လှူဒါန်းမှု စီမံခန့်ခွဲ",
    },
    "donations.delete": {
      en: "Delete donation records",
      mm: "လှူဒါန်းမှတ်တမ်း ဖျက်ရန်",
    },
    "inventory.read": { en: "View inventory", mm: "စတော့ ကြည့်ရှု" },
    "inventory.write": { en: "Manage inventory", mm: "စတော့ စီမံခန့်ခွဲ" },
    "reports.read": { en: "View reports", mm: "အစီရင်ခံစာ ကြည့်ရှု" },
    "data.reset": {
      en: "Reset demo/local data",
      mm: "Demo/local data reset",
    },
  }

function buildDefaultRoles(): RoleDefinition[] {
  return [
    {
      id: "admin",
      labelEn: "Administrator",
      labelMm: "စီမံခန့်ခွဲသူ",
      permissions: [...ALL_PERMISSIONS],
      locked: true,
    },
    {
      id: "registration_clerk",
      labelEn: "Registration Clerk",
      labelMm: "မှတ်ပုံတင်မှူး",
      permissions: [
        "dashboard.read",
        "donors.read",
        "donors.write",
        "donors.delete",
        "donations.read",
      ],
    },
    {
      id: "screening_staff",
      labelEn: "Screening Staff",
      labelMm: "စစ်ဆေးမှု ဝန်ထမ်း",
      permissions: [
        "dashboard.read",
        "donors.read",
        "screening.read",
        "screening.write",
      ],
    },
    {
      id: "phlebotomist",
      labelEn: "Phlebotomist",
      labelMm: "သွေးယူသူ",
      permissions: [
        "dashboard.read",
        "donors.read",
        "donations.read",
        "donations.write",
        "donations.delete",
      ],
    },
    {
      id: "lab_tech",
      labelEn: "Lab Technician",
      labelMm: "ဓာတ်ခွဲခန်း Technician",
      permissions: [
        "dashboard.read",
        "donors.read",
        "screening.read",
        "screening.write",
        "inventory.read",
        "inventory.write",
      ],
    },
    {
      id: "inventory_clerk",
      labelEn: "Inventory Clerk",
      labelMm: "စတော့ မှူး",
      permissions: ["dashboard.read", "inventory.read", "inventory.write"],
    },
    {
      id: "viewer",
      labelEn: "Viewer",
      labelMm: "ကြည့်ရှုသူ",
      permissions: [
        "dashboard.read",
        "donors.read",
        "donations.read",
        "reports.read",
      ],
    },
  ]
}

/** @deprecated Use listRoles() / getRoleLabel() instead */
export const ROLE_LABELS = Object.fromEntries(
  buildDefaultRoles().map((role) => [
    role.id,
    { en: role.labelEn, mm: role.labelMm },
  ])
) as Record<string, { en: string; mm: string }>

/** @deprecated Use listRoles() / getPermissionsForRole() instead */
export const ROLE_PERMISSIONS = Object.fromEntries(
  buildDefaultRoles().map((role) => [role.id, role.permissions])
) as Record<string, Permission[]>

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  minPasswordLength: 6,
  requireUppercase: false,
  requireNumber: true,
  sessionTimeoutMinutes: 120,
  maxLoginAttempts: 5,
}

function nowIso() {
  return new Date().toISOString()
}

function readJson<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return schema.parse(JSON.parse(raw))
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeRolePermissions(
  role: RoleDefinition
): RoleDefinition {
  const unique = [...new Set(role.permissions)]
  if (role.id === "admin" && !unique.includes("users.manage")) {
    unique.unshift("users.manage")
  }
  return { ...role, permissions: unique }
}

function mergeMissingDefaultRolePermissions(
  roles: RoleDefinition[]
): RoleDefinition[] {
  const defaultById = new Map(
    buildDefaultRoles().map((role) => [role.id, role.permissions])
  )
  let changed = false
  const merged = roles.map((role) => {
    const defaultPermissions = defaultById.get(role.id)
    if (!defaultPermissions) return role
    const missing = defaultPermissions.filter(
      (permission) => !role.permissions.includes(permission)
    )
    if (missing.length === 0) return role
    changed = true
    return normalizeRolePermissions({
      ...role,
      permissions: [...role.permissions, ...missing],
    })
  })
  if (changed) {
    writeRoles(merged)
  }
  return merged
}

function mergeMissingDefaultRoles(roles: RoleDefinition[]): RoleDefinition[] {
  const defaults = buildDefaultRoles()
  const existingIds = new Set(roles.map((role) => role.id))
  const merged = [...roles]
  let changed = false

  for (const role of defaults) {
    if (!existingIds.has(role.id)) {
      merged.push(role)
      changed = true
    }
  }

  const normalized = merged.map(normalizeRolePermissions)
  if (changed) {
    writeRoles(normalized)
  }
  return normalized
}

function mergeMissingSeedUsers(users: User[]): User[] {
  const seedUsers = buildSeedUsers()
  const existingUsernames = new Set(
    users.map((user) => user.username.toLowerCase())
  )
  const merged = [...users]
  let changed = false

  for (const seedUser of seedUsers) {
    if (!existingUsernames.has(seedUser.username.toLowerCase())) {
      merged.push(seedUser)
      changed = true
    }
  }

  if (changed) {
    writeUsers(merged)
  }
  return merged
}

export function ensureUserStoreReady() {
  readRoles()
  readUsers()
}

export function listDemoLoginAccounts() {
  ensureUserStoreReady()
  const demoUsernames = new Set(["admin", "clerk", "labtech"])
  return listUsers().filter((user) => demoUsernames.has(user.username))
}

function readRoles(): RoleDefinition[] {
  if (typeof window === "undefined") return buildDefaultRoles()
  const raw = window.localStorage.getItem(ROLE_STORAGE_KEY)
  if (!raw) {
    const seed = buildDefaultRoles()
    writeRoles(seed)
    return seed
  }
  try {
    const parsed = z.array(RoleDefinitionSchema).parse(JSON.parse(raw))
    const roles =
      parsed.length > 0
        ? parsed.map(normalizeRolePermissions)
        : buildDefaultRoles()
    return mergeMissingDefaultRolePermissions(mergeMissingDefaultRoles(roles))
  } catch {
    const seed = buildDefaultRoles()
    writeRoles(seed)
    return seed
  }
}

function writeRoles(roles: RoleDefinition[]) {
  writeJson(
    ROLE_STORAGE_KEY,
    roles.map(normalizeRolePermissions)
  )
}

function readUsers(): User[] {
  if (typeof window === "undefined") return buildSeedUsers()
  const raw = window.localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) {
    const seed = buildSeedUsers()
    writeUsers(seed)
    return seed
  }
  try {
    const parsed = z.array(UserSchema).parse(JSON.parse(raw))
    const users = parsed.length > 0 ? parsed : buildSeedUsers()
    return mergeMissingSeedUsers(users)
  } catch {
    const seed = buildSeedUsers()
    writeUsers(seed)
    return seed
  }
}

function writeUsers(users: User[]) {
  writeJson(USER_STORAGE_KEY, users)
}

function buildSeedUsers(): User[] {
  const createdAt = nowIso()
  return [
    {
      id: "usr-admin",
      username: "admin",
      displayName: "System Administrator",
      email: "admin@bdms.local",
      role: "admin",
      status: "active",
      password: "demo123",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "usr-clerk",
      username: "clerk",
      displayName: "Registration Clerk",
      email: "clerk@bdms.local",
      role: "registration_clerk",
      status: "active",
      password: "demo123",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "usr-lab",
      username: "labtech",
      displayName: "Lab Technician",
      email: "lab@bdms.local",
      role: "lab_tech",
      status: "active",
      password: "demo123",
      createdAt,
      updatedAt: createdAt,
    },
  ]
}

function slugifyRoleId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function listRoles(): RoleDefinition[] {
  return readRoles()
    .slice()
    .sort((a, b) => a.labelEn.localeCompare(b.labelEn))
}

export function getRoleById(id: string): RoleDefinition | undefined {
  return readRoles().find((role) => role.id === id)
}

export function getRoleLabel(roleId: string, locale: "en" | "mm") {
  const role = getRoleById(roleId)
  if (!role) return roleId
  return locale === "mm" ? role.labelMm : role.labelEn
}

export function countUsersWithRole(roleId: string) {
  return readUsers().filter((user) => user.role === roleId).length
}

export function upsertRole(input: RoleDefinition): RoleDefinition {
  const roles = readRoles()
  const duplicate = roles.find(
    (role) =>
      role.id !== input.id &&
      role.labelEn.toLowerCase() === input.labelEn.trim().toLowerCase()
  )
  if (duplicate) {
    throw new Error("A role with a similar name already exists.")
  }

  const nextRole = normalizeRolePermissions({
    ...input,
    id: input.id.trim(),
    labelEn: input.labelEn.trim(),
    labelMm: input.labelMm.trim(),
  })

  const index = roles.findIndex((role) => role.id === nextRole.id)
  if (index >= 0) {
    const existing = roles[index]
    if (existing.locked) {
      nextRole.locked = true
      nextRole.id = existing.id
    }
    roles[index] = nextRole
  } else {
    if (roles.some((role) => role.id === nextRole.id)) {
      throw new Error("Role id already exists.")
    }
    roles.push(nextRole)
  }

  writeRoles(roles)
  return nextRole
}

export function deleteRole(id: string) {
  const role = getRoleById(id)
  if (!role) return
  if (role.locked) {
    throw new Error("This system role cannot be deleted.")
  }
  if (countUsersWithRole(id) > 0) {
    throw new Error("Cannot delete a role that is assigned to users.")
  }
  writeRoles(readRoles().filter((item) => item.id !== id))
}

export function setRolePermission(
  roleId: string,
  permission: Permission,
  enabled: boolean
) {
  const role = getRoleById(roleId)
  if (!role) throw new Error("Role not found.")
  if (role.id === "admin" && permission === "users.manage" && !enabled) {
    throw new Error("Administrator must keep user management permission.")
  }

  const permissions = enabled
    ? [...new Set([...role.permissions, permission])]
    : role.permissions.filter((item) => item !== permission)

  upsertRole({ ...role, permissions })
}

export function resetRolesToDefault() {
  writeRoles(buildDefaultRoles())
}

export function createRoleIdPreview(labelEn: string) {
  const base = slugifyRoleId(labelEn)
  if (!base) return `role_${Math.random().toString(36).slice(2, 8)}`
  const roles = readRoles()
  if (!roles.some((role) => role.id === base)) return base
  return `${base}_${Math.random().toString(36).slice(2, 6)}`
}

export function listUsers(): User[] {
  return readUsers().slice().sort((a, b) => a.username.localeCompare(b.username))
}

export function getUserById(id: string): User | undefined {
  return readUsers().find((user) => user.id === id)
}

export function getUserByUsername(username: string): User | undefined {
  const normalized = username.trim().toLowerCase()
  return readUsers().find(
    (user) => user.username.toLowerCase() === normalized
  )
}

export function getPermissionsForRole(roleId: string): Permission[] {
  return getRoleById(roleId)?.permissions ?? []
}

export function userHasPermission(
  user: Pick<User, "role">,
  permission: Permission
) {
  return getPermissionsForRole(user.role).includes(permission)
}

export function validatePassword(
  password: string,
  settings: SecuritySettings = getSecuritySettings()
): string | null {
  if (password.length < settings.minPasswordLength) {
    return `Password must be at least ${settings.minPasswordLength} characters.`
  }
  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter."
  }
  if (settings.requireNumber && !/\d/.test(password)) {
    return "Password must include a number."
  }
  return null
}

export function authenticateUser(
  username: string,
  password: string
): User | null {
  const user = getUserByUsername(username)
  if (!user || user.status !== "active") return null
  if (!getRoleById(user.role)) return null
  if (user.password !== password) return null

  const users = readUsers()
  const index = users.findIndex((item) => item.id === user.id)
  if (index >= 0) {
    users[index] = { ...users[index], lastLoginAt: nowIso() }
    writeUsers(users)
  }

  appendAuditLog({
    actorId: user.id,
    actorName: user.displayName,
    action: "login",
    details: `User ${user.username} signed in`,
  })

  return { ...user, lastLoginAt: nowIso() }
}

export function upsertUser(
  input: Omit<User, "createdAt" | "updatedAt"> & { createdAt?: string }
): User {
  const users = readUsers()
  const timestamp = nowIso()
  const existingIndex = users.findIndex((user) => user.id === input.id)
  const duplicateUsername = users.find(
    (user) =>
      user.username.toLowerCase() === input.username.trim().toLowerCase() &&
      user.id !== input.id
  )
  if (duplicateUsername) {
    throw new Error("Username already exists.")
  }
  if (!getRoleById(input.role)) {
    throw new Error("Selected role does not exist.")
  }

  const passwordError = validatePassword(input.password)
  if (passwordError) {
    throw new Error(passwordError)
  }

  const nextUser: User = {
    ...input,
    username: input.username.trim(),
    displayName: input.displayName.trim(),
    email: input.email?.trim() ?? "",
    createdAt: input.createdAt ?? timestamp,
    updatedAt: timestamp,
  }

  if (existingIndex >= 0) {
    users[existingIndex] = nextUser
  } else {
    users.push(nextUser)
  }

  writeUsers(users)
  return nextUser
}

export function deleteUser(id: string) {
  const users = readUsers()
  const target = users.find((user) => user.id === id)
  if (!target) return
  if (target.username === "admin" && target.role === "admin") {
    throw new Error("Cannot delete the primary administrator account.")
  }
  writeUsers(users.filter((user) => user.id !== id))
}

export function resetUsersToSeed() {
  writeUsers(buildSeedUsers())
}

export function getSecuritySettings(): SecuritySettings {
  return readJson(SECURITY_SETTINGS_KEY, SecuritySettingsSchema, {
    ...DEFAULT_SECURITY_SETTINGS,
  })
}

export function saveSecuritySettings(settings: SecuritySettings) {
  writeJson(SECURITY_SETTINGS_KEY, SecuritySettingsSchema.parse(settings))
}

export function listAuditLogs(limit = 50): AuditLogEntry[] {
  const logs = readJson(AUDIT_LOG_KEY, z.array(AuditLogEntrySchema), [])
  return logs
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}

export function appendAuditLog(input: {
  actorId: string
  actorName: string
  action: string
  target?: string
  details?: string
}) {
  const logs = readJson(AUDIT_LOG_KEY, z.array(AuditLogEntrySchema), [])
  logs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: nowIso(),
    ...input,
  })
  writeJson(AUDIT_LOG_KEY, logs.slice(0, 200))
}

export function clearAuditLogs() {
  writeJson(AUDIT_LOG_KEY, [])
}

export function createUserIdPreview() {
  return `usr-${Math.random().toString(36).slice(2, 8)}`
}
