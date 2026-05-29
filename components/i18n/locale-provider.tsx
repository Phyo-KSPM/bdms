"use client"

import * as React from "react"

export type Locale = "en" | "mm"

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const STORAGE_KEY = "bdms-locale"

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

function isLocale(value: string): value is Locale {
  return value === "en" || value === "mm"
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("mm")

  React.useEffect(() => {
    const savedLocale = window.localStorage.getItem(STORAGE_KEY)
    if (savedLocale && isLocale(savedLocale)) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(STORAGE_KEY, nextLocale)
  }, [])

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale, setLocale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = React.useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return context
}
