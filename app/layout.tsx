import { Geist, Geist_Mono, Noto_Serif_Myanmar, Padauk } from "next/font/google"

import "./globals.css"
import { LocaleProvider } from "@/components/i18n/locale-provider"
import { LayoutControls } from "@/components/layout-controls"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
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
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        fontMyanmar.variable,
        fontMyanmarDisplay.variable
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <LocaleProvider>
              <LayoutControls />
              {children}
              <Toaster />
            </LocaleProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
