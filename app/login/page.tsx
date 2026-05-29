"use client"

import { useEffect } from "react"
import Image from "next/image"
import { LoginForm } from "@/app/login/login-form"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/components/i18n/locale-provider"
import { readAuthSession } from "@/lib/auth"

const content: Record<
  "en" | "mm",
  {
    systemName: string
    backToHome: string
    coverTitle: string
    coverDescription: string
  }
> = {
  en: {
    systemName: "Blood Donation Management System",
    backToHome: "Back to home",
    coverTitle: "SAVE LIVES WITH YOUR BLOOD",
    coverDescription:
      "Connect donors and recipients quickly with a reliable blood donation workflow.",
  },
  mm: {
    systemName: "Blood Donation Management System",
    backToHome: "ပင်မစာမျက်နှာသို့ ပြန်ရန်",
    coverTitle: "သင့်သွေးဖြင့် အသက်ကယ်ပါ",
    coverDescription:
      "ယုံကြည်စိတ်ချရသော သွေးလှူဒါန်းမှုစနစ်ဖြင့် သွေးလှူရှင်များနှင့် သွေးလိုအပ်သူများကို လျင်မြန်စွာ ချိတ်ဆက်နိုင်ပါသည်။",
  },
}

export default function LoginPage() {
  const router = useRouter()
  const { locale } = useLocale()
  const t = content[locale]

  useEffect(() => {
    if (readAuthSession()) {
      router.replace("/dashboard")
    }
  }, [router])

  return (
    <motion.div
      className="grid min-h-svh overflow-x-hidden bg-muted/20 lg:h-svh lg:grid-cols-2 lg:overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        className="flex flex-col p-6 md:p-10 lg:min-h-0 lg:overflow-y-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <motion.div
          className="mb-6 flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="BDMS logo" width={36} height={36} className="rounded-md object-contain" />
            <div className="leading-tight">
              <p className="font-semibold">BDMS</p>
              <p className="text-xs text-muted-foreground">{t.systemName}</p>
            </div>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            {t.backToHome}
          </Link>
        </motion.div>

        <motion.div
          className="flex flex-1 items-center justify-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
        >
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative min-h-[260px] overflow-hidden bg-muted sm:min-h-[320px] lg:min-h-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <img
          src="/login-cover.jpg?v=2"
          alt="Blood donation center"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <motion.div
          className="absolute right-6 bottom-6 left-6 max-w-lg text-white sm:right-8 sm:bottom-8 sm:left-8 lg:right-10 lg:bottom-10 lg:left-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28, ease: "easeOut" }}
        >
          <p
            className={`text-xl leading-tight font-semibold sm:text-2xl ${
              locale === "mm"
                ? "font-(family-name:--font-myanmar-display)"
                : "font-sans tracking-wide"
            }`}
          >
            {t.coverTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white">
            {t.coverDescription}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
