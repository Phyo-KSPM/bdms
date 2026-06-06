"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react"
import { isAfter } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  UsersIcon,
  HeartHandshakeIcon,
  DropletIcon,
  CalendarClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  listDonations,
  listDonors,
  type Donor,
  type DonationRecord,
} from "@/lib/donor-store"

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const
const CHART_MONTHS = 12

const DONOR_GENDER_COLORS = {
  male: "oklch(0.52 0.11 254)",
  female: "oklch(0.60 0.13 242)",
} as const

function dayLabel(d: Date) {
  return d.toISOString().slice(0, 10)
}

function monthLabel(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthTick(
  value: string,
  locale: string,
  style: "short" | "long" = "short"
) {
  const [year, month] = value.split("-")
  if (!year || !month) return value
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString(locale === "my" ? "my-MM" : "en-US", {
    month: style,
    year: style === "long" ? "numeric" : undefined,
  })
}

function formatDayTick(
  value: string,
  locale: string,
  style: "short" | "long" = "short"
) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return d.toLocaleDateString(locale === "my" ? "my-MM" : "en-US", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
  })
}

export default function Page() {
    const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Dashboard",
        subtitle: "Overview of blood donation activity",
        totalDonors: "Total donors",
        eligibleNow: "Eligible now",
        donationsTotal: "Donation records",
        next7Days: "Eligible in 7 days",
        chartTitle: "New donors",
        chartSub: "Registrations over the last 12 months",
        chartFilterAll: "All months",
        chartSubDaily: "Daily registrations",
        male: "Male",
        female: "Female",
        bloodTypeTitle: "Blood type distribution",
        bloodTypeSub: "Donors grouped by blood type",
        recentTitle: "Recent donors",
        recentSub: "Latest registrations",
        cooldownNote: "56-day cooldown",
        last30: "last 30 days",
        readyToUse: "ready to use",
        upcoming: "upcoming",
        empty: "No donors yet",
        donors: "donors",
        bagsTotal: "Total bags",
        ready_to_use: "Ready to use",
        colDonor: "Donor",
        colDonorId: "Donor ID",
        colBloodType: "Blood type",
        colLocation: "Location",
        colStatus: "Status",
        colRegistered: "Registered",
        eligibleShort: "Eligible",
        cooldownShort: "Cooldown",
      } as const
    }
    return {
      title: "Dashboard",
      subtitle: "သွေးလှူဒါန်းမှု ခြုံငုံသုံးသပ်ချက်",
      totalDonors: "Donor စုစုပေါင်း",
      eligibleNow: "ယခုလှူနိုင်သူ",
      donationsTotal: "လှူဒါန်းမှတ်တမ်း",
      next7Days: "၇ ရက်အတွင်း လှူနိုင်မယ့်သူ",
      chartTitle: "Donor အသစ်",
      chartSub: "လွန်ခဲ့သော ၁၂ လအတွင်း မှတ်ပုံတင်မှု",
      chartFilterAll: "လ အားလုံး",
      chartSubDaily: "နေ့စဉ် မှတ်ပုံတင်မှု",
      male: "ကျား",
      female: "မ",
      bloodTypeTitle: "သွေးအုပ်စု ခွဲခြားမှု",
      bloodTypeSub: "သွေးအုပ်စုအလိုက် donor များ",
      recentTitle: "လတ်တလော Donor များ",
      recentSub: "နောက်ဆုံး မှတ်ပုံတင်မှုများ",
      cooldownNote: "၅၆ ရက် နားရန်",
      last30: "လွန်ခဲ့သော ၃၀ ရက်",
      readyToUse: "အသုံးပြုနိုင်",
      upcoming: "လာမည့်",
      empty: "Donor မရှိသေးပါ",
      donors: "ဦး",
      bagsTotal: "အိတ်စုစုပေါင်း",
      ready_to_use: "အသုံးပြုနိုင်",
      colDonor: "Donor",
      colDonorId: "Donor ID",
      colBloodType: "သွေးအုပ်စု",
      colLocation: "တည်နေရာ",
      colStatus: "အခြေအနေ",
      colRegistered: "မှတ်ပုံတင်သည့်နေ့",
      eligibleShort: "လှူနိုင်",
      cooldownShort: "နားဆဲ",
    } as const
  }, [locale])

      const [isLoading, setIsLoading] = useState(true)
  const [donors, setDonors] = useState<Donor[]>([])
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [nowMs, setNowMs] = useState(0)
  const [chartMonthFilter, setChartMonthFilter] = useState("all")
  const [chartSeries, setChartSeries] = useState({
    male: true,
    female: true,
  })

  useEffect(() => {
    setIsLoading(true)
    const d = listDonors()
    const r = listDonations()
    setDonors(d)
    setDonations(r)
    setNowMs(Date.now())
    setIsLoading(false)
  }, [])

  const lastDonationByDonor = useMemo(() => {
    const map = new Map<string, DonationRecord>()
    for (const record of donations) {
      const existing = map.get(record.donorId)
      if (
        !existing ||
        isAfter(new Date(record.donatedAt), new Date(existing.donatedAt))
      ) {
        map.set(record.donorId, record)
      }
    }
    return map
  }, [donations])

  const isDonorEligible = useCallback(
    (donorId: string) => {
      const last = lastDonationByDonor.get(donorId)
      const nowDate = new Date(nowMs || Date.now())
      return !last || !isAfter(new Date(last.nextEligibleDate), nowDate)
    },
    [lastDonationByDonor, nowMs]
  )

  const stats = useMemo(() => {
    const total = donors.length
    const nowDate = new Date(nowMs || Date.now())
    const in7 = new Date(nowDate.getTime() + 7 * 86400000)
    let eligible = 0
    let soon = 0

    for (const donor of donors) {
      if (isDonorEligible(donor.id)) eligible += 1

      const last = lastDonationByDonor.get(donor.id)
      if (last) {
        const next = new Date(last.nextEligibleDate)
        if (next >= nowDate && next <= in7) soon += 1
      }
    }

    const now = nowMs
    const last30 = donors.filter(
      (d) => now - new Date(d.createdAt).getTime() <= 30 * 86400000
    ).length
    const prev30 = donors.filter((d) => {
      const age = now - new Date(d.createdAt).getTime()
      return age > 30 * 86400000 && age <= 60 * 86400000
    }).length
    const trend =
      prev30 === 0
        ? last30 > 0
          ? 100
          : 0
        : Math.round(((last30 - prev30) / prev30) * 100)

    const readyBags = donations.filter(
      (r) => r.bloodBagStatus === "ready_to_use"
    ).length

    return { total, eligible, soon, trend, readyBags }
  }, [donors, donations, nowMs, lastDonationByDonor, isDonorEligible])

  const donationsCount = donations.length

  const bloodTypeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const bt of BLOOD_TYPES) counts.set(bt, 0)
    for (const d of donors) {
      counts.set(d.bloodType, (counts.get(d.bloodType) ?? 0) + 1)
    }
    return BLOOD_TYPES.map((bt) => ({
      bloodType: bt,
      count: counts.get(bt) ?? 0,
    }))
  }, [donors])

  const recentDonors = useMemo(() => {
    return donors
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
  }, [donors])

  const chartData = useMemo(() => {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    const start = new Date(end.getFullYear(), end.getMonth() - (CHART_MONTHS - 1), 1)

    const counts = new Map<string, { male: number; female: number }>()
    const cursor = new Date(start)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

    while (cursor <= endMonth) {
      counts.set(monthLabel(cursor), { male: 0, female: 0 })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    for (const donor of donors) {
      const created = new Date(donor.createdAt)
      const key = monthLabel(created)
      const row = counts.get(key)
      if (!row) continue
      if (donor.gender === "male") row.male += 1
      else if (donor.gender === "female") row.female += 1
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { male, female }]) => ({
        date,
        male,
        female,
      }))
  }, [donors])

  const isDailyChart = chartMonthFilter !== "all"
  const chartStackId =
    chartSeries.male && chartSeries.female ? "gender" : undefined

  const setChartSeriesVisible = (
    key: "male" | "female",
    visible: boolean
  ) => {
    setChartSeries((prev) => {
      const next = { ...prev, [key]: visible }
      if (!next.male && !next.female) return prev
      return next
    })
  }

  const filteredChartData = useMemo(() => {
    if (chartMonthFilter === "all") return chartData

    const [year, month] = chartMonthFilter.split("-").map(Number)
    if (!year || !month) return chartData

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    const counts = new Map<string, { male: number; female: number }>()
    const cursor = new Date(start)
    while (cursor <= end) {
      counts.set(dayLabel(cursor), { male: 0, female: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const donor of donors) {
      const created = new Date(donor.createdAt)
      if (monthLabel(created) !== chartMonthFilter) continue
      const key = dayLabel(created)
      const row = counts.get(key)
      if (!row) continue
      if (donor.gender === "male") row.male += 1
      else if (donor.gender === "female") row.female += 1
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { male, female }]) => ({
        date,
        male,
        female,
      }))
  }, [chartData, chartMonthFilter, donors])

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      male: {
        label: t.male,
        color: DONOR_GENDER_COLORS.male,
      },
      female: {
        label: t.female,
        color: DONOR_GENDER_COLORS.female,
      },
    }),
    [t.male, t.female]
  )

  const bloodTypeConfig = useMemo<ChartConfig>(
    () => ({
      count: {
        label: t.donors,
        color: "oklch(0.58 0.14 254)",
      },
    }),
    [t.donors]
  )

  const donationRadialData = useMemo(
    () => [
      {
        status: "ready",
        value: stats.readyBags,
        fill: "var(--color-ready)",
      },
    ],
    [stats.readyBags]
  )

  const donationRadialConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: t.bagsTotal,
      },
      ready: {
        label: t.ready_to_use,
        color: "oklch(0.62 0.21 25)",
      },
    }),
    [t.bagsTotal, t.ready_to_use]
  )

  const eligibleRadialData = useMemo(
    () => [
      {
        status: "eligible",
        value: stats.eligible,
        fill: "var(--color-eligible)",
      },
    ],
    [stats.eligible]
  )

  const eligibleRadialConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: t.totalDonors,
      },
      eligible: {
        label: t.eligibleShort,
        color: "oklch(0.7 0.15 145)",
      },
    }),
    [t.eligibleShort, t.totalDonors]
  )

  const eligiblePercent = useMemo(
    () =>
      stats.total > 0 ? Math.round((stats.eligible / stats.total) * 100) : 0,
    [stats.eligible, stats.total]
  )

  const soonRadialData = useMemo(
    () => [
      {
        status: "soon",
        value: stats.soon,
        fill: "var(--color-soon)",
      },
    ],
    [stats.soon]
  )

  const soonRadialConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: t.totalDonors,
      },
      soon: {
        label: t.upcoming,
        color: "oklch(0.74 0.16 75)",
      },
    }),
    [t.totalDonors, t.upcoming]
  )

  const soonPercent = useMemo(
    () => (stats.total > 0 ? Math.round((stats.soon / stats.total) * 100) : 0),
    [stats.soon, stats.total]
  )

  const totalRadialData = useMemo(
    () => [
      {
        status: "total",
        value: stats.total,
        fill: "var(--color-total)",
      },
    ],
    [stats.total]
  )

  const totalRadialConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: t.totalDonors,
      },
      total: {
        label: t.donors,
        color: "var(--chart-2)",
      },
    }),
    [t.donors, t.totalDonors]
  )

  type StatCard = {
    key: string
    label: string
    value: number
    icon: typeof UsersIcon
    note: string | null
    accent: string
    bg: string
    color: string
    showTrend: boolean
    progress: number | null
  }

  const statCards: StatCard[] = [
    {
      key: "total",
      label: t.totalDonors,
      value: stats.total,
      icon: UsersIcon,
      note: null,
      accent: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
      color: "oklch(0.62 0.16 240)",
      showTrend: true,
      progress: null,
    },
    {
      key: "eligible",
      label: t.eligibleNow,
      value: stats.eligible,
      icon: HeartHandshakeIcon,
      note: t.cooldownNote,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      color: "oklch(0.7 0.15 145)",
      showTrend: false,
      progress: null,
    },
    {
      key: "donations",
      label: t.donationsTotal,
      value: donationsCount,
      icon: DropletIcon,
      note: `${stats.readyBags.toLocaleString()} ${t.readyToUse}`,
      accent: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
      color: "oklch(0.62 0.21 25)",
      showTrend: false,
      progress: null,
    },
    {
      key: "soon",
      label: t.next7Days,
      value: stats.soon,
      icon: CalendarClockIcon,
      note: t.upcoming,
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      color: "oklch(0.74 0.16 75)",
      showTrend: false,
      progress: null,
    },
  ]

  return (
    <AuthedShell title={t.title}>
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <Card
                  key={card.key}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <span
                      className={`flex size-9 items-center justify-center rounded-lg ${card.bg} ${card.accent}`}
                    >
                      <Icon className="size-4.5" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-2xl font-semibold tabular-nums">
                          {card.value.toLocaleString()}
                        </div>
                        {card.showTrend ? (
                          <div className="mt-1 flex items-center gap-1 text-xs">
                            {stats.trend >= 0 ? (
                              <TrendingUpIcon className="size-3.5 text-emerald-500" />
                            ) : (
                              <TrendingDownIcon className="size-3.5 text-rose-500" />
                            )}
                            <span
                              className={
                                stats.trend >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {stats.trend >= 0 ? "+" : ""}
                              {stats.trend}%
                            </span>
                            <span className="text-muted-foreground">
                              {t.last30}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {card.note}
                          </div>
                        )}
                      </div>

                      {card.key === "total" ? (
                        <div className="h-20 w-20 shrink-0">
                          <ChartContainer
                            config={totalRadialConfig}
                            className="h-full w-full"
                          >
                            <RadialBarChart
                              data={totalRadialData}
                              endAngle={100}
                              innerRadius={28}
                              outerRadius={40}
                            >
                              <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[36, 31]}
                              />
                              <RadialBar dataKey="value" background />
                              <PolarRadiusAxis
                                tick={false}
                                tickLine={false}
                                axisLine={false}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    if (
                                      viewBox &&
                                      "cx" in viewBox &&
                                      "cy" in viewBox
                                    ) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-sm font-bold"
                                          >
                                            {stats.total.toLocaleString()}
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 14}
                                            className="fill-muted-foreground text-[9px]"
                                          >
                                            {t.donors}
                                          </tspan>
                                        </text>
                                      )
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </div>
                      ) : card.key === "donations" ? (
                        <div className="h-20 w-20 shrink-0">
                          <ChartContainer
                            config={donationRadialConfig}
                            className="h-full w-full"
                          >
                            <RadialBarChart
                              data={donationRadialData}
                              startAngle={0}
                              endAngle={250}
                              outerRadius={40}
                              innerRadius={35}
                            >
                              <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[40, 35]}
                              />
                              <RadialBar
                                dataKey="value"
                                background
                                cornerRadius={6}
                                max={Math.max(donationsCount, 1)}
                              />
                              <PolarRadiusAxis
                                tick={false}
                                tickLine={false}
                                axisLine={false}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    if (
                                      viewBox &&
                                      "cx" in viewBox &&
                                      "cy" in viewBox
                                    ) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-sm font-bold"
                                          >
                                            {stats.readyBags.toLocaleString()}
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 14}
                                            className="fill-muted-foreground text-[9px]"
                                          >
                                            {t.readyToUse}
                                          </tspan>
                                        </text>
                                      )
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </div>
                      ) : card.key === "eligible" ? (
                        <div className="h-20 w-20 shrink-0">
                          <ChartContainer
                            config={eligibleRadialConfig}
                            className="h-full w-full"
                          >
                            <RadialBarChart
                              data={eligibleRadialData}
                              startAngle={0}
                              endAngle={250}
                              outerRadius={40}
                              innerRadius={35}
                            >
                              <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[40, 35]}
                              />
                              <RadialBar
                                dataKey="value"
                                background
                                cornerRadius={6}
                                max={Math.max(stats.total, 1)}
                              />
                              <PolarRadiusAxis
                                tick={false}
                                tickLine={false}
                                axisLine={false}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    if (
                                      viewBox &&
                                      "cx" in viewBox &&
                                      "cy" in viewBox
                                    ) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-sm font-bold"
                                          >
                                            {eligiblePercent}%
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 14}
                                            className="fill-muted-foreground text-[9px]"
                                          >
                                            {t.eligibleShort}
                                          </tspan>
                                        </text>
                                      )
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </div>
                      ) : card.key === "soon" ? (
                        <div className="h-20 w-20 shrink-0">
                          <ChartContainer
                            config={soonRadialConfig}
                            className="h-full w-full"
                          >
                            <RadialBarChart
                              data={soonRadialData}
                              startAngle={0}
                              endAngle={250}
                              outerRadius={40}
                              innerRadius={35}
                            >
                              <PolarGrid
                                gridType="circle"
                                radialLines={false}
                                stroke="none"
                                className="first:fill-muted last:fill-background"
                                polarRadius={[40, 35]}
                              />
                              <RadialBar
                                dataKey="value"
                                background
                                cornerRadius={6}
                                max={Math.max(stats.total, 1)}
                              />
                              <PolarRadiusAxis
                                tick={false}
                                tickLine={false}
                                axisLine={false}
                              >
                                <Label
                                  content={({ viewBox }) => {
                                    if (
                                      viewBox &&
                                      "cx" in viewBox &&
                                      "cy" in viewBox
                                    ) {
                                      return (
                                        <text
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                        >
                                          <tspan
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            className="fill-foreground text-sm font-bold"
                                          >
                                            {soonPercent}%
                                          </tspan>
                                          <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 14}
                                            className="fill-muted-foreground text-[9px]"
                                          >
                                            {t.upcoming}
                                          </tspan>
                                        </text>
                                      )
                                    }
                                  }}
                                />
                              </PolarRadiusAxis>
                            </RadialBarChart>
                          </ChartContainer>
                        </div>
                      ) : null}
                    </div>

                    {card.progress !== null ? (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round((card.progress ?? 0) * 100)}%`,
                              backgroundColor: card.color,
                            }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {Math.round((card.progress ?? 0) * 100)}%
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="min-w-0 xl:col-span-8">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{t.chartTitle}</CardTitle>
                  <CardDescription>
                    {chartMonthFilter === "all"
                      ? t.chartSub
                      : `${formatMonthTick(chartMonthFilter, locale, "long")} · ${t.chartSubDaily}`}
                  </CardDescription>
                </div>
                <Select
                  value={chartMonthFilter}
                  onValueChange={(value) => {
                    if (value) setChartMonthFilter(value)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={t.chartFilterAll} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.chartFilterAll}</SelectItem>
                    {chartData.map((row) => (
                      <SelectItem key={row.date} value={row.date}>
                        {formatMonthTick(row.date, locale, "long")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  id="donor-new"
                  config={chartConfig}
                  className="aspect-auto h-[280px] w-full"
                >
                  <AreaChart
                    accessibilityLayer
                    data={filteredChartData}
                    margin={{ top: 12, right: 12, left: 12, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={isDailyChart ? 8 : 24}
                      tickFormatter={(value) =>
                        isDailyChart
                          ? formatDayTick(String(value), locale, "short")
                          : formatMonthTick(String(value), locale, "short")
                      }
                    />
                    <YAxis
                      hide
                      domain={[0, "dataMax"]}
                      padding={{ top: 20 }}
                      allowDecimals={false}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) =>
                            isDailyChart
                              ? formatDayTick(String(label), locale, "long")
                              : formatMonthTick(String(label), locale, "long")
                          }
                        />
                      }
                    />
                    <defs>
                      <linearGradient
                        id="fillDonorsMale"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={DONOR_GENDER_COLORS.male}
                          stopOpacity={0.55}
                        />
                        <stop
                          offset="95%"
                          stopColor={DONOR_GENDER_COLORS.male}
                          stopOpacity={0.08}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fillDonorsFemale"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={DONOR_GENDER_COLORS.female}
                          stopOpacity={0.55}
                        />
                        <stop
                          offset="95%"
                          stopColor={DONOR_GENDER_COLORS.female}
                          stopOpacity={0.08}
                        />
                      </linearGradient>
                    </defs>
                    {chartSeries.female ? (
                      <Area
                        dataKey="female"
                        type="monotone"
                        stackId={chartStackId}
                        baseValue={0}
                        fill="url(#fillDonorsFemale)"
                        fillOpacity={0.35}
                        stroke={DONOR_GENDER_COLORS.female}
                      />
                    ) : null}
                    {chartSeries.male ? (
                      <Area
                        dataKey="male"
                        type="monotone"
                        stackId={chartStackId}
                        baseValue={0}
                        fill="url(#fillDonorsMale)"
                        fillOpacity={0.35}
                        stroke={DONOR_GENDER_COLORS.male}
                      />
                    ) : null}
                  </AreaChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-4 pt-3">
                  {(
                    [
                      {
                        key: "female" as const,
                        label: t.female,
                        color: DONOR_GENDER_COLORS.female,
                      },
                      {
                        key: "male" as const,
                        label: t.male,
                        color: DONOR_GENDER_COLORS.male,
                      },
                    ] as const
                  ).map((item) => {
                    const visible = chartSeries[item.key]
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setChartSeriesVisible(item.key, !visible)
                        }
                        className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm"
                      >
                        <span
                          className={`size-2.5 rounded-[3px] transition-opacity ${visible ? "opacity-100" : "opacity-30"}`}
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className={
                            visible
                              ? "text-foreground"
                              : "text-muted-foreground line-through"
                          }
                        >
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 xl:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">{t.bloodTypeTitle}</CardTitle>
                <CardDescription>{t.bloodTypeSub}</CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                <ChartContainer
                  id="blood-type"
                  config={bloodTypeConfig}
                  className="mx-auto aspect-square max-h-[280px]"
                >
                  <RadarChart data={bloodTypeData}>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <PolarAngleAxis dataKey="bloodType" />
                    <PolarGrid radialLines={false} />
                    <Radar
                      dataKey="count"
                      fill="var(--color-count)"
                      fillOpacity={0}
                      stroke="var(--color-count)"
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent donors table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.recentTitle}</CardTitle>
              <CardDescription>{t.recentSub}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDonors.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t.empty}
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.colDonor}</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          {t.colDonorId}
                        </TableHead>
                        <TableHead>{t.colBloodType}</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t.colLocation}
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {t.colRegistered}
                        </TableHead>
                        <TableHead className="text-right">
                          {t.colStatus}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDonors.map((d) => {
                        const eligible = isDonorEligible(d.id)
                        const initials = d.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                        return (
                          <TableRow key={d.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {initials}
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">
                                    {d.name}
                                  </div>
                                  <div className="truncate text-xs text-muted-foreground sm:hidden">
                                    {d.donorId}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                              {d.donorId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {d.bloodType}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {d.township || d.city || "—"}
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                              {d.createdAt.slice(0, 10)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={eligible ? "default" : "secondary"}
                                className={
                                  eligible
                                    ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                                    : ""
                                }
                              >
                                {eligible ? t.eligibleShort : t.cooldownShort}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AuthedShell>
  )
}
