"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getDonorById, type Donor } from "@/lib/donor-store"

export default function Page() {
  const params = useParams<{ id: string }>()
  const donorInternalId = params?.id
  const router = useRouter()
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "View Donor",
        back: "Back",
        edit: "Edit",
        donorId: "Donor ID",
        name: "Name",
        nrc: "NRC",
        age: "Age",
        bloodType: "Blood type",
        gender: "Gender",
        phone: "Phone",
        email: "Email",
        contactAddress: "Address",
        township: "Township",
        city: "City",
        fullAddress: "Full address",
      } as const
    }
    return {
      title: "Donor ကြည့်မယ်",
      back: "နောက်သို့",
      edit: "ပြင်မယ်",
      donorId: "Donor ID",
      name: "အမည်",
      nrc: "မှတ်ပုံတင်နံပါတ် (NRC)",
      age: "အသက်",
      bloodType: "သွေးအမျိုးအစား",
      gender: "ကျား/မ",
      phone: "ဖုန်း",
      email: "အီးမေးလ်",
      contactAddress: "လိပ်စာ",
      township: "မြို့နယ်",
      city: "မြို့",
      fullAddress: "အသေးစိတ်လိပ်စာ",
    } as const
  }, [locale])

  const donor: Donor | null = useMemo(() => {
    if (!donorInternalId) return null
    return getDonorById(donorInternalId)
  }, [donorInternalId])

  return (
    <AuthedShell title={t.title}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            {t.back}
          </Button>
          {donorInternalId ? (
            <Button onClick={() => router.push(`/donor/registration/${donorInternalId}/edit`)}>
              {t.edit}
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {!donor ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-full max-w-md" />
                <Skeleton className="h-8 w-full max-w-sm" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>{t.donorId}</Label>
                  <Input value={donor.donorId} disabled className="font-mono" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t.name}</Label>
                    <Input value={donor.name} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.nrc}</Label>
                    <Input value={donor.nrc} disabled />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>{t.age}</Label>
                    <Input value={String(donor.age)} disabled className="h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.bloodType}</Label>
                    <Input value={donor.bloodType} disabled className="h-10" />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.gender}</Label>
                    <Input value={donor.gender ?? ""} disabled className="h-10" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t.phone}</Label>
                    <Input value={donor.contactPhone} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.email}</Label>
                    <Input value={donor.contactEmail} disabled />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>{t.contactAddress}</Label>
                  <Input value={donor.contactAddress} disabled />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t.township}</Label>
                    <Input value={donor.township} disabled />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.city}</Label>
                    <Input value={donor.city} disabled />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>{t.fullAddress}</Label>
                  <Textarea value={donor.address} disabled />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}

