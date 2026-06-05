"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { useLocale } from "@/components/i18n/locale-provider"
import { AuthedShell } from "@/components/authed-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Form } from "@/components/ui/form"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BloodTypeSchema,
  GenderSchema,
  DonationTypeSchema,
  getDonorById,
  getNextDonorIdPreview,
  upsertDonor,
  type Donor,
} from "@/lib/donor-store"
import { DemographicsStep } from "@/app/donor/registration/_components/steps/DemographicsStep"
import { ScreeningStep } from "@/app/donor/registration/_components/steps/ScreeningStep"
import { MedicalHistoryStep } from "@/app/donor/registration/_components/steps/MedicalHistoryStep"
import { DonationDetailsStep } from "@/app/donor/registration/_components/steps/DonationDetailsStep"

const WizardSchema = z.object({
  // Step 1
  name: z.string().min(1),
  age: z.coerce.number().int().min(16).max(80),
  bloodType: BloodTypeSchema,
  contactPhone: z.string().min(0),
  contactEmail: z.string().min(0),
  contactAddress: z.string().min(0),
  nrc: z.string().min(0),
  gender: GenderSchema.nullable(),
  address: z.string().min(0),
  township: z.string().min(0),
  city: z.string().min(0),
  // Step 2
  screening: z.object({
    weightKg: z.number().nullable(),
    bpSystolic: z.number().nullable(),
    bpDiastolic: z.number().nullable(),
    pulse: z.number().nullable(),
    hb: z.number().nullable(),
    lastDonationDate: z.string().datetime().nullable(),
  }),
  // Step 3
  medical: z.object({
    conditions: z.array(z.string()),
    infectiousFlags: z.array(z.string()),
    medications: z.string(),
    notes: z.string(),
  }),
  // Step 4
  donationDetails: z.object({
    donationType: DonationTypeSchema.nullable(),
    notes: z.string(),
  }),
})

type WizardInput = z.input<typeof WizardSchema>
type WizardValues = z.output<typeof WizardSchema>

const stepFieldNames: Array<Array<keyof WizardValues | string>> = [
  [
    "nrc",
    "name",
    "age",
    "bloodType",
    "gender",
    "contactPhone",
    "contactEmail",
    "contactAddress",
    "township",
    "city",
    "address",
  ],
  [
    "screening.weightKg",
    "screening.bpSystolic",
    "screening.bpDiastolic",
    "screening.pulse",
    "screening.hb",
    "screening.lastDonationDate",
  ],
  ["medical.conditions", "medical.infectiousFlags", "medical.medications", "medical.notes"],
  ["donationDetails.donationType", "donationDetails.notes"],
]

export function DonorWizard({
  mode,
  donorInternalId,
}: {
  mode: "new" | "edit"
  donorInternalId?: string
}) {
  const router = useRouter()
  const { locale } = useLocale()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        titleNew: "Register Donor",
        titleEdit: "Edit Donor",
        back: "Back to list",
        next: "Next",
        prev: "Back",
        save: "Save",
        step: (n: number) => `Step ${n}`,
        discardTitle: "Discard changes?",
        discardDesc: "You have unsaved changes. Are you sure you want to leave?",
        stay: "Stay",
        discard: "Discard",
        demographics: "Demographics",
        screening: "Screening & Vitals",
        medical: "Medical History",
        donation: "Donation Details",
      }
    }
    return {
      titleNew: "Donor အသစ်မှတ်ပုံတင်ရန်",
      titleEdit: "Donor ပြင်ဆင်ရန်",
      back: "စာရင်းသို့ ပြန်မယ်",
      next: "ရှေ့သို့",
      prev: "နောက်သို့",
      save: "သိမ်းမယ်",
      step: (n: number) => `အဆင့် ${n}`,
      discardTitle: "မသိမ်းဘဲ ထွက်မလား?",
      discardDesc: "မသိမ်းရသေးတဲ့ အချက်အလက်တွေ ရှိပါတယ်။ ထွက်မှာ သေချာလား?",
      stay: "မထွက်တော့ဘူး",
      discard: "ထွက်မယ်",
      demographics: "အခြေခံအချက်အလက်",
      screening: "စစ်ဆေးချက်များ",
      medical: "ဆေးဘက်ရာဇဝင်",
      donation: "လှူဒါန်းမှုအချက်အလက်",
    }
  }, [locale])

  const [isLoading, setIsLoading] = useState(mode === "edit")
  const [donor, setDonor] = useState<Donor | null>(null)
  const [donorId, setDonorId] = useState<string>("")
  const [step, setStep] = useState(0)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [pendingLeaveTo, setPendingLeaveTo] = useState<string | null>(null)

  const form = useForm<WizardInput, unknown, WizardValues>({
    resolver: zodResolver(WizardSchema),
    defaultValues: {
      name: "",
      age: 18,
      bloodType: "O+",
      contactPhone: "",
      contactEmail: "",
      contactAddress: "",
      nrc: "",
      gender: null,
      address: "",
      township: "",
      city: "",
      screening: {
        weightKg: null,
        bpSystolic: null,
        bpDiastolic: null,
        pulse: null,
        hb: null,
        lastDonationDate: null,
      },
      medical: {
        conditions: [],
        infectiousFlags: [],
        medications: "",
        notes: "",
      },
      donationDetails: {
        donationType: null,
        notes: "",
      },
    },
  })

  const bloodTypes = useMemo(() => BloodTypeSchema.options, [])

  const conditionOptions = useMemo(
    () =>
      locale === "en"
        ? [
            { key: "diabetes", label: "Diabetes" },
            { key: "hypertension", label: "Hypertension" },
            { key: "heart_disease", label: "Heart disease" },
          ]
        : [
            { key: "diabetes", label: "ဆီးချို" },
            { key: "hypertension", label: "သွေးတိုး" },
            { key: "heart_disease", label: "နှလုံးရောဂါ" },
          ],
    [locale]
  )

  const infectiousOptions = useMemo(
    () =>
      locale === "en"
        ? [
            { key: "hepatitis", label: "Hepatitis" },
            { key: "malaria", label: "Malaria" },
            { key: "hiv", label: "HIV" },
          ]
        : [
            { key: "hepatitis", label: "အသည်းရောင်" },
            { key: "malaria", label: "ငှက်ဖျား" },
            { key: "hiv", label: "HIV" },
          ],
    [locale]
  )

  const donationTypes = useMemo(
    () =>
      locale === "en"
        ? [
            { key: "whole_blood", label: "Whole blood" },
            { key: "platelets", label: "Platelets" },
            { key: "plasma", label: "Plasma" },
            { key: "double_red_cells", label: "Double red cells" },
          ]
        : [
            { key: "whole_blood", label: "သွေးရိုးရိုး" },
            { key: "platelets", label: "သွေးဥမွှား" },
            { key: "plasma", label: "ပလားစမာ" },
            { key: "double_red_cells", label: "RBC နှစ်ဆ" },
          ],
    [locale]
  )

  useEffect(() => {
    if (mode === "new") {
      setDonorId(getNextDonorIdPreview())
      setDonor(null)
      setIsLoading(false)
      return
    }

    if (!donorInternalId) {
      setIsLoading(false)
      setDonor(null)
      return
    }

    setIsLoading(true)
    const found = getDonorById(donorInternalId)
    setDonor(found)
    setDonorId(found?.donorId ?? "")
    if (found) {
      form.reset({
        name: found.name,
        age: found.age,
        bloodType: found.bloodType,
        contactPhone: found.contactPhone,
        contactEmail: found.contactEmail,
        contactAddress: found.contactAddress,
        nrc: found.nrc,
        gender: found.gender,
        address: found.address,
        township: found.township,
        city: found.city,
        screening: found.screening,
        medical: found.medical,
        donationDetails: found.donationDetails,
      })
    }
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, donorInternalId])

  function requestLeave(to: string) {
    if (form.formState.isDirty) {
      setPendingLeaveTo(to)
      setIsLeaveConfirmOpen(true)
      return
    }
    router.push(to)
  }

  async function nextStep() {
    const fields = stepFieldNames[step] ?? []
    const ok = await form.trigger(fields as any, { shouldFocus: true })
    if (!ok) return
    setStep((s) => Math.min(3, s + 1))
  }

  function prevStep() {
    setStep((s) => Math.max(0, s - 1))
  }

  async function onSave(values: WizardValues) {
    const contact = [values.contactPhone, values.contactEmail, values.contactAddress]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" / ")

    upsertDonor({
      id: mode === "edit" ? donorInternalId : undefined,
      contact,
      ...values,
    })
    router.push("/donor/registration")
  }

  const stepTitles = useMemo(
    () => [t.demographics, t.screening, t.medical, t.donation],
    [t]
  )

  return (
    <AuthedShell title={mode === "new" ? t.titleNew : t.titleEdit}>
      <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.discardDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.stay}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const to = pendingLeaveTo ?? "/donor/registration"
                setIsLeaveConfirmOpen(false)
                setPendingLeaveTo(null)
                router.push(to)
              }}
            >
              {t.discard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => requestLeave("/donor/registration")}
          >
            {t.back}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {locale === "en" ? "Donor ID" : "Donor ID"}
            </span>
            <span className="font-mono">{donorId}</span>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex w-full flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {mode === "new" ? t.titleNew : t.titleEdit}
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {t.step(step + 1)} / 4
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {stepTitles.map((label, idx) => {
                  const active = idx === step
                  const disabled = isLoading || (mode === "edit" && !donor)
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      onClick={() => setStep(idx)}
                      className="disabled:opacity-60"
                      aria-current={active ? "step" : undefined}
                    >
                      <Badge variant={active ? "default" : "outline"}>
                        {label}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-full max-w-md" />
                <Skeleton className="h-8 w-full max-w-sm" />
                <Skeleton className="h-8 w-full max-w-sm" />
              </div>
            ) : mode === "edit" && !donor ? (
              <div className="text-sm text-muted-foreground">
                {locale === "en" ? "Donor not found." : "Donor မတွေ့ပါ။"}
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
                  {step === 0 ? (
                    <DemographicsStep
                      control={form.control}
                      bloodTypes={bloodTypes}
                      t={{
                        nrc: locale === "en" ? "NRC" : "မှတ်ပုံတင်နံပါတ် (NRC)",
                        name: locale === "en" ? "Name" : "အမည်",
                        age: locale === "en" ? "Age" : "အသက်",
                        bloodType:
                          locale === "en" ? "Blood type" : "သွေးအမျိုးအစား",
                        gender: locale === "en" ? "Gender" : "ကျား/မ",
                        contact: locale === "en" ? "Contact" : "ဆက်သွယ်ရန်",
                        contactGroup: locale === "en" ? "Contact" : "ဆက်သွယ်ရန်",
                        phone: locale === "en" ? "Phone" : "ဖုန်း",
                        email: locale === "en" ? "Email" : "အီးမေးလ်",
                        contactAddress: locale === "en" ? "Other" : "အခြား (လိပ်စာ)",
                        township:
                          locale === "en" ? "Township/City" : "မြို့နယ်/မြို့",
                        city: locale === "en" ? "City" : "မြို့",
                        address: locale === "en" ? "Address" : "နေရပ်လိပ်စာ",
                        addressGroup: locale === "en" ? "Address" : "နေရပ်လိပ်စာ",
                        selectPlaceholder:
                          locale === "en" ? "Select..." : "ရွေးချယ်ပါ",
                        genderMale: locale === "en" ? "Male" : "ကျား",
                        genderFemale: locale === "en" ? "Female" : "မ",
                        genderOther: locale === "en" ? "Other" : "အခြား",
                        namePlaceholder:
                          locale === "en"
                            ? "e.g. Aung Aung"
                            : "ဥပမာ - Aung Aung",
                        phonePlaceholder:
                          locale === "en" ? "e.g. 09xxxxxxxx" : "ဥပမာ - 09xxxxxxxx",
                        emailPlaceholder:
                          locale === "en" ? "e.g. name@example.com" : "ဥပမာ - name@example.com",
                        contactAddressPlaceholder:
                          locale === "en" ? "e.g. emergency contact" : "ဥပမာ - အရေးပေါ်ဆက်သွယ်ရန်",
                        nrcPlaceholder:
                          locale === "en"
                            ? "e.g. 12/ABC(N)123456"
                            : "ဥပမာ - 12/ABC(N)123456",
                        townshipPlaceholder:
                          locale === "en" ? "e.g. Hlaing" : "ဥပမာ - လှိုင်",
                        cityPlaceholder:
                          locale === "en" ? "e.g. Yangon" : "ဥပမာ - ရန်ကုန်",
                        addressPlaceholder:
                          locale === "en"
                            ? "Street, ward, etc"
                            : "လမ်း/ရပ်ကွက် စသည်",
                      }}
                    />
                  ) : null}

                  {step === 1 ? (
                    <ScreeningStep
                      control={form.control}
                      t={{
                        weightKg:
                          locale === "en" ? "Weight (kg)" : "အလေးချိန် (kg)",
                        weightLbHint: (lb: number) =>
                          locale === "en"
                            ? `≈ ${lb} lb`
                            : `≈ ${lb} lb ပေါင်`,
                        bpSystolic:
                          locale === "en" ? "BP Systolic" : "သွေးပေါင် (အပေါ်)",
                        bpDiastolic:
                          locale === "en" ? "BP Diastolic" : "သွေးပေါင် (အောက်)",
                        pulse: locale === "en" ? "Pulse" : "သွေးခုန်နှုန်း",
                        hb:
                          locale === "en" ? "Hemoglobin (Hb)" : "သွေးအား (Hb)",
                        lastDonationDate:
                          locale === "en"
                            ? "Last donation date"
                            : "နောက်ဆုံးလှူခဲ့သည့်ရက်",
                        neverDonatedHint:
                          locale === "en"
                            ? "Leave empty if never donated."
                            : "မလှူဖူးသေးရင် မဖြည့်ပါ။",
                      }}
                    />
                  ) : null}

                  {step === 2 ? (
                    <MedicalHistoryStep
                      control={form.control}
                      conditions={conditionOptions}
                      infectious={infectiousOptions}
                      t={{
                        conditions: locale === "en" ? "Conditions" : "ရောဂါအခံ",
                        infectious:
                          locale === "en"
                            ? "Infectious diseases"
                            : "ကူးစက်ရောဂါများ",
                        medications:
                          locale === "en"
                            ? "Current medications"
                            : "လက်ရှိသောက်နေသော ဆေးဝါးများ",
                        notes: locale === "en" ? "Notes" : "မှတ်ချက်",
                      }}
                    />
                  ) : null}

                  {step === 3 ? (
                    <DonationDetailsStep
                      control={form.control}
                      donationTypes={donationTypes}
                      t={{
                        donationType:
                          locale === "en"
                            ? "Donation type"
                            : "သွေးလှူအမျိုးအစား",
                        notes: locale === "en" ? "Notes" : "မှတ်ချက်",
                        selectPlaceholder:
                          locale === "en" ? "Select..." : "ရွေးချယ်ပါ",
                      }}
                    />
                  ) : null}

                  <div className="flex items-center justify-between gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={step === 0}
                    >
                      {t.prev}
                    </Button>

                    {step < 3 ? (
                      <Button type="button" onClick={nextStep}>
                        {t.next}
                      </Button>
                    ) : (
                      <Button type="submit">{t.save}</Button>
                    )}
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

