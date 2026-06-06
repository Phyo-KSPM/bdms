import { z } from "zod"

import { readAuthSession } from "@/lib/auth"
import type { Donor } from "@/lib/donor-store"

const DONOR_AUDIT_LOG_KEY = "bdms-donor-audit-log"

export const DonorAuditChangeSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
  oldValue: z.string(),
  newValue: z.string(),
})

export const DonorAuditEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  donorId: z.string(),
  donorCode: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.enum(["created", "updated", "deleted"]),
  summary: z.string(),
  changes: z.array(DonorAuditChangeSchema).optional(),
})

export type DonorAuditEntry = z.infer<typeof DonorAuditEntrySchema>
export type DonorAuditChange = z.infer<typeof DonorAuditChangeSchema>

function readJson<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T
): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function getAuditActor() {
  const session = readAuthSession()
  if (session) {
    return { actorId: session.userId, actorName: session.displayName }
  }
  return { actorId: "system", actorName: "System" }
}

function displayValue(value: unknown) {
  if (value == null) return "—"
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—"
  if (typeof value === "string") return value.trim() ? value : "—"
  return String(value)
}

const TRACKED_SCALAR_FIELDS = [
  "name",
  "age",
  "bloodType",
  "gender",
  "nrc",
  "eid",
  "contactPhone",
  "contactEmail",
  "contactAddress",
  "township",
  "city",
  "address",
] as const

const TRACKED_SCREENING_FIELDS = [
  "weightKg",
  "bpSystolic",
  "bpDiastolic",
  "pulse",
  "hb",
] as const

export function diffDonor(before: Donor, after: Donor): DonorAuditChange[] {
  const changes: DonorAuditChange[] = []

  for (const field of TRACKED_SCALAR_FIELDS) {
    const oldValue = displayValue(before[field])
    const newValue = displayValue(after[field])
    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue })
    }
  }

  for (const field of TRACKED_SCREENING_FIELDS) {
    const oldValue = displayValue(before.screening[field])
    const newValue = displayValue(after.screening[field])
    if (oldValue !== newValue) {
      changes.push({ field: `screening.${field}`, oldValue, newValue })
    }
  }

  const oldConditions = displayValue(before.medical.conditions)
  const newConditions = displayValue(after.medical.conditions)
  if (oldConditions !== newConditions) {
    changes.push({
      field: "medical.conditions",
      oldValue: oldConditions,
      newValue: newConditions,
    })
  }

  const oldMedications = displayValue(before.medical.medications)
  const newMedications = displayValue(after.medical.medications)
  if (oldMedications !== newMedications) {
    changes.push({
      field: "medical.medications",
      oldValue: oldMedications,
      newValue: newMedications,
    })
  }

  const oldMedicalNotes = displayValue(before.medical.notes)
  const newMedicalNotes = displayValue(after.medical.notes)
  if (oldMedicalNotes !== newMedicalNotes) {
    changes.push({
      field: "medical.notes",
      oldValue: oldMedicalNotes,
      newValue: newMedicalNotes,
    })
  }

  const oldDonationType = displayValue(before.donationDetails.donationType)
  const newDonationType = displayValue(after.donationDetails.donationType)
  if (oldDonationType !== newDonationType) {
    changes.push({
      field: "donationDetails.donationType",
      oldValue: oldDonationType,
      newValue: newDonationType,
    })
  }

  const oldDonationNotes = displayValue(before.donationDetails.notes)
  const newDonationNotes = displayValue(after.donationDetails.notes)
  if (oldDonationNotes !== newDonationNotes) {
    changes.push({
      field: "donationDetails.notes",
      oldValue: oldDonationNotes,
      newValue: newDonationNotes,
    })
  }

  return changes
}

export function appendDonorAuditLog(input: {
  donorId: string
  donorCode: string
  action: DonorAuditEntry["action"]
  summary: string
  changes?: DonorAuditChange[]
}) {
  const actor = getAuditActor()
  const logs = readJson(DONOR_AUDIT_LOG_KEY, z.array(DonorAuditEntrySchema), [])
  logs.unshift({
    id: `donor-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: nowIso(),
    actorId: actor.actorId,
    actorName: actor.actorName,
    ...input,
  })
  writeJson(DONOR_AUDIT_LOG_KEY, logs.slice(0, 500))
}

export function listDonorAuditLogs(donorId: string, limit = 100): DonorAuditEntry[] {
  const logs = readJson(DONOR_AUDIT_LOG_KEY, z.array(DonorAuditEntrySchema), [])
  return logs
    .filter((entry) => entry.donorId === donorId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}
