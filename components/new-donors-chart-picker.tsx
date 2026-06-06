"use client"

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Donor } from "@/lib/donor-store"

export type ChartViewMode = "month" | "week" | "day"

const DEFAULT_MONTHS = 12

function dayLabel(d: Date) {
  return d.toISOString().slice(0, 10)
}

function monthLabel(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function localeCode(locale: string) {
  return locale === "my" ? "my-MM" : "en-US"
}

export function getDefaultChartRange() {
  const end = startOfDay(new Date())
  const start = startOfMonth(addMonths(end, -(DEFAULT_MONTHS - 1)))
  return { start, end }
}

export function normalizeChartRange(start: Date, end: Date) {
  const normalizedStart = startOfDay(start)
  const normalizedEnd = startOfDay(end)
  if (isAfter(normalizedStart, normalizedEnd)) {
    return { start: normalizedEnd, end: normalizedStart }
  }
  return { start: normalizedStart, end: normalizedEnd }
}

export function isWithinChartRange(
  date: Date | string,
  startDate: Date,
  endDate: Date
) {
  const { start, end } = normalizeChartRange(startDate, endDate)
  const day = startOfDay(typeof date === "string" ? new Date(date) : date)
  return !isBefore(day, start) && !isAfter(day, endOfDay(end))
}

function buildGenderCounts(
  donors: Donor[],
  keys: string[],
  matchFn: (created: Date) => string | null
) {
  const counts = new Map<string, { male: number; female: number }>()
  for (const key of keys) counts.set(key, { male: 0, female: 0 })

  for (const donor of donors) {
    const created = new Date(donor.createdAt)
    const key = matchFn(created)
    if (!key || !counts.has(key)) continue
    const row = counts.get(key)!
    if (donor.gender === "male") row.male += 1
    else if (donor.gender === "female") row.female += 1
  }

  return keys.map((date) => ({
    date,
    male: counts.get(date)?.male ?? 0,
    female: counts.get(date)?.female ?? 0,
  }))
}

function weekKey(d: Date) {
  return dayLabel(startOfWeek(d, { weekStartsOn: 1 }))
}

function generateDayKeys(start: Date, end: Date) {
  return eachDayOfInterval({ start, end }).map(dayLabel)
}

function generateWeekKeys(start: Date, end: Date) {
  const keys: string[] = []
  let cursor = startOfWeek(start, { weekStartsOn: 1 })
  const lastWeek = startOfWeek(end, { weekStartsOn: 1 })
  while (cursor <= lastWeek) {
    keys.push(dayLabel(cursor))
    cursor = addDays(cursor, 7)
  }
  return keys
}

function generateMonthKeys(start: Date, end: Date) {
  return eachMonthOfInterval({
    start: startOfMonth(start),
    end: startOfMonth(end),
  }).map(monthLabel)
}

function isWithinRange(created: Date, start: Date, end: Date) {
  const day = startOfDay(created)
  return !isBefore(day, start) && !isAfter(day, endOfDay(end))
}

export function buildNewDonorsChartData(
  donors: Donor[],
  viewMode: ChartViewMode,
  startDate: Date,
  endDate: Date
) {
  const { start, end } = normalizeChartRange(startDate, endDate)

  if (viewMode === "month") {
    const keys = generateMonthKeys(start, end)
    const keySet = new Set(keys)
    return buildGenderCounts(donors, keys, (created) => {
      if (!isWithinRange(created, start, end)) return null
      const key = monthLabel(created)
      return keySet.has(key) ? key : null
    })
  }

  if (viewMode === "week") {
    const keys = generateWeekKeys(start, end)
    const keySet = new Set(keys)
    return buildGenderCounts(donors, keys, (created) => {
      if (!isWithinRange(created, start, end)) return null
      const key = weekKey(created)
      return keySet.has(key) ? key : null
    })
  }

  const keys = generateDayKeys(start, end)
  const keySet = new Set(keys)
  return buildGenderCounts(donors, keys, (created) => {
    if (!isWithinRange(created, start, end)) return null
    const key = dayLabel(created)
    return keySet.has(key) ? key : null
  })
}

export function formatMonthTick(
  value: string,
  locale: string,
  style: "short" | "long" = "short"
) {
  const [year, month] = value.split("-")
  if (!year || !month) return value
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString(localeCode(locale), {
    month: style,
    year: style === "long" ? "numeric" : undefined,
  })
}

export function formatDayTick(
  value: string,
  locale: string,
  style: "short" | "long" = "short"
) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return d.toLocaleDateString(localeCode(locale), {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
  })
}

export function formatWeekTick(
  value: string,
  locale: string,
  style: "short" | "long" = "short"
) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  const start = new Date(Number(year), Number(month) - 1, Number(day))
  const end = addDays(start, 6)
  const loc = localeCode(locale)
  const sameMonth = start.getMonth() === end.getMonth()

  if (style === "long") {
    if (sameMonth) {
      return `${start.toLocaleDateString(loc, { month: "long", day: "numeric" })} – ${end.toLocaleDateString(loc, { day: "numeric", year: "numeric" })}`
    }
    return `${start.toLocaleDateString(loc, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`
  }

  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric" })}`
}

export function formatDateRangeLabel(
  startDate: Date,
  endDate: Date,
  locale: string,
  style: "short" | "long" = "short"
) {
  const { start, end } = normalizeChartRange(startDate, endDate)
  const loc = localeCode(locale)
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${start.toLocaleDateString(loc, { month: style === "long" ? "long" : "short", day: "numeric" })} – ${end.toLocaleDateString(loc, { day: "numeric", year: "numeric" })}`
  }

  if (sameYear) {
    return `${start.toLocaleDateString(loc, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`
  }

  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`
}

export function formatChartPeriodDescription(
  viewMode: ChartViewMode,
  startDate: Date,
  endDate: Date,
  locale: string,
  labels: {
    chartSubDaily: string
    chartSubWeekly: string
    chartSubMonthly: string
  }
) {
  const range = formatDateRangeLabel(startDate, endDate, locale, "long")
  if (viewMode === "month") return `${range} · ${labels.chartSubMonthly}`
  if (viewMode === "week") return `${range} · ${labels.chartSubWeekly}`
  return `${range} · ${labels.chartSubDaily}`
}

export function formatChartTick(
  value: string,
  viewMode: ChartViewMode,
  locale: string,
  style: "short" | "long" = "short"
) {
  if (viewMode === "month") return formatMonthTick(value, locale, style)
  if (viewMode === "week") return formatWeekTick(value, locale, style)
  return formatDayTick(value, locale, style)
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

type NewDonorsChartPickerProps = {
  locale: string
  viewMode: ChartViewMode
  startDate: Date
  endDate: Date
  onViewModeChange: (mode: ChartViewMode) => void
  onRangeChange: (start: Date, end: Date) => void
  labels: {
    viewDay: string
    viewWeek: string
    viewMonth: string
    startDate: string
    endDate: string
    clear: string
  }
}

export function NewDonorsChartPicker({
  locale,
  viewMode,
  startDate,
  endDate,
  onViewModeChange,
  onRangeChange,
  labels,
}: NewDonorsChartPickerProps) {
  const triggerLabel = formatDateRangeLabel(startDate, endDate, locale, "short")

  function handleClear() {
    const { start, end } = getDefaultChartRange()
    onViewModeChange("month")
    onRangeChange(start, end)
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-start gap-2 font-normal sm:w-[260px]"
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="space-y-3 border-b p-3">
          <Tabs
            value={viewMode}
            onValueChange={(value) => {
              if (value === "day" || value === "week" || value === "month") {
                onViewModeChange(value)
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="day">{labels.viewDay}</TabsTrigger>
              <TabsTrigger value="week">{labels.viewWeek}</TabsTrigger>
              <TabsTrigger value="month">{labels.viewMonth}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="chart-start-date">{labels.startDate}</Label>
              <Input
                id="chart-start-date"
                type="date"
                value={dayLabel(startDate)}
                onChange={(event) => {
                  const next = parseInputDate(event.target.value)
                  if (next) onRangeChange(next, endDate)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="chart-end-date">{labels.endDate}</Label>
              <Input
                id="chart-end-date"
                type="date"
                value={dayLabel(endDate)}
                onChange={(event) => {
                  const next = parseInputDate(event.target.value)
                  if (next) onRangeChange(startDate, next)
                }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              {labels.clear}
            </Button>
          </div>
        </div>
        <Calendar
          mode="range"
          selected={{ from: startDate, to: endDate }}
          onSelect={(range) => {
            if (!range?.from) return
            onRangeChange(range.from, range.to ?? range.from)
          }}
          defaultMonth={endDate}
          numberOfMonths={2}
          weekStartsOn={1}
          showWeekNumber={viewMode === "week"}
        />
      </PopoverContent>
    </Popover>
  )
}
