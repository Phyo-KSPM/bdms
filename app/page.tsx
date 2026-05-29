"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLocale } from "@/components/i18n/locale-provider"

const galleryImages = [
  { src: "/1.png", alt: "Image 1" },
  { src: "/2.png", alt: "Image 2" },
  { src: "/3.png", alt: "Image 3" },
]

const content: Record<
  "en" | "mm",
  {
    systemName: string
    login: string
    getStarted: string
    heroTitle: string
    heroDescription: string
    privacy: string
    terms: string
  }
> = {
  en: {
    systemName: "Blood Donation Management System",
    login: "Login",
    getStarted: "Get Started",
    heroTitle: '"SAVE LIVES WITH YOUR BLOOD"',
    heroDescription:
      "Through our system, connect blood donors and people in need more easily. Your participation can become hope for someone.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  mm: {
    systemName: "Blood Donation Management System",
    login: "ဝင်ရန်",
    getStarted: "စတင်ရန်",
    heroTitle: '"သင့်သွေးဖြင့် အသက်ကယ်ပါ"',
    heroDescription:
      "ကျွန်ုပ်တို့၏ စနစ်မှတစ်ဆင့် သွေးလိုအပ်နေသူများနှင့် စေတနာရှင် သွေးလှူရှင်များကို အလွယ်တကူ ချိတ်ဆက်လိုက်ပါ။ သင့်ရဲ့ ပါဝင်မှုက တစ်စုံတစ်ယောက်အတွက် မျှော်လင့်ချက် ဖြစ်လာနိုင်ပါတယ်။",
    privacy: "ကိုယ်ရေးအချက်အလက် မူဝါဒ",
    terms: "ဝန်ဆောင်မှု စည်းမျဉ်းများ",
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

export default function Page() {
  const { locale } = useLocale()
  const t = content[locale]
  const navButtonBaseClass =
    "inline-flex h-8 w-[112px] items-center justify-center rounded-[min(var(--radius-md),12px)] px-2.5 font-medium whitespace-nowrap"
  const navActionTextClass =
    locale === "mm"
      ? "font-(family-name:--font-myanmar) text-[0.95rem] leading-normal"
      : "font-sans text-[0.85rem] leading-none"

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <motion.header
        className="border-b border-border/60 bg-background/70 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BDMS logo"
              width={40}
              height={40}
              className="rounded-md object-contain ring-1 ring-border/60"
              priority
            />
            <div>
              <p className="text-lg font-semibold leading-tight">BDMS</p>
              <p className="text-xs text-muted-foreground">{t.systemName}</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2.5">
            <Link
              href="/login"
              className={`${navButtonBaseClass} border border-border bg-background transition-colors hover:bg-muted`}
            >
              <span className={navActionTextClass}>{t.login}</span>
            </Link>
            <Link
              href="/login"
              className={`${navButtonBaseClass} bg-primary text-primary-foreground transition-all hover:opacity-90`}
            >
              <span className={navActionTextClass}>{t.getStarted}</span>
            </Link>
          </nav>
        </div>
      </motion.header>

      <main className="flex flex-1 items-center">
        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <motion.div
            className="mx-auto max-w-4xl space-y-7 text-center"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="flex justify-center"
              variants={fadeUp}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Image
                src="/logo.png"
                alt="BDMS logo"
                width={72}
                height={72}
                className="rounded-lg object-contain"
                priority
              />
            </motion.div>
            <motion.h1
              className={`min-h-[56px] text-3xl font-bold leading-tight sm:min-h-[64px] sm:text-4xl md:min-h-[76px] md:text-5xl md:whitespace-nowrap ${
                locale === "mm"
                  ? "font-(family-name:--font-myanmar-display)"
                  : "font-sans tracking-wide"
              }`}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {t.heroTitle}
            </motion.h1>
            <motion.p
              className="font-(family-name:--font-myanmar) mx-auto min-h-[96px] max-w-3xl text-base leading-loose text-muted-foreground sm:min-h-[110px] sm:text-lg"
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {t.heroDescription}
            </motion.p>
            <motion.div
              className="flex flex-wrap items-center justify-center gap-3"
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <Link
                href="/login"
                className="inline-flex h-7 w-[110px] items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-primary-foreground transition-all hover:opacity-90"
              >
                {t.getStarted}
              </Link>
            </motion.div>

            <motion.div
              className="pt-8"
              variants={fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                {galleryImages.map((image) => (
                  <motion.div
                    key={image.src}
                    className="rounded-xl border border-border/80 bg-background/60 p-2"
                    variants={fadeUp}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div className="group overflow-hidden rounded-lg">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={640}
                        height={480}
                        className="aspect-4/3 w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

      </main>

      <motion.footer
        className="border-t border-border/60 bg-background"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Royal Taurus Co., Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="transition-colors hover:text-foreground">
              {t.privacy}
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              {t.terms}
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}
