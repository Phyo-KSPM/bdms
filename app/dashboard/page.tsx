"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { differenceInCalendarDays, isAfter, subDays } from "date-fns"
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
import { Button } from "@/components/ui/button"
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
  buildDonorListHref,
  type DashboardDonorView,
} from "@/lib/donor-dashboard-navigation"
import {
  listDonations,
  listDonors,
  BloodTypeSchema,
  type Donor,
  type DonationRecord,
} from "@/lib/donor-store"
import {
  buildNewDonorsChartData,
  formatChartPeriodDescription,
  formatChartTick,
  getDefaultChartRange,
  getLastNDaysRange,
  isWithinChartRange,
  NewDonorsChartPicker,
  normalizeChartRange,
  type ChartViewMode,
} from "@/components/new-donors-chart-picker"

const BLOOD_TYPES = BloodTypeSchema.options

const DONOR_GENDER_COLORS = {
  male: "oklch(0.52 0.11 254)",
  female: "oklch(0.60 0.13 242)",
} as const

export default function Page() {
  const router = useRouter()
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
        chartSubDaily: "Daily registrations",
        chartSubWeekly: "Weekly registrations",
        chartSubMonthly: "Monthly registrations",
        viewDay: "Day",
        viewWeek: "Week",
        viewMonth: "Month",
        startDate: "Start date",
        endDate: "End date",
        clear: "Clear",
        quickPresets: "Quick presets",
        last3Days: "Last 3 days",
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
        last12Months: "Last 12 months",
        bloodType: "Blood type",
        allBloodTypes: "All blood types",
        filters: "Filters",
        male: "Male",
        female: "Female",
        bloodTypeTitle: "Blood type distribution",
        bloodTypeSub: "Donors grouped by blood type",
        recentTitle: "Recent donors",
        recentSub: "Latest registrations",
        cooldownNote: "56-day cooldown",
        last30: "last 30 days",
        vsPreviousPeriod: "vs previous period",
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
      chartSubDaily: "နေ့စဉ် မှတ်ပုံတင်မှု",
      chartSubWeekly: "အပတ်စဉ် မှတ်ပုံတင်မှု",
      chartSubMonthly: "လစဉ် မှတ်ပုံတင်မှု",
      viewDay: "နေ့",
      viewWeek: "အပတ်",
      viewMonth: "လ",
      startDate: "စတင်ရက်",
      endDate: "ပြီးဆုံးရက်",
      clear: "ရှင်းမည်",
      quickPresets: "အမြန်ရွေးချယ်မှု",
      last3Days: "နောက်ဆုံး ၃ ရက်",
      last7Days: "နောက်ဆုံး ၇ ရက်",
      last30Days: "နောက်ဆုံး ၃၀ ရက်",
      last12Months: "နောက်ဆုံး ၁၂ လ",
      bloodType: "သွေးအမျိုးအစား",
      allBloodTypes: "သွေးအုပ်စု အားလုံး",
      filters: "Filter",
      male: "ကျား",
      female: "မ",
      bloodTypeTitle: "သွေးအုပ်စု ခွဲခြားမှု",
      bloodTypeSub: "သွေးအုပ်စုအလိုက် donor များ",
      recentTitle: "လတ်တလော Donor များ",
      recentSub: "နောက်ဆုံး မှတ်ပုံတင်မှုများ",
      cooldownNote: "၅၆ ရက် နားရန်",
      last30: "လွန်ခဲ့သော ၃၀ ရက်",
      vsPreviousPeriod: "ယခင်ကာလနှင့် နှိုင်းယှဉ်",
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
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("month")
  const [chartStartDate, setChartStartDate] = useState(
    () => getDefaultChartRange().start
  )
  const [chartEndDate, setChartEndDate] = useState(
    () => getDefaultChartRange().end
  )
  const [bloodTypeFilter, setBloodTypeFilter] = useState("all")
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

  const filterRange = useMemo(
    () => normalizeChartRange(chartStartDate, chartEndDate),
    [chartStartDate, chartEndDate]
  )

  const dateFilteredDonors = useMemo(
    () =>
      donors.filter((donor) =>
        isWithinChartRange(donor.createdAt, filterRange.start, filterRange.end)
      ),
    [donors, filterRange]
  )

  const filteredDonors = useMemo(() => {
    if (bloodTypeFilter === "all") return dateFilteredDonors
    return dateFilteredDonors.filter(
      (donor) => donor.bloodType === bloodTypeFilter
    )
  }, [dateFilteredDonors, bloodTypeFilter])

  const dateFilteredDonations = useMemo(
    () =>
      donations.filter((record) =>
        isWithinChartRange(record.donatedAt, filterRange.start, filterRange.end)
      ),
    [donations, filterRange]
  )

  const filteredDonations = useMemo(() => {
    if (bloodTypeFilter === "all") return dateFilteredDonations
    const donorIds = new Set(
      donors
        .filter((donor) => donor.bloodType === bloodTypeFilter)
        .map((donor) => donor.id)
    )
    return dateFilteredDonations.filter((record) =>
      donorIds.has(record.donorId)
    )
  }, [dateFilteredDonations, bloodTypeFilter, donors])

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
    const total = filteredDonors.length
    const nowDate = new Date(nowMs || Date.now())
    const in7 = new Date(nowDate.getTime() + 7 * 86400000)
    let eligible = 0
    let soon = 0

    for (const donor of filteredDonors) {
      if (isDonorEligible(donor.id)) eligible += 1

      const last = lastDonationByDonor.get(donor.id)
      if (last) {
        const next = new Date(last.nextEligibleDate)
        if (next >= nowDate && next <= in7) soon += 1
      }
    }

    const periodDays =
      differenceInCalendarDays(filterRange.end, filterRange.start) + 1
    const prevEnd = subDays(filterRange.start, 1)
    const prevStart = subDays(prevEnd, periodDays - 1)
    const currentPeriod = filteredDonors.length
    const previousPeriod = donors.filter((donor) => {
      if (!isWithinChartRange(donor.createdAt, prevStart, prevEnd)) return false
      if (bloodTypeFilter !== "all" && donor.bloodType !== bloodTypeFilter) {
        return false
      }
      return true
    }).length
    const trend =
      previousPeriod === 0
        ? currentPeriod > 0
          ? 100
          : 0
        : Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100)

    const readyBags = filteredDonations.filter(
      (record) => record.bloodBagStatus === "ready_to_use"
    ).length

    return { total, eligible, soon, trend, readyBags }
  }, [
    filteredDonors,
    filteredDonations,
    donors,
    filterRange,
    bloodTypeFilter,
    nowMs,
    lastDonationByDonor,
    isDonorEligible,
  ])

  const donationsCount = filteredDonations.length

  const bloodTypeData = useMemo(() => {
    const counts = new Map<string, { male: number; female: number }>()
    for (const bt of BLOOD_TYPES) counts.set(bt, { male: 0, female: 0 })
    for (const d of filteredDonors) {
      const row = counts.get(d.bloodType)
      if (!row) continue
      if (d.gender === "male") row.male += 1
      else if (d.gender === "female") row.female += 1
    }
    return BLOOD_TYPES.map((bt) => ({
      bloodType: bt,
      male: counts.get(bt)?.male ?? 0,
      female: counts.get(bt)?.female ?? 0,
    }))
  }, [filteredDonors])

  const recentDonors = useMemo(() => {
    return filteredDonors
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
  }, [filteredDonors])

  const filteredChartData = useMemo(
    () =>
      buildNewDonorsChartData(
        filteredDonors,
        chartViewMode,
        chartStartDate,
        chartEndDate
      ),
    [filteredDonors, chartViewMode, chartStartDate, chartEndDate]
  )

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

  function applyDatePreset(days: number | "default", mode: ChartViewMode) {
    const range =
      days === "default" ? getDefaultChartRange() : getLastNDaysRange(days)
    setChartViewMode(mode)
    setChartStartDate(range.start)
    setChartEndDate(range.end)
  }

  function clearDashboardFilters() {
    const { start, end } = getDefaultChartRange()
    setChartViewMode("month")
    setChartStartDate(start)
    setChartEndDate(end)
    setBloodTypeFilter("all")
  }

  function openDonorList(view: DashboardDonorView) {
    router.push(
      buildDonorListHref({
        view,
        bloodType: bloodTypeFilter,
        from: filterRange.start,
        to: filterRange.end,
        groupBy: "bloodType",
      })
    )
  }

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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-x-auto pb-0.5 xl:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => applyDatePreset(3, "day")}
              >
                {t.last3Days}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => applyDatePreset(7, "day")}
              >
                {t.last7Days}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => applyDatePreset(30, "day")}
              >
                {t.last30Days}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => applyDatePreset("default", "month")}
              >
                {t.last12Months}
              </Button>
              <Select
                value={bloodTypeFilter}
                onValueChange={(value) => {
                  if (value) setBloodTypeFilter(value)
                }}
              >
                <SelectTrigger className="h-8 w-auto min-w-[72px] shrink-0 rounded-full px-3 text-xs">
                  <SelectValue placeholder={t.allBloodTypes} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allBloodTypes}</SelectItem>
                  {BLOOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NewDonorsChartPicker
                locale={locale}
                viewMode={chartViewMode}
                startDate={chartStartDate}
                endDate={chartEndDate}
                bloodTypeFilter={bloodTypeFilter}
                bloodTypes={BLOOD_TYPES}
                onViewModeChange={setChartViewMode}
                onRangeChange={(start, end) => {
                  const normalized = normalizeChartRange(start, end)
                  setChartStartDate(normalized.start)
                  setChartEndDate(normalized.end)
                }}
                onBloodTypeChange={setBloodTypeFilter}
                labels={{
                  viewDay: t.viewDay,
                  viewWeek: t.viewWeek,
                  viewMonth: t.viewMonth,
                  startDate: t.startDate,
                  endDate: t.endDate,
                  clear: t.clear,
                  quickPresets: t.quickPresets,
                  last3Days: t.last3Days,
                  last7Days: t.last7Days,
                  last30Days: t.last30Days,
                  last12Months: t.last12Months,
                  bloodType: t.bloodType,
                  allBloodTypes: t.allBloodTypes,
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2 text-xs"
                onClick={clearDashboardFilters}
              >
                {t.clear}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <Card
                  key={card.key}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openDonorList(card.key as DashboardDonorView)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      openDonorList(card.key as DashboardDonorView)
                    }
                  }}
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
                              {t.vsPreviousPeriod}
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
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">{t.chartTitle}</CardTitle>
                <CardDescription>
                  {formatChartPeriodDescription(
                    chartViewMode,
                    chartStartDate,
                    chartEndDate,
                    locale,
                    {
                      chartSubDaily: t.chartSubDaily,
                      chartSubWeekly: t.chartSubWeekly,
                      chartSubMonthly: t.chartSubMonthly,
                    }
                  )}
                </CardDescription>
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
                      minTickGap={chartViewMode === "month" ? 24 : 8}
                      tickFormatter={(value) =>
                        formatChartTick(
                          String(value),
                          chartViewMode,
                          locale,
                          "short"
                        )
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
                            formatChartTick(
                              String(label),
                              chartViewMode,
                              locale,
                              "long"
                            )
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
              <CardContent className="pb-3">
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
                    {chartSeries.female ? (
                      <Radar
                        dataKey="female"
                        fill="var(--color-female)"
                        fillOpacity={0.15}
                        stroke="var(--color-female)"
                        strokeWidth={2}
                      />
                    ) : null}
                    {chartSeries.male ? (
                      <Radar
                        dataKey="male"
                        fill="var(--color-male)"
                        fillOpacity={0.15}
                        stroke="var(--color-male)"
                        strokeWidth={2}
                      />
                    ) : null}
                  </RadarChart>
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
