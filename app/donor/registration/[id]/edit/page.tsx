"use client"

import { useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

import {
  BloodTypeSchema,
  getDonorById,
  upsertDonor,
  type Donor,
} from "@/lib/donor-store"

export default function Page() {
  const params = useParams<{ id: string }>()
  const donorInternalId = params?.id
  const router = useRouter()
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Edit Donor",
        back: "Back",
        save: "Save",
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
        selectPlaceholder: "Select...",
        male: "Male",
        female: "Female",
        other: "Other",
      } as const
    }
    return {
      title: "Donor ပြင်ဆင်ရန်",
      back: "နောက်သို့",
      save: "သိမ်းမယ်",
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
      selectPlaceholder: "ရွေးချယ်ပါ",
      male: "ကျား",
      female: "မ",
      other: "အခြား",
    } as const
  }, [locale])

  const DonorFormSchema = useMemo(
    () =>
      z.object({
        nrc: z.string().optional(),
        name: z.string().min(1),
        age: z.coerce.number().int().min(16).max(80),
        bloodType: BloodTypeSchema,
        gender: z.enum(["male", "female", "other"]).nullable(),
        contactPhone: z.string().min(1),
        contactEmail: z.string().optional(),
        contactAddress: z.string().optional(),
        township: z.string().optional(),
        city: z.string().optional(),
        address: z.string().optional(),
      }),
    []
  )

  type DonorFormInput = z.input<typeof DonorFormSchema>
  type DonorFormValues = z.output<typeof DonorFormSchema>

  const form = useForm<DonorFormInput, unknown, DonorFormValues>({
    resolver: zodResolver(DonorFormSchema),
    defaultValues: {
      nrc: "",
      name: "",
      age: 18,
      bloodType: "O+",
      gender: null,
      contactPhone: "",
      contactEmail: "",
      contactAddress: "",
      township: "",
      city: "",
      address: "",
    },
  })

  const bloodTypes = useMemo(() => BloodTypeSchema.options, [])

  const donor: Donor | null = useMemo(() => {
    if (!donorInternalId) return null
    return getDonorById(donorInternalId)
  }, [donorInternalId])

  useEffect(() => {
    if (!donor) return
    form.reset({
      nrc: donor.nrc,
      name: donor.name,
      age: donor.age,
      bloodType: donor.bloodType,
      gender: donor.gender,
      contactPhone: donor.contactPhone,
      contactEmail: donor.contactEmail,
      contactAddress: donor.contactAddress,
      township: donor.township,
      city: donor.city,
      address: donor.address,
    })
  }, [donor, form])

  function onSubmit(values: DonorFormValues) {
    if (!donorInternalId) return
    const contact = [values.contactPhone, values.contactEmail, values.contactAddress]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" / ")
    upsertDonor({
      id: donorInternalId,
      contact,
      ...values,
    })
    router.push(`/donor/registration/${donorInternalId}`)
  }

  return (
    <AuthedShell title={t.title}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            {t.back}
          </Button>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t.donorId}</Label>
                    <Input value={donor.donorId} disabled className="font-mono" />
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.name}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nrc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.nrc}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.age}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={16}
                              max={80}
                              className="h-10"
                              value={
                                typeof field.value === "number" ||
                                typeof field.value === "string"
                                  ? field.value
                                  : ""
                              }
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bloodType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.bloodType}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t.selectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bloodTypes.map((bt) => (
                                <SelectItem key={bt} value={bt}>
                                  {bt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.gender}</FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) => field.onChange(v ? v : null)}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t.selectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">{t.male}</SelectItem>
                              <SelectItem value="female">{t.female}</SelectItem>
                              <SelectItem value="other">{t.other}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.phone}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.email}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.contactAddress}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="township"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.township}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.city}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.fullAddress}</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit">{t.save}</Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthedShell>
  )
}

