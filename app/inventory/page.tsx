"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  PackageIcon,
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  BloodTypeSchema,
  getDonorById,
  getInventoryStats,
  isTtiComplete,
  listDonations,
  TTI_MARKERS,
  type DonationRecord,
} from "@/lib/donor-store"

type StatusFilter = "all" | DonationRecord["bloodBagStatus"]
type BloodTypeFilter = "all" | (typeof BloodTypeSchema.options)[number]

const BLOOD_TYPES = BloodTypeSchema.options

const BLOOD_TYPE_COLORS: Record<string, string> = {
  "A+": "oklch(0.62 0.21 25)",
  "A-": "oklch(0.68 0.18 15)",
  "B+": "oklch(0.6 0.18 265)",
  "B-": "oklch(0.65 0.14 280)",
  "AB+": "oklch(0.7 0.15 145)",
  "AB-": "oklch(0.72 0.12 160)",
  "O+": "oklch(0.62 0.16 240)",
  "O-": "oklch(0.74 0.16 75)",
}

function bloodTypeGradientKey(bloodType: string) {
  return bloodType.replace(/[^a-zA-Z0-9]/g, "")
}

function StatCardBloodTypeChart({
  cardKey,
  data,
}: {
  cardKey: string
  data: { bloodType: string; count: number }[]
}) {
  const seriesKeys = useMemo(() => data.map((item) => item.bloodType), [data])

  const wideData = useMemo(() => {
    return data.map(({ bloodType, count }) => {
      const row: Record<string, string | number> = { bloodType }
      for (const bt of seriesKeys) {
        row[bt] = bt === bloodType ? count : 0
      }
      return row
    })
  }, [data, seriesKeys])

  const config = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {}
    for (const bloodType of seriesKeys) {
      cfg[bloodType] = {
        label: bloodType,
        color: BLOOD_TYPE_COLORS[bloodType] ?? "oklch(0.6 0.1 300)",
      }
    }
    return cfg
  }, [seriesKeys])

  if (wideData.length === 0) return null

  const gradientPrefix = `fillInvArea-${cardKey}`

  return (
    <ChartContainer
      id={`inv-stat-${cardKey}`}
      config={config}
      className="mt-3 h-[148px] w-full border-t pt-3"
    >
      <AreaChart
        data={wideData}
        margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
      >
        <defs>
          {seriesKeys.map((bloodType) => {
            const color =
              BLOOD_TYPE_COLORS[bloodType] ?? "oklch(0.6 0.1 300)"
            return (
              <linearGradient
                key={bloodType}
                id={`${gradientPrefix}-${bloodTypeGradientKey(bloodType)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.55} />
                <stop offset="95%" stopColor={color} stopOpacity={0.08} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="bloodType"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9 }}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 9 }}
          width={28}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(label) => String(label)}
            />
          }
        />
        {seriesKeys.map((bloodType) => {
          const color =
            BLOOD_TYPE_COLORS[bloodType] ?? "oklch(0.6 0.1 300)"
          return (
            <Area
              key={bloodType}
              type="monotone"
              dataKey={bloodType}
              stackId="blood"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradientPrefix}-${bloodTypeGradientKey(bloodType)})`}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          )
        })}
      </AreaChart>
    </ChartContainer>
  )
}

export default function Page() {
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Blood Bag Inventory",
        subtitle:
          "All collected blood units — view bag ID, donor, blood type, and status",
        statTotal: "Total bags",
        statReady: "Ready to use",
        statPending: "Pending testing",
        statDiscarded: "Discarded",
        listTitle: "Blood bags",
        listSub: "Units created after pre-donation screening and collection",
        search: "Search bag ID / donor ID / name...",
        filterStatus: "All statuses",
        filterBloodType: "All blood types",
        colBag: "Bag ID",
        colDonor: "Donor",
        colBloodType: "Blood type",
        colType: "Type",
        colVolume: "Volume",
        colCollected: "Collected",
        colLocation: "Location",
        colTti: "TTI",
        colStatus: "Status",
        noBags: "No blood bags yet. Complete screening, then record collection.",
        goDonations: "Record collection",
        ready_to_use: "Ready to use",
        pending_testing: "Pending testing",
        discarded: "Discarded",
        whole_blood: "Whole blood",
        platelets: "Platelets",
        plasma: "Plasma",
        double_red_cells: "Double red cells",
      } as const
    }
    return {
      title: "သွေးအိတ် စတော့",
      subtitle:
        "ကောက်ယူထားသော သွေးအိတ်အားလုံး — Bag ID၊ Donor၊ သွေးအမျိုးအစား၊ အခြေအနေ",
      statTotal: "အိတ်စုစုပေါင်း",
      statReady: "အသုံးပြုနိုင်",
      statPending: "စစ်ဆေးဆဲ",
      statDiscarded: "ဖျက်သိမ်း",
      listTitle: "သွေးအိတ်များ",
      listSub: "စစ်ဆေးမှု Pass ဖြစ်ပြီး ကောက်ယူပြီးသော အိတ်များ",
      search: "Bag ID / Donor ID / အမည်ဖြင့် ရှာရန်...",
      filterStatus: "အခြေအနေ အားလုံး",
      filterBloodType: "သွေးအမျိုးအစား အားလုံး",
      colBag: "အိတ် ID",
      colDonor: "Donor",
      colBloodType: "သွေးအမျိုးအစား",
      colType: "အမျိုးအစား",
      colVolume: "ပမာဏ",
      colCollected: "ကောက်ယူသည့်နေ့",
      colLocation: "နေရာ",
      colTti: "TTI",
      colStatus: "အခြေအနေ",
      noBags: "သွေးအိတ် မရှိသေးပါ။ စစ်ဆေးမှု ပြီးမှ ကောက်ယူမှု မှတ်တမ်းတင်ပါ။",
      goDonations: "ကောက်ယူမှု မှတ်တမ်းတင်",
      ready_to_use: "အသုံးပြုနိုင်",
      pending_testing: "စစ်ဆေးဆဲ",
      discarded: "ဖျက်သိမ်း",
      whole_blood: "သွေးရိုးရိုး",
      platelets: "သွေးဥမွှား",
      plasma: "ပလားစမာ",
      double_red_cells: "RBC နှစ်ဆ",
    } as const
  }, [locale])

  const statusLabel: Record<DonationRecord["bloodBagStatus"], string> = {
    ready_to_use: t.ready_to_use,
    pending_testing: t.pending_testing,
    discarded: t.discarded,
  }

  const [records, setRecords] = useState<DonationRecord[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [bloodTypeFilter, setBloodTypeFilter] = useState<BloodTypeFilter>("all")

  function refresh() {
    setRecords(listDonations())
  }

  useEffect(() => {
    refresh()
  }, [])

  const stats = useMemo(() => {
    void records
    return getInventoryStats()
  }, [records])

  const donorById = useMemo(() => {
    const map = new Map<
      string,
      { name: string; donorId: string; bloodType: string }
    >()
    for (const r of records) {
      if (map.has(r.donorId)) continue
      const donor = getDonorById(r.donorId)
      if (donor) {
        map.set(r.donorId, {
          name: donor.name,
          donorId: donor.donorId,
          bloodType: donor.bloodType,
        })
      }
    }
    return map
  }, [records])

  const bagBreakdownByStatus = useMemo(() => {
    type BloodType = (typeof BLOOD_TYPES)[number]
    const total = new Map<BloodType, number>(
      BLOOD_TYPES.map((bt) => [bt, 0])
    )
    const ready = new Map<BloodType, number>(
      BLOOD_TYPES.map((bt) => [bt, 0])
    )
    const pending = new Map<BloodType, number>(
      BLOOD_TYPES.map((bt) => [bt, 0])
    )
    const discarded = new Map<BloodType, number>(
      BLOOD_TYPES.map((bt) => [bt, 0])
    )

    for (const r of records) {
      const bt = donorById.get(r.donorId)?.bloodType as BloodType | undefined
      if (!bt || !total.has(bt)) continue

      total.set(bt, (total.get(bt) ?? 0) + 1)
      if (r.bloodBagStatus === "ready_to_use") {
        ready.set(bt, (ready.get(bt) ?? 0) + 1)
      } else if (r.bloodBagStatus === "pending_testing") {
        pending.set(bt, (pending.get(bt) ?? 0) + 1)
      } else if (r.bloodBagStatus === "discarded") {
        discarded.set(bt, (discarded.get(bt) ?? 0) + 1)
      }
    }

    const toList = (counts: Map<BloodType, number>) =>
      BLOOD_TYPES.map((bloodType) => ({
        bloodType,
        count: counts.get(bloodType) ?? 0,
      })).filter((row) => row.count > 0)

    return {
      total: toList(total),
      ready: toList(ready),
      pending: toList(pending),
      discarded: toList(discarded),
    }
  }, [records, donorById])

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records
      .slice()
      .sort((a, b) => b.donatedAt.localeCompare(a.donatedAt))
      .filter((r) => {
        if (statusFilter !== "all" && r.bloodBagStatus !== statusFilter) {
          return false
        }
        const donor = donorById.get(r.donorId)
        if (
          bloodTypeFilter !== "all" &&
          donor?.bloodType !== bloodTypeFilter
        ) {
          return false
        }
        if (!q) return true
        const hay = [r.donationId, donor?.name, donor?.donorId, donor?.bloodType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
  }, [records, search, statusFilter, bloodTypeFilter, donorById])

  function statusBadgeClass(status: DonationRecord["bloodBagStatus"]) {
    switch (status) {
      case "ready_to_use":
        return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
      case "discarded":
        return "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400"
      default:
        return "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
    }
  }

  function ttiSummary(tti: DonationRecord["tti"]) {
    const positive = TTI_MARKERS.filter((m) => tti[m] === "positive").length
    const negative = TTI_MARKERS.filter((m) => tti[m] === "negative").length
    return { positive, negative, complete: isTtiComplete(tti) }
  }

  const statCards = [
    {
      key: "total",
      label: t.statTotal,
      value: stats.total,
      breakdown: bagBreakdownByStatus.total,
      icon: PackageIcon,
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      key: "ready",
      label: t.statReady,
      value: stats.ready,
      breakdown: bagBreakdownByStatus.ready,
      icon: CheckCircle2Icon,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "pending",
      label: t.statPending,
      value: stats.pending,
      breakdown: bagBreakdownByStatus.pending,
      icon: ClockIcon,
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      key: "discarded",
      label: t.statDiscarded,
      value: stats.discarded,
      breakdown: bagBreakdownByStatus.discarded,
      icon: XCircleIcon,
      accent: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
  ] as const

  return (
    <AuthedShell title={t.title}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <Link href="/donor/donations">
            <Button variant="outline">{t.goDonations}</Button>
          </Link>
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
                  <div className="text-2xl font-semibold tabular-nums">
                    {card.value.toLocaleString()}
                  </div>
                  <StatCardBloodTypeChart
                    cardKey={card.key}
                    data={card.breakdown}
                  />
                  {card.breakdown.length === 0 ? (
                    <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                      —
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.listTitle}</CardTitle>
            <CardDescription>{t.listSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full lg:max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as StatusFilter) ?? "all")
                }
              >
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.filterStatus}</SelectItem>
                  <SelectItem value="ready_to_use">{t.ready_to_use}</SelectItem>
                  <SelectItem value="pending_testing">
                    {t.pending_testing}
                  </SelectItem>
                  <SelectItem value="discarded">{t.discarded}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={bloodTypeFilter}
                onValueChange={(v) =>
                  setBloodTypeFilter((v as BloodTypeFilter) ?? "all")
                }
              >
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.filterBloodType}</SelectItem>
                  {BloodTypeSchema.options.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.colBag}</TableHead>
                    <TableHead>{t.colDonor}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t.colBloodType}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t.colType}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t.colVolume}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t.colCollected}
                    </TableHead>
                    <TableHead className="hidden xl:table-cell">
                      {t.colLocation}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t.colTti}
                    </TableHead>
                    <TableHead>{t.colStatus}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRecords.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t.noBags}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRecords.map((r) => {
                      const donor = donorById.get(r.donorId)
                      const summary = ttiSummary(r.tti)
                      const typeKey = r.donationType ?? ""
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            {r.donationId}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {donor?.name ?? "—"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {donor?.donorId ?? r.donorId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {donor?.bloodType ?? "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">
                            {typeKey
                              ? (t[typeKey as keyof typeof t] ?? typeKey)
                              : "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm tabular-nums lg:table-cell">
                            {r.volumeMl != null ? `${r.volumeMl} ml` : "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {format(new Date(r.donatedAt), "PP")}
                          </TableCell>
                          <TableCell className="hidden max-w-[140px] truncate text-sm text-muted-foreground xl:table-cell">
                            {r.location || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {summary.complete ? (
                                summary.positive > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    {summary.positive} +ve
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {summary.negative}/4 −ve
                                  </span>
                                )
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {summary.negative + summary.positive}/4
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={statusBadgeClass(r.bloodBagStatus)}
                            >
                              {statusLabel[r.bloodBagStatus]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}
