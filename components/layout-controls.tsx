"use client"

import { usePathname } from "next/navigation"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

const PUBLIC_PATHS = new Set(["/", "/login"])

export function LayoutControls() {
  const pathname = usePathname()

  if (!PUBLIC_PATHS.has(pathname)) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <ThemeToggle className="bg-background shadow-sm" />
      <LanguageSwitcher className="h-10 w-[124px] border border-border bg-background font-sans text-[0.85rem] shadow-sm transition-colors hover:bg-muted focus-visible:ring-0" />
    </div>
  )
}
