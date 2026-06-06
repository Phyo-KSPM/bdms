"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  DropletIcon,
  ScanLineIcon,
  XCircleIcon,
} from "lucide-react"
import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { readAuthSession } from "@/lib/auth"
import {
  filterDonorMatches,
  parseDonorScanPayload,
  resolveDonorFromQuery,
} from "@/lib/donor-lookup"
import {
  addDonationRecord,
  assessDonationCollection,
  DonationTypeSchema,
  getNextDonationIdPreview,
  getNextEligibleDate,
  isDonationIdTaken,
  listDonationsByDonor,
  listDonors,
  type DonationCollectionBlocker,
  type Donor,
} from "@/lib/donor-store"
import { PermissionDeniedError } from "@/lib/permissions"

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function StepBadge({
  step,
  label,
  active,
  done,
}: {
  step: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        active
          ? "border-primary bg-primary/5"
          : done
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-muted bg-muted/20 text-muted-foreground"
      }`}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold">
        {done ? "✓" : step}
      </span>
      <span>{label}</span>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AuthedShell title="Blood Collection" requiredPermission="donations.write">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-[280px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </AuthedShell>
      }
    >
      <BloodCollectionPageContent />
    </Suspense>
  )
}

function BloodCollectionPageContent() {
  const { locale } = useLocale()
  const { can } = usePermissions()
  const searchParams = useSearchParams()
  const donorInputRef = useRef<HTMLInputElement>(null)
  const bagInputRef = useRef<HTMLInputElement>(null)

  const [donors, setDonors] = useState<Donor[]>([])
  const [donorQuery, setDonorQuery] = useState("")
  const [selectedDonorId, setSelectedDonorId] = useState("")
  const [bagQuery, setBagQuery] = useState("")
  const [donationId, setDonationId] = useState("")
  const [donatedAt, setDonatedAt] = useState(() =>
    toDateTimeLocalValue(new Date())
  )
  const [location, setLocation] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [justRecordedCount, setJustRecordedCount] = useState<number | null>(
    null
  )

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Blood Collection",
        subtitle:
          "Secure workflow: EID scan → verify screening & eligibility → scan bag → record collection.",
        stepScanEid: "Scan EID",
        stepVerify: "Verify checks",
        stepScanBag: "Scan blood bag",
        stepConfirm: "Confirm collection",
        scanEidLabel: "Scan EID / QR / Donor ID",
        scanEidPlaceholder: "EID-000001 or scan card QR",
        scanBagLabel: "Scan blood bag barcode",
        scanBagPlaceholder: "BAG-000001 / barcode",
        donatedAt: "Collection time",
        location: "Location / Camp",
        confirm: "Record blood collection",
        reset: "Scan next donor",
        matches: "Matches",
        donorNotFound: "No donor matches this scan.",
        previewEid: "Preview EID cards cannot be used for collection.",
        noDonors: "No donors registered yet.",
        workflowTitle: "Procedure checklist",
        checkEid: "EID issued",
        checkScreening: "Screening passed (today)",
        checkCooldown: "56-day eligibility",
        checkBag: "Blood bag ID ready",
        ready: "Ready to collect",
        notReady: "Cannot collect yet",
        donationCount: "Donations recorded",
        lastCount: "After this collection",
        nextEligible: "Next eligible",
        now: "Now",
        goScreening: "Go to screening",
        goEid: "Issue EID card",
        permissionDenied: "You do not have permission to record collections.",
        success: "Blood collection recorded.",
        errors: {
          DONOR_NOT_FOUND: "Donor not found.",
          EID_REQUIRED: "EID must be issued before collection.",
          COOLDOWN_ACTIVE: "Donor is still in 56-day cooldown.",
          SCREENING_REQUIRED: "Complete pre-donation screening first.",
          SCREENING_EXPIRED: "Today's screening pass is required (re-screen).",
          SCREENING_MISMATCH: "Screening visit mismatch.",
          DONATION_ID_DUPLICATE: "This blood bag ID is already used.",
          PREVIEW_EID: "Preview EID cannot be used.",
        } satisfies Record<
          DonationCollectionBlocker | string,
          string
        >,
      } as const
    }

    return {
      title: "သွေးကောက်ယူမှု",
      subtitle:
        "လုံခြုံသော အဆင့်များ: EID scan → screening/eligibility စစ်ဆေး → အိတ် scan → မှတ်တမ်းတင်",
      stepScanEid: "EID Scan",
      stepVerify: "စစ်ဆေးချက်",
      stepScanBag: "သွေးအိတ် Scan",
      stepConfirm: "အတည်ပြု",
      scanEidLabel: "EID / QR / Donor ID Scan",
      scanEidPlaceholder: "EID-000001 သို့မဟုတ် card QR",
      scanBagLabel: "သွေးအိတ် Barcode Scan",
      scanBagPlaceholder: "BAG-000001 / barcode",
      donatedAt: "ကောက်ယူချိန်",
      location: "နေရာ / စခန်း",
      confirm: "သွေးကောက်ယူမှု မှတ်တမ်းတင်",
      reset: "Donor အသစ် Scan",
      matches: "ကိုက်ညီမှုများ",
      donorNotFound: "ဒီ scan နဲ့ Donor မတွေ့ပါ။",
      previewEid: "Preview EID card ကို collection မှာ မသုံးနိုင်ပါ။",
      noDonors: "Donor မှတ်ပုံတင်ထားခြင်း မရှိသေးပါ။",
      workflowTitle: "Procedure checklist",
      checkEid: "EID ထုတ်ပြီးပြီ",
      checkScreening: "Screening Pass (ယနေ့)",
      checkCooldown: "56 ရက် eligibility",
      checkBag: "သွေးအိတ် ID အဆင်သင့်",
      ready: "ကောက်ယူနိုင်ပါပြီ",
      notReady: "မကောက်ယူရသေးပါ",
      donationCount: "လှူဒါန်းအကြိမ်",
      lastCount: "မှတ်တမ်းတင်ပြီးနောက်",
      nextEligible: "နောက်တစ်ကြိမ် လှူနိုင်မည့်ရက်",
      now: "ယခု",
      goScreening: "စစ်ဆေးရန် သွားမည်",
      goEid: "EID ထုတ်ပေးရန်",
      permissionDenied: "သွေးကောက်ယူမှု မှတ်တမ်းတင်ခွင့် မရှိပါ။",
      success: "သွေးကောက်ယူမှု မှတ်တမ်းတင်ပြီးပါပြီ။",
      errors: {
        DONOR_NOT_FOUND: "Donor မတွေ့ပါ။",
        EID_REQUIRED: "Collection မလုပ်မီ EID ထုတ်ပေးရပါမည်။",
        COOLDOWN_ACTIVE: "56 ရက် cooldown ကြာသေးပါသည်။",
        SCREENING_REQUIRED: "လှူမီ screening ပြီးမြောက်ရပါမည်။",
        SCREENING_EXPIRED: "ယနေ့ screening Pass လိုအပ်ပါသည် (ပြန်စစ်ဆေးပါ)။",
        SCREENING_MISMATCH: "Screening visit မကိုက်ညီပါ။",
        DONATION_ID_DUPLICATE: "ဒီသွေးအိတ် ID ကို အသုံးပြုပြီးသားဖြစ်ပါသည်။",
        PREVIEW_EID: "Preview EID ကို မသုံးနိုင်ပါ။",
      } satisfies Record<DonationCollectionBlocker | string, string>,
    } as const
  }, [locale])

  const canWriteDonations = can("donations.write")

  function refreshDonors() {
    setDonors(listDonors())
  }

  useEffect(() => {
    refreshDonors()
    setDonationId(getNextDonationIdPreview())
    donorInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const initial =
      searchParams.get("eid") ??
      searchParams.get("donorId") ??
      searchParams.get("donor")
    if (initial) {
      setDonorQuery(initial)
    }
  }, [searchParams])

  useEffect(() => {
    const payload = parseDonorScanPayload(donorQuery)
    if (payload?.preview) {
      setSelectedDonorId("")
      return
    }

    const exact = resolveDonorFromQuery(donors, donorQuery)
    if (exact) {
      setSelectedDonorId(exact.id)
      return
    }
    if (!donorQuery.trim()) {
      setSelectedDonorId("")
    }
  }, [donorQuery, donors])

  const donorMatches = useMemo(
    () => filterDonorMatches(donors, donorQuery),
    [donorQuery, donors]
  )

  const donor = useMemo(
    () => donors.find((d) => d.id === selectedDonorId) ?? null,
    [donors, selectedDonorId]
  )

  const referenceDate = useMemo(
    () => (donatedAt ? new Date(donatedAt) : new Date()),
    [donatedAt]
  )

  const assessment = useMemo(() => {
    if (!selectedDonorId) return null
    return assessDonationCollection(selectedDonorId, { referenceDate })
  }, [selectedDonorId, referenceDate, justRecordedCount])

  const previewScanBlocker = useMemo(() => {
    const payload = parseDonorScanPayload(donorQuery)
    return payload?.preview ? ("PREVIEW_EID" as const) : null
  }, [donorQuery])

  const nextEligible = useMemo(() => {
    if (!selectedDonorId) return null
    return getNextEligibleDate(selectedDonorId)
  }, [selectedDonorId, justRecordedCount])

  const bagReady = Boolean(donationId.trim()) && !isDonationIdTaken(donationId)
  const bagDuplicate = Boolean(donationId.trim()) && isDonationIdTaken(donationId)

  const canConfirm =
    canWriteDonations &&
    assessment?.ready === true &&
    bagReady &&
    !isSaving

  const currentStep = !donor
    ? 1
    : !assessment?.ready
      ? 2
      : !bagReady
        ? 3
        : 4

  const showNotFound =
    donorQuery.trim().length > 0 &&
    !donor &&
    donorMatches.length === 0 &&
    !previewScanBlocker

  function selectDonor(d: Donor) {
    setSelectedDonorId(d.id)
    setDonorQuery(d.eid ?? d.donorId)
    setJustRecordedCount(null)
  }

  function handleDonorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    const payload = parseDonorScanPayload(donorQuery)
    if (payload?.preview) {
      toast.error(t.previewEid)
      return
    }
    const exact = resolveDonorFromQuery(donors, donorQuery)
    if (exact) {
      selectDonor(exact)
      if (assessDonationCollection(exact.id, { referenceDate }).ready) {
        bagInputRef.current?.focus()
      }
      return
    }
    if (donorMatches.length === 1) {
      selectDonor(donorMatches[0])
    }
  }

  function handleBagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    const value = bagQuery.trim() || donationId.trim()
    if (!value) return
    setDonationId(value)
    setBagQuery(value)
  }

  useEffect(() => {
    if (bagQuery.trim()) {
      setDonationId(bagQuery.trim())
    }
  }, [bagQuery])

  useEffect(() => {
    if (assessment?.ready) {
      bagInputRef.current?.focus()
    }
  }, [assessment?.ready, selectedDonorId])

  function blockerLabel(code: DonationCollectionBlocker | "PREVIEW_EID") {
    return t.errors[code] ?? code
  }

  function resetForNextDonor() {
    setDonorQuery("")
    setSelectedDonorId("")
    setBagQuery("")
    setDonationId(getNextDonationIdPreview())
    setLocation("")
    setJustRecordedCount(null)
    donorInputRef.current?.focus()
  }

  async function handleConfirm() {
    if (!assessment?.ready || !assessment.donor || !assessment.screening) return
    if (!canWriteDonations) {
      toast.error(t.permissionDenied)
      return
    }

    setIsSaving(true)
    try {
      const session = readAuthSession()
      addDonationRecord({
        donorId: assessment.donor.id,
        donatedAt: new Date(donatedAt),
        donationId: donationId.trim() || undefined,
        donationType: DonationTypeSchema.options[0],
        volumeMl: 450,
        location: location.trim(),
        collectedBy: session?.displayName ?? "",
        screeningVisitId: assessment.screening.id,
        requireEid: true,
      })

      const newCount = listDonationsByDonor(assessment.donor.id).length
      setJustRecordedCount(newCount)
      toast.success(t.success)
      refreshDonors()
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
      } else if (err instanceof Error) {
        const message =
          err.message in t.errors
            ? t.errors[err.message as keyof typeof t.errors]
            : err.message
        toast.error(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const donationCountBefore =
    assessment?.donationCount ?? (donor ? listDonationsByDonor(donor.id).length : 0)
  const donationCountAfter = justRecordedCount ?? donationCountBefore

  return (
    <AuthedShell title={t.title} requiredPermission="donations.write">
      <p className="mb-4 text-sm text-muted-foreground">{t.subtitle}</p>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StepBadge
          step={1}
          label={t.stepScanEid}
          active={currentStep === 1}
          done={currentStep > 1}
        />
        <StepBadge
          step={2}
          label={t.stepVerify}
          active={currentStep === 2}
          done={currentStep > 2}
        />
        <StepBadge
          step={3}
          label={t.stepScanBag}
          active={currentStep === 3}
          done={currentStep > 3}
        />
        <StepBadge
          step={4}
          label={t.stepConfirm}
          active={currentStep === 4}
          done={justRecordedCount != null}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLineIcon className="size-4" />
              {t.stepScanEid}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label htmlFor="collection-eid-scan">{t.scanEidLabel}</Label>
              <Input
                ref={donorInputRef}
                id="collection-eid-scan"
                value={donorQuery}
                onChange={(e) => {
                  setDonorQuery(e.target.value)
                  setJustRecordedCount(null)
                }}
                onKeyDown={handleDonorKeyDown}
                placeholder={t.scanEidPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {donors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noDonors}</p>
            ) : null}

            {previewScanBlocker ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
                {blockerLabel(previewScanBlocker)}
              </div>
            ) : null}

            {showNotFound ? (
              <p className="text-sm text-muted-foreground">{t.donorNotFound}</p>
            ) : null}

            {donorMatches.length > 0 && !donor ? (
              <div className="rounded-md border bg-muted/20 p-2 text-sm">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {t.matches}
                </div>
                <div className="grid gap-1">
                  {donorMatches.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left hover:bg-muted"
                      onClick={() => selectDonor(d)}
                    >
                      <span className="font-mono text-xs">{d.donorId}</span>
                      <span className="truncate">
                        {d.name} ({d.bloodType})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {donor ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-mono text-xs text-muted-foreground">
                  {donor.donorId}
                  {donor.eid ? ` · ${donor.eid}` : ""}
                </div>
                <div className="font-medium">{donor.name}</div>
                <div className="text-muted-foreground">{donor.bloodType}</div>
                <div className="mt-2 text-muted-foreground">
                  {t.donationCount}: {donationCountBefore}
                  {justRecordedCount != null ? (
                    <span className="ml-2 font-medium text-emerald-600">
                      → {donationCountAfter}
                    </span>
                  ) : null}
                </div>
                <div className="text-muted-foreground">
                  {t.nextEligible}:{" "}
                  {nextEligible ? format(nextEligible, "PPP") : t.now}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DropletIcon className="size-4" />
              {t.workflowTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!donor ? (
              <p className="text-sm text-muted-foreground">{t.scanEidPlaceholder}</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      {
                        ok: Boolean(donor.eid),
                        label: t.checkEid,
                        action: !donor.eid ? (
                          <Link href={`/donor/certificate?donorId=${encodeURIComponent(donor.donorId)}`}>
                            <Button size="sm" variant="outline">
                              {t.goEid}
                            </Button>
                          </Link>
                        ) : null,
                      },
                      {
                        ok: !assessment?.blockers.includes("COOLDOWN_ACTIVE"),
                        label: t.checkCooldown,
                        action: null,
                      },
                      {
                        ok:
                          !assessment?.blockers.includes("SCREENING_REQUIRED") &&
                          !assessment?.blockers.includes("SCREENING_EXPIRED"),
                        label: t.checkScreening,
                        action:
                          assessment?.blockers.includes("SCREENING_REQUIRED") ||
                          assessment?.blockers.includes("SCREENING_EXPIRED") ? (
                            <Link
                              href={`/testing-screening?donorId=${encodeURIComponent(donor.donorId)}`}
                            >
                              <Button size="sm" variant="outline">
                                {t.goScreening}
                              </Button>
                            </Link>
                          ) : null,
                      },
                      {
                        ok: bagReady,
                        label: t.checkBag,
                        action: null,
                      },
                    ] as const
                  ).map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2">
                        {item.ok ? (
                          <CheckCircle2Icon className="size-4 text-emerald-600" />
                        ) : (
                          <XCircleIcon className="size-4 text-amber-600" />
                        )}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.action}
                    </div>
                  ))}
                </div>

                {assessment && assessment.blockers.length > 0 ? (
                  <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                    <div className="font-medium text-amber-900 dark:text-amber-200">
                      {t.notReady}
                    </div>
                    <ul className="list-inside list-disc text-amber-800 dark:text-amber-300">
                      {previewScanBlocker ? (
                        <li>{blockerLabel(previewScanBlocker)}</li>
                      ) : null}
                      {assessment.blockers.map((code) => (
                        <li key={code}>{blockerLabel(code)}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Badge className="bg-emerald-600">{t.ready}</Badge>
                )}

                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <div className="grid gap-3">
                    <Label htmlFor="collection-bag-scan">{t.scanBagLabel}</Label>
                    <Input
                      ref={bagInputRef}
                      id="collection-bag-scan"
                      value={bagQuery || donationId}
                      onChange={(e) => {
                        setBagQuery(e.target.value)
                        setDonationId(e.target.value)
                      }}
                      onKeyDown={handleBagKeyDown}
                      placeholder={t.scanBagPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={!assessment?.ready}
                    />
                    {bagDuplicate ? (
                      <p className="text-xs text-rose-600">
                        {t.errors.DONATION_ID_DUPLICATE}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="collection-time">{t.donatedAt}</Label>
                    <Input
                      id="collection-time"
                      type="datetime-local"
                      value={donatedAt}
                      onChange={(e) => setDonatedAt(e.target.value)}
                      disabled={!assessment?.ready}
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="collection-location">{t.location}</Label>
                  <Input
                    id="collection-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={!assessment?.ready}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button disabled={!canConfirm} onClick={handleConfirm}>
                    {t.confirm}
                  </Button>
                  {justRecordedCount != null ? (
                    <Button variant="outline" onClick={resetForNextDonor}>
                      {t.reset}
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}
