"use client"

import Link from "next/link"
import { AuthedShell } from "@/components/authed-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const items = [
  {
    title: "Donor မှတ်ပုံတင်ခြင်း",
    description: "အမည်၊ အသက်၊ သွေးအမျိုးအစား၊ ဆက်သွယ်ရန် အချက်အလက်များ ထည့်သွင်းပါ။",
    href: "/donor/registration",
  },
  {
    title: "စစ်ဆေးမှု နှင့် စကရင်းနင်း",
    description: "သွေးမကောက်မီ vitals နှင့် TTI စစ်ဆေးပြီး Pass ဖြစ်မှသာ လှူဒါန်းခွင့်ပြုပါ။",
    href: "/testing-screening",
  },
  {
    title: "သွေးကောက်ယူမှု",
    description: "EID scan → screening/eligibility စစ်ဆေး → သွေးအိတ် scan → လှူအကြိမ်ရေ auto update။",
    href: "/donor/collection",
  },
  {
    title: "လှူဒါန်းမှတ်တမ်း",
    description: "လှူဒါန်းမှတ်တမ်းများ ကြည့်ရှု/စီမံခန့်ခွဲရန် (admin)။",
    href: "/donor/donations",
  },
  {
    title: "56 ရက် cooldown အသိပေးချက်",
    description: "နောက်တစ်ကြိမ် လှူနိုင်သည့်ရက်ကို တွက်ချက်ပြပြီး စိစစ်ပါ။",
    href: "/donor/eligibility",
  },
  {
    title: "Donor သမိုင်းကြောင်း",
    description: "Donor အသေးစိတ် + လှူဒါန်းမှတ်တမ်းများကို စုစည်းကြည့်ရှုပါ။",
    href: "/donor/history",
  },
  {
    title: "Donor EID Card",
    description: "Member Card စာအုပ်အစား Electronic Donor ID (EID) card ထုတ်ပေးပါ။",
    href: "/donor/certificate",
  },
] as const

export default function Page() {
  return (
    <AuthedShell title="Donor">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AuthedShell>
  )
}

