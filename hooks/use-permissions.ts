"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { hasPermission, readAuthSession, type AuthSession } from "@/lib/auth"
import type { Permission } from "@/lib/user-store"

export function usePermissions() {
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    setSession(readAuthSession())
  }, [])

  const can = useCallback(
    (permission: Permission) => hasPermission(session, permission),
    [session]
  )

  return useMemo(
    () => ({
      session,
      can,
      canDeleteDonors: can("donors.delete"),
      canDeleteDonations: can("donations.delete"),
      canWriteDonations: can("donations.write"),
      canResetData: can("data.reset"),
    }),
    [session, can]
  )
}
