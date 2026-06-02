import { addDays, isAfter } from "date-fns"
import { z } from "zod"

const DONOR_STORAGE_KEY = "bdms-donors"
const DONATION_STORAGE_KEY = "bdms-donor-donations"
const HIDDEN_DEMO_DONOR_IDS_KEY = "bdms-hidden-demo-donors"
const DEFAULT_DEMO_DONOR_COUNT = 100

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

function parseDonorIdSeq(donorId: string) {
  const match = /^DNR-(\d{1,})$/.exec(donorId)
  if (!match) return null
  const seq = Number(match[1])
  return Number.isFinite(seq) ? seq : null
}

export function getNextDonorIdPreview(): string {
  const hiddenDemo = listHiddenDemoDonorIds()
  const stored = listStoredDonors()
  const storedIds = new Set(stored.map((d) => d.id))
  const demo = buildDemoDonors().filter(
    (d) => !storedIds.has(d.id) && !hiddenDemo.has(d.id)
  )

  const maxSeq = [...stored, ...demo].reduce((max, d) => {
    const seq = parseDonorIdSeq(d.donorId)
    return seq ? Math.max(max, seq) : max
  }, 0)

  return formatDonorId(maxSeq + 1)
}

function isDemoDonorId(id: string) {
  return id.startsWith("demo-donor-")
}

export function hideDemoDonors(ids: string[]) {
  if (typeof window === "undefined") return
  const onlyDemo = ids.filter((id) => isDemoDonorId(id))
  if (onlyDemo.length === 0) return
  const current = new Set(readStringArray(HIDDEN_DEMO_DONOR_IDS_KEY))
  for (const id of onlyDemo) current.add(id)
  writeStringArray(HIDDEN_DEMO_DONOR_IDS_KEY, Array.from(current))
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

function buildDemoDonors(count: number = DEFAULT_DEMO_DONOR_COUNT): Donor[] {
  const rng = mulberry32(20260602)

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

  for (let i = 0; i < count; i++) {
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
    // spread createdAt over last ~365 days
    const createdAt = new Date(now - Math.floor(rng() * 365) * 86400000).toISOString()

    demo.push(
      normalizeDonor({
        id: `demo-donor-${pad(i + 1, 4)}`,
        donorId: formatDonorId(i + 1),
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
      })
    )
  }

  return demo
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
  const stored = listStoredDonors()
  const storedIds = new Set(stored.map((d) => d.id))
  const hiddenDemo = listHiddenDemoDonorIds()
  const demo = buildDemoDonors().filter(
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
  const demoIds = ids.filter((id) => isDemoDonorId(id))
  const storedIds = ids.filter((id) => !isDemoDonorId(id))
  if (demoIds.length) hideDemoDonors(demoIds)
  for (const id of storedIds) deleteDonor(id)
}

export function resetDonorLocalData() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DONOR_STORAGE_KEY)
  window.localStorage.removeItem(DONATION_STORAGE_KEY)
  window.localStorage.removeItem(HIDDEN_DEMO_DONOR_IDS_KEY)
}

export function upsertDonor(
  input: Pick<Donor, "name" | "age" | "bloodType" | "contact"> & {
    id?: string
    donorId?: string
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
  return donor
}

export function getDonorById(id: string): Donor | null {
  return listDonors().find((d) => d.id === id) ?? null
}

export function deleteDonor(id: string) {
  const donors = listStoredDonors()
  writeArray(
    DONOR_STORAGE_KEY,
    donors.filter((d) => d.id !== id)
  )

  const donations = listDonations()
  writeArray(
    DONATION_STORAGE_KEY,
    donations.filter((r) => r.donorId !== id)
  )
}

export function listDonations(): DonationRecord[] {
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

export function listDonationsByDonor(donorId: string): DonationRecord[] {
  return listDonations().filter((r) => r.donorId === donorId)
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
}): DonationRecord {
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
      bpSystolic: input.vitals?.bpSystolic ?? null,
      bpDiastolic: input.vitals?.bpDiastolic ?? null,
      hb: input.vitals?.hb ?? null,
      weightKg: input.vitals?.weightKg ?? null,
    },
    bloodBagStatus: input.bloodBagStatus ?? "pending_testing",
    tti: { ...defaultTti(), ...(input.tti ?? {}) },
    receivedBy: input.receivedBy ?? "",
    collectedBy: input.collectedBy ?? "",
    adverseReactions: input.adverseReactions ?? "",
    note: input.note,
  })
  const all = listDonations()
  writeArray(DONATION_STORAGE_KEY, [...all, record])
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
  const records = listDonations()
  writeArray(
    DONATION_STORAGE_KEY,
    records.filter((r) => r.id !== id)
  )
}

