"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { AuthedShell } from "@/components/authed-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getNextEligibleDate,
  listDonationsByDonor,
  listDonors,
  type DonationRecord,
  type Donor,
} from "@/lib/donor-store"

export default function Page() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("")
  const [records, setRecords] = useState<DonationRecord[]>([])

  useEffect(() => {
    const all = listDonors()
    setDonors(all)
    if (all[0]) setSelectedDonorId(all[0].id)
  }, [])

  useEffect(() => {
    if (!selectedDonorId) {
      setRecords([])
      return
    }
    setRecords(listDonationsByDonor(selectedDonorId))
  }, [selectedDonorId])

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

  return (
    <AuthedShell title="Donor သမိုင်းကြောင်း">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Donor ရွေးချယ်ရန်</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedDonorId}
              onValueChange={(value) => setSelectedDonorId(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Donor ရွေးချယ်ပါ" />
              </SelectTrigger>
              <SelectContent>
                {donors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.bloodType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {donor ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">{donor.name}</div>
                <div className="text-muted-foreground">Age: {donor.age}</div>
                <div className="text-muted-foreground">
                  Contact: {donor.contact}
                </div>
                <div className="mt-2 text-muted-foreground">
                  Next eligible:{" "}
                  {nextEligible ? format(nextEligible, "PPP") : "Now"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Donor မရှိသေးပါ။
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Donation history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!donor ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : sorted.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Donation record မရှိသေးပါ။
              </div>
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

