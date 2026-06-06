import { hasPermission, readAuthSession } from "@/lib/auth"
import type { Permission } from "@/lib/user-store"

export class PermissionDeniedError extends Error {
  permission: Permission

  constructor(permission: Permission) {
    super(`PERMISSION_DENIED:${permission}`)
    this.name = "PermissionDeniedError"
    this.permission = permission
  }
}

export function checkPermission(permission: Permission) {
  return hasPermission(readAuthSession(), permission)
}

export function assertPermission(permission: Permission) {
  if (!checkPermission(permission)) {
    throw new PermissionDeniedError(permission)
  }
}
