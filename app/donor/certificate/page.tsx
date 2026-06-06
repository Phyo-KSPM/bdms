"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react"
import { IdCardIcon, PrinterIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { AuthedShell } from "@/components/authed-shell"
import { DonorEidCard } from "@/components/donor-eid-card"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePermissions } from "@/hooks/use-permissions"
import {
  filterDonorMatches,
  resolveDonorFromQuery,
} from "@/lib/donor-lookup"
import {
  getLastDonation,
  getNextEidPreview,
  issueDonorEid,
  listDonationsByDonor,
  listDonors,
  setDonorPhoto,
  type Donor,
} from "@/lib/donor-store"
import { readDonorPhotoFile } from "@/lib/donor-photo"
import { PermissionDeniedError } from "@/lib/permissions"

export default function Page() {
  const { locale } = useLocale()
  const { can } = usePermissions()
  const canIssueEid = can("donors.write")
  const donorInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [donors, setDonors] = useState<Donor[]>([])
  const [selectedDonorId, setSelectedDonorId] = useState<string>("")
  const [donorQuery, setDonorQuery] = useState<string>("")
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Donor EID Card",
        panelTitle: "Issue EID card",
        donorId: "Donor ID",
        donorIdPlaceholder: "DNR-000123",
        donorNoDonors:
          "No donors found. Register a donor in Donor Registration first.",
        donorNotFound: "No donor matches this Donor ID.",
        matches: "Matches",
        noDonor: "Enter a Donor ID to begin.",
        issueEid: "Confirm & issue EID",
        issueEidAgain: "EID card already issued",
        eidIssued: "EID card issued successfully.",
        eidNotIssued: "Issue an EID card before printing.",
        permissionDenied: "You do not have permission to issue EID cards.",
        printCard: "Print EID card",
        printHint:
          'Use "Save as PDF" in the print dialog to export the card.',
        previewTitle: "Card preview",
        previewHint:
          "Review the card preview. When everything looks correct, confirm to issue the EID.",
        previewEmpty: "Upload a donor photo to preview the EID card.",
        previewPending: "Preview — not issued yet",
        orgNameMm: "မြန်မာနိုင်ငံ သွေးလှူရှင်များ စီမံခန့်ခွဲမှု",
        orgNameEn: "BLOOD DONATION MANAGEMENT SYSTEM (BDMS)",
        cardTitle: "Blood Donor Member Card (EID)",
        nameLabel: "Name",
        bloodGroupLabel: "Blood Group",
        memberNoLabel: "Member No.",
        nrcLabel: "N.R.C No.",
        joinedDateLabel: "First donation date",
        donationCountLabel: "Donations",
        lastDonationLabel: "Last donation",
        scanHint: "(Scan for details and donation history)",
        signatureLabel: "Member's Signature",
        phone: "Phone: 09-123456789",
        email: "Email: info@bdms.local",
        website: "Website: www.bdms.local",
        none: "—",
        photo: "Donor photo",
        uploadPhoto: "Upload photo",
        changePhoto: "Change photo",
        photoHint: "Upload a portrait photo before issuing the EID card.",
        photoRequired: "Upload a donor photo before issuing the EID card.",
        photoSaved: "Photo saved.",
        photoInvalid: "Please choose a JPG or PNG image.",
        photoTooLarge: "Image must be 5 MB or smaller.",
        photoReadFailed: "Could not read the selected image.",
        statusIssued: "EID issued",
        statusPending: "Not issued yet",
        reset: "Reset",
      } as const
    }
    return {
      title: "Donor EID Card",
      panelTitle: "EID card ထုတ်ပေးရန်",
      donorId: "Donor ID",
      donorIdPlaceholder: "DNR-000123",
      donorNoDonors:
        "Donor မရှိသေးပါ။ `Donor မှတ်ပုံတင်ခြင်း` မှာ အရင် register လုပ်ပါ။",
      donorNotFound: "ဒီ Donor ID နဲ့ မတွေ့ပါ။",
      matches: "ကိုက်ညီမှုများ",
      noDonor: "Donor ID ရိုက်ထည့်ပါ။",
      issueEid: "EID card ထုတ်ပေးမည် (အတည်ပြု)",
      issueEidAgain: "EID card ထုတ်ပြီးသား",
      eidIssued: "EID card ထုတ်ပေးပြီးပါပြီ။",
      eidNotIssued: "Print မလုပ်မီ EID card ထုတ်ပေးရန် လိုအပ်ပါသည်။",
      permissionDenied: "EID card ထုတ်ပေးခွင့် မရှိပါ။",
      printCard: "EID card print",
      printHint: "Print dialog မှာ Save as PDF ရွေးပြီး card ထုတ်ယူနိုင်ပါတယ်။",
      previewTitle: "Card preview",
      previewHint:
        "Card preview ကို စစ်ဆေးပါ။ အချက်အလက် မှန်ကန်ပါက EID card ထုတ်ပေးမည် (အတည်ပြု) ကို နှိပ်ပါ။",
      previewEmpty: "EID card preview ကြည့်ရန် donor photo upload လုပ်ပါ။",
      previewPending: "Preview — မထုတ်ရသေးပါ",
      orgNameMm: "မြန်မာနိုင်ငံ သွေးလှူရှင်များအသင်း",
      orgNameEn: "MYANMAR BLOOD DONORS ASSOCIATION",
      cardTitle: "သွေးလှူရှင် အသင်းဝင်ကတ် (EID)",
      nameLabel: "အမည် (Name)",
      bloodGroupLabel: "သွေးအုပ်စု (Blood Group)",
      memberNoLabel: "အသင်းဝင်နံပါတ် (Member No.)",
      nrcLabel: "မှတ်ပုံတင်နံပါတ် (N.R.C No.)",
      joinedDateLabel: "သွေးစတင်လှူဒါန်းသည့်ရက်",
      donationCountLabel: "လှူဒါန်းခဲ့သည့်အရေအတွက်",
      lastDonationLabel: "နောက်ဆုံးရက်စွဲ",
      scanHint:
        "အသေးစိတ်အချက်အလက်များအတွက် (Scan for detailed details and donation history)",
      signatureLabel: "အသင်းဝင် လက်မှတ်",
      phone: "ဖုန်း: ၀၉-၁၂၃၄၅၆၇၈",
      email: "အီးမေးလ်: info@mbda.org.mm",
      website: "ဝဘ်ဆိုဒ်: www.mbda.org.mm",
      none: "—",
      photo: "Donor photo",
      uploadPhoto: "Photo upload",
      changePhoto: "Photo ပြောင်းမည်",
      photoHint: "EID card ထုတ်မီ donor photo တင်ထားပါ။",
      photoRequired: "EID card ထုတ်မီ donor photo upload လုပ်ရန် လိုအပ်ပါသည်။",
      photoSaved: "Photo သိမ်းပြီးပါပြီ။",
      photoInvalid: "JPG သို့မဟုတ် PNG ပုံ ရွေးပါ။",
      photoTooLarge: "ပုံအရွယ်အစား 5 MB အောက်ဖြစ်ရပါမည်။",
      photoReadFailed: "ရွေးထားတဲ့ ပုံကို မဖတ်နိုင်ပါ။",
      statusIssued: "EID ထုတ်ပြီးပါပြီ",
      statusPending: "EID မထုတ်ရသေးပါ",
      reset: "ပြန်စမည်",
    } as const
  }, [locale])

  const cardLabels = useMemo(
    () => ({
      orgNameMm: t.orgNameMm,
      orgNameEn: t.orgNameEn,
      cardTitle: t.cardTitle,
      nameLabel: t.nameLabel,
      bloodGroupLabel: t.bloodGroupLabel,
      memberNoLabel: t.memberNoLabel,
      nrcLabel: t.nrcLabel,
      joinedDateLabel: t.joinedDateLabel,
      donationCountLabel: t.donationCountLabel,
      lastDonationLabel: t.lastDonationLabel,
      scanHint: t.scanHint,
      signatureLabel: t.signatureLabel,
      phone: t.phone,
      email: t.email,
      website: t.website,
      none: t.none,
    }),
    [t]
  )

  function refreshDonors() {
    setDonors(listDonors())
  }

  useEffect(() => {
    refreshDonors()
    donorInputRef.current?.focus()
  }, [])

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

  const donorMatches = useMemo(
    () => filterDonorMatches(donors, donorQuery),
    [donorQuery, donors]
  )

  const donor = useMemo(
    () => donors.find((d) => d.id === selectedDonorId) ?? null,
    [donors, selectedDonorId]
  )

  const donorStats = useMemo(() => {
    if (!donor) {
      return {
        donationCount: 0,
        firstDonationDate: null as string | null,
        lastDonationDate: null as string | null,
      }
    }
    const records = listDonationsByDonor(donor.id)
    const sorted = records
      .slice()
      .sort(
        (a, b) =>
          new Date(a.donatedAt).getTime() - new Date(b.donatedAt).getTime()
      )
    const last = getLastDonation(donor.id)
    return {
      donationCount: records.length,
      firstDonationDate: sorted[0]?.donatedAt ?? null,
      lastDonationDate: last?.donatedAt ?? null,
    }
  }, [donor])

  useEffect(() => {
    setPendingPhotoUrl(donor?.photoUrl ?? null)
  }, [donor?.id, donor?.photoUrl])

  const hasPhoto = Boolean(pendingPhotoUrl?.trim())

  const previewEid = useMemo(() => getNextEidPreview(), [donors])

  const cardDonor = useMemo(() => {
    if (!donor) return null
    const eid = donor.eid ?? previewEid
    if (!eid) return null
    return {
      ...donor,
      eid,
      photoUrl: pendingPhotoUrl ?? donor.photoUrl,
    }
  }, [donor, pendingPhotoUrl, previewEid])

  const isPreview = Boolean(donor && !donor.eid && hasPhoto)

  const showNotFound =
    donorQuery.trim().length > 0 && !donor && donorMatches.length === 0

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

  async function handlePhotoSelected(file: File | null) {
    if (!file || !donor) return
    setIsUploadingPhoto(true)
    try {
      const dataUrl = await readDonorPhotoFile(file)
      setPendingPhotoUrl(dataUrl)
      if (donor.eid) {
        const updated = setDonorPhoto(donor.id, dataUrl)
        refreshDonors()
        setSelectedDonorId(updated.id)
        toast.success(t.photoSaved)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "INVALID_IMAGE") toast.error(t.photoInvalid)
        else if (err.message === "FILE_TOO_LARGE") toast.error(t.photoTooLarge)
        else toast.error(t.photoReadFailed)
      }
    } finally {
      setIsUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }

  async function handleIssueEid() {
    if (!donor || donor.eid) return
    if (!hasPhoto) {
      toast.error(t.photoRequired)
      return
    }
    setIsIssuing(true)
    try {
      const updated = issueDonorEid(donor.id, { photoUrl: pendingPhotoUrl })
      refreshDonors()
      setSelectedDonorId(updated.id)
      setDonorQuery(updated.donorId)
      setPendingPhotoUrl(updated.photoUrl)
      toast.success(t.eidIssued)
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
      } else if (err instanceof Error && err.message === "PHOTO_REQUIRED") {
        toast.error(t.photoRequired)
      } else {
        throw err
      }
    } finally {
      setIsIssuing(false)
    }
  }

  function printCard() {
    if (!donor?.eid) {
      toast.error(t.eidNotIssued)
      return
    }
    window.print()
  }

  function resetForm() {
    setDonorQuery("")
    setSelectedDonorId("")
    setPendingPhotoUrl(null)
    if (photoInputRef.current) photoInputRef.current.value = ""
    donorInputRef.current?.focus()
  }

  return (
    <>
      <div className="print:hidden">
        <AuthedShell title={t.title}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.panelTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="eid-donor-lookup">{t.donorId}</Label>
                  <Input
                    ref={donorInputRef}
                    id="eid-donor-lookup"
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
                  <div className="space-y-3 rounded-md border p-3 text-sm">
                    <div className="font-medium">{donor.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {donor.donorId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {donor.eid ? t.statusIssued : t.statusPending}
                    </div>

                    <div className="grid gap-2 border-t pt-3">
                      <Label htmlFor="donor-photo-upload">{t.photo}</Label>
                      <div className="flex flex-wrap items-start gap-3">
                        <div
                          className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-md border-2 bg-muted/30"
                          style={{ borderColor: "#9b0018" }}
                        >
                          {hasPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pendingPhotoUrl!}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="px-2 text-center text-xs text-muted-foreground">
                              {t.uploadPhoto}
                            </span>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <input
                            ref={photoInputRef}
                            id="donor-photo-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null
                              void handlePhotoSelected(file)
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploadingPhoto}
                            onClick={() => photoInputRef.current?.click()}
                          >
                            {hasPhoto ? t.changePhoto : t.uploadPhoto}
                          </Button>
                          <p className="max-w-[220px] text-xs text-muted-foreground">
                            {t.photoHint}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : donors.length > 0 && !donorQuery.trim() ? (
                  <div className="text-sm text-muted-foreground">{t.noDonor}</div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {canIssueEid ? (
                    <Button
                      disabled={!donor || !!donor?.eid || isIssuing || !hasPhoto}
                      onClick={handleIssueEid}
                    >
                      <IdCardIcon className="size-4" />
                      {donor?.eid ? t.issueEidAgain : t.issueEid}
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    disabled={!donor?.eid}
                    onClick={printCard}
                  >
                    <PrinterIcon className="size-4" />
                    {t.printCard}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={!donorQuery.trim() && !donor && !hasPhoto}
                  >
                    <RotateCcwIcon className="size-4" />
                    {t.reset}
                  </Button>
                </div>

                {isPreview ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                    {t.previewHint}
                  </div>
                ) : null}

                <div className="text-sm text-muted-foreground">{t.printHint}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.previewTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cardDonor && hasPhoto ? (
                  <>
                    {isPreview ? (
                      <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {t.previewPending}
                      </div>
                    ) : null}
                    <DonorEidCard
                      donor={cardDonor}
                      labels={cardLabels}
                      stats={donorStats}
                      useMyanmarDigits={locale === "mm"}
                      isPreview={isPreview}
                      photoUrlOverride={pendingPhotoUrl}
                    />
                  </>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    {donor ? t.previewEmpty : t.noDonor}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AuthedShell>
      </div>

      {donor?.eid ? (
        <div className="fixed inset-0 z-[100] hidden bg-white p-8 print:block">
          <DonorEidCard
            donor={donor}
            labels={cardLabels}
            stats={donorStats}
            useMyanmarDigits={locale === "mm"}
            className="mx-auto"
          />
        </div>
      ) : null}
    </>
  )
}
