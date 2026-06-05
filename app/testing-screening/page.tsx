"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import {
  FlaskConicalIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import { formatWeightDual, kgToLb } from "@/lib/weight"
import {
  deriveScreeningStatus,
  evaluateVitalsEligibility,
  getDonorById,
  getTestingStats,
  isTtiComplete,
  listScreeningVisits,
  TTI_MARKERS,
  updateScreeningVisit,
  type ScreeningVisit,
  type ScreeningVitals,
  type TtiMarker,
  type TtiScreening,
} from "@/lib/donor-store"

type StatusFilter = "all" | "pending" | "passed" | "deferred"

export default function Page() {
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Testing & Screening",
        subtitle:
          "Screen donors before blood collection — registration → screening → donation",
        statPending: "Awaiting screening",
        statPassed: "Cleared to donate",
        statDeferred: "Deferred",
        reactiveDonors: "Reactive (TTI +ve)",
        queueTitle: "Screening queue",
        queueSub:
          "Record vitals and TTI results. Only passed donors can proceed to donation.",
        search: "Search by donor ID / name...",
        filterAll: "All statuses",
        colDonor: "Donor",
        colRegistered: "Registered",
        colVitals: "Vitals",
        colTti: "TTI",
        colStatus: "Status",
        colAction: "Action",
        screen: "Screen donor",
        review: "Review",
        noQueue: "No donors in the screening queue.",
        pending: "Awaiting screening",
        passed: "Cleared to donate",
        deferred: "Deferred",
        dialogTitle: "Pre-donation screening",
        dialogDesc:
          "Complete vitals and TTI before the donor can donate blood.",
        weightKg: "Weight (kg)",
        weightLbHint: (lb: number) => `≈ ${lb} lb`,
        bpSys: "BP (sys)",
        bpDia: "BP (dia)",
        pulse: "Pulse",
        hb: "Hb",
        hiv: "HIV",
        hepB: "Hepatitis B",
        hepC: "Hepatitis C",
        syphilis: "Syphilis",
        result_pending: "Pending",
        result_negative: "Negative (non-reactive)",
        result_positive: "Positive (reactive)",
        screenedBy: "Screened by",
        note: "Note (optional)",
        derivedStatus: "Screening result",
        incompleteHint:
          "Complete all vitals and TTI markers to finalize screening.",
        markAll: "Mark all TTI negative",
        vitalsFail: "Vitals do not meet donation criteria.",
        cancel: "Cancel",
        save: "Save screening",
        saved: "Screening results saved.",
        goDonate: "Proceed to donation",
      } as const
    }
    return {
      title: "စစ်ဆေးမှု နှင့် စကရင်းနင်း",
      subtitle:
        "သွေးမကောက်မီ donor ကို စစ်ဆေးပါ — မှတ်ပုံတင် → စစ်ဆေး → လှူဒါန်း",
      statPending: "စစ်ဆေးရန် စောင့်ဆိုင်း",
      statPassed: "လှူနိုင်ပြီ",
      statDeferred: "ရွှေ့ဆိုင်း",
      reactiveDonors: "ပြန်ပြု TTI +ve",
      queueTitle: "စစ်ဆေးရန် စာရင်း",
      queueSub:
        "Vitals နှင့် TTI ရလဒ်များ မှတ်တမ်းတင်ပါ။ Pass ဖြစ်မှသာ လှူဒါန်းနိုင်ပါမည်။",
      search: "Donor ID / အမည်ဖြင့် ရှာရန်...",
      filterAll: "အခြေအနေ အားလုံး",
      colDonor: "Donor",
      colRegistered: "မှတ်ပုံတင်သည့်နေ့",
      colVitals: "Vitals",
      colTti: "TTI",
      colStatus: "အခြေအနေ",
      colAction: "လုပ်ဆောင်ချက်",
      screen: "စစ်ဆေးမည်",
      review: "ပြန်ကြည့်",
      noQueue: "စစ်ဆေးရန် donor မရှိသေးပါ။",
      pending: "စစ်ဆေးဆဲ",
      passed: "လှူနိုင်ပြီ",
      deferred: "ရွှေ့ဆိုင်း",
      dialogTitle: "လှူဒါန်းမီ စစ်ဆေးမှု",
      dialogDesc:
        "သွေးမကောက်မီ vitals နှင့် TTI ကို ဖြည့်ပါ။ Pass ဖြစ်မှသာ လှူဒါန်းခွင့်ပြုပါမည်။",
      weightKg: "အလေးချိန် (kg)",
      weightLbHint: (lb: number) => `≈ ${lb} lb ပေါင်`,
      bpSys: "သွေးပေါင် (အပေါ်)",
      bpDia: "သွေးပေါင် (အောက်)",
      pulse: "သွေးခုန်နှုန်း",
      hb: "သွေးအား (Hb)",
      hiv: "HIV",
      hepB: "အသည်းရောင် B",
      hepC: "အသည်းရောင် C",
      syphilis: "ဆစ်ဖလစ်",
      result_pending: "စောင့်ဆိုင်း",
      result_negative: "Negative (ပိုးမတွေ့)",
      result_positive: "Positive (ပိုးတွေ့)",
      screenedBy: "စစ်ဆေးသူ",
      note: "မှတ်ချက် (optional)",
      derivedStatus: "စစ်ဆေးမှု ရလဒ်",
      incompleteHint:
        "Vitals နှင့် TTI marker အားလုံး ဖြည့်မှ အပြီးသတ်နိုင်ပါမည်။",
      markAll: "TTI အားလုံး Negative",
      vitalsFail: "Vitals သည် လှူဒါန်းရန် သတ်မှတ်ချက်နှင့် မကိုက်ညီပါ။",
      cancel: "ပယ်ဖျက်",
      save: "စစ်ဆေးမှု သိမ်းမည်",
      saved: "စစ်ဆေးမှု ရလဒ်များ သိမ်းပြီးပါပြီ။",
      goDonate: "လှူဒါန်းရန် ဆက်လုပ်မည်",
    } as const
  }, [locale])

  const markerLabel: Record<TtiMarker, string> = {
    hiv: t.hiv,
    hepB: t.hepB,
    hepC: t.hepC,
    syphilis: t.syphilis,
  }

  const statusLabel: Record<ScreeningVisit["status"], string> = {
    pending: t.pending,
    passed: t.passed,
    deferred: t.deferred,
  }

  const resultLabel = {
    pending: t.result_pending,
    negative: t.result_negative,
    positive: t.result_positive,
  } as const

  const [visits, setVisits] = useState<ScreeningVisit[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("pending")

  const [activeId, setActiveId] = useState<string | null>(null)
  const [draftVitals, setDraftVitals] = useState<ScreeningVitals>({
    weightKg: null,
    bpSystolic: null,
    bpDiastolic: null,
    pulse: null,
    hb: null,
  })
  const [draftTti, setDraftTti] = useState<TtiScreening>({
    hiv: "pending",
    hepB: "pending",
    hepC: "pending",
    syphilis: "pending",
  })
  const [screenedBy, setScreenedBy] = useState("")
  const [note, setNote] = useState("")

  function refresh() {
    setVisits(listScreeningVisits())
  }

  useEffect(() => {
    refresh()
  }, [])

  const stats = useMemo(() => {
    void visits
    return getTestingStats()
  }, [visits])

  const donorNameById = useMemo(() => {
    const map = new Map<
      string,
      { name: string; donorId: string; bloodType: string }
    >()
    for (const v of visits) {
      if (map.has(v.donorId)) continue
      const donor = getDonorById(v.donorId)
      if (donor) {
        map.set(v.donorId, {
          name: donor.name,
          donorId: donor.donorId,
          bloodType: donor.bloodType,
        })
      }
    }
    return map
  }, [visits])

  const visibleVisits = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visits.filter((v) => {
      if (filter !== "all" && v.status !== filter) return false
      if (!q) return true
      const donor = donorNameById.get(v.donorId)
      const hay = [donor?.name, donor?.donorId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [visits, search, filter, donorNameById])

  const activeVisit = useMemo(
    () => visits.find((v) => v.id === activeId) ?? null,
    [visits, activeId]
  )

  const activeDonor = useMemo(
    () => (activeVisit ? getDonorById(activeVisit.donorId) : null),
    [activeVisit]
  )

  const derivedStatus = useMemo(
    () => deriveScreeningStatus(draftVitals, draftTti, activeDonor),
    [draftVitals, draftTti, activeDonor]
  )

  const vitalsCheck = useMemo(
    () => evaluateVitalsEligibility(draftVitals, activeDonor),
    [draftVitals, activeDonor]
  )

  function openDialog(visit: ScreeningVisit) {
    setActiveId(visit.id)
    setDraftVitals({ ...visit.vitals })
    setDraftTti({ ...visit.tti })
    setScreenedBy(visit.screenedBy ?? "")
    setNote(visit.note ?? "")
  }

  function closeDialog() {
    setActiveId(null)
  }

  function handleSave() {
    if (!activeId) return
    updateScreeningVisit(activeId, {
      vitals: draftVitals,
      tti: draftTti,
      screenedBy: screenedBy.trim(),
      note: note.trim(),
      autoStatus: true,
    })
    refresh()
    closeDialog()
    toast.success(t.saved)
  }

  function ttiSummary(tti: TtiScreening) {
    const positive = TTI_MARKERS.filter((m) => tti[m] === "positive").length
    const negative = TTI_MARKERS.filter((m) => tti[m] === "negative").length
    return { positive, negative, complete: isTtiComplete(tti) }
  }

  function statusBadgeClass(status: ScreeningVisit["status"]) {
    switch (status) {
      case "passed":
        return "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
      case "deferred":
        return "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400"
      default:
        return "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
    }
  }

  function vitalsSummary(vitals: ScreeningVitals) {
    const parts = [
      vitals.weightKg != null ? formatWeightDual(vitals.weightKg) : null,
      vitals.hb != null ? `Hb ${vitals.hb}` : null,
      vitals.bpSystolic != null && vitals.bpDiastolic != null
        ? `${vitals.bpSystolic}/${vitals.bpDiastolic}`
        : null,
    ].filter(Boolean)
    return parts.length ? parts.join(" · ") : "—"
  }

  const statCards = [
    {
      key: "pending",
      label: t.statPending,
      value: stats.pending,
      icon: FlaskConicalIcon,
      accent: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      key: "passed",
      label: t.statPassed,
      value: stats.passed,
      icon: CheckCircle2Icon,
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "deferred",
      label: t.statDeferred,
      value: stats.deferred,
      icon: XCircleIcon,
      accent: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      key: "reactive",
      label: t.reactiveDonors,
      value: stats.reactive,
      icon: AlertTriangleIcon,
      accent: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
    },
  ] as const

  return (
    <AuthedShell title={t.title}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.key}>
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
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.queueTitle}</CardTitle>
            <CardDescription>{t.queueSub}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:max-w-sm"
              />
              <Select
                value={filter}
                onValueChange={(v) => setFilter((v as StatusFilter) ?? "all")}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.filterAll}</SelectItem>
                  <SelectItem value="pending">{t.pending}</SelectItem>
                  <SelectItem value="passed">{t.passed}</SelectItem>
                  <SelectItem value="deferred">{t.deferred}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.colDonor}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t.colRegistered}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t.colVitals}
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t.colTti}
                    </TableHead>
                    <TableHead>{t.colStatus}</TableHead>
                    <TableHead className="text-right">{t.colAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleVisits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t.noQueue}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleVisits.map((v) => {
                      const donor = donorNameById.get(v.donorId)
                      const summary = ttiSummary(v.tti)
                      const isPending = v.status === "pending"
                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {donor?.name ?? "—"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {donor?.donorId ?? v.donorId}
                                {donor?.bloodType ? ` · ${donor.bloodType}` : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {format(new Date(v.createdAt), "PP")}
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                            {vitalsSummary(v.vitals)}
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
                              className={statusBadgeClass(v.status)}
                            >
                              {statusLabel[v.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant={isPending ? "default" : "outline"}
                                onClick={() => openDialog(v)}
                              >
                                {isPending ? t.screen : t.review}
                              </Button>
                              {v.status === "passed" && !v.linkedDonationId ? (
                                <Link href="/donor/donations">
                                  <Button size="sm" variant="secondary">
                                    {t.goDonate}
                                  </Button>
                                </Link>
                              ) : null}
                            </div>
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

      <Dialog
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>
              {activeDonor ? (
                <span>
                  {activeDonor.name}{" "}
                  <span className="font-mono text-xs">
                    ({activeDonor.donorId})
                  </span>
                </span>
              ) : (
                t.dialogDesc
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["weightKg", t.weightKg],
                  ["hb", t.hb],
                  ["bpSystolic", t.bpSys],
                  ["bpDiastolic", t.bpDia],
                  ["pulse", t.pulse],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="grid gap-1.5">
                  <Label className="text-sm">{label}</Label>
                  <Input
                    type="number"
                    value={draftVitals[key] ?? ""}
                    onChange={(e) =>
                      setDraftVitals((prev) => ({
                        ...prev,
                        [key]: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                  {key === "weightKg" &&
                  draftVitals.weightKg != null &&
                  Number.isFinite(draftVitals.weightKg) ? (
                    <p className="text-xs text-muted-foreground">
                      {t.weightLbHint(kgToLb(draftVitals.weightKg))}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {!vitalsCheck.eligible &&
            draftVitals.weightKg != null &&
            draftVitals.hb != null ? (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {t.vitalsFail}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {TTI_MARKERS.map((m) => (
                <div key={m} className="grid gap-1.5">
                  <Label className="text-sm">{markerLabel[m]}</Label>
                  <Select
                    value={draftTti[m]}
                    onValueChange={(v) =>
                      setDraftTti((prev) => ({
                        ...prev,
                        [m]: (v as TtiScreening[TtiMarker]) ?? "pending",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        {resultLabel.pending}
                      </SelectItem>
                      <SelectItem value="negative">
                        {resultLabel.negative}
                      </SelectItem>
                      <SelectItem value="positive">
                        {resultLabel.positive}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraftTti({
                    hiv: "negative",
                    hepB: "negative",
                    hepC: "negative",
                    syphilis: "negative",
                  })
                }
              >
                {t.markAll}
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t.derivedStatus}:</span>
                <Badge
                  variant="secondary"
                  className={statusBadgeClass(derivedStatus)}
                >
                  {statusLabel[derivedStatus]}
                </Badge>
              </div>
            </div>

            {!isTtiComplete(draftTti) ? (
              <p className="text-xs text-muted-foreground">{t.incompleteHint}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-sm">{t.screenedBy}</Label>
                <Input
                  value={screenedBy}
                  onChange={(e) => setScreenedBy(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm">{t.note}</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthedShell>
  )
}
