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
    title: "လှူဒါန်းမှတ်တမ်း",
    description: "Donor အလိုက် လှူဒါန်းရက်စွဲ၊ note စသည်များကို သိမ်းဆည်းပါ။",
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
    title: "Donor Card / Certificate",
    description: "Print လုပ်လို့ရတဲ့ Donor card / certificate စာရွက်ထုတ်ပေးပါ။",
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

