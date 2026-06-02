"use client"

import { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  canDonateNow,
  getNextEligibleDate,
  listDonations,
  listDonors,
  type Donor,
} from "@/lib/donor-store"

type RangeKey = "7d" | "30d" | "90d"

function startOfDayISO(d: Date) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt.toISOString()
}

function dayLabel(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function Page() {
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Dashboard",
        totalDonors: "Total donors",
        eligibleNow: "Eligible now",
        donationsTotal: "Donation records",
        next7Days: "Eligible in next 7 days",
        chartTitle: "New donors",
        chartSub: "Registrations over selected range",
        last7: "Last 7 days",
        last30: "Last 30 days",
        last90: "Last 3 months",
      } as const
    }
    return {
      title: "Dashboard",
      totalDonors: "Donor စုစုပေါင်း",
      eligibleNow: "ယခုလှူနိုင်သူ",
      donationsTotal: "လှူဒါန်းမှတ်တမ်း",
      next7Days: "၇ ရက်အတွင်း လှူနိုင်မယ့်သူ",
      chartTitle: "Donor အသစ်",
      chartSub: "ရွေးထားတဲ့ကာလအတွင်း မှတ်ပုံတင်မှု",
      last7: "၇ ရက်",
      last30: "၃၀ ရက်",
      last90: "၃ လ",
    } as const
  }, [locale])

  const [isLoading, setIsLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>("90d")
  const [donors, setDonors] = useState<Donor[]>([])
  const [donationsCount, setDonationsCount] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    const d = listDonors()
    const r = listDonations()
    setDonors(d)
    setDonationsCount(r.length)
    setIsLoading(false)
  }, [])

  const stats = useMemo(() => {
    const total = donors.length
    const eligible = donors.filter((d) => canDonateNow(d.id)).length
    const soon = donors.filter((d) => {
      const next = getNextEligibleDate(d.id)
      if (!next) return false
      const now = new Date()
      const in7 = new Date(now.getTime() + 7 * 86400000)
      return next >= now && next <= in7
    }).length
    return { total, eligible, soon }
  }, [donors])

  const chartData = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end.getTime() - (days - 1) * 86400000)

    const counts = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 86400000)
      counts.set(dayLabel(d), 0)
    }

    for (const donor of donors) {
      const created = new Date(donor.createdAt)
      created.setHours(0, 0, 0, 0)
      if (created < start || created > end) continue
      const key = dayLabel(created)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return Array.from(counts.entries()).map(([date, value]) => ({
      date,
      value,
    }))
  }, [donors, range])

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: t.chartTitle,
        theme: {
          light: "hsl(221.2 83.2% 53.3%)",
          dark: "hsl(217.2 91.2% 59.8%)",
        },
      },
    }),
    [t.chartTitle]
  )

  return (
    <AuthedShell title={t.title}>
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="mt-2 h-4 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.totalDonors}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.total.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {startOfDayISO(new Date()).slice(0, 10)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.eligibleNow}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.eligible.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  56-day cooldown
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.donationsTotal}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {donationsCount.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  localStorage
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.next7Days}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">
                  {stats.soon.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  upcoming
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{t.chartTitle}</CardTitle>
                <div className="text-sm text-muted-foreground">{t.chartSub}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={range === "90d" ? "secondary" : "outline"}
                  onClick={() => setRange("90d")}
                >
                  {t.last90}
                </Button>
                <Button
                  variant={range === "30d" ? "secondary" : "outline"}
                  onClick={() => setRange("30d")}
                >
                  {t.last30}
                </Button>
                <Button
                  variant={range === "7d" ? "secondary" : "outline"}
                  onClick={() => setRange("7d")}
                >
                  {t.last7}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                id="donor-new"
                config={chartConfig}
                className="h-[300px] w-full"
              >
                <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={32}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(label) => label}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-value)"
                    fill="var(--color-value)"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </AuthedShell>
  )
}
