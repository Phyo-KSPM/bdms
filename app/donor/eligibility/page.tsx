"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format, isAfter } from "date-fns"
import { AuthedShell } from "@/components/authed-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getLastDonation,
  getNextEligibleDate,
  listDonors,
  type Donor,
} from "@/lib/donor-store"

function toDateValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function Page() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [asOf, setAsOf] = useState<string>(() => toDateValue(new Date()))

  useEffect(() => {
    setDonors(listDonors())
  }, [])

  const now = useMemo(() => new Date(`${asOf}T00:00:00`), [asOf])

  const computed = useMemo(() => {
    return donors.map((d) => {
      const last = getLastDonation(d.id)
      const next = getNextEligibleDate(d.id)
      const eligible = !next ? true : !isAfter(next, now)
      return { donor: d, last, next, eligible }
    })
  }, [donors, now])

  return (
    <AuthedShell title="56 ရက် cooldown အသိပေးချက်">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eligibility overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label>As of date</Label>
            <Input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>

          {computed.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Donor မရှိသေးပါ။
            </div>
          ) : (
            <div className="space-y-2">
              {computed.map(({ donor, last, next, eligible }) => (
                <div
                  key={donor.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-[260px]">
                    <div className="font-medium">
                      {donor.name}{" "}
                      <span className="text-muted-foreground">
                        ({donor.bloodType})
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last:{" "}
                      {last ? format(new Date(last.donatedAt), "PPP") : "—"} • Next
                      eligible: {next ? format(next, "PPP") : "Now"}
                    </div>
                  </div>
                  <div
                    className={
                      eligible
                        ? "rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-700"
                        : "rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-700"
                    }
                  >
                    {eligible ? "Eligible" : "Cooldown"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AuthedShell>
  )
}

