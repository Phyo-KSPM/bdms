"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Trash2Icon } from "lucide-react"
import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { readAuthSession } from "@/lib/auth"
import {
  filterDonorMatches,
  resolveDonorFromQuery,
} from "@/lib/donor-lookup"
import {
  addDonationRecord,
  DonationTypeSchema,
  getNextDonationIdPreview,
  getPassedScreeningForDonor,
  canDonateNow,
  deleteDonationRecord,
  getLastDonation,
  listDonationsByDonor,
  listDonors,
  type DonationRecord,
  type Donor,
} from "@/lib/donor-store"
import { PermissionDeniedError } from "@/lib/permissions"

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function Page() {
  const { locale } = useLocale()
  const { canDeleteDonations, canWriteDonations } = usePermissions()
  const donorInputRef = useRef<HTMLInputElement>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("")
  const [donorQuery, setDonorQuery] = useState<string>("")
  const [donationId, setDonationId] = useState<string>("")
  const [donatedAt, setDonatedAt] = useState<string>(() =>
    toDateTimeLocalValue(new Date())
  )
  const [donationType, setDonationType] = useState<string>("whole_blood")
  const [volumeMl, setVolumeMl] = useState<string>("450")
  const [location, setLocation] = useState<string>("")
  const [collectedBy, setCollectedBy] = useState<string>("")
  const [screeningTick, setScreeningTick] = useState(0)
  const [adverseReactions, setAdverseReactions] = useState<string>("")
  const [note, setNote] = useState("")
  const [records, setRecords] = useState<DonationRecord[]>([])
  const [pendingDeleteRecord, setPendingDeleteRecord] =
    useState<DonationRecord | null>(null)

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Donation Records",
        addTitle: "Add donation record",
        listTitle: "Donation history",
        donorId: "Donor ID",
        donorIdPlaceholder: "DNR-000123",
        donorNoDonors:
          "No donors found. Register a donor in Donor Registration first.",
        matches: "Matches",
        donatedAt: "Donation date & time",
        donationId: "Donation ID (Bag/Barcode)",
        donationIdPlaceholder: "e.g. BAG-000001 / barcode",
        donationType: "Donation type",
        volumeMl: "Volume (ml)",
        location: "Location / Camp",
        adverseReactions: "Adverse reactions",
        collectedBy: "Collected by",
        note: "Note (optional)",
        save: "Record blood collection",
        refresh: "Refresh",
        selectDonorHint: "Search and select a donor by Donor ID.",
        noRecords: "No records yet.",
        statusEligible: "Eligible to donate",
        statusCooldown: "Cooldown (56 days)",
        lastDonation: "Last donation",
        nextEligible: "Next eligible",
        screeningPassed: "Pre-donation screening passed (today)",
        screeningRequired:
          "Complete pre-donation screening before collecting blood.",
        screeningExpired:
          "Screening pass must be from today. Re-screen the donor first.",
        goCollection: "Use Blood Collection (EID scan)",
        goScreening: "Go to screening",
        workflowHint:
          "Workflow: Register → Screen (pass) → Collect blood into bag",
        viewInventory: "View all blood bags",
        delete: "Delete",
        deleteTitle: "Delete donation record?",
        deleteDesc:
          "This will permanently remove this blood collection record. This action cannot be undone.",
        cancel: "Cancel",
        permissionDenied:
          "You do not have permission to delete donation records.",
      } as const
    }
    return {
      title: "လှူဒါန်းမှတ်တမ်း",
      addTitle: "လှူဒါန်းမှတ်တမ်း ထည့်သွင်းရန်",
      listTitle: "Donor လှူဒါန်းမှတ်တမ်း",
      donorId: "Donor ID",
      donorIdPlaceholder: "DNR-000123",
      donorNoDonors:
        "Donor မရှိသေးပါ။ `Donor မှတ်ပုံတင်ခြင်း` မှာ အရင် register လုပ်ပါ။",
      matches: "ကိုက်ညီမှုများ",
      donatedAt: "လှူဒါန်းသည့် အချိန်",
      donationId: "Donation ID (သွေးအိတ်/Barcode)",
      donationIdPlaceholder: "ဥပမာ - BAG-000001 / barcode",
      donationType: "လှူဒါန်းမှု အမျိုးအစား",
      volumeMl: "ပမာဏ (ml)",
      location: "နေရာ / စခန်း",
      adverseReactions: "ဘေးထွက်ဆိုးကျိုး",
      collectedBy: "ဖောက်ယူသူ",
      note: "မှတ်ချက် (optional)",
      save: "သွေးအိတ် ကောက်ယူမှု မှတ်တမ်းတင်",
      refresh: "Refresh",
      selectDonorHint: "",
      noRecords: "မှတ်တမ်း မရှိသေးပါ။",
      statusEligible: "လှူနိုင်ပါပြီ",
      statusCooldown: "Cooldown (56 days)",
      lastDonation: "နောက်ဆုံးလှူခဲ့သည့်ရက်",
      nextEligible: "နောက်တစ်ကြိမ် လှူနိုင်မည့်ရက်",
      screeningPassed: "လှူဒါန်းမီ screening Pass (ယနေ့)",
      screeningRequired:
        "သွေးမကောက်မီ screening ပြီးမြောက်ရန် လိုအပ်ပါသည်။",
      screeningExpired:
        "ယနေ့ screening Pass လိုအပ်ပါသည်။ Donor ကို ပြန်စစ်ဆေးပါ။",
      goCollection: "သွေးကောက်ယူမှု (EID scan)",
      goScreening: "စစ်ဆေးရန် သွားမည်",
      workflowHint:
        "အဆင့်များ: မှတ်ပုံတင် → စစ်ဆေး (Pass) → သွေးအိတ်ထဲ ကောက်ယူ",
      viewInventory: "သွေးအိတ် စတော့ ကြည့်ရန်",
      delete: "ဖျက်မယ်",
      deleteTitle: "လှူဒါန်းမှတ်တမ်း ဖျက်မလား?",
      deleteDesc:
        "သွေးအိတ် ကောက်ယူမှု မှတ်တမ်းကို အပြီးဖျက်ပါမည်။ ပြန်မရနိုင်ပါ။",
      cancel: "မလုပ်တော့",
      permissionDenied: "လှူဒါန်းမှတ်တမ်း ဖျက်ခွင့် မရှိပါ။",
    } as const
  }, [locale])

  const donationTypeLabel = useMemo(() => {
    return locale === "en"
      ? {
          whole_blood: "Whole blood",
          platelets: "Platelets",
          plasma: "Plasma",
          double_red_cells: "Double red cells",
        }
      : {
          whole_blood: "သွေးရိုးရိုး",
          platelets: "သွေးဥမွှား",
          plasma: "ပလားစမာ",
          double_red_cells: "RBC နှစ်ဆ",
        }
  }, [locale])

  function refreshDonors() {
    const all = listDonors()
    setDonors(all)
  }

  function refreshRecords(donorId: string) {
    setRecords(listDonationsByDonor(donorId))
  }

  useEffect(() => {
    refreshDonors()
    donorInputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!donationId) setDonationId(getNextDonationIdPreview())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedDonorId) {
      setRecords([])
      return
    }
    refreshRecords(selectedDonorId)
  }, [selectedDonorId])

  const donorMatches = useMemo(
    () => filterDonorMatches(donors, donorQuery),
    [donorQuery, donors]
  )

  useEffect(() => {
    const exact = resolveDonorFromQuery(donors, donorQuery)
    if (exact) {
      setSelectedDonorId(exact.id)
      return
    }
    if (!donorQuery.trim()) {
      setSelectedDonorId("")
    }
  }, [donorQuery, donors])

  const selectedDonor = useMemo(
    () => donors.find((d) => d.id === selectedDonorId) ?? null,
    [donors, selectedDonorId]
  )

  const lastDonation = useMemo(() => {
    if (!selectedDonorId) return null
    return getLastDonation(selectedDonorId)
  }, [selectedDonorId, records])

  const eligibleNow = useMemo(() => {
    if (!selectedDonorId) return false
    return canDonateNow(selectedDonorId)
  }, [selectedDonorId, records])

  const referenceDate = useMemo(
    () => (donatedAt ? new Date(donatedAt) : new Date()),
    [donatedAt]
  )

  const passedScreening = useMemo(() => {
    void screeningTick
    if (!selectedDonorId) return null
    return getPassedScreeningForDonor(selectedDonorId, {
      sameDayOnly: true,
      referenceDate,
    })
  }, [selectedDonorId, screeningTick, referenceDate])

  const passedScreeningAnyDay = useMemo(() => {
    void screeningTick
    if (!selectedDonorId) return null
    return getPassedScreeningForDonor(selectedDonorId)
  }, [selectedDonorId, screeningTick])

  const screeningExpired =
    passedScreeningAnyDay != null && passedScreening == null

  const canCollectBlood =
    canWriteDonations &&
    !!selectedDonorId &&
    eligibleNow &&
    passedScreening != null

  function selectDonor(d: Donor) {
    setSelectedDonorId(d.id)
    setDonorQuery(d.eid ?? d.donorId)
  }

  function handleDonorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    const exact = resolveDonorFromQuery(donors, donorQuery)
    if (exact) {
      selectDonor(exact)
      return
    }
    if (donorMatches.length === 1) {
      selectDonor(donorMatches[0])
    }
  }

  function confirmDeleteRecord() {
    if (!pendingDeleteRecord || !selectedDonorId) return
    try {
      deleteDonationRecord(pendingDeleteRecord.id)
      setPendingDeleteRecord(null)
      refreshRecords(selectedDonorId)
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
        setPendingDeleteRecord(null)
      } else {
        throw err
      }
    }
  }

  return (
    <AuthedShell title={t.title}>
      <AlertDialog
        open={pendingDeleteRecord != null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRecord(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteDesc}{" "}
              {pendingDeleteRecord ? (
                <span className="font-medium text-foreground">
                  ({pendingDeleteRecord.donationId})
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteRecord}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href="/donor/collection">
          <Button variant="default">{t.goCollection}</Button>
        </Link>
        <Link href="/inventory">
          <Button variant="outline">{t.viewInventory}</Button>
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.addTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.workflowHint}</p>

            <div className="grid gap-3">
              <Label>{t.donorId}</Label>
              <Input
                ref={donorInputRef}
                value={donorQuery}
                onChange={(e) => setDonorQuery(e.target.value)}
                onKeyDown={handleDonorKeyDown}
                placeholder={t.donorIdPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
              {donors.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {t.donorNoDonors}
                </div>
              ) : null}
              {donorMatches.length > 0 && !selectedDonor ? (
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
                        onClick={() => {
                          setSelectedDonorId(d.id)
                          setDonorQuery(d.donorId)
                        }}
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
            </div>

            {selectedDonor ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {selectedDonor.name}{" "}
                  <span className="text-muted-foreground">
                    ({selectedDonor.bloodType})
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Contact: {selectedDonor.contact}
                </div>
                <div className="mt-2 text-muted-foreground">
                  {t.lastDonation}:{" "}
                  {lastDonation
                    ? format(new Date(lastDonation.donatedAt), "PPP p")
                    : "—"}
                </div>
                <div className="mt-1">
                  Status:{" "}
                  <span className={eligibleNow ? "text-emerald-600" : "text-amber-600"}>
                    {eligibleNow ? t.statusEligible : t.statusCooldown}
                  </span>
                </div>
                <div className="mt-2">
                  {passedScreening ? (
                    <span className="text-emerald-600">{t.screeningPassed}</span>
                  ) : screeningExpired ? (
                    <div className="space-y-2">
                      <span className="text-amber-600">{t.screeningExpired}</span>
                      <Link href="/testing-screening">
                        <Button size="sm" variant="outline">
                          {t.goScreening}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-amber-600">{t.screeningRequired}</span>
                      <Link href="/testing-screening">
                        <Button size="sm" variant="outline">
                          {t.goScreening}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              <Label>{t.donationId}</Label>
              <Input
                value={donationId}
                onChange={(e) => setDonationId(e.target.value)}
                placeholder={t.donationIdPlaceholder}
              />
            </div>

            <div className="grid gap-3">
              <Label>{t.donatedAt}</Label>
              <Input
                type="datetime-local"
                value={donatedAt}
                onChange={(e) => setDonatedAt(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-3">
                <Label>{t.donationType}</Label>
                <Select value={donationType} onValueChange={(v) => setDonationType(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DonationTypeSchema.options.map((k) => (
                      <SelectItem key={k} value={k}>
                        {donationTypeLabel[k] ?? k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label>{t.volumeMl}</Label>
                <Input
                  type="number"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(e.target.value)}
                  placeholder="450"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <Label>{t.location}</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Yangon General Hospital / Mobile Camp"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-3">
                <Label>{t.collectedBy}</Label>
                <Input value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label>{t.adverseReactions}</Label>
                <Input
                  value={adverseReactions}
                  onChange={(e) => setAdverseReactions(e.target.value)}
                  placeholder="e.g. dizziness / none"
                />
              </div>
            </div>

            <div className="grid gap-3">
              <Label>{t.note}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button
              disabled={!canCollectBlood || donors.length === 0}
              onClick={() => {
                if (!selectedDonorId || !passedScreening) return
                try {
                  const session = readAuthSession()
                  addDonationRecord({
                    donorId: selectedDonorId,
                    donatedAt: new Date(donatedAt),
                    donationId: donationId.trim() ? donationId.trim() : undefined,
                    donationType: (donationType as any) ?? null,
                    volumeMl: volumeMl ? Number(volumeMl) : null,
                    location: location.trim(),
                    collectedBy: collectedBy.trim() || session?.displayName || "",
                    adverseReactions: adverseReactions.trim(),
                    note: note.trim() ? note.trim() : undefined,
                    screeningVisitId: passedScreening.id,
                    requireEid: false,
                  })
                  setNote("")
                  setDonationId(getNextDonationIdPreview())
                  setScreeningTick((n) => n + 1)
                  refreshRecords(selectedDonorId)
                } catch (err) {
                  if (err instanceof PermissionDeniedError) {
                    toast.error(t.permissionDenied)
                  } else if (err instanceof Error) {
                    if (err.message === "SCREENING_REQUIRED") {
                      toast.error(t.screeningRequired)
                    } else if (err.message === "SCREENING_EXPIRED") {
                      toast.error(t.screeningExpired)
                    } else {
                      toast.error(err.message)
                    }
                  }
                }
              }}
            >
              {t.save}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.listTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedDonorId ? (
              <div className="text-sm text-muted-foreground" />
            ) : records.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t.noRecords}
              </div>
            ) : (
              <div className="space-y-2">
                {records
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.donatedAt).getTime() -
                      new Date(a.donatedAt).getTime()
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="min-w-[220px]">
                        <div className="font-medium">
                          {r.donationId} • {format(new Date(r.donatedAt), "PPP p")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {r.donationType ?? "—"} • {r.bloodBagStatus} • Next eligible:{" "}
                          {format(new Date(r.nextEligibleDate), "PPP")}
                        </div>
                        {r.note ? (
                          <div className="text-sm text-muted-foreground">
                            {r.note}
                          </div>
                        ) : null}
                      </div>
                      {canDeleteDonations ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t.delete}
                          onClick={() => setPendingDeleteRecord(r)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => {
                refreshDonors()
                if (selectedDonorId) refreshRecords(selectedDonorId)
              }}
            >
              {t.refresh}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}

