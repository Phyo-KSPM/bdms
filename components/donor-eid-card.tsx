"use client"

import { format } from "date-fns"
import { QRCodeSVG } from "qrcode.react"
import { NfcIcon } from "lucide-react"

import type { Donor } from "@/lib/donor-store"

export type DonorEidCardStats = {
  donationCount: number
  firstDonationDate: string | null
  lastDonationDate: string | null
}

export type DonorEidCardLabels = {
  orgNameMm: string
  orgNameEn: string
  cardTitle: string
  nameLabel: string
  bloodGroupLabel: string
  memberNoLabel: string
  nrcLabel: string
  joinedDateLabel: string
  donationCountLabel: string
  lastDonationLabel: string
  scanHint: string
  signatureLabel: string
  phone: string
  email: string
  website: string
  none: string
}

const CARD_RED = "#9b0018"

function toMyanmarDigits(value: string) {
  const map: Record<string, string> = {
    "0": "၀",
    "1": "၁",
    "2": "၂",
    "3": "၃",
    "4": "၄",
    "5": "၅",
    "6": "၆",
    "7": "၇",
    "8": "၈",
    "9": "၉",
  }
  return value.replace(/[0-9]/g, (digit) => map[digit] ?? digit)
}

function formatDisplayDate(value: string | null, useMyanmarDigits: boolean) {
  if (!value) return "—"
  const formatted = format(new Date(value), "dd-MM-yyyy")
  return useMyanmarDigits ? toMyanmarDigits(formatted) : formatted
}

function formatCount(count: number, useMyanmarDigits: boolean) {
  const text = String(count)
  return useMyanmarDigits ? toMyanmarDigits(text) : text
}

function bloodTypeLabel(bloodType: string) {
  const map: Record<string, string> = {
    "O+": "O Positive (O+)",
    "O-": "O Negative (O−)",
    "A+": "A Positive (A+)",
    "A-": "A Negative (A−)",
    "B+": "B Positive (B+)",
    "B-": "B Negative (B−)",
    "AB+": "AB Positive (AB+)",
    "AB-": "AB Negative (AB−)",
  }
  return map[bloodType] ?? bloodType
}

function donorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
}

function DonorEidLogo() {
  return (
    <div
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white"
      aria-hidden
    >
      <svg viewBox="0 0 44 44" className="size-10">
        <circle cx="22" cy="22" r="20" fill="#fff" stroke={CARD_RED} strokeWidth="1.5" />
        <path
          d="M22 30c-6-4.5-9.5-7.5-9.5-11.2a5.2 5.2 0 0 1 9.5-2.8 5.2 5.2 0 0 1 9.5 2.8C31.5 22.5 28 25.5 22 30z"
          fill={CARD_RED}
        />
        <ellipse cx="22" cy="18.5" rx="2.2" ry="2.8" fill="#fff" opacity="0.85" />
      </svg>
    </div>
  )
}

function EmvChip() {
  return (
    <div
      aria-hidden
      className="h-7 w-10 rounded-sm bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-0.5 shadow-sm"
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-px rounded-[2px] bg-amber-500/40 p-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[1px] bg-amber-900/25" />
        ))}
      </div>
    </div>
  )
}

function CircuitWatermark() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
    >
      <path
        d="M0 40h80v20H40v40h120M160 40v80h40M240 20h40v60h-20v40M320 60h80M0 160h60v40H20v20h100M180 140h40v60M280 120h120v20H320v40"
        fill="none"
        stroke={CARD_RED}
        strokeWidth="2"
      />
    </svg>
  )
}

function CenterWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
    >
      <DonorEidLogo />
    </div>
  )
}

export function DonorEidCard({
  donor,
  labels,
  stats,
  useMyanmarDigits = false,
  className,
  isPreview = false,
  photoUrlOverride,
}: {
  donor: Donor
  labels: DonorEidCardLabels
  stats: DonorEidCardStats
  useMyanmarDigits?: boolean
  className?: string
  isPreview?: boolean
  photoUrlOverride?: string | null
}) {
  if (!donor.eid) return null

  const photoUrl = photoUrlOverride ?? donor.photoUrl

  const joinedDate =
    stats.firstDonationDate ??
    donor.eidIssuedAt ??
    donor.createdAt

  const qrValue = JSON.stringify({
    system: "BDMS",
    eid: donor.eid,
    donorId: donor.donorId,
    ...(isPreview ? { preview: true } : {}),
  })

  return (
    <div
      className={className}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <div
        className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-2xl border border-[#9b0018]/40 bg-white shadow-lg"
        style={{ aspectRatio: "1.586 / 1" }}
      >
        {isPreview ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div
              className="rotate-[-18deg] rounded-md border-4 border-dashed px-6 py-2 text-2xl font-black uppercase tracking-widest opacity-25"
              style={{ borderColor: CARD_RED, color: CARD_RED }}
            >
              Preview
            </div>
          </div>
        ) : null}
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-3 py-2 text-white"
          style={{ backgroundColor: CARD_RED }}
        >
          <DonorEidLogo />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-bold">{labels.orgNameMm}</div>
            <div className="truncate text-[9px] font-semibold tracking-wide uppercase">
              {labels.orgNameEn}
            </div>
          </div>
        </div>

        {/* Card title */}
        <div
          className="border-b border-red-100 px-3 py-1 text-center text-[11px] font-bold"
          style={{ color: CARD_RED }}
        >
          {labels.cardTitle}
        </div>

        {/* Body */}
        <div className="relative flex min-h-0 flex-1 flex-col px-3 py-2">
          <CircuitWatermark />
          <CenterWatermark />

          <div className="relative flex flex-1 gap-2">
            {/* Photo + chip */}
            <div className="flex shrink-0 flex-col gap-1.5">
              <div
                className="flex h-[92px] w-[74px] items-center justify-center overflow-hidden border-2 bg-slate-100 text-lg font-semibold text-slate-500"
                style={{ borderColor: CARD_RED }}
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  donorInitials(donor.name)
                )}
              </div>
              <EmvChip />
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 space-y-1 text-[10px] leading-snug text-slate-800">
              <div>
                <span className="font-semibold" style={{ color: CARD_RED }}>
                  {labels.nameLabel}:
                </span>{" "}
                <span className="font-bold">{donor.name}</span>
              </div>

              <div>
                <span className="font-semibold" style={{ color: CARD_RED }}>
                  {labels.bloodGroupLabel}:
                </span>{" "}
                <span
                  className="text-base font-extrabold leading-none"
                  style={{ color: CARD_RED }}
                >
                  {bloodTypeLabel(donor.bloodType)}
                </span>
              </div>

              <div>
                <span className="font-semibold" style={{ color: CARD_RED }}>
                  {labels.memberNoLabel}:
                </span>{" "}
                <span className="font-mono font-semibold">{donor.eid}</span>
              </div>

              <div>
                <span className="font-semibold" style={{ color: CARD_RED }}>
                  {labels.nrcLabel}:
                </span>{" "}
                <span>{donor.nrc || labels.none}</span>
              </div>

              <div>
                <span className="font-semibold" style={{ color: CARD_RED }}>
                  {labels.joinedDateLabel}:
                </span>{" "}
                <span>{formatDisplayDate(joinedDate, useMyanmarDigits)}</span>
              </div>

              <div
                className="mt-1 space-y-0.5 border-t border-dashed border-red-200 pt-1 text-[9px]"
                style={{ color: CARD_RED }}
              >
                <div>
                  {labels.donationCountLabel}:{" "}
                  <span className="font-bold">
                    {formatCount(stats.donationCount, useMyanmarDigits)}
                  </span>
                </div>
                <div>
                  {labels.lastDonationLabel}:{" "}
                  <span className="font-bold">
                    {stats.lastDonationDate
                      ? formatDisplayDate(stats.lastDonationDate, useMyanmarDigits)
                      : labels.none}
                  </span>
                </div>
              </div>
            </div>

            {/* QR + signature */}
            <div className="flex w-[92px] shrink-0 flex-col items-center">
              <div className="relative">
                <QRCodeSVG value={qrValue} size={78} level="M" marginSize={0} />
                <NfcIcon
                  className="absolute -right-1 -top-1 size-3.5 text-slate-500"
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-center text-[7px] leading-tight text-slate-600">
                {labels.scanHint}
              </p>
              <div className="mt-auto w-full pt-2">
                <div className="border-b border-slate-800" />
                <div className="mt-0.5 text-center text-[7px] text-slate-700">
                  {labels.signatureLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-1.5 text-[8px] text-white"
          style={{ backgroundColor: CARD_RED }}
        >
          <span>{labels.phone}</span>
          <span>{labels.email}</span>
          <span>{labels.website}</span>
        </div>
      </div>
    </div>
  )
}
