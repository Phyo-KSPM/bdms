"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  clearAuthSession,
  hasPermission,
  isSessionExpired,
  readAuthSession,
  type AuthSession,
} from "@/lib/auth"
import type { Permission } from "@/lib/user-store"

export function AuthedShell({
  title,
  children,
  requiredPermission,
}: {
  title: string
  children: React.ReactNode
  requiredPermission?: Permission
}) {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)

  useEffect(() => {
    const current = readAuthSession()
    if (!current || isSessionExpired(current)) {
      clearAuthSession()
      router.replace("/login")
      return
    }

    if (requiredPermission && !hasPermission(current, requiredPermission)) {
      setSession(current)
      setIsForbidden(true)
      setIsCheckingAuth(false)
      return
    }

    setSession(current)
    setIsForbidden(false)
    setIsCheckingAuth(false)
  }, [router, requiredPermission])

  const resolvedTitle = useMemo(() => title, [title])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (isForbidden) {
    return (
      <SidebarProvider>
        <AppSidebar session={session} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <div className="text-sm font-medium text-foreground">
                {resolvedTitle}
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <div className="text-sm font-medium text-foreground">
              {resolvedTitle}
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
