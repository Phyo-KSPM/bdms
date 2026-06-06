import type { Donor } from "@/lib/donor-store"



export type DonorScanPayload = {

  eid?: string

  donorId?: string

  preview?: boolean

}



/** Normalize scanner input: plain EID/Donor ID, or BDMS QR JSON payload. */

export function parseDonorScanPayload(raw: string): DonorScanPayload | null {

  const trimmed = raw.trim()

  if (!trimmed) return null



  if (trimmed.startsWith("{")) {

    try {

      const parsed = JSON.parse(trimmed) as Record<string, unknown>

      if (parsed.system !== "BDMS") return null

      if (parsed.preview === true) return { preview: true }

      return {

        eid: typeof parsed.eid === "string" ? parsed.eid : undefined,

        donorId: typeof parsed.donorId === "string" ? parsed.donorId : undefined,

      }

    } catch {

      return null

    }

  }



  return { eid: trimmed, donorId: trimmed }

}



function normalizeLookupToken(value: string) {

  return value.trim().toLowerCase()

}



/** Resolve a donor from Donor ID, EID, internal id, or BDMS QR JSON. */

export function resolveDonorFromQuery(donors: Donor[], query: string): Donor | null {

  const payload = parseDonorScanPayload(query)

  if (!payload || payload.preview) return null



  const tokens = [payload.eid, payload.donorId]

    .filter((v): v is string => Boolean(v?.trim()))

    .map(normalizeLookupToken)



  if (tokens.length === 0) return null



  for (const token of tokens) {

    const byDonorId = donors.find((d) => d.donorId.toLowerCase() === token)

    if (byDonorId) return byDonorId



    const byEid = donors.find((d) => d.eid?.toLowerCase() === token)

    if (byEid) return byEid



    const byId = donors.find((d) => d.id.toLowerCase() === token)

    if (byId) return byId

  }



  return null

}



export function filterDonorMatches(donors: Donor[], query: string, limit = 8) {

  const q = query.trim().toLowerCase()

  if (!q) return []

  if (resolveDonorFromQuery(donors, query)) return []

  return donors

    .filter((d) => {

      const hay = [d.donorId, d.eid, d.name, d.contactPhone, d.nrc]

        .filter(Boolean)

        .join(" ")

        .toLowerCase()

      return hay.includes(q)

    })

    .slice(0, limit)

}

