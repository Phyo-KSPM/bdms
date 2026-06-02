"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { AuthedShell } from "@/components/authed-shell"
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
  listDonors,
  type Donor,
  getLastDonation,
} from "@/lib/donor-store"

export default function Page() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("")
  const [issuedAt, setIssuedAt] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  )
  const [certificateNo, setCertificateNo] = useState<string>("")

  useEffect(() => {
    const all = listDonors()
    setDonors(all)
    if (all[0]) setSelectedDonorId(all[0].id)
  }, [])

  const donor = useMemo(
    () => donors.find((d) => d.id === selectedDonorId) ?? null,
    [donors, selectedDonorId]
  )

  const lastDonation = useMemo(() => {
    if (!selectedDonorId) return null
    return getLastDonation(selectedDonorId)
  }, [selectedDonorId])

  return (
    <AuthedShell title="Donor Card / Certificate">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Donor</Label>
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
            </div>

            <div className="grid gap-2">
              <Label>Issued at</Label>
              <Input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Certificate No (optional)</Label>
              <Input
                value={certificateNo}
                onChange={(e) => setCertificateNo(e.target.value)}
                placeholder="ဥပမာ - BDMS-000123"
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => window.print()}
              disabled={!donor}
            >
              Print
            </Button>

            <div className="text-sm text-muted-foreground">
              Hint: Print dialog မှ “Save as PDF” ကိုရွေးပြီး certificate ကို PDF ထုတ်ယူနိုင်ပါတယ်။
            </div>
          </CardContent>
        </Card>

        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background p-6 print:border-0 print:p-0">
              <div className="text-center">
                <div className="text-xl font-semibold">BDMS Inc</div>
                <div className="text-sm text-muted-foreground">
                  Blood Donation Management System
                </div>
              </div>

              <div className="mt-6 text-center text-2xl font-bold">
                Donor Certificate
              </div>

              <div className="mt-6 grid gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Issued at:</span>{" "}
                  <span className="font-medium">{issuedAt}</span>
                </div>
                {certificateNo.trim() ? (
                  <div>
                    <span className="text-muted-foreground">
                      Certificate No:
                    </span>{" "}
                    <span className="font-medium">{certificateNo}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 rounded-md border p-4">
                {donor ? (
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{donor.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Blood type: {donor.bloodType} • Age: {donor.age}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Contact: {donor.contact}
                    </div>
                    <div className="mt-3 text-sm">
                      Last donation:{" "}
                      <span className="font-medium">
                        {lastDonation
                          ? format(new Date(lastDonation.donatedAt), "PPP")
                          : "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Donor ရွေးချယ်ပါ။
                  </div>
                )}
              </div>

              <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
                <div className="text-center">
                  <div className="h-10 border-b" />
                  <div className="mt-2 text-muted-foreground">Donor signature</div>
                </div>
                <div className="text-center">
                  <div className="h-10 border-b" />
                  <div className="mt-2 text-muted-foreground">
                    Authorized signature
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                Generated by BDMS • This certificate is for record purpose.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}

