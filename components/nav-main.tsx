"use client"

import * as React from "react"
import { useLocale } from "@/components/i18n/locale-provider"
import { usePathname, useRouter } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

const NAV_OPEN_KEY = "bdms-nav-open-v2"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { locale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [openState, setOpenState] = React.useState<Record<string, boolean>>(() => ({}))

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NAV_OPEN_KEY)
      const parsed = raw ? (JSON.parse(raw) as unknown) : null
      const obj =
        parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
      const next: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "boolean") next[k] = v
      }
      setOpenState(next)
    } catch {
      // ignore
    }
  }, [])

  const persistOpen = React.useCallback((next: Record<string, boolean>) => {
    setOpenState(next)
    try {
      window.localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [])

  const isUrlActive = React.useCallback(
    (url: string) => {
      if (!pathname) return false
      if (url === "/dashboard") return pathname === "/dashboard"
      return pathname === url || pathname.startsWith(url + "/")
    },
    [pathname]
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {locale === "en" ? "Platform" : "ပလက်ဖောင်း"}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const subItems = item.items ?? []
          const hasSub = subItems.length > 0
          const activeLeaf = !hasSub && isUrlActive(item.url)
          const activeSub = hasSub ? subItems.some((s) => isUrlActive(s.url)) : false
          const active = activeLeaf || activeSub

          if (hasSub) {
            const isOpen = openState[item.url] ?? active
            return (
            <Collapsible
              key={item.title}
              open={isOpen}
              onOpenChange={(nextOpen) => {
                const next = { ...openState, [item.url]: nextOpen }
                persistOpen(next)
              }}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={<SidebarMenuButton tooltip={item.title} />}
              >
                {item.icon}
                <span>{item.title}</span>
                <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {subItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        isActive={isUrlActive(subItem.url)}
                        render={
                          <a
                            href={subItem.url}
                            onClick={(e) => {
                              e.preventDefault()
                              // keep parent open across navigation
                              const next = { ...openState, [item.url]: true }
                              persistOpen(next)
                              router.push(subItem.url)
                            }}
                          />
                        }
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={activeLeaf}
                render={
                  <a
                    href={item.url}
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(item.url)
                    }}
                  />
                }
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
