"use client"

import Image from "next/image"

import { useLocale, type Locale } from "@/components/i18n/locale-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale()

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger
        size="sm"
        aria-label="Select language"
        className={className}
      >
        <span className="flex items-center justify-center gap-1.5 leading-tight">
          <Image
            src={locale === "en" ? "/united-kingdom.png" : "/myanmar.png"}
            alt=""
            width={14}
            height={14}
            aria-hidden
            className="shrink-0 rounded-full object-cover"
          />
          <span>{locale === "en" ? "EN" : "MM"}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="en" className="min-h-8">
          <Image
            src="/united-kingdom.png"
            alt=""
            width={14}
            height={14}
            aria-hidden
            className="shrink-0 rounded-full object-cover"
          />
          <span>EN</span>
        </SelectItem>
        <SelectItem value="mm" className="min-h-8">
          <Image
            src="/myanmar.png"
            alt=""
            width={14}
            height={14}
            aria-hidden
            className="shrink-0 rounded-full object-cover"
          />
          <span>MM</span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
