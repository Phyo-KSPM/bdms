"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  addDonationRecord,
  BloodBagStatusSchema,
  DonationTypeSchema,
  getNextDonationIdPreview,
  canDonateNow,
  deleteDonationRecord,
  getLastDonation,
  listDonationsByDonor,
  listDonors,
  type DonationRecord,
  type Donor,
  type TtiScreening,
} from "@/lib/donor-store"

function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function Page() {
  const { locale } = useLocale()
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
  const [bpS, setBpS] = useState<string>("")
  const [bpD, setBpD] = useState<string>("")
  const [hb, setHb] = useState<string>("")
  const [weightKg, setWeightKg] = useState<string>("")
  const [bloodBagStatus, setBloodBagStatus] = useState<string>("pending_testing")
  const [tti, setTti] = useState<TtiScreening>({
    hiv: "pending",
    hepB: "pending",
    hepC: "pending",
    syphilis: "pending",
  })
  const [receivedBy, setReceivedBy] = useState<string>("")
  const [collectedBy, setCollectedBy] = useState<string>("")
  const [adverseReactions, setAdverseReactions] = useState<string>("")
  const [note, setNote] = useState("")
  const [records, setRecords] = useState<DonationRecord[]>([])

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
        bloodBagStatus: "Blood bag status",
        adverseReactions: "Adverse reactions",
        bpSys: "BP (sys)",
        bpDia: "BP (dia)",
        hb: "Hb",
        weightKg: "Weight (kg)",
        receivedBy: "Received by",
        collectedBy: "Collected by",
        tti: "TTI screening results",
        note: "Note (optional)",
        save: "Save donation record",
        refresh: "Refresh",
        selectDonorHint: "Search and select a donor by Donor ID.",
        noRecords: "No records yet.",
        statusEligible: "Eligible to donate",
        statusCooldown: "Cooldown (56 days)",
        lastDonation: "Last donation",
        nextEligible: "Next eligible",
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
      bloodBagStatus: "သွေးအိတ် အခြေအနေ",
      adverseReactions: "ဘေးထွက်ဆိုးကျိုး",
      bpSys: "သွေးပေါင် (အပေါ်)",
      bpDia: "သွေးပေါင် (အောက်)",
      hb: "သွေးအား (Hb)",
      weightKg: "အလေးချိန် (kg)",
      receivedBy: "လက်ခံသူ",
      collectedBy: "ဖောက်ယူသူ",
      tti: "TTI စစ်ဆေးချက်",
      note: "မှတ်ချက် (optional)",
      save: "သိမ်းမယ်",
      refresh: "Refresh",
      selectDonorHint: "",
      noRecords: "မှတ်တမ်း မရှိသေးပါ။",
      statusEligible: "လှူနိုင်ပါပြီ",
      statusCooldown: "Cooldown (56 days)",
      lastDonation: "နောက်ဆုံးလှူခဲ့သည့်ရက်",
      nextEligible: "နောက်တစ်ကြိမ် လှူနိုင်မည့်ရက်",
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

  const bloodBagStatusLabel = useMemo(() => {
    return locale === "en"
      ? {
          pending_testing: "Pending testing",
          ready_to_use: "Ready to use",
          discarded: "Discarded",
        }
      : {
          pending_testing: "စစ်ဆေးရန် စောင့်ဆိုင်း",
          ready_to_use: "အသုံးပြုရန် အဆင်သင့်",
          discarded: "ဖျက်သိမ်း",
        }
  }, [locale])

  const ttiResultLabel = useMemo(() => {
    return locale === "en"
      ? { pending: "Pending", negative: "Negative", positive: "Positive" }
      : { pending: "စောင့်ဆိုင်း", negative: "Negative", positive: "Positive" }
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

  const donorMatches = useMemo(() => {
    const q = donorQuery.trim().toLowerCase()
    if (!q) return []
    return donors
      .filter((d) => {
        const hay = [d.donorId, d.name, d.contactPhone, d.nrc]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)
  }, [donorQuery, donors])

  useEffect(() => {
    const q = donorQuery.trim().toLowerCase()
    if (!q) {
      setSelectedDonorId("")
      return
    }
    const exact = donors.find((d) => d.donorId.toLowerCase() === q)
    if (exact) {
      setSelectedDonorId(exact.id)
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

  return (
    <AuthedShell title={t.title}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.addTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Label>{t.donorId}</Label>
              <Input
                value={donorQuery}
                onChange={(e) => setDonorQuery(e.target.value)}
                placeholder={t.donorIdPlaceholder}
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
                <Label>{t.bloodBagStatus}</Label>
                <Select value={bloodBagStatus} onValueChange={(v) => setBloodBagStatus(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BloodBagStatusSchema.options.map((k) => (
                      <SelectItem key={k} value={k}>
                        {bloodBagStatusLabel[k] ?? k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="grid gap-3">
                <Label>{t.bpSys}</Label>
                <Input type="number" value={bpS} onChange={(e) => setBpS(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label>{t.bpDia}</Label>
                <Input type="number" value={bpD} onChange={(e) => setBpD(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label>{t.hb}</Label>
                <Input type="number" value={hb} onChange={(e) => setHb(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label>{t.weightKg}</Label>
                <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-3">
                <Label>{t.receivedBy}</Label>
                <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label>{t.collectedBy}</Label>
                <Input value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3">
              <Label>{t.tti}</Label>
              <div className="grid gap-3 sm:grid-cols-4">
                {(["hiv", "hepB", "hepC", "syphilis"] as const).map((k) => (
                  <div key={k} className="grid gap-3">
                    <Label className="text-xs uppercase text-muted-foreground">{k}</Label>
                    <Select
                      value={tti[k]}
                      onValueChange={(v) =>
                        setTti((prev) => ({ ...prev, [k]: (v as any) ?? "pending" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["pending", "negative", "positive"] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {ttiResultLabel[opt] ?? opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>{t.note}</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button
              disabled={!selectedDonorId || donors.length === 0}
              onClick={() => {
                if (!selectedDonorId) return
                addDonationRecord({
                  donorId: selectedDonorId,
                  donatedAt: new Date(donatedAt),
                  donationId: donationId.trim() ? donationId.trim() : undefined,
                  donationType: (donationType as any) ?? null,
                  volumeMl: volumeMl ? Number(volumeMl) : null,
                  location: location.trim(),
                  vitals: {
                    bpSystolic: bpS ? Number(bpS) : null,
                    bpDiastolic: bpD ? Number(bpD) : null,
                    hb: hb ? Number(hb) : null,
                    weightKg: weightKg ? Number(weightKg) : null,
                  },
                  bloodBagStatus: (bloodBagStatus as any) ?? "pending_testing",
                  tti,
                  receivedBy: receivedBy.trim(),
                  collectedBy: collectedBy.trim(),
                  adverseReactions: adverseReactions.trim(),
                  note: note.trim() ? note.trim() : undefined,
                })
                setNote("")
                setDonationId(getNextDonationIdPreview())
                refreshRecords(selectedDonorId)
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
                      <Button
                        variant="destructive"
                        onClick={() => {
                          deleteDonationRecord(r.id)
                          refreshRecords(selectedDonorId)
                        }}
                      >
                        Delete
                      </Button>
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

