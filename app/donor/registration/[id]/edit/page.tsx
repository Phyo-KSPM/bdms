"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { toast } from "sonner"
import { DonorActionLog } from "@/app/donor/registration/_components/DonorActionLog"
import { DonorDemographicsFields } from "@/app/donor/registration/_components/DonorDemographicsFields"
import { DonorRelatedNotebook } from "@/app/donor/registration/_components/DonorRelatedNotebook"
import {
  formatBagStatusLabel,
  formatDonationTypeLabel,
  formatVisitStatusLabel,
  getDonationTypeOptions,
  getDonorActionLogLabels,
  getDonorFieldLabels,
  getDonorNotebookLabels,
  getDonorStatusLabels,
  getInfectiousOptions,
  getMedicalConditionOptions,
} from "@/app/donor/registration/_components/donor-profile-i18n"
import {
  donorProfileBadgesClass,
  donorProfileCardClass,
  donorProfileCardContentClass,
  donorProfileCardHeaderClass,
  donorProfileGridClass,
  donorProfileHeaderRowClass,
  donorProfileMainCardSlotClass,
  donorProfileSideColumnClass,
  donorProfileToolbarClass,
} from "@/app/donor/registration/_components/donor-profile-layout"
import {
  listDonorAuditLogs,
  type DonorAuditEntry,
} from "@/lib/donor-audit-log"
import {
  BloodTypeSchema,
  DonationTypeSchema,
  GenderSchema,
  getDonorById,
  listDonationsByDonor,
  listScreeningVisitsByDonor,
  upsertDonor,
  type DonationRecord,
  type Donor,
  type ScreeningVisit,
} from "@/lib/donor-store"

const DonorEditSchema = z.object({
  nrc: z.string().optional(),
  name: z.string().min(1),
  age: z.coerce.number().int().min(16).max(80),
  bloodType: BloodTypeSchema,
  gender: GenderSchema.nullable(),
  contactPhone: z.string().min(1),
  contactEmail: z.string().optional(),
  contactAddress: z.string().optional(),
  township: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  screening: z.object({
    weightKg: z.number().nullable(),
    bpSystolic: z.number().nullable(),
    bpDiastolic: z.number().nullable(),
    pulse: z.number().nullable(),
    hb: z.number().nullable(),
    lastDonationDate: z.string().datetime().nullable(),
  }),
  medical: z.object({
    conditions: z.array(z.string()),
    infectiousFlags: z.array(z.string()),
    medications: z.string(),
    notes: z.string(),
  }),
  donationDetails: z.object({
    donationType: DonationTypeSchema.nullable(),
    notes: z.string(),
  }),
})

type DonorEditInput = z.input<typeof DonorEditSchema>
type DonorEditValues = z.output<typeof DonorEditSchema>

function normalizeDonorFormValues(
  values: DonorEditInput | DonorEditValues
): DonorEditValues {
  return {
    ...values,
    age: Number(values.age),
    nrc: values.nrc ?? "",
    contactEmail: values.contactEmail ?? "",
    contactAddress: values.contactAddress ?? "",
    township: values.township ?? "",
    city: values.city ?? "",
    address: values.address ?? "",
    medical: {
      ...values.medical,
      medications: values.medical.medications ?? "",
      notes: values.medical.notes ?? "",
    },
    donationDetails: {
      ...values.donationDetails,
      notes: values.donationDetails.notes ?? "",
    },
  } as DonorEditValues
}

function serializeDonorFormValues(values: DonorEditInput | DonorEditValues) {
  return JSON.stringify(normalizeDonorFormValues(values))
}

export default function Page() {
  const params = useParams<{ id: string }>()
  const donorInternalId = params?.id
  const router = useRouter()
  const { locale } = useLocale()
  const [donor, setDonor] = useState<Donor | null>(null)
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [visits, setVisits] = useState<ScreeningVisit[]>([])
  const [auditEntries, setAuditEntries] = useState<DonorAuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false)
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [pendingLeaveTo, setPendingLeaveTo] = useState<string | null>(null)
  const savedSnapshotRef = useRef<string | null>(null)

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Edit Donor",
        back: "Back",
        save: "Save",
        cancel: "Cancel",
        saveConfirmTitle: "Save changes?",
        saveConfirmDesc: "Donor profile updates will be saved.",
        saveConfirmAction: "Save",
        discardTitle: "Discard changes?",
        discardDesc: "You have unsaved changes. Are you sure you want to leave?",
        stay: "Stay",
        discard: "Discard",
        saveSuccess: "Donor updated successfully.",
        identity: "Identity",
        contactGroup: "Contact",
        locationGroup: "Location",
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
        notSet: "Not set",
        notebookTitle: "Related records",
        donations: "Donations",
        screening: "Screening",
        medical: "Medical history",
        donationInfo: "Donation info",
        noDonations: "No donations recorded for this donor.",
        noVisits: "No screening visits recorded.",
        donationId: "Bag / Donation ID",
        donatedAt: "Donated at",
        donationType: "Type",
        volume: "Volume",
        bagStatus: "Bag status",
        visitDate: "Visit date",
        visitStatus: "Status",
        screenedBy: "Screened by",
        weight: "Weight",
        bp: "Blood pressure",
        pulse: "Pulse",
        hb: "Hb",
        conditions: "Conditions",
        infectiousFlags: "Infectious flags",
        medications: "Medications",
        medicalNotes: "Medical notes",
        preferredType: "Preferred donation type",
        donationNotes: "Donation notes",
        none: "—",
        ml: "ml",
        bagPending: "Pending testing",
        bagReady: "Ready to use",
        bagDiscarded: "Discarded",
        visitPending: "Pending",
        visitPassed: "Passed",
        visitDeferred: "Deferred",
        typeWholeBlood: "Whole blood",
        typePlatelets: "Platelets",
        typePlasma: "Plasma",
        typeDoubleRed: "Double red cells",
        actionLogTitle: "Action log",
        actionLogEmpty: "No activity recorded yet.",
        actionLogActivity: "activity",
        actionLogActivities: "activities",
        actionCreated: "Created",
        actionUpdated: "Updated",
        actionDeleted: "Deleted",
        actionRegistered: "Registered donor {id}",
        actionSystem: "System",
        actionChanged: "Changes",
        fieldLabels: {
          name: "Name",
          age: "Age",
          bloodType: "Blood type",
          gender: "Gender",
          nrc: "NRC",
          contactPhone: "Phone",
          contactEmail: "Email",
          contactAddress: "Address",
          township: "Township",
          city: "City",
          address: "Full address",
          "screening.weightKg": "Weight (kg)",
          "screening.bpSystolic": "BP systolic",
          "screening.bpDiastolic": "BP diastolic",
          "screening.pulse": "Pulse",
          "screening.hb": "Hb",
          "medical.conditions": "Conditions",
          "medical.medications": "Medications",
          "medical.notes": "Medical notes",
          "donationDetails.donationType": "Donation type",
          "donationDetails.notes": "Donation notes",
        },
      } as const
    }

    return {
      title: "Donor ပြင်ဆင်ရန်",
      back: "နောက်သို့",
      save: "သိမ်းမယ်",
      cancel: "မလုပ်တော့",
      saveConfirmTitle: "ပြောင်းလဲမှုများ သိမ်းမလား?",
      saveConfirmDesc: "Donor profile အချက်အလက်များ သိမ်းပါမည်။",
      saveConfirmAction: "သိမ်းမယ်",
      discardTitle: "မသိမ်းဘဲ ထွက်မလား?",
      discardDesc: "မသိမ်းရသေးတဲ့ အချက်အလက်တွေ ရှိပါတယ်။ ထွက်မှာ သေချာလား?",
      stay: "မထွက်တော့ဘူး",
      discard: "ထွက်မယ်",
      saveSuccess: "Donor အချက်အလက် သိမ်းပြီးပါပြီ။",
      identity: "Identity",
      contactGroup: "ဆက်သွယ်ရန်",
      locationGroup: "နေရပ်လိပ်စာ",
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
      notSet: "မသတ်မှတ်ရသေး",
      notebookTitle: "ဆက်စပ်မှတ်တမ်းများ",
      donations: "လှူဒါန်းမှုများ",
      screening: "Screening",
      medical: "Medical history",
      donationInfo: "Donation info",
      noDonations: "လှူဒါန်းမှတ်တမ်း မရှိသေးပါ။",
      noVisits: "Screening visit မရှိသေးပါ။",
      donationId: "Bag / Donation ID",
      donatedAt: "လှူဒါန်းသည့်အချိန်",
      donationType: "အမျိုးအစား",
      volume: "ပမာဏ",
      bagStatus: "Bag status",
      visitDate: "Visit ရက်စွဲ",
      visitStatus: "Status",
      screenedBy: "Screened by",
      weight: "ကိုယ်အလေးချိန်",
      bp: "သွေးပေါင်ချိန်",
      pulse: "Pulse",
      hb: "Hb",
      conditions: "ရောဂါများ",
      infectiousFlags: "Infectious flags",
      medications: "ဆေးများ",
      medicalNotes: "Medical notes",
      preferredType: "Preferred donation type",
      donationNotes: "Donation notes",
      none: "—",
      ml: "ml",
      bagPending: "Pending testing",
      bagReady: "Ready to use",
      bagDiscarded: "Discarded",
      visitPending: "Pending",
      visitPassed: "Passed",
      visitDeferred: "Deferred",
      typeWholeBlood: "Whole blood",
      typePlatelets: "Platelets",
      typePlasma: "Plasma",
      typeDoubleRed: "Double red cells",
      actionLogTitle: "Action log",
      actionLogEmpty: "Activity မရှိသေးပါ။",
      actionLogActivity: "activity",
      actionLogActivities: "activities",
      actionCreated: "Created",
      actionUpdated: "Updated",
      actionDeleted: "Deleted",
      actionRegistered: "Donor {id} မှတ်ပုံတင်ထားသည်",
      actionSystem: "System",
      actionChanged: "ပြောင်းလဲမှုများ",
      fieldLabels: {
        name: "အမည်",
        age: "အသက်",
        bloodType: "သွေးအမျိုးအစား",
        gender: "ကျား/မ",
        nrc: "NRC",
        contactPhone: "ဖုန်း",
        contactEmail: "အီးမေးလ်",
        contactAddress: "လိပ်စာ",
        township: "မြို့နယ်",
        city: "မြို့",
        address: "အသေးစိတ်လိပ်စာ",
        "screening.weightKg": "ကိုယ်အလေးချိန် (kg)",
        "screening.bpSystolic": "BP systolic",
        "screening.bpDiastolic": "BP diastolic",
        "screening.pulse": "Pulse",
        "screening.hb": "Hb",
        "medical.conditions": "ရောဂါများ",
        "medical.medications": "ဆေးများ",
        "medical.notes": "Medical notes",
        "donationDetails.donationType": "Donation type",
        "donationDetails.notes": "Donation notes",
      },
    } as const
  }, [locale])

  const bloodTypes = useMemo(() => BloodTypeSchema.options, [])

  const notebookLabels = useMemo(
    () => getDonorNotebookLabels(locale),
    [locale]
  )
  const statusLabels = useMemo(() => getDonorStatusLabels(locale), [locale])
  const actionLogLabels = useMemo(
    () => getDonorActionLogLabels(locale),
    [locale]
  )
  const fieldLabels = useMemo(() => getDonorFieldLabels(locale), [locale])
  const conditionOptions = useMemo(
    () => getMedicalConditionOptions(locale),
    [locale]
  )

  const infectiousOptions = useMemo(
    () => getInfectiousOptions(locale),
    [locale]
  )

  const donationTypes = useMemo(
    () => getDonationTypeOptions(locale),
    [locale]
  )

  const form = useForm<DonorEditInput, unknown, DonorEditValues>({
    resolver: zodResolver(DonorEditSchema),
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

  const watchedName = useWatch({ control: form.control, name: "name" })
  const watchedBloodType = useWatch({ control: form.control, name: "bloodType" })
  const watchedGender = useWatch({ control: form.control, name: "gender" })
  const watchedAge = useWatch({ control: form.control, name: "age" })
  const { isDirty } = form.formState

  useEffect(() => {
    if (!donorInternalId) {
      setIsLoading(false)
      return
    }
    const found = getDonorById(donorInternalId)
    setDonor(found)
    if (found) {
      const initialValues = {
        nrc: found.nrc,
        name: found.name,
        age: found.age,
        bloodType: found.bloodType,
        gender: found.gender,
        contactPhone: found.contactPhone,
        contactEmail: found.contactEmail,
        contactAddress: found.contactAddress,
        township: found.township,
        city: found.city,
        address: found.address,
        screening: found.screening,
        medical: found.medical,
        donationDetails: found.donationDetails,
      }
      form.reset(initialValues)
      savedSnapshotRef.current = serializeDonorFormValues(initialValues)
      setDonations(
        listDonationsByDonor(found.id).sort((a, b) =>
          b.donatedAt.localeCompare(a.donatedAt)
        )
      )
      setVisits(listScreeningVisitsByDonor(found.id))
      const logs = listDonorAuditLogs(found.id)
      if (logs.length > 0) {
        setAuditEntries(logs)
      } else {
        setAuditEntries([
          {
            id: `seed-${found.id}`,
            at: found.createdAt,
            donorId: found.id,
            donorCode: found.donorId,
            actorId: "system",
            actorName: actionLogLabels.system,
            action: "created",
            summary: actionLogLabels.registered.replace("{id}", found.donorId),
          },
        ])
      }
    } else {
      setDonations([])
      setVisits([])
      setAuditEntries([])
      savedSnapshotRef.current = null
    }
    setIsLoading(false)
  }, [donorInternalId, form, actionLogLabels.registered, actionLogLabels.system])

  function formatGender(value: Donor["gender"]) {
    if (value === "male") return t.male
    if (value === "female") return t.female
    if (value === "other") return t.other
    return t.notSet
  }

  function formatBagStatus(status: DonationRecord["bloodBagStatus"]) {
    return formatBagStatusLabel(status, statusLabels)
  }

  function formatVisitStatus(status: ScreeningVisit["status"]) {
    return formatVisitStatusLabel(status, statusLabels)
  }

  function formatDonationType(type: Donor["donationDetails"]["donationType"]) {
    const label = formatDonationTypeLabel(type, statusLabels)
    return label || t.none
  }

  function onSubmit(values: DonorEditValues) {
    if (!donorInternalId || !donor) return
    const contact = [values.contactPhone, values.contactEmail, values.contactAddress]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" / ")
    upsertDonor({
      id: donorInternalId,
      contact,
      ...values,
    })
    toast.success(t.saveSuccess)
    router.replace(`/donor/registration/${donorInternalId}`)
  }

  function hasUnsavedChanges() {
    if (savedSnapshotRef.current == null) return isDirty
    return serializeDonorFormValues(form.getValues()) !== savedSnapshotRef.current
  }

  function requestLeave(to: string) {
    setIsSaveConfirmOpen(false)
    if (hasUnsavedChanges()) {
      setPendingLeaveTo(to)
      setIsDiscardConfirmOpen(true)
      return
    }
    router.replace(to)
  }

  async function requestSave() {
    const ok = await form.trigger()
    if (!ok) return
    setIsSaveConfirmOpen(true)
  }

  function confirmSave() {
    setIsSaveConfirmOpen(false)
    form.handleSubmit(onSubmit)()
  }

  function confirmDiscard() {
    const to =
      pendingLeaveTo ??
      (donorInternalId
        ? `/donor/registration/${donorInternalId}`
        : "/donor/registration")
    setIsDiscardConfirmOpen(false)
    setPendingLeaveTo(null)
    router.replace(to)
  }

  const viewPath = donorInternalId
    ? `/donor/registration/${donorInternalId}`
    : "/donor/registration"

  const displayName = watchedName || donor?.name || "—"
  const displayBloodType = watchedBloodType || donor?.bloodType || "—"
  const displayGender = formatGender(watchedGender ?? donor?.gender ?? null)
  const displayAge =
    watchedAge != null && watchedAge !== ""
      ? String(watchedAge)
      : donor?.age != null
        ? String(donor.age)
        : "—"

  const notebookDonor: Donor | null = donor
    ? {
        ...donor,
        name: String(watchedName || donor.name),
        bloodType: (watchedBloodType || donor.bloodType) as Donor["bloodType"],
        gender: watchedGender ?? donor.gender,
        age: Number(watchedAge || donor.age),
        screening: form.getValues("screening"),
        medical: form.getValues("medical"),
        donationDetails: form.getValues("donationDetails"),
      }
    : null

  return (
    <AuthedShell title={t.title}>
      <AlertDialog open={isSaveConfirmOpen} onOpenChange={setIsSaveConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.saveConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.saveConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.stay}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>
              {t.saveConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDiscardConfirmOpen}
        onOpenChange={(open) => {
          setIsDiscardConfirmOpen(open)
          if (!open) setPendingLeaveTo(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.discardTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.discardDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.stay}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
              {t.discard}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto w-full max-w-7xl px-1 sm:px-0">
        {isLoading ? (
          <div className={donorProfileGridClass}>
            <div className={donorProfileToolbarClass}>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-14" />
            </div>
            <Skeleton
              className={`h-[480px] w-full rounded-xl ${donorProfileMainCardSlotClass}`}
            />
            <Skeleton
              className={`h-[480px] w-full rounded-xl ${donorProfileSideColumnClass}`}
            />
          </div>
        ) : !donor || !notebookDonor ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Donor not found.
            </CardContent>
          </Card>
        ) : (
          <div className={donorProfileGridClass}>
            <div className={donorProfileToolbarClass}>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => requestLeave(viewPath)}
              >
                {t.back}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => requestLeave(viewPath)}
              >
                {t.cancel}
              </Button>
              <Button size="sm" type="button" onClick={requestSave}>
                {t.save}
              </Button>
            </div>
            <Card className={`${donorProfileCardClass} ${donorProfileMainCardSlotClass}`}>
                <CardHeader className={donorProfileCardHeaderClass}>
                  <div className={donorProfileHeaderRowClass}>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-lg">{displayName}</CardTitle>
                      <p className="font-mono text-sm text-muted-foreground">
                        {donor.donorId}
                      </p>
                    </div>
                    <div className={donorProfileBadgesClass}>
                      <Badge variant="secondary">{displayBloodType}</Badge>
                      <Badge variant="outline">{displayGender}</Badge>
                      <Badge variant="outline">
                        {t.age}: {displayAge}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={donorProfileCardContentClass}>
                <Form {...form}>
                  <form
                    id="donor-edit-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void requestSave()
                    }}
                    className="space-y-4"
                  >
                    <DonorDemographicsFields
                      control={form.control}
                      donorId={donor.donorId}
                      bloodTypes={bloodTypes}
                      labels={{
                        identity: t.identity,
                        contactGroup: t.contactGroup,
                        locationGroup: t.locationGroup,
                        donorId: t.donorId,
                        name: t.name,
                        nrc: t.nrc,
                        age: t.age,
                        bloodType: t.bloodType,
                        gender: t.gender,
                        phone: t.phone,
                        email: t.email,
                        contactAddress: t.contactAddress,
                        township: t.township,
                        city: t.city,
                        fullAddress: t.fullAddress,
                        selectPlaceholder: t.selectPlaceholder,
                        male: t.male,
                        female: t.female,
                        other: t.other,
                      }}
                    />

                    <DonorRelatedNotebook
                      donor={notebookDonor}
                      donations={donations}
                      visits={visits}
                      control={form.control}
                      conditionOptions={conditionOptions}
                      infectiousOptions={infectiousOptions}
                      donationTypes={donationTypes}
                      editLabels={{
                        screening: {
                          weightKg:
                            locale === "en" ? "Weight (kg)" : "အလေးချိန် (kg)",
                          weightLbHint: (lb: number) =>
                            locale === "en"
                              ? `≈ ${lb} lb`
                              : `≈ ${lb} lb ပေါင်`,
                          bpSystolic:
                            locale === "en"
                              ? "BP Systolic"
                              : "သွေးပေါင် (အပေါ်)",
                          bpDiastolic:
                            locale === "en"
                              ? "BP Diastolic"
                              : "သွေးပေါင် (အောက်)",
                          pulse:
                            locale === "en" ? "Pulse" : "သွေးခုန်နှုန်း",
                          hb:
                            locale === "en"
                              ? "Hemoglobin (Hb)"
                              : "သွေးအား (Hb)",
                          lastDonationDate:
                            locale === "en"
                              ? "Last donation date"
                              : "နောက်ဆုံးလှူခဲ့သည့်ရက်",
                          neverDonatedHint:
                            locale === "en"
                              ? "Leave empty if never donated."
                              : "မလှူဖူးသေးရင် မဖြည့်ပါ။",
                        },
                        medical: {
                          conditions:
                            locale === "en" ? "Conditions" : "ရောဂါအခံ",
                          infectious:
                            locale === "en"
                              ? "Infectious diseases"
                              : "ကူးစက်ရောဂါများ",
                          medications:
                            locale === "en"
                              ? "Current medications"
                              : "လက်ရှိသောက်နေသော ဆေးဝါးများ",
                          notes: locale === "en" ? "Notes" : "မှတ်ချက်",
                        },
                        donation: {
                          donationType:
                            locale === "en"
                              ? "Donation type"
                              : "သွေးလှူအမျိုးအစား",
                          notes: locale === "en" ? "Notes" : "မှတ်ချက်",
                          selectPlaceholder: t.selectPlaceholder,
                        },
                      }}
                      labels={notebookLabels}
                      formatBagStatus={formatBagStatus}
                      formatVisitStatus={formatVisitStatus}
                      formatDonationType={formatDonationType}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className={donorProfileSideColumnClass}>
              <DonorActionLog
              entries={auditEntries}
              fieldLabels={fieldLabels}
              labels={{
                title: actionLogLabels.title,
                empty: actionLogLabels.empty,
                activitySingular: actionLogLabels.activitySingular,
                activityPlural: actionLogLabels.activityPlural,
                created: actionLogLabels.created,
                updated: actionLogLabels.updated,
                deleted: actionLogLabels.deleted,
                registered: actionLogLabels.registered,
                system: actionLogLabels.system,
                changed: actionLogLabels.changed,
                from: actionLogLabels.from,
                to: actionLogLabels.to,
              }}
              />
            </div>
          </div>
        )}
      </div>
    </AuthedShell>
  )
}
