import { addDays, isAfter, isSameDay } from "date-fns"
import { z } from "zod"

import {
  appendDonorAuditLog,
  diffDonor,
} from "@/lib/donor-audit-log"
import { assertPermission } from "@/lib/permissions"

const DONOR_STORAGE_KEY = "bdms-donors"
const DONATION_STORAGE_KEY = "bdms-donor-donations"
const SCREENING_VISIT_STORAGE_KEY = "bdms-screening-visits"
const HIDDEN_DEMO_DONOR_IDS_KEY = "bdms-hidden-demo-donors-v3"
const DONOR_AUDIT_LOG_KEY = "bdms-donor-audit-log"
const DONOR_DATA_VERSION_KEY = "bdms-donor-data-version"
/** Bump when demo donor shape/count/seed changes to force a one-time local reset. */
const DONOR_DATA_VERSION = "v7-consistent-donor-demo-20260607"
const DEMO_MONTHLY_DONOR_COUNTS = [
  22, 35, 48, 28, 65, 42, 70, 38, 55, 24, 45, 31,
] as const
export const DEMO_DONOR_COUNT = DEMO_MONTHLY_DONOR_COUNTS.reduce(
  (sum, value) => sum + value,
  0
)
const DEFAULT_DEMO_DONOR_COUNT = DEMO_DONOR_COUNT
const DEMO_DATA_SEED = 20260606

function demoLastDonationDaysAgo(idx: number): number {
  return 70 + ((idx * 47 + 13) % 180)
}

/** Screening and donation happen on the same calendar day (screen AM, donate later). */
function demoWorkflowDayTimestamp(daysAgo: number, hour: number): string {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() - daysAgo)
  day.setHours(hour, 0, 0, 0)
  return day.toISOString()
}

function demoWorkflowBounds(total: number) {
  const pendingEnd = Math.floor(total * 0.25)
  const passedEnd = pendingEnd + Math.floor(total * 0.2)
  const deferredEnd = passedEnd + Math.floor(total * 0.1)
  const infectiousEnd = passedEnd + Math.max(5, Math.floor(total * 0.007))

  return {
    pendingEnd,
    passedEnd,
    deferredEnd,
    historicalStart: deferredEnd,
    infectiousStart: passedEnd,
    infectiousEnd,
  }
}

function demoDonorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function demoDonorPhotoDataUrl(name: string, hue: number) {
  const initials = demoDonorInitials(name)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300"><rect width="240" height="300" fill="hsl(${hue}, 42%, 84%)"/><text x="120" y="168" text-anchor="middle" font-family="Arial,sans-serif" font-size="68" font-weight="600" fill="hsl(${hue}, 32%, 32%)">${initials}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function demoDonorHasEid(idx: number, bounds: ReturnType<typeof demoWorkflowBounds>) {
  const isPassedReady = idx >= bounds.pendingEnd && idx < bounds.passedEnd
  const isHistorical = idx >= bounds.historicalStart
  return isPassedReady || isHistorical
}

let cachedAllDemoDonors: Donor[] | null = null
let cachedDemoVisits: ScreeningVisit[] | null = null
let cachedDemoDonations: DonationRecord[] | null = null
let cachedListDonations: DonationRecord[] | null = null

function invalidateDemoCache() {
  cachedAllDemoDonors = null
  cachedDemoVisits = null
  cachedDemoDonations = null
  cachedListDonations = null
}

function getAllDemoDonors(): Donor[] {
  if (!cachedAllDemoDonors) {
    cachedAllDemoDonors = buildDemoDonors()
  }
  return cachedAllDemoDonors
}

function getDemoVisitsForDonors(donors: Donor[]): ScreeningVisit[] {
  if (!cachedDemoVisits) {
    cachedDemoVisits = buildDemoScreeningVisits(getAllDemoDonors())
  }
  const donorIds = new Set(donors.map((donor) => donor.id))
  return cachedDemoVisits.filter((visit) => donorIds.has(visit.donorId))
}

function getDemoDonationsForDonors(
  donors: Donor[],
  visits: ScreeningVisit[]
): DonationRecord[] {
  if (!cachedDemoDonations) {
    const allDonors = getAllDemoDonors()
    const allVisits =
      cachedDemoVisits ?? buildDemoScreeningVisits(allDonors)
    cachedDemoDonations = buildDemoDonations(allDonors, allVisits)
  }
  const donorIds = new Set(donors.map((donor) => donor.id))
  return cachedDemoDonations.filter((record) => donorIds.has(record.donorId))
}

export const BloodTypeSchema = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
])

export const GenderSchema = z.enum(["male", "female", "other"])

export const DonationTypeSchema = z.enum([
  "whole_blood",
  "platelets",
  "plasma",
  "double_red_cells",
])

export const BloodBagStatusSchema = z.enum([
  "pending_testing",
  "ready_to_use",
  "discarded",
])

export const TtiResultSchema = z.enum(["pending", "negative", "positive"])

export const TtiScreeningSchema = z.object({
  hiv: TtiResultSchema,
  hepB: TtiResultSchema,
  hepC: TtiResultSchema,
  syphilis: TtiResultSchema,
})

export type TtiScreening = z.infer<typeof TtiScreeningSchema>

export const ScreeningSchema = z.object({
  weightKg: z.number().finite().positive().nullable(),
  bpSystolic: z.number().int().positive().nullable(),
  bpDiastolic: z.number().int().positive().nullable(),
  pulse: z.number().int().positive().nullable(),
  hb: z.number().finite().positive().nullable(),
  lastDonationDate: z.string().datetime().nullable(),
})

export type Screening = z.infer<typeof ScreeningSchema>

export const MedicalHistorySchema = z.object({
  conditions: z.array(z.string().min(1)),
  infectiousFlags: z.array(z.string().min(1)),
  medications: z.string(),
  notes: z.string(),
})

export type MedicalHistory = z.infer<typeof MedicalHistorySchema>

export const DonationDetailsSchema = z.object({
  donationType: DonationTypeSchema.nullable(),
  notes: z.string(),
})

export type DonationDetails = z.infer<typeof DonationDetailsSchema>

export const DonorSchema = z.object({
  id: z.string().min(1),
  donorId: z.string().min(1),
  eid: z.string().min(1).nullable(),
  eidIssuedAt: z.string().datetime().nullable(),
  photoUrl: z.string().nullable(),
  name: z.string().min(1),
  age: z.number().int().min(16).max(80),
  bloodType: BloodTypeSchema,
  contact: z.string().min(1),
  contactPhone: z.string(),
  contactEmail: z.string(),
  contactAddress: z.string(),
  nrc: z.string(),
  gender: GenderSchema.nullable(),
  address: z.string(),
  township: z.string(),
  city: z.string(),
  screening: ScreeningSchema,
  medical: MedicalHistorySchema,
  donationDetails: DonationDetailsSchema,
  createdAt: z.string().datetime(),
})

export type Donor = z.infer<typeof DonorSchema>

export const DonationRecordSchema = z.object({
  id: z.string().min(1),
  donationId: z.string().min(1), // e.g. blood bag no / barcode
  donorId: z.string().min(1),
  donatedAt: z.string().datetime(),
  donationType: DonationTypeSchema.nullable(),
  volumeMl: z.number().int().positive().nullable(),
  location: z.string(),
  vitals: z.object({
    bpSystolic: z.number().int().positive().nullable(),
    bpDiastolic: z.number().int().positive().nullable(),
    hb: z.number().finite().positive().nullable(),
    weightKg: z.number().finite().positive().nullable(),
  }),
  bloodBagStatus: BloodBagStatusSchema,
  tti: TtiScreeningSchema,
  receivedBy: z.string(),
  collectedBy: z.string(),
  adverseReactions: z.string(),
  nextEligibleDate: z.string().datetime(),
  note: z.string().optional(),
})

export type DonationRecord = z.infer<typeof DonationRecordSchema>

export const ScreeningVisitStatusSchema = z.enum([
  "pending",
  "passed",
  "deferred",
])

export const ScreeningVitalsSchema = z.object({
  weightKg: z.number().finite().positive().nullable(),
  bpSystolic: z.number().int().positive().nullable(),
  bpDiastolic: z.number().int().positive().nullable(),
  pulse: z.number().int().positive().nullable(),
  hb: z.number().finite().positive().nullable(),
})

export type ScreeningVitals = z.infer<typeof ScreeningVitalsSchema>

export const ScreeningVisitSchema = z.object({
  id: z.string().min(1),
  donorId: z.string().min(1),
  createdAt: z.string().datetime(),
  screenedAt: z.string().datetime().nullable(),
  vitals: ScreeningVitalsSchema,
  tti: TtiScreeningSchema,
  status: ScreeningVisitStatusSchema,
  screenedBy: z.string(),
  note: z.string(),
  linkedDonationId: z.string().nullable(),
})

export type ScreeningVisit = z.infer<typeof ScreeningVisitSchema>

function defaultTti(): TtiScreening {
  return { hiv: "pending", hepB: "pending", hepC: "pending", syphilis: "pending" }
}

function normalizeDonationRecord(
  r: Partial<DonationRecord> &
    Pick<DonationRecord, "id" | "donorId" | "donatedAt"> & { note?: string }
): DonationRecord {
  const donatedAt = new Date(r.donatedAt)
  const nextEligibleDate = addDays(donatedAt, 56).toISOString()

  const donationIdResolved = r.donationId?.trim() || `BAG-${r.id.slice(0, 8).toUpperCase()}`

  return DonationRecordSchema.parse({
    id: r.id,
    donationId: donationIdResolved,
    donorId: r.donorId,
    donatedAt: new Date(r.donatedAt).toISOString(),
    donationType: r.donationType ?? null,
    volumeMl: r.volumeMl ?? null,
    location: r.location ?? "",
    vitals: {
      bpSystolic: r.vitals?.bpSystolic ?? null,
      bpDiastolic: r.vitals?.bpDiastolic ?? null,
      hb: r.vitals?.hb ?? null,
      weightKg: r.vitals?.weightKg ?? null,
    },
    bloodBagStatus: r.bloodBagStatus ?? "pending_testing",
    tti: {
      ...defaultTti(),
      ...(r.tti ?? {}),
    },
    receivedBy: r.receivedBy ?? "",
    collectedBy: r.collectedBy ?? "",
    adverseReactions: r.adverseReactions ?? "",
    nextEligibleDate: r.nextEligibleDate ?? nextEligibleDate,
    note: r.note,
  })
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readArray<T>(
  key: string,
  itemSchema: z.ZodType<T>,
  fallback: T[] = []
): T[] {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  const parsed = safeParseJson<unknown>(raw)
  const schema = z.array(itemSchema)
  const result = schema.safeParse(parsed)
  return result.success ? result.data : fallback
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function readStringArray(key: string): string[] {
  return readArray(key, z.string(), [])
}

function writeStringArray(key: string, value: string[]) {
  return writeArray(key, value)
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]) {
  return items[Math.floor(rng() * items.length)]!
}

function hashStringToSeed(input: string) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function pad(num: number, size: number) {
  return String(num).padStart(size, "0")
}

function formatDonorId(seq: number) {
  return `DNR-${pad(seq, 6)}`
}

function formatEid(seq: number) {
  return `EID-${pad(seq, 8)}`
}

function parseDonorIdSeq(donorId: string) {
  const match = /^DNR-(\d{1,})$/.exec(donorId)
  if (!match) return null
  const seq = Number(match[1])
  return Number.isFinite(seq) ? seq : null
}

function parseEidSeq(eid: string) {
  const match = /^EID-(\d{1,})$/.exec(eid)
  if (!match) return null
  const seq = Number(match[1])
  return Number.isFinite(seq) ? seq : null
}

export function getNextDonorIdPreview(): string {
  const hiddenDemo = listHiddenDemoDonorIds()
  const stored = listStoredDonors()
  const storedIds = new Set(stored.map((d) => d.id))
  const demo = getAllDemoDonors().filter(
    (d) => !storedIds.has(d.id) && !hiddenDemo.has(d.id)
  )

  const maxSeq = [...stored, ...demo].reduce((max, d) => {
    const seq = parseDonorIdSeq(d.donorId)
    return seq ? Math.max(max, seq) : max
  }, 0)

  return formatDonorId(maxSeq + 1)
}

export function getNextEidPreview(): string {
  const hiddenDemo = listHiddenDemoDonorIds()
  const stored = listStoredDonors()
  const storedIds = new Set(stored.map((d) => d.id))
  const demo = getAllDemoDonors().filter(
    (d) => !storedIds.has(d.id) && !hiddenDemo.has(d.id)
  )

  const maxSeq = [...stored, ...demo].reduce((max, d) => {
    if (!d.eid) return max
    const seq = parseEidSeq(d.eid)
    return seq ? Math.max(max, seq) : max
  }, 0)

  return formatEid(maxSeq + 1)
}

function isDemoDonorId(id: string) {
  return id.startsWith("demo-donor-")
}

function isDemoScreeningId(id: string) {
  return id.startsWith("demo-screening-")
}

function isDemoDonationId(id: string) {
  return id.startsWith("demo-donation-")
}

function listVisibleDemoDonors(): Donor[] {
  const hidden = listHiddenDemoDonorIds()
  const storedIds = new Set(listStoredDonors().map((d) => d.id))
  return getAllDemoDonors().filter(
    (d) => !hidden.has(d.id) && !storedIds.has(d.id)
  )
}

function demoNegativeTti(): TtiScreening {
  return { hiv: "negative", hepB: "negative", hepC: "negative", syphilis: "negative" }
}

function demoEligibleVitals(
  rng: () => number,
  gender: z.infer<typeof GenderSchema>
): ScreeningVitals {
  const minHb = gender === "female" ? 12.0 : 12.5
  return {
    weightKg: Math.round((52 + rng() * 35) * 10) / 10,
    hb: Math.round((minHb + rng() * 2.5) * 10) / 10,
    bpSystolic: 110 + Math.floor(rng() * 25),
    bpDiastolic: 70 + Math.floor(rng() * 15),
    pulse: 62 + Math.floor(rng() * 25),
  }
}

function demoIneligibleVitals(
  rng: () => number,
  gender: z.infer<typeof GenderSchema>
): ScreeningVitals {
  const minHb = gender === "female" ? 12.0 : 12.5
  return {
    weightKg: Math.round((42 + rng() * 7) * 10) / 10,
    hb: Math.round((minHb - 2 - rng() * 1.5) * 10) / 10,
    bpSystolic: 185 + Math.floor(rng() * 15),
    bpDiastolic: 72 + Math.floor(rng() * 10),
    pulse: 68 + Math.floor(rng() * 20),
  }
}

export function hideDemoDonors(ids: string[]) {
  if (typeof window === "undefined") return
  const onlyDemo = ids.filter((id) => isDemoDonorId(id))
  if (onlyDemo.length === 0) return
  const current = new Set(readStringArray(HIDDEN_DEMO_DONOR_IDS_KEY))
  for (const id of onlyDemo) current.add(id)
  writeStringArray(HIDDEN_DEMO_DONOR_IDS_KEY, Array.from(current))
  cachedListDonations = null
}

function listHiddenDemoDonorIds() {
  if (typeof window === "undefined") return new Set<string>()
  return new Set(readStringArray(HIDDEN_DEMO_DONOR_IDS_KEY))
}

function defaultScreening(): Screening {
  return {
    weightKg: null,
    bpSystolic: null,
    bpDiastolic: null,
    pulse: null,
    hb: null,
    lastDonationDate: null,
  }
}

function defaultMedical(): MedicalHistory {
  return {
    conditions: [],
    infectiousFlags: [],
    medications: "",
    notes: "",
  }
}

function defaultDonationDetails(): DonationDetails {
  return {
    donationType: null,
    notes: "",
  }
}

function demoMedicalForIndex(
  idx: number,
  bounds: ReturnType<typeof demoWorkflowBounds>,
  rng: () => number
): MedicalHistory {
  if (
    idx >= bounds.infectiousStart &&
    idx < bounds.infectiousEnd &&
    idx % 2 === 0
  ) {
    return { ...defaultMedical(), infectiousFlags: ["hepatitis"] }
  }

  const conditions: string[] = []
  if (rng() < 0.08) conditions.push("diabetes")
  if (rng() < 0.06) conditions.push("hypertension")
  if (rng() < 0.03) conditions.push("heart_disease")

  return {
    conditions,
    infectiousFlags: [],
    medications: conditions.length ? "On maintenance medication" : "",
    notes: idx % 11 === 0 ? "No known allergies" : "",
  }
}

function demoDonationDetailsForIndex(
  idx: number,
  rng: () => number
): DonationDetails {
  return {
    donationType: pick(rng, DonationTypeSchema.options),
    notes:
      idx % 9 === 0 ? "Regular donor — prefers weekday visits" : "",
  }
}

const AUTO_TOWNSHIPS = [
  "Hlaing",
  "Kamayut",
  "Sanchaung",
  "Bahan",
  "Mayangone",
  "Yankin",
  "Lanmadaw",
  "Pazundaung",
  "Tamwe",
  "Thingangyun",
] as const

const AUTO_CITIES = ["Yangon", "Mandalay", "Naypyitaw", "Bago", "Pathein"] as const

function makeAutoNrc(rng: () => number, seqFallback: number) {
  const states = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const
  const state = pick(rng, states)
  const codes = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR"] as const
  const code = pick(rng, codes)
  return `${state}/${code}(N)${pad(seqFallback, 6)}`
}

function makeAutoEmail(rng: () => number, name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .replace(/\s+/g, ".")
  const suffix = pad(Math.floor(rng() * 99) + 1, 2)
  return `${base || "donor"}${suffix}@example.com`
}

function makeAutoPhone(rng: () => number) {
  return `09${pad(Math.floor(rng() * 100000000), 8)}`
}

function normalizeDonor(
  d: Partial<Donor> & Pick<Donor, "id" | "name" | "age" | "bloodType" | "contact" | "createdAt">
): Donor {
  const screening = {
    ...defaultScreening(),
    ...(d.screening ?? {}),
  }

  const medical = {
    ...defaultMedical(),
    ...(d.medical ?? {}),
  }

  const donationDetails = {
    ...defaultDonationDetails(),
    ...(d.donationDetails ?? {}),
  }

  const seed = hashStringToSeed(`${d.id}|${d.donorId ?? ""}|${d.name}`)
  const rng = mulberry32(seed)

  const donorIdResolved = d.donorId ?? `LEGACY-${d.id}`
  const seqFallback = parseDonorIdSeq(donorIdResolved) ?? 1

  const contactPhoneResolved =
    d.contactPhone?.trim() ||
    (d.contact?.trim() ? d.contact.trim().split(/[\/|,]/)[0]!.trim() : "") ||
    makeAutoPhone(rng)

  const contactEmailResolved =
    d.contactEmail?.trim() || makeAutoEmail(rng, d.name)

  const contactAddressResolved =
    d.contactAddress?.trim() || `Emergency: ${makeAutoPhone(rng)}`

  const townshipResolved = d.township?.trim() || pick(rng, AUTO_TOWNSHIPS)
  const cityResolved = d.city?.trim() || pick(rng, AUTO_CITIES)
  const addressResolved =
    d.address?.trim() || `${Math.floor(rng() * 200) + 1} ${townshipResolved} Rd, ${cityResolved}`

  const nrcResolved = d.nrc?.trim() || makeAutoNrc(rng, seqFallback)
  const genderResolved = d.gender ?? pick(rng, GenderSchema.options)

  const contactResolved =
    d.contact?.trim() ||
    [contactPhoneResolved, contactEmailResolved].filter(Boolean).join(" / ")

  return DonorSchema.parse({
    ...d,
    donorId: donorIdResolved,
    eid: d.eid ?? null,
    eidIssuedAt: d.eidIssuedAt ?? null,
    photoUrl: d.photoUrl ?? null,
    nrc: nrcResolved,
    gender: genderResolved,
    contact: contactResolved,
    contactPhone: contactPhoneResolved,
    contactEmail: contactEmailResolved,
    contactAddress: contactAddressResolved,
    address: addressResolved,
    township: townshipResolved,
    city: cityResolved,
    screening,
    medical,
    donationDetails,
  })
}

function demoCreatedAtInMonth(monthsAgo: number, rng: () => number) {
  const now = new Date()
  const created = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const daysInMonth = new Date(
    created.getFullYear(),
    created.getMonth() + 1,
    0
  ).getDate()
  created.setDate(1 + Math.floor(rng() * daysInMonth))
  created.setHours(9 + Math.floor(rng() * 8), Math.floor(rng() * 60), 0, 0)
  return created.toISOString()
}

function buildDemoDonors(count: number = DEFAULT_DEMO_DONOR_COUNT): Donor[] {
  const rng = mulberry32(DEMO_DATA_SEED)

  const firstNames = [
    "Aung",
    "Kyaw",
    "Min",
    "Myo",
    "Thura",
    "Htet",
    "Nanda",
    "Zin",
    "Phyo",
    "Hla",
    "Su",
    "May",
    "Khin",
    "Thandar",
    "Yadanar",
    "Nwe",
    "Ei",
    "Hnin",
    "Mon",
    "Sandi",
  ] as const

  const lastNames = [
    "Aung",
    "Oo",
    "Htet",
    "Win",
    "Tun",
    "Naing",
    "Hlaing",
    "Ko",
    "Myint",
    "Zaw",
    "Nanda",
    "Moe",
    "Hnin",
    "Soe",
    "Htike",
  ] as const

  const bloodTypes = BloodTypeSchema.options
  const genders = GenderSchema.options

  const townships = [
    "Hlaing",
    "Kamayut",
    "Sanchaung",
    "Bahan",
    "Mayangone",
    "Yankin",
    "Lanmadaw",
    "Pazundaung",
    "Tamwe",
    "Thingangyun",
  ] as const

  const cities = ["Yangon", "Mandalay", "Naypyitaw", "Bago", "Pathein"] as const

  function makeNrc(seq: number) {
    const states = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    const state = pick(rng, states)
    const codes = ["ABC", "DEF", "GHI", "JKL", "MNO", "PQR"]
    const code = pick(rng, codes)
    return `${state}/${code}(N)${pad(seq, 6)}`
  }

  const now = Date.now()
  const demo: Donor[] = []
  const bounds = demoWorkflowBounds(count)
  const monthlyCounts = [...DEMO_MONTHLY_DONOR_COUNTS]
  const monthlyTotal = monthlyCounts.reduce((sum, value) => sum + value, 0)
  if (monthlyTotal !== count) {
    monthlyCounts[monthlyCounts.length - 1] += count - monthlyTotal
  }

  let i = 0
  let eidSeq = 0
  for (let monthsAgo = monthlyCounts.length - 1; monthsAgo >= 0; monthsAgo--) {
    const monthCount = monthlyCounts[monthlyCounts.length - 1 - monthsAgo] ?? 0
    for (let j = 0; j < monthCount; j++) {
      const name = `${pick(rng, firstNames)} ${pick(rng, lastNames)}`
      const age = 18 + Math.floor(rng() * (60 - 18 + 1))
      const bloodType = pick(rng, bloodTypes)
      const gender = pick(rng, genders)
      const township = pick(rng, townships)
      const city = pick(rng, cities)
      const phone = `09${pad(Math.floor(rng() * 100000000), 8)}`
      const email = `${name.replace(/\s+/g, ".").toLowerCase()}${pad(
        Math.floor(rng() * 99) + 1,
        2
      )}@example.com`
      const contactAddress = `Emergency: 09${pad(Math.floor(rng() * 100000000), 8)}`
      const address = `${Math.floor(rng() * 200) + 1} ${township} Rd, ${city}`
      const contact = [phone, email].join(" / ")
      const createdAt = demoCreatedAtInMonth(monthsAgo, rng)
      const vitals = demoEligibleVitals(rng, gender)
      const idx = i

      let screening: Screening
      if (idx < bounds.pendingEnd) {
        screening = {
          ...defaultScreening(),
          weightKg: vitals.weightKg,
          hb: idx % 2 === 0 ? vitals.hb : null,
          bpSystolic: idx % 3 === 0 ? vitals.bpSystolic : null,
          bpDiastolic: idx % 3 === 0 ? vitals.bpDiastolic : null,
          pulse: vitals.pulse,
        }
      } else if (idx < bounds.historicalStart) {
        screening = {
          ...defaultScreening(),
          ...vitals,
        }
      } else {
        const daysAgo = demoLastDonationDaysAgo(idx)
        screening = {
          ...defaultScreening(),
          ...vitals,
          lastDonationDate: demoWorkflowDayTimestamp(daysAgo, 11),
        }
      }

      const identity =
        demoDonorHasEid(idx, bounds)
          ? (() => {
              eidSeq += 1
              const donationDaysAgo =
                idx >= bounds.historicalStart
                  ? demoLastDonationDaysAgo(idx)
                  : undefined
              return {
                eid: formatEid(eidSeq),
                eidIssuedAt:
                  donationDaysAgo != null
                    ? demoWorkflowDayTimestamp(donationDaysAgo + 14, 10)
                    : createdAt,
                photoUrl: demoDonorPhotoDataUrl(name, (idx * 41) % 360),
              }
            })()
          : {
              eid: null as string | null,
              eidIssuedAt: null as string | null,
              photoUrl: null as string | null,
            }

      demo.push(
        normalizeDonor({
          id: `demo-donor-${pad(i + 1, 4)}`,
          donorId: formatDonorId(i + 1),
          eid: identity.eid,
          eidIssuedAt: identity.eidIssuedAt,
          photoUrl: identity.photoUrl,
          name,
          age,
          bloodType,
          contact,
          contactPhone: phone,
          contactEmail: email,
          contactAddress,
          nrc: makeNrc(i + 1),
          gender,
          township,
          city,
          address,
          createdAt,
          screening,
          medical: demoMedicalForIndex(idx, bounds, rng),
          donationDetails: demoDonationDetailsForIndex(idx, rng),
        })
      )
      i += 1
    }
  }

  return demo
}

function buildDemoScreeningVisits(donors: Donor[]): ScreeningVisit[] {
  const rng = mulberry32(DEMO_DATA_SEED + 1)
  const visits: ScreeningVisit[] = []
  const bounds = demoWorkflowBounds(donors.length)

  for (let i = 0; i < donors.length; i++) {
    const donor = donors[i]!
    const idx = i
    const baseVitals: ScreeningVitals = {
      weightKg: donor.screening.weightKg,
      bpSystolic: donor.screening.bpSystolic,
      bpDiastolic: donor.screening.bpDiastolic,
      pulse: donor.screening.pulse,
      hb: donor.screening.hb,
    }

    if (idx < bounds.pendingEnd) {
      const visitDay = demoWorkflowDayTimestamp(0, 9)
      visits.push(
        normalizeScreeningVisit({
          id: `demo-screening-${pad(idx + 1, 4)}`,
          donorId: donor.id,
          createdAt: visitDay,
          vitals: baseVitals,
          status: "pending",
        })
      )
      continue
    }

    if (idx < bounds.passedEnd) {
      const visitDay = demoWorkflowDayTimestamp(0, 9)
      visits.push(
        normalizeScreeningVisit({
          id: `demo-screening-${pad(idx + 1, 4)}`,
          donorId: donor.id,
          createdAt: visitDay,
          screenedAt: visitDay,
          vitals: baseVitals,
          tti: demoNegativeTti(),
          status: "passed",
          screenedBy: "Demo Lab Tech",
        })
      )
      continue
    }

    if (idx < bounds.deferredEnd) {
      const daysAgo = Math.floor(rng() * 5)
      const visitDay = demoWorkflowDayTimestamp(daysAgo, 9)
      const deferredVitals =
        idx % 2 === 0
          ? demoIneligibleVitals(rng, donor.gender ?? "male")
          : baseVitals
      const tti =
        idx % 2 === 1
          ? { ...demoNegativeTti(), hiv: "positive" as const }
          : demoNegativeTti()
      visits.push(
        normalizeScreeningVisit({
          id: `demo-screening-${pad(idx + 1, 4)}`,
          donorId: donor.id,
          createdAt: visitDay,
          screenedAt: visitDay,
          vitals: deferredVitals,
          tti,
          status: "deferred",
          screenedBy: "Demo Lab Tech",
          note: "Deferred during pre-donation screening",
        })
      )
      continue
    }

    const daysAgo = demoLastDonationDaysAgo(idx)
    const screeningAt = demoWorkflowDayTimestamp(daysAgo, 9)
    const donationRecordId = `demo-donation-${pad(idx + 1, 4)}`

    visits.push(
      normalizeScreeningVisit({
        id: `demo-screening-hist-${pad(idx + 1, 4)}`,
        donorId: donor.id,
        createdAt: screeningAt,
        screenedAt: screeningAt,
        vitals: baseVitals,
        tti: demoNegativeTti(),
        status: "passed",
        screenedBy: "Demo Lab Tech",
        linkedDonationId: donationRecordId,
      })
    )

    if (idx % 5 === 0) {
      const olderDaysAgo = daysAgo + 120
      const olderScreeningAt = demoWorkflowDayTimestamp(olderDaysAgo, 9)
      visits.push(
        normalizeScreeningVisit({
          id: `demo-screening-hist2-${pad(idx + 1, 4)}`,
          donorId: donor.id,
          createdAt: olderScreeningAt,
          screenedAt: olderScreeningAt,
          vitals: baseVitals,
          tti: demoNegativeTti(),
          status: "passed",
          screenedBy: "Demo Lab Tech",
          linkedDonationId: `demo-donation2-${pad(idx + 1, 4)}`,
        })
      )
    }
  }

  return visits
}

function demoBloodBagOutcome(rng: () => number): {
  bloodBagStatus: z.infer<typeof BloodBagStatusSchema>
  tti: TtiScreening
} {
  const roll = rng()
  if (roll < 0.1) {
    return {
      bloodBagStatus: "discarded",
      tti: { ...demoNegativeTti(), hiv: "positive" },
    }
  }
  if (roll < 0.35) {
    return {
      bloodBagStatus: "pending_testing",
      tti: {
        hiv: "negative",
        hepB: "negative",
        hepC: "pending",
        syphilis: "pending",
      },
    }
  }
  return {
    bloodBagStatus: "ready_to_use",
    tti: demoNegativeTti(),
  }
}

function buildDemoDonations(
  donors: Donor[],
  visits: ScreeningVisit[]
): DonationRecord[] {
  const rng = mulberry32(DEMO_DATA_SEED + 2)
  const records: DonationRecord[] = []

  const bounds = demoWorkflowBounds(donors.length)
  const visitsById = new Map(visits.map((visit) => [visit.id, visit]))

  for (let i = bounds.historicalStart; i < donors.length; i++) {
    const donor = donors[i]!
    const screening = visitsById.get(`demo-screening-hist-${pad(i + 1, 4)}`)
    if (!screening) continue

    const donatedAt = demoWorkflowDayTimestamp(demoLastDonationDaysAgo(i), 11)
    const outcome = demoBloodBagOutcome(rng)

    records.push(
      normalizeDonationRecord({
        id: `demo-donation-${pad(i + 1, 4)}`,
        donationId: `BAG-DEMO-${pad(i + 1, 4)}`,
        donorId: donor.id,
        donatedAt,
        donationType:
          donor.donationDetails.donationType ?? pick(rng, DonationTypeSchema.options),
        volumeMl: 450,
        location: pick(rng, ["Yangon General Hospital", "Mobile Camp A", "BDMS Center"]),
        vitals: {
          bpSystolic: screening.vitals.bpSystolic,
          bpDiastolic: screening.vitals.bpDiastolic,
          hb: screening.vitals.hb,
          weightKg: screening.vitals.weightKg,
        },
        bloodBagStatus: outcome.bloodBagStatus,
        tti: outcome.tti,
        receivedBy: screening.screenedBy,
        collectedBy: "Demo Phlebotomist",
        adverseReactions: "",
        note: "Demo donation (screening passed before collection)",
      })
    )

    if (i % 5 === 0) {
      const olderDaysAgo = demoLastDonationDaysAgo(i) + 120
      const olderScreening = visitsById.get(
        `demo-screening-hist2-${pad(i + 1, 4)}`
      )
      if (olderScreening) {
        const olderOutcome = demoBloodBagOutcome(rng)
        records.push(
          normalizeDonationRecord({
            id: `demo-donation2-${pad(i + 1, 4)}`,
            donationId: `BAG-DEMO2-${pad(i + 1, 4)}`,
            donorId: donor.id,
            donatedAt: demoWorkflowDayTimestamp(olderDaysAgo, 11),
            donationType:
              donor.donationDetails.donationType ??
              pick(rng, DonationTypeSchema.options),
            volumeMl: 450,
            location: pick(rng, [
              "Yangon General Hospital",
              "Mobile Camp A",
              "BDMS Center",
            ]),
            vitals: {
              bpSystolic: olderScreening.vitals.bpSystolic,
              bpDiastolic: olderScreening.vitals.bpDiastolic,
              hb: olderScreening.vitals.hb,
              weightKg: olderScreening.vitals.weightKg,
            },
            bloodBagStatus: olderOutcome.bloodBagStatus,
            tti: olderOutcome.tti,
            receivedBy: olderScreening.screenedBy,
            collectedBy: "Demo Phlebotomist",
            adverseReactions: "",
            note: "Demo repeat donation (56-day interval satisfied)",
          })
        )
      }
    }
  }

  return records
}

function listStoredDonors(): Donor[] {
  const raw = readArray(DONOR_STORAGE_KEY, z.any(), [])
  const migrated = z.array(z.any()).safeParse(raw)
  const list = migrated.success ? migrated.data : []
  const normalized: Donor[] = []

  for (const item of list) {
    const parsed = DonorSchema.safeParse(item)
    if (parsed.success) {
      normalized.push(parsed.data)
      continue
    }
    // Attempt legacy migration (missing extended fields)
    const legacy = z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        age: z.number().int().min(16).max(80),
        bloodType: BloodTypeSchema,
        contact: z.string().min(1),
        createdAt: z.string().datetime(),
        donorId: z.string().min(1).optional(),
      })
      .safeParse(item)

    if (legacy.success) {
      normalized.push(normalizeDonor(legacy.data))
    }
  }

  // persist migration if needed
  if (typeof window !== "undefined") {
    const existingRaw = window.localStorage.getItem(DONOR_STORAGE_KEY)
    if (existingRaw) {
      const parsedExisting = safeParseJson<unknown>(existingRaw)
      const existingCount = Array.isArray(parsedExisting) ? parsedExisting.length : 0
      if (existingCount > 0 && normalized.length > 0) {
        writeArray(DONOR_STORAGE_KEY, normalized)
      }
    }
  }

  return normalized
}

export function listDonors(): Donor[] {
  ensureDonorDataVersion()
  const stored = listStoredDonors()
  const storedIds = new Set(stored.map((d) => d.id))
  const hiddenDemo = listHiddenDemoDonorIds()
  const demo = getAllDemoDonors().filter(
    (d) => !storedIds.has(d.id) && !hiddenDemo.has(d.id)
  )

  const storedSorted = stored
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const demoSorted = demo
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return [...storedSorted, ...demoSorted]
}

export function deleteDonors(ids: string[]) {
  assertPermission("donors.delete")
  const demoIds = ids.filter((id) => isDemoDonorId(id))
  const storedIds = ids.filter((id) => !isDemoDonorId(id))
  if (demoIds.length) hideDemoDonors(demoIds)
  for (const id of storedIds) deleteDonor(id)
}

export function reseedDemoDonors() {
  resetDonorLocalData()
}

export function resetDonorLocalData() {
  assertPermission("data.reset")
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DONOR_STORAGE_KEY)
  window.localStorage.removeItem(DONATION_STORAGE_KEY)
  window.localStorage.removeItem(SCREENING_VISIT_STORAGE_KEY)
  window.localStorage.removeItem(HIDDEN_DEMO_DONOR_IDS_KEY)
  window.localStorage.removeItem(DONOR_AUDIT_LOG_KEY)
  window.localStorage.setItem(DONOR_DATA_VERSION_KEY, DONOR_DATA_VERSION)
  invalidateDemoCache()
}

function ensureDonorDataVersion() {
  if (typeof window === "undefined") return
  const current = window.localStorage.getItem(DONOR_DATA_VERSION_KEY)
  if (current === DONOR_DATA_VERSION) return
  window.localStorage.removeItem(DONOR_STORAGE_KEY)
  window.localStorage.removeItem(DONATION_STORAGE_KEY)
  window.localStorage.removeItem(SCREENING_VISIT_STORAGE_KEY)
  window.localStorage.removeItem(HIDDEN_DEMO_DONOR_IDS_KEY)
  window.localStorage.removeItem(DONOR_AUDIT_LOG_KEY)
  window.localStorage.setItem(DONOR_DATA_VERSION_KEY, DONOR_DATA_VERSION)
  invalidateDemoCache()
}

export function upsertDonor(
  input: Pick<Donor, "name" | "age" | "bloodType" | "contact"> & {
    id?: string
    donorId?: string
    eid?: string | null
    eidIssuedAt?: string | null
    contactPhone?: string
    contactEmail?: string
    contactAddress?: string
    nrc?: string
    gender?: z.infer<typeof GenderSchema> | null
    address?: string
    township?: string
    city?: string
    screening?: Partial<Screening>
    medical?: Partial<MedicalHistory>
    donationDetails?: Partial<DonationDetails>
  }
): Donor {
  const donors = listStoredDonors()
  const now = new Date().toISOString()
  const id = input.id ?? crypto.randomUUID()
  const { id: _ignoredId, donorId: _ignoredDonorId, ...rest } = input
  void _ignoredId
  void _ignoredDonorId

  const existing = donors.find((d) => d.id === id)
  const donorId = existing?.donorId ?? getNextDonorIdPreview()

  const donor: Donor = normalizeDonor({
    ...(existing ?? ({} as Donor)),
    ...rest,
    id,
    donorId,
    createdAt: donors.find((d) => d.id === id)?.createdAt ?? now,
  } as Donor)
  const next = [...donors.filter((d) => d.id !== id), donor]
  writeArray(DONOR_STORAGE_KEY, next)

  if (!existing) {
    appendDonorAuditLog({
      donorId: donor.id,
      donorCode: donor.donorId,
      action: "created",
      summary: `Created donor ${donor.donorId}`,
    })
    createScreeningVisit(donor.id, {
      vitals: {
        weightKg: donor.screening.weightKg,
        bpSystolic: donor.screening.bpSystolic,
        bpDiastolic: donor.screening.bpDiastolic,
        pulse: donor.screening.pulse,
        hb: donor.screening.hb,
      },
    })
  } else {
    const changes = diffDonor(existing, donor)
    if (changes.length > 0) {
      appendDonorAuditLog({
        donorId: donor.id,
        donorCode: donor.donorId,
        action: "updated",
        summary: `Updated donor ${donor.donorId}`,
        changes,
      })
    }
  }

  return donor
}

export function getDonorById(id: string): Donor | null {
  return listDonors().find((d) => d.id === id) ?? null
}

function writeDonorRecord(donor: Donor) {
  const donors = listStoredDonors()
  writeArray(DONOR_STORAGE_KEY, [
    ...donors.filter((d) => d.id !== donor.id),
    donor,
  ])
}

export function setDonorPhoto(id: string, photoUrl: string | null): Donor {
  assertPermission("donors.write")
  const existing = getDonorById(id)
  if (!existing) {
    throw new Error("DONOR_NOT_FOUND")
  }

  const donor = normalizeDonor({
    ...existing,
    photoUrl: photoUrl?.trim() ? photoUrl : null,
  })
  writeDonorRecord(donor)

  appendDonorAuditLog({
    donorId: donor.id,
    donorCode: donor.donorId,
    action: "updated",
    summary: `Updated photo for donor ${donor.donorId}`,
    changes: [{ field: "photoUrl", oldValue: "—", newValue: "Updated" }],
  })

  return donor
}

export function issueDonorEid(
  id: string,
  options?: { photoUrl?: string | null }
): Donor {
  assertPermission("donors.write")
  const existing = getDonorById(id)
  if (!existing) {
    throw new Error("DONOR_NOT_FOUND")
  }
  if (existing.eid) return existing

  const photoUrl = options?.photoUrl ?? existing.photoUrl
  if (!photoUrl?.trim()) {
    throw new Error("PHOTO_REQUIRED")
  }

  const eid = getNextEidPreview()
  const now = new Date().toISOString()
  const donor = normalizeDonor({
    ...existing,
    eid,
    eidIssuedAt: now,
    photoUrl,
  })

  writeDonorRecord(donor)

  appendDonorAuditLog({
    donorId: donor.id,
    donorCode: donor.donorId,
    action: "updated",
    summary: `Issued EID ${eid} for donor ${donor.donorId}`,
    changes: [{ field: "eid", oldValue: "—", newValue: eid }],
  })

  return donor
}

export function deleteDonor(id: string) {
  assertPermission("donors.delete")
  const existing = getDonorById(id)
  if (existing) {
    appendDonorAuditLog({
      donorId: existing.id,
      donorCode: existing.donorId,
      action: "deleted",
      summary: `Deleted donor ${existing.donorId}`,
    })
  }

  const donors = listStoredDonors()
  writeArray(
    DONOR_STORAGE_KEY,
    donors.filter((d) => d.id !== id)
  )

  const donations = listStoredDonations()
  writeArray(
    DONATION_STORAGE_KEY,
    donations.filter((r) => r.donorId !== id)
  )
  cachedListDonations = null

  const visits = listStoredScreeningVisits()
  writeArray(
    SCREENING_VISIT_STORAGE_KEY,
    visits.filter((v) => v.donorId !== id)
  )
}

function listStoredDonations(): DonationRecord[] {
  const raw = readArray(DONATION_STORAGE_KEY, z.any(), [])
  const migrated = z.array(z.any()).safeParse(raw)
  const list = migrated.success ? migrated.data : []
  const normalized: DonationRecord[] = []

  for (const item of list) {
    const parsed = DonationRecordSchema.safeParse(item)
    if (parsed.success) {
      normalized.push(parsed.data)
      continue
    }
    const legacy = z
      .object({
        id: z.string().min(1),
        donorId: z.string().min(1),
        donatedAt: z.string(),
        note: z.string().optional(),
      })
      .safeParse(item)
    if (legacy.success) {
      normalized.push(
        normalizeDonationRecord({
          id: legacy.data.id,
          donorId: legacy.data.donorId,
          donatedAt: new Date(legacy.data.donatedAt).toISOString(),
          note: legacy.data.note,
        })
      )
    }
  }

  if (typeof window !== "undefined") {
    const existingRaw = window.localStorage.getItem(DONATION_STORAGE_KEY)
    if (existingRaw) {
      const parsedExisting = safeParseJson<unknown>(existingRaw)
      const existingCount = Array.isArray(parsedExisting) ? parsedExisting.length : 0
      if (existingCount > 0 && normalized.length > 0) {
        writeArray(DONATION_STORAGE_KEY, normalized)
      }
    }
  }

  return normalized.sort((a, b) => a.donatedAt.localeCompare(b.donatedAt))
}

export function listDonations(): DonationRecord[] {
  if (cachedListDonations) return cachedListDonations

  const stored = listStoredDonations()
  const storedIds = new Set(stored.map((r) => r.id))
  const demoDonors = listVisibleDemoDonors()
  const demoVisits = getDemoVisitsForDonors(demoDonors)
  const demo = getDemoDonationsForDonors(demoDonors, demoVisits).filter(
    (r) => !storedIds.has(r.id)
  )

  cachedListDonations = [...stored, ...demo].sort((a, b) =>
    a.donatedAt.localeCompare(b.donatedAt)
  )
  return cachedListDonations
}

export function listDonationsByDonor(donorId: string): DonationRecord[] {
  return listDonations().filter((r) => r.donorId === donorId)
}

export function listScreeningVisitsByDonor(donorId: string): ScreeningVisit[] {
  return listScreeningVisits()
    .filter((visit) => visit.donorId === donorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getLastDonation(donorId: string): DonationRecord | null {
  const records = listDonationsByDonor(donorId)
  if (records.length === 0) return null
  return records.reduce((latest, r) =>
    isAfter(new Date(r.donatedAt), new Date(latest.donatedAt)) ? r : latest
  )
}

export function getNextEligibleDate(donorId: string): Date | null {
  const last = getLastDonation(donorId)
  if (!last) return null
  return new Date(last.nextEligibleDate)
}

export function canDonateNow(donorId: string, now: Date = new Date()) {
  const next = getNextEligibleDate(donorId)
  if (!next) return true
  return !isAfter(next, now)
}

export type DonationCollectionBlocker =
  | "DONOR_NOT_FOUND"
  | "EID_REQUIRED"
  | "COOLDOWN_ACTIVE"
  | "SCREENING_REQUIRED"
  | "SCREENING_EXPIRED"
  | "PREVIEW_EID"

export type DonationCollectionAssessment = {
  ready: boolean
  donor: Donor | null
  screening: ScreeningVisit | null
  donationCount: number
  blockers: DonationCollectionBlocker[]
}

export function assessDonationCollection(
  donorId: string,
  options?: { referenceDate?: Date }
): DonationCollectionAssessment {
  const referenceDate = options?.referenceDate ?? new Date()
  const donor = getDonorById(donorId)
  const blockers: DonationCollectionBlocker[] = []

  if (!donor) {
    return {
      ready: false,
      donor: null,
      screening: null,
      donationCount: 0,
      blockers: ["DONOR_NOT_FOUND"],
    }
  }

  const donationCount = listDonationsByDonor(donor.id).length

  if (!donor.eid?.trim()) {
    blockers.push("EID_REQUIRED")
  }

  if (!canDonateNow(donor.id, referenceDate)) {
    blockers.push("COOLDOWN_ACTIVE")
  }

  const anyPassed = listScreeningVisits().find(
    (v) =>
      v.donorId === donor.id &&
      v.status === "passed" &&
      v.linkedDonationId == null
  )

  const screening = getPassedScreeningForDonor(donor.id, {
    sameDayOnly: true,
    referenceDate,
  })

  if (!anyPassed) {
    blockers.push("SCREENING_REQUIRED")
  } else if (!screening) {
    blockers.push("SCREENING_EXPIRED")
  }

  return {
    ready: blockers.length === 0,
    donor,
    screening,
    donationCount,
    blockers,
  }
}

export function isDonationIdTaken(donationId: string): boolean {
  const normalized = donationId.trim().toLowerCase()
  if (!normalized) return false
  return listDonations().some(
    (r) => r.donationId.trim().toLowerCase() === normalized
  )
}

export function addDonationRecord(input: {
  donorId: string
  donatedAt: Date
  donationId?: string
  donationType?: z.infer<typeof DonationTypeSchema> | null
  volumeMl?: number | null
  location?: string
  vitals?: Partial<DonationRecord["vitals"]>
  bloodBagStatus?: z.infer<typeof BloodBagStatusSchema>
  tti?: Partial<TtiScreening>
  receivedBy?: string
  collectedBy?: string
  adverseReactions?: string
  note?: string
  screeningVisitId?: string
  requireEid?: boolean
}): DonationRecord {
  assertPermission("donations.write")

  const donor = getDonorById(input.donorId)
  if (!donor) {
    throw new Error("DONOR_NOT_FOUND")
  }

  const requireEid = input.requireEid ?? true
  if (requireEid && !donor.eid?.trim()) {
    throw new Error("EID_REQUIRED")
  }

  if (!canDonateNow(input.donorId, input.donatedAt)) {
    throw new Error("COOLDOWN_ACTIVE")
  }

  const screening = getPassedScreeningForDonor(input.donorId, {
    sameDayOnly: true,
    referenceDate: input.donatedAt,
  })
  if (!screening) {
    const hasPassed = listScreeningVisits().some(
      (v) =>
        v.donorId === input.donorId &&
        v.status === "passed" &&
        v.linkedDonationId == null
    )
    throw new Error(hasPassed ? "SCREENING_EXPIRED" : "SCREENING_REQUIRED")
  }
  if (input.screeningVisitId && input.screeningVisitId !== screening.id) {
    throw new Error("SCREENING_MISMATCH")
  }

  const bagId = input.donationId?.trim()
  if (bagId && isDonationIdTaken(bagId)) {
    throw new Error("DONATION_ID_DUPLICATE")
  }

  const tti = { ...screening.tti, ...(input.tti ?? {}) }
  const bloodBagStatus =
    input.bloodBagStatus ?? deriveBagStatusFromTti(tti)

  const id = crypto.randomUUID()
  const record: DonationRecord = normalizeDonationRecord({
    id,
    donationId: input.donationId,
    donorId: input.donorId,
    donatedAt: input.donatedAt.toISOString(),
    donationType: input.donationType ?? null,
    volumeMl: input.volumeMl ?? null,
    location: input.location ?? "",
    vitals: {
      bpSystolic: input.vitals?.bpSystolic ?? screening.vitals.bpSystolic,
      bpDiastolic: input.vitals?.bpDiastolic ?? screening.vitals.bpDiastolic,
      hb: input.vitals?.hb ?? screening.vitals.hb,
      weightKg: input.vitals?.weightKg ?? screening.vitals.weightKg,
    },
    bloodBagStatus,
    tti,
    receivedBy: input.receivedBy ?? screening.screenedBy,
    collectedBy: input.collectedBy ?? "",
    adverseReactions: input.adverseReactions ?? "",
    note: input.note,
  })
  const all = listStoredDonations()
  writeArray(DONATION_STORAGE_KEY, [...all, record])
  cachedListDonations = null
  persistScreeningLink(screening, record.id)

  const donationCount = listDonationsByDonor(donor.id).length
  appendDonorAuditLog({
    donorId: donor.id,
    donorCode: donor.donorId,
    action: "updated",
    summary: `Blood collection recorded (${record.donationId}) — donation #${donationCount}`,
  })

  return record
}

export function getNextDonationIdPreview(): string {
  const all = listDonations()
  const maxSeq = all.reduce((max, r) => {
    const m = /^BAG-(\d+)$/.exec(r.donationId)
    if (!m) return max
    const seq = Number(m[1])
    return Number.isFinite(seq) ? Math.max(max, seq) : max
  }, 0)
  return `BAG-${pad(maxSeq + 1, 6)}`
}

export function deleteDonationRecord(id: string) {
  assertPermission("donations.delete")
  if (isDemoDonationId(id)) return

  const records = listStoredDonations()
  writeArray(
    DONATION_STORAGE_KEY,
    records.filter((r) => r.id !== id)
  )
  cachedListDonations = null

  const visits = listStoredScreeningVisits()
  writeArray(
    SCREENING_VISIT_STORAGE_KEY,
    visits.map((v) =>
      v.linkedDonationId === id
        ? normalizeScreeningVisit({ ...v, linkedDonationId: null })
        : v
    )
  )
}

/* -------------------------------------------------------------------------- */
/* Pre-donation screening visits                                               */
/* -------------------------------------------------------------------------- */

function normalizeScreeningVisit(
  v: Partial<ScreeningVisit> &
    Pick<ScreeningVisit, "id" | "donorId" | "createdAt">
): ScreeningVisit {
  return ScreeningVisitSchema.parse({
    id: v.id,
    donorId: v.donorId,
    createdAt: new Date(v.createdAt).toISOString(),
    screenedAt: v.screenedAt ? new Date(v.screenedAt).toISOString() : null,
    vitals: {
      weightKg: v.vitals?.weightKg ?? null,
      bpSystolic: v.vitals?.bpSystolic ?? null,
      bpDiastolic: v.vitals?.bpDiastolic ?? null,
      pulse: v.vitals?.pulse ?? null,
      hb: v.vitals?.hb ?? null,
    },
    tti: { ...defaultTti(), ...(v.tti ?? {}) },
    status: v.status ?? "pending",
    screenedBy: v.screenedBy ?? "",
    note: v.note ?? "",
    linkedDonationId: v.linkedDonationId ?? null,
  })
}

function listStoredScreeningVisits(): ScreeningVisit[] {
  const raw = readArray(SCREENING_VISIT_STORAGE_KEY, z.any(), [])
  const migrated = z.array(z.any()).safeParse(raw)
  const list = migrated.success ? migrated.data : []
  const normalized: ScreeningVisit[] = []

  for (const item of list) {
    const parsed = ScreeningVisitSchema.safeParse(item)
    if (parsed.success) {
      normalized.push(parsed.data)
      continue
    }
    const legacy = z
      .object({
        id: z.string().min(1),
        donorId: z.string().min(1),
        createdAt: z.string(),
      })
      .safeParse(item)
    if (legacy.success) {
      normalized.push(
        normalizeScreeningVisit({
          id: legacy.data.id,
          donorId: legacy.data.donorId,
          createdAt: legacy.data.createdAt,
        })
      )
    }
  }

  return normalized.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listScreeningVisits(): ScreeningVisit[] {
  const stored = listStoredScreeningVisits()
  const storedDonorIds = new Set(stored.map((v) => v.donorId))
  const demoDonors = listVisibleDemoDonors()
  const demo = getDemoVisitsForDonors(demoDonors).filter(
    (v) => !storedDonorIds.has(v.donorId)
  )

  return [...stored, ...demo].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )
}

export function getScreeningVisitById(id: string): ScreeningVisit | null {
  return listScreeningVisits().find((v) => v.id === id) ?? null
}

export function createScreeningVisit(
  donorId: string,
  input?: {
    vitals?: Partial<ScreeningVitals>
    tti?: Partial<TtiScreening>
    note?: string
  }
): ScreeningVisit {
  const visit = normalizeScreeningVisit({
    id: crypto.randomUUID(),
    donorId,
    createdAt: new Date().toISOString(),
    vitals: input?.vitals
      ? {
          weightKg: input.vitals.weightKg ?? null,
          bpSystolic: input.vitals.bpSystolic ?? null,
          bpDiastolic: input.vitals.bpDiastolic ?? null,
          pulse: input.vitals.pulse ?? null,
          hb: input.vitals.hb ?? null,
        }
      : undefined,
    tti: input?.tti
      ? {
          hiv: input.tti.hiv ?? "pending",
          hepB: input.tti.hepB ?? "pending",
          hepC: input.tti.hepC ?? "pending",
          syphilis: input.tti.syphilis ?? "pending",
        }
      : undefined,
    note: input?.note,
    status: "pending",
  })
  const all = listStoredScreeningVisits()
  writeArray(SCREENING_VISIT_STORAGE_KEY, [visit, ...all])
  return visit
}

export function ensureScreeningVisit(donorId: string): ScreeningVisit {
  const existing = listScreeningVisits().find(
    (v) =>
      v.donorId === donorId &&
      v.status === "pending" &&
      v.linkedDonationId == null
  )
  if (existing) return existing

  const passed = getPassedScreeningForDonor(donorId)
  if (passed) return passed

  const donor = getDonorById(donorId)
  return createScreeningVisit(donorId, {
    vitals: donor
      ? {
          weightKg: donor.screening.weightKg,
          bpSystolic: donor.screening.bpSystolic,
          bpDiastolic: donor.screening.bpDiastolic,
          pulse: donor.screening.pulse,
          hb: donor.screening.hb,
        }
      : undefined,
  })
}

/** Passed screening not yet linked to a donation record. */
export function getPassedScreeningForDonor(
  donorId: string,
  options?: { sameDayOnly?: boolean; referenceDate?: Date }
): ScreeningVisit | null {
  const visit =
    listScreeningVisits().find(
      (v) =>
        v.donorId === donorId &&
        v.status === "passed" &&
        v.linkedDonationId == null
    ) ?? null

  if (!visit) return null

  if (options?.sameDayOnly) {
    const referenceDate = options.referenceDate ?? new Date()
    const screenedAt = visit.screenedAt ? new Date(visit.screenedAt) : null
    if (!screenedAt || !isSameDay(screenedAt, referenceDate)) {
      return null
    }
  }

  return visit
}

export function evaluateVitalsEligibility(
  vitals: ScreeningVitals,
  donor?: Donor | null
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []
  const minHb = donor?.gender === "female" ? 12.0 : 12.5

  if (vitals.weightKg == null || vitals.weightKg < 50) {
    reasons.push("weight_below_50kg")
  }
  if (vitals.hb == null || vitals.hb < minHb) {
    reasons.push("hb_low")
  }
  if (
    vitals.bpSystolic != null &&
    (vitals.bpSystolic < 90 || vitals.bpSystolic > 180)
  ) {
    reasons.push("bp_systolic_out_of_range")
  }
  if (
    vitals.bpDiastolic != null &&
    (vitals.bpDiastolic < 50 || vitals.bpDiastolic > 100)
  ) {
    reasons.push("bp_diastolic_out_of_range")
  }

  return { eligible: reasons.length === 0, reasons }
}

export function deriveScreeningStatus(
  vitals: ScreeningVitals,
  tti: TtiScreening,
  donor?: Donor | null
): z.infer<typeof ScreeningVisitStatusSchema> {
  if (!isTtiComplete(tti)) return "pending"
  if (TTI_MARKERS.some((m) => tti[m] === "positive")) return "deferred"

  const vitalsCheck = evaluateVitalsEligibility(vitals, donor)
  if (!vitalsCheck.eligible) return "deferred"

  if (donor?.medical.infectiousFlags.length) return "deferred"

  return "passed"
}

export function updateScreeningVisit(
  id: string,
  input: {
    vitals?: Partial<ScreeningVitals>
    tti?: Partial<TtiScreening>
    status?: z.infer<typeof ScreeningVisitStatusSchema>
    screenedBy?: string
    note?: string
    autoStatus?: boolean
  }
): ScreeningVisit | null {
  const existing = listScreeningVisits().find((v) => v.id === id)
  if (!existing) return null
  if (existing.linkedDonationId) return null

  const nextVitals: ScreeningVitals = {
    ...existing.vitals,
    ...(input.vitals ?? {}),
  }
  const nextTti: TtiScreening = {
    ...existing.tti,
    ...(input.tti ?? {}),
  }

  const donor = getDonorById(existing.donorId)
  const autoStatus = input.autoStatus ?? true
  const nextStatus =
    input.status ??
    (autoStatus
      ? deriveScreeningStatus(nextVitals, nextTti, donor)
      : existing.status)

  const finalized = nextStatus !== "pending"

  const updated = normalizeScreeningVisit({
    ...existing,
    vitals: nextVitals,
    tti: nextTti,
    status: nextStatus,
    screenedAt: finalized
      ? existing.screenedAt ?? new Date().toISOString()
      : existing.screenedAt,
    screenedBy:
      input.screenedBy != null ? input.screenedBy : existing.screenedBy,
    note: input.note != null ? input.note : existing.note,
  })

  if (isDemoScreeningId(id)) {
    const stored = listStoredScreeningVisits()
    const persisted = normalizeScreeningVisit({
      ...updated,
      id: crypto.randomUUID(),
    })
    writeArray(SCREENING_VISIT_STORAGE_KEY, [persisted, ...stored])
    return persisted
  }

  const visits = listStoredScreeningVisits()
  writeArray(
    SCREENING_VISIT_STORAGE_KEY,
    visits.map((v) => (v.id === id ? updated : v))
  )
  return updated
}

function linkScreeningToDonation(
  screeningId: string,
  donationRecordId: string
): ScreeningVisit | null {
  const visits = listStoredScreeningVisits()
  const existing = visits.find((v) => v.id === screeningId)
  if (!existing) return null

  const updated = normalizeScreeningVisit({
    ...existing,
    linkedDonationId: donationRecordId,
  })

  writeArray(
    SCREENING_VISIT_STORAGE_KEY,
    visits.map((v) => (v.id === screeningId ? updated : v))
  )
  return updated
}

function persistScreeningLink(
  screening: ScreeningVisit,
  donationRecordId: string
): ScreeningVisit | null {
  if (isDemoScreeningId(screening.id)) {
    const stored = listStoredScreeningVisits()
    const persisted = normalizeScreeningVisit({
      ...screening,
      id: crypto.randomUUID(),
      linkedDonationId: donationRecordId,
    })
    writeArray(SCREENING_VISIT_STORAGE_KEY, [persisted, ...stored])
    return persisted
  }
  return linkScreeningToDonation(screening.id, donationRecordId)
}

/* -------------------------------------------------------------------------- */
/* Testing & Screening                                                         */
/* -------------------------------------------------------------------------- */

export type TtiMarker = keyof TtiScreening

export const TTI_MARKERS: TtiMarker[] = ["hiv", "hepB", "hepC", "syphilis"]

/**
 * Derive the resulting blood-bag status from a set of TTI results.
 * - any positive  -> discarded (unsafe to use)
 * - all negative   -> ready_to_use
 * - otherwise      -> pending_testing (still waiting on some markers)
 */
export function deriveBagStatusFromTti(
  tti: TtiScreening
): z.infer<typeof BloodBagStatusSchema> {
  const values = TTI_MARKERS.map((m) => tti[m])
  if (values.some((v) => v === "positive")) return "discarded"
  if (values.every((v) => v === "negative")) return "ready_to_use"
  return "pending_testing"
}

/** True when every TTI marker has a final (non-pending) result. */
export function isTtiComplete(tti: TtiScreening): boolean {
  return TTI_MARKERS.every((m) => tti[m] !== "pending")
}

export function getDonationRecordById(id: string): DonationRecord | null {
  return listDonations().find((r) => r.id === id) ?? null
}

/** Donation records that still require lab testing (status pending_testing). */
export function listPendingTesting(): DonationRecord[] {
  return listDonations()
    .filter((r) => r.bloodBagStatus === "pending_testing")
    .sort((a, b) => a.donatedAt.localeCompare(b.donatedAt))
}

/**
 * Record / update the TTI screening results for a donation.
 * By default the blood-bag status is auto-derived from the TTI results.
 * Returns the updated record, or null if the record was not found.
 */
export function updateDonationTesting(
  id: string,
  input: {
    tti?: Partial<TtiScreening>
    bloodBagStatus?: z.infer<typeof BloodBagStatusSchema>
    receivedBy?: string
    note?: string
    autoStatus?: boolean
  }
): DonationRecord | null {
  if (isDemoDonationId(id)) return null

  const records = listStoredDonations()
  const existing = records.find((r) => r.id === id)
  if (!existing) return null

  const nextTti: TtiScreening = {
    ...existing.tti,
    ...(input.tti ?? {}),
  }

  const autoStatus = input.autoStatus ?? true
  const nextStatus =
    input.bloodBagStatus ??
    (autoStatus ? deriveBagStatusFromTti(nextTti) : existing.bloodBagStatus)

  const updated: DonationRecord = normalizeDonationRecord({
    ...existing,
    tti: nextTti,
    bloodBagStatus: nextStatus,
    receivedBy:
      input.receivedBy != null ? input.receivedBy : existing.receivedBy,
    note: input.note != null ? input.note : existing.note,
  })

  writeArray(
    DONATION_STORAGE_KEY,
    records.map((r) => (r.id === id ? updated : r))
  )
  cachedListDonations = null
  return updated
}

/** Aggregate counts for the Testing & Screening dashboard. */
export function getTestingStats() {
  const visits = listScreeningVisits()
  let pending = 0
  let passed = 0
  let deferred = 0
  let reactive = 0

  for (const v of visits) {
    if (v.status === "pending") pending += 1
    else if (v.status === "passed") passed += 1
    else if (v.status === "deferred") deferred += 1

    if (TTI_MARKERS.some((m) => v.tti[m] === "positive")) reactive += 1
  }

  return {
    total: visits.length,
    pending,
    passed,
    deferred,
    reactive,
  }
}

/** Aggregate counts for the blood bag inventory dashboard. */
export function getInventoryStats() {
  const records = listDonations()
  let ready = 0
  let pending = 0
  let discarded = 0

  for (const r of records) {
    if (r.bloodBagStatus === "ready_to_use") ready += 1
    else if (r.bloodBagStatus === "pending_testing") pending += 1
    else if (r.bloodBagStatus === "discarded") discarded += 1
  }

  return {
    total: records.length,
    ready,
    pending,
    discarded,
  }
}

