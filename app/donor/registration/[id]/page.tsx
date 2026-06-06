"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { IdCardIcon } from "lucide-react"
import { toast } from "sonner"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { usePermissions } from "@/hooks/use-permissions"
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
import { Skeleton } from "@/components/ui/skeleton"
import { DonorActionLog } from "@/app/donor/registration/_components/DonorActionLog"
import {
  DonorFieldGroup,
  DonorReadonlyField,
} from "@/app/donor/registration/_components/DonorFormSheet"
import { DonorRelatedNotebook } from "@/app/donor/registration/_components/DonorRelatedNotebook"
import {
  formatBagStatusLabel,
  formatDonationTypeLabel,
  formatVisitStatusLabel,
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
  getDonorById,
  issueDonorEid,
  listDonationsByDonor,
  listScreeningVisitsByDonor,
  type DonationRecord,
  type Donor,
  type ScreeningVisit,
} from "@/lib/donor-store"
import { PermissionDeniedError } from "@/lib/permissions"

export default function Page() {
  const params = useParams<{ id: string }>()
  const donorInternalId = params?.id
  const router = useRouter()
  const { locale } = useLocale()
  const { can } = usePermissions()
  const canIssueEid = can("donors.write")
  const [donor, setDonor] = useState<Donor | null>(null)
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [visits, setVisits] = useState<ScreeningVisit[]>([])
  const [auditEntries, setAuditEntries] = useState<DonorAuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false)
  const [isIssuingEid, setIsIssuingEid] = useState(false)

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "View Donor",
        back: "Back",
        edit: "Edit",
        editConfirmTitle: "Edit this donor?",
        editConfirmDesc: "You will be taken to the edit form for this donor profile.",
        editConfirmAction: "Continue to edit",
        editCancel: "Cancel",
        profile: "Profile",
        identity: "Identity",
        contactGroup: "Contact",
        locationGroup: "Location",
        donorId: "Donor ID",
        eid: "EID",
        issueEid: "Issue EID card",
        issueEidDone: "EID card issued",
        viewEidCard: "EID card",
        eidIssuedToast: "EID card issued successfully.",
        permissionDenied: "You do not have permission to issue EID cards.",
        photoRequired: "Upload a donor photo on the EID Card page before issuing.",
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
        visitInfectious: "Infectious",
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
          eid: "EID",
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
      title: "Donor ကြည့်မယ်",
      back: "နောက်သို့",
      edit: "ပြင်မယ်",
      editConfirmTitle: "Donor ကို ပြင်ဆင်မလား?",
      editConfirmDesc: "Donor profile ပြင်ဆင်ရန် edit form သို့ သွားပါမည်။",
      editConfirmAction: "ပြင်ဆင်ရန် ဆက်လုပ်မယ်",
      editCancel: "မလုပ်တော့",
      profile: "Profile",
      identity: "Identity",
      contactGroup: "ဆက်သွယ်ရန်",
      locationGroup: "နေရပ်လိပ်စာ",
      donorId: "Donor ID",
      eid: "EID",
      issueEid: "EID card ထုတ်ပေးမည်",
      issueEidDone: "EID card ထုတ်ပြီးသား",
      viewEidCard: "EID card",
      eidIssuedToast: "EID card ထုတ်ပေးပြီးပါပြီ။",
      permissionDenied: "EID card ထုတ်ပေးခွင့် မရှိပါ။",
      photoRequired: "EID card ထုတ်မီ Donor EID Card page မှာ photo upload လုပ်ပါ။",
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
      visitInfectious: "Infectious",
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

  useEffect(() => {
    if (!donorInternalId) {
      setIsLoading(false)
      return
    }
    loadDonor(donorInternalId)
  }, [donorInternalId, actionLogLabels.registered, actionLogLabels.system])

  function loadDonor(id: string) {
    const found = getDonorById(id)
    setDonor(found)
    if (found) {
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
    }
    setIsLoading(false)
  }

  async function handleIssueEid() {
    if (!donor || donor.eid) return
    setIsIssuingEid(true)
    try {
      issueDonorEid(donor.id)
      loadDonor(donor.id)
      toast.success(t.eidIssuedToast)
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
      } else if (err instanceof Error && err.message === "PHOTO_REQUIRED") {
        toast.error(t.photoRequired)
      } else {
        throw err
      }
    } finally {
      setIsIssuingEid(false)
    }
  }

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

  return (
    <AuthedShell title={t.title}>
      <AlertDialog open={isEditConfirmOpen} onOpenChange={setIsEditConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.editConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.editConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.editCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (donorInternalId) {
                  router.push(`/donor/registration/${donorInternalId}/edit`)
                }
              }}
            >
              {t.editConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto w-full max-w-7xl px-1 sm:px-0">
        {isLoading ? (
          <div className={donorProfileGridClass}>
            <div className={donorProfileToolbarClass}>
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
        ) : !donor ? (
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
                onClick={() => router.push("/donor/registration")}
              >
                {t.back}
              </Button>
              {donorInternalId ? (
                <>
                  {canIssueEid && !donor?.eid ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isIssuingEid}
                      onClick={handleIssueEid}
                    >
                      <IdCardIcon className="size-4" />
                      {t.issueEid}
                    </Button>
                  ) : null}
                  {donor?.eid ? (
                    <Link href="/donor/certificate">
                      <Button size="sm" variant="outline">
                        {t.viewEidCard}
                      </Button>
                    </Link>
                  ) : null}
                  <Button size="sm" onClick={() => setIsEditConfirmOpen(true)}>
                    {t.edit}
                  </Button>
                </>
              ) : null}
            </div>
            <Card className={`${donorProfileCardClass} ${donorProfileMainCardSlotClass}`}>
                <CardHeader className={donorProfileCardHeaderClass}>
                  <div className={donorProfileHeaderRowClass}>
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-lg">{donor.name}</CardTitle>
                      <p className="font-mono text-sm text-muted-foreground">
                        {donor.donorId}
                      </p>
                    </div>
                    <div className={donorProfileBadgesClass}>
                      <Badge variant="secondary">{donor.bloodType}</Badge>
                      <Badge variant="outline">{formatGender(donor.gender)}</Badge>
                      <Badge variant="outline">
                        {t.age}: {donor.age}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className={donorProfileCardContentClass}>
                <DonorFieldGroup title={t.identity}>
                  <DonorReadonlyField
                    label={t.donorId}
                    value={donor.donorId}
                    mono
                  />
                  <DonorReadonlyField
                    label={t.eid}
                    value={donor.eid ?? t.notSet}
                    mono
                  />
                  <DonorReadonlyField label={t.name} value={donor.name} />
                  <DonorReadonlyField label={t.nrc} value={donor.nrc} />
                  <DonorReadonlyField
                    label={t.bloodType}
                    value={donor.bloodType}
                  />
                  <DonorReadonlyField
                    label={t.gender}
                    value={formatGender(donor.gender)}
                  />
                  <DonorReadonlyField
                    label={t.age}
                    value={String(donor.age)}
                  />
                </DonorFieldGroup>

                <DonorFieldGroup title={t.contactGroup}>
                  <DonorReadonlyField
                    label={t.phone}
                    value={donor.contactPhone}
                  />
                  <DonorReadonlyField
                    label={t.email}
                    value={donor.contactEmail}
                  />
                  <DonorReadonlyField
                    label={t.contactAddress}
                    value={donor.contactAddress}
                    className="sm:col-span-2"
                  />
                </DonorFieldGroup>

                <DonorFieldGroup title={t.locationGroup}>
                  <DonorReadonlyField
                    label={t.township}
                    value={donor.township}
                  />
                  <DonorReadonlyField label={t.city} value={donor.city} />
                  <DonorReadonlyField
                    label={t.fullAddress}
                    value={donor.address}
                    className="sm:col-span-2"
                  />
                </DonorFieldGroup>

                <DonorRelatedNotebook
                  donor={donor}
                  donations={donations}
                  visits={visits}
                  labels={notebookLabels}
                  conditionOptions={conditionOptions}
                  infectiousOptions={infectiousOptions}
                  formatBagStatus={formatBagStatus}
                  formatVisitStatus={formatVisitStatus}
                  formatDonationType={formatDonationType}
                />
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
