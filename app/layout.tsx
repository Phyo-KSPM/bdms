import { Geist, Geist_Mono, Noto_Serif_Myanmar, Padauk } from "next/font/google"

import "./globals.css"
import { LocaleProvider } from "@/components/i18n/locale-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const fontMyanmar = Padauk({
  subsets: ["latin", "myanmar"],
  variable: "--font-myanmar",
  weight: ["400", "700"],
})

const fontMyanmarDisplay = Noto_Serif_Myanmar({
  subsets: ["myanmar"],
  variable: "--font-myanmar-display",
  weight: ["400", "700"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "light",
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        fontMyanmar.variable,
        fontMyanmarDisplay.variable
      )}
    >
      <body suppressHydrationWarning>
        <TooltipProvider>
          <LocaleProvider>
            <LanguageSwitcher className="fixed top-4 right-4 z-50 h-10 w-[124px] border border-border bg-background font-sans text-[0.85rem] shadow-sm transition-colors hover:bg-muted focus-visible:ring-0" />
            {children}
          </LocaleProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
