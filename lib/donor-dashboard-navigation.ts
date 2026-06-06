import { addDays } from "date-fns"
import { format } from "date-fns/format"

import { isWithinChartRange } from "@/components/new-donors-chart-picker"
import {
  buildFilterFacetId,
  buildGroupByFacetId,
  type OdooFacet,
} from "@/app/donor/registration/odoo-search-bar"
import {
  canDonateNow,
  getNextEligibleDate,
  type DonationRecord,
  type Donor,
} from "@/lib/donor-store"

export type DashboardDonorView = "total" | "eligible" | "donations" | "soon"

export type DonorListPreset = {
  view: DashboardDonorView
  from?: string
  to?: string
  bloodType?: string
  groupBy: string
}

export type DashboardFacetLabels = {
  viewTotal: string
  viewEligible: string
  viewDonations: string
  viewSoon: string
  bloodType: string
  groupByPrefix: string
  registeredBetween: (from: string, to: string) => string
  donationsBetween: (from: string, to: string) => string
  groupFieldLabels: Record<string, string>
}

const VIEW_VALUES: DashboardDonorView[] = [
  "total",
  "eligible",
  "donations",
  "soon",
]

function isDashboardView(value: string | null): value is DashboardDonorView {
  return !!value && VIEW_VALUES.includes(value as DashboardDonorView)
}

function formatDay(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function buildDonorListHref(params: {
  view: DashboardDonorView
  bloodType?: string
  from: Date
  to: Date
  groupBy?: string
}) {
  const sp = new URLSearchParams()
  sp.set("view", params.view)
  sp.set("from", formatDay(params.from))
  sp.set("to", formatDay(params.to))
  if (params.bloodType && params.bloodType !== "all") {
    sp.set("bloodType", params.bloodType)
  }
  if (params.groupBy) {
    sp.set("groupBy", params.groupBy)
  }
  return `/donor/registration?${sp.toString()}`
}

export function parseDonorListPreset(params: {
  get: (name: string) => string | null
}): DonorListPreset | null {
  const view = params.get("view")
  if (!isDashboardView(view)) return null

  const from = params.get("from") ?? undefined
  const to = params.get("to") ?? undefined
  const bloodType = params.get("bloodType") ?? undefined
  const groupBy = params.get("groupBy") ?? "bloodType"

  return { view, from, to, bloodType, groupBy }
}

export function buildDashboardFacets(
  preset: DonorListPreset,
  labels: DashboardFacetLabels
): OdooFacet[] {
  const facets: OdooFacet[] = []

  const viewLabels: Record<DashboardDonorView, string> = {
    total: labels.viewTotal,
    eligible: labels.viewEligible,
    donations: labels.viewDonations,
    soon: labels.viewSoon,
  }

  facets.push({
    kind: "meta",
    id: `dashboard:view:${preset.view}`,
    label: viewLabels[preset.view],
  })

  if (preset.from && preset.to) {
    const rangeLabel =
      preset.view === "donations"
        ? labels.donationsBetween(preset.from, preset.to)
        : labels.registeredBetween(preset.from, preset.to)
    facets.push({
      kind: "meta",
      id: "dashboard:dateRange",
      label: rangeLabel,
    })
  }

  if (preset.bloodType && preset.bloodType !== "all") {
    facets.push({
      kind: "filter",
      id: buildFilterFacetId("bloodType", preset.bloodType),
      groupId: "bloodType",
      columnId: "bloodType",
      value: preset.bloodType,
      label: `${labels.bloodType}: ${preset.bloodType}`,
    })
  }

  const groupLabel =
    labels.groupFieldLabels[preset.groupBy] ?? preset.groupBy
  facets.push({
    kind: "groupBy",
    id: buildGroupByFacetId(preset.groupBy),
    columnId: preset.groupBy,
    label: `${labels.groupByPrefix}: ${groupLabel}`,
  })

  return facets
}

export function buildDashboardRowPredicate(
  preset: DonorListPreset,
  donations: DonationRecord[]
): (donor: Donor) => boolean {
  const start = preset.from ? new Date(preset.from) : null
  const end = preset.to ? new Date(preset.to) : null
  const bloodType =
    preset.bloodType && preset.bloodType !== "all" ? preset.bloodType : null

  const donationsByDonor = new Map<string, DonationRecord[]>()
  for (const record of donations) {
    const list = donationsByDonor.get(record.donorId) ?? []
    list.push(record)
    donationsByDonor.set(record.donorId, list)
  }

  const inRegRange = (createdAt: string) => {
    if (!start || !end) return true
    return isWithinChartRange(createdAt, start, end)
  }

  const hasDonationInRange = (donorId: string) => {
    const records = donationsByDonor.get(donorId) ?? []
    if (!start || !end) return records.length > 0
    return records.some((record) =>
      isWithinChartRange(record.donatedAt, start, end)
    )
  }

  return (donor) => {
    if (bloodType && donor.bloodType !== bloodType) return false

    switch (preset.view) {
      case "total":
        return inRegRange(donor.createdAt)
      case "eligible":
        return inRegRange(donor.createdAt) && canDonateNow(donor.id)
      case "soon": {
        if (!inRegRange(donor.createdAt)) return false
        const next = getNextEligibleDate(donor.id)
        if (!next) return false
        const now = new Date()
        const in7 = addDays(now, 7)
        return next >= now && next <= in7
      }
      case "donations":
        return hasDonationInRange(donor.id)
      default:
        return true
    }
  }
}
