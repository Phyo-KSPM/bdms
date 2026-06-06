"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  filterDonorMatches,
  resolveDonorFromQuery,
} from "@/lib/donor-lookup"
import {
  getNextEligibleDate,
  listDonationsByDonor,
  listDonors,
  type DonationRecord,
  type Donor,
} from "@/lib/donor-store"

export default function Page() {
  const { locale } = useLocale()
  const donorInputRef = useRef<HTMLInputElement>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("")
  const [donorQuery, setDonorQuery] = useState<string>("")
  const [records, setRecords] = useState<DonationRecord[]>([])

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Donor History",
        selectTitle: "Find donor",
        donorId: "Donor ID",
        donorIdPlaceholder: "DNR-000123",
        donorNoDonors:
          "No donors found. Register a donor in Donor Registration first.",
        donorNotFound: "No donor matches this Donor ID.",
        matches: "Matches",
        historyTitle: "Donation history",
        noDonor: "Enter a Donor ID above.",
        noRecords: "No donation records yet.",
        age: "Age",
        contact: "Contact",
        nextEligible: "Next eligible",
        now: "Now",
      } as const
    }
    return {
      title: "Donor သမိုင်းကြောင်း",
      selectTitle: "Donor ရှာရန်",
      donorId: "Donor ID",
      donorIdPlaceholder: "DNR-000123",
      donorNoDonors:
        "Donor မရှိသေးပါ။ `Donor မှတ်ပုံတင်ခြင်း` မှာ အရင် register လုပ်ပါ။",
      donorNotFound: "ဒီ Donor ID နဲ့ Donor မတွေ့ပါ။",
      matches: "ကိုက်ညီမှုများ",
      historyTitle: "လှူဒါန်းမှတ်တမ်း",
      noDonor: "Donor ID ရိုက်ထည့်ပါ။",
      noRecords: "Donation record မရှိသေးပါ။",
      age: "အသက်",
      contact: "ဆက်သွယ်ရန်",
      nextEligible: "နောက်တစ်ကြိမ် လှူနိုင်မည့်ရက်",
      now: "ယခု",
    } as const
  }, [locale])

  useEffect(() => {
    setDonors(listDonors())
    donorInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!selectedDonorId) {
      setRecords([])
      return
    }
    setRecords(listDonationsByDonor(selectedDonorId))
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

  const donor = useMemo(
    () => donors.find((d) => d.id === selectedDonorId) ?? null,
    [donors, selectedDonorId]
  )

  const nextEligible = useMemo(() => {
    if (!selectedDonorId) return null
    return getNextEligibleDate(selectedDonorId)
  }, [selectedDonorId, records])

  const sorted = useMemo(() => {
    return records
      .slice()
      .sort(
        (a, b) =>
          new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime()
      )
  }, [records])

  const showNotFound =
    donorQuery.trim().length > 0 &&
    !donor &&
    donorMatches.length === 0

  function selectDonor(d: Donor) {
    setSelectedDonorId(d.id)
    setDonorQuery(d.donorId)
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

  return (
    <AuthedShell title={t.title}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t.selectTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <Label htmlFor="donor-id-lookup">{t.donorId}</Label>
              <Input
                ref={donorInputRef}
                id="donor-id-lookup"
                value={donorQuery}
                onChange={(e) => setDonorQuery(e.target.value)}
                onKeyDown={handleDonorKeyDown}
                placeholder={t.donorIdPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {donors.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t.donorNoDonors}
              </div>
            ) : null}

            {showNotFound ? (
              <div className="text-sm text-muted-foreground">
                {t.donorNotFound}
              </div>
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
                </div>
                <div className="font-medium">{donor.name}</div>
                <div className="text-muted-foreground">
                  {t.age}: {donor.age}
                </div>
                <div className="text-muted-foreground">
                  {t.contact}: {donor.contact}
                </div>
                <div className="mt-2 text-muted-foreground">
                  {t.nextEligible}:{" "}
                  {nextEligible ? format(nextEligible, "PPP") : t.now}
                </div>
              </div>
            ) : donors.length > 0 && !donorQuery.trim() ? (
              <div className="text-sm text-muted-foreground">{t.noDonor}</div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t.historyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!donor ? (
              <div className="text-sm text-muted-foreground">{t.noDonor}</div>
            ) : sorted.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t.noRecords}</div>
            ) : (
              <div className="space-y-2">
                {sorted.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="font-medium">
                      {format(new Date(r.donatedAt), "PPP p")}
                    </div>
                    {r.note ? (
                      <div className="text-sm text-muted-foreground">
                        {r.note}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}

