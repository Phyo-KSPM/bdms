"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/i18n/locale-provider"
import {
  formatDonorDateTime,
  formatMedicalKeyList,
  getDonorEidCardLabels,
} from "@/app/donor/registration/_components/donor-profile-i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DonorEidCard } from "@/components/donor-eid-card"
import { DonationDetailsStep } from "@/app/donor/registration/_components/steps/DonationDetailsStep"
import { MedicalHistoryStep } from "@/app/donor/registration/_components/steps/MedicalHistoryStep"
import { ScreeningStep } from "@/app/donor/registration/_components/steps/ScreeningStep"
import type {
  DonationRecord,
  Donor,
  ScreeningVisit,
} from "@/lib/donor-store"
import { getNextEidPreview } from "@/lib/donor-store"

type DonorRelatedNotebookLabels = {
  notebookTitle: string
  donations: string
  screening: string
  medical: string
  donationInfo: string
  noDonations: string
  noVisits: string
  donationId: string
  donatedAt: string
  donationType: string
  volume: string
  bagStatus: string
  visitDate: string
  visitStatus: string
  screenedBy: string
  weight: string
  bp: string
  pulse: string
  hb: string
  conditions: string
  infectiousFlags: string
  medications: string
  medicalNotes: string
  preferredType: string
  donationNotes: string
  none: string
  ml: string
  eidCard: string
  eidStatusIssued: string
  eidStatusPending: string
  eidNotIssuedHint: string
  eidNoPhotoHint: string
  eidIssuedAt: string
  eidPreviewHint: string
  openEidPage: string
}

type DonorRelatedNotebookEditLabels = {
  screening: {
    weightKg: string
    weightLbHint: (lb: number) => string
    bpSystolic: string
    bpDiastolic: string
    pulse: string
    hb: string
    lastDonationDate: string
    neverDonatedHint: string
  }
  medical: {
    conditions: string
    infectious: string
    medications: string
    notes: string
  }
  donation: {
    donationType: string
    notes: string
    selectPlaceholder: string
  }
}

type DonorRelatedNotebookProps = {
  donor: Donor
  donations: DonationRecord[]
  visits: ScreeningVisit[]
  labels: DonorRelatedNotebookLabels
  formatBagStatus: (status: DonationRecord["bloodBagStatus"]) => string
  formatVisitStatus: (status: ScreeningVisit["status"]) => string
  formatDonationType: (type: Donor["donationDetails"]["donationType"]) => string
  control?: any
  editLabels?: DonorRelatedNotebookEditLabels
  conditionOptions?: readonly { key: string; label: string }[]
  infectiousOptions?: readonly { key: string; label: string }[]
  donationTypes?: readonly { key: string; label: string }[]
}

function ReadonlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  )
}

export function DonorRelatedNotebook({
  donor,
  donations,
  visits,
  labels,
  formatBagStatus,
  formatVisitStatus,
  formatDonationType,
  control,
  editLabels,
  conditionOptions,
  infectiousOptions,
  donationTypes,
}: DonorRelatedNotebookProps) {
  const { locale } = useLocale()
  const isEditing = Boolean(control && editLabels)
  const eidCardLabels = useMemo(() => getDonorEidCardLabels(locale), [locale])

  const eidStats = useMemo(() => {
    const sorted = donations
      .slice()
      .sort(
        (a, b) =>
          new Date(a.donatedAt).getTime() - new Date(b.donatedAt).getTime()
      )
    return {
      donationCount: donations.length,
      firstDonationDate: sorted[0]?.donatedAt ?? null,
      lastDonationDate: sorted.at(-1)?.donatedAt ?? null,
    }
  }, [donations])

  const hasEid = Boolean(donor.eid?.trim())
  const hasPhoto = Boolean(donor.photoUrl?.trim())
  const previewEid = useMemo(() => getNextEidPreview(), [donor.id])
  const eidTabStatus = hasEid ? labels.eidStatusIssued : labels.eidStatusPending

  return (
    <div className="border-t pt-5">
      <h3 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {labels.notebookTitle}
      </h3>
        <Tabs defaultValue="donations">
          <TabsList
            variant="line"
            className="mb-4 h-auto w-full flex-wrap justify-start gap-x-1 gap-y-1"
          >
            <TabsTrigger value="donations" className="flex-none px-3">
              {labels.donations} ({donations.length})
            </TabsTrigger>
            <TabsTrigger value="screening" className="flex-none px-3">
              {labels.screening} ({visits.length})
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex-none px-3">
              {labels.medical}
            </TabsTrigger>
            <TabsTrigger value="donation-info" className="flex-none px-3">
              {labels.donationInfo}
            </TabsTrigger>
            <TabsTrigger value="eid-card" className="flex-none gap-1.5 px-3">
              {labels.eidCard}
              <Badge
                variant={hasEid ? "default" : "secondary"}
                className={
                  hasEid
                    ? "bg-emerald-600 text-white hover:bg-emerald-600"
                    : undefined
                }
              >
                {eidTabStatus}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="donations">
            {donations.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noDonations}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{labels.donationId}</TableHead>
                      <TableHead>{labels.donatedAt}</TableHead>
                      <TableHead>{labels.donationType}</TableHead>
                      <TableHead>{labels.volume}</TableHead>
                      <TableHead>{labels.bagStatus}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono text-xs">
                          {record.donationId}
                        </TableCell>
                        <TableCell>
                          {formatDonorDateTime(record.donatedAt, locale)}
                        </TableCell>
                        <TableCell>
                          {record.donationType
                            ? formatDonationType(record.donationType)
                            : labels.none}
                        </TableCell>
                        <TableCell>
                          {record.volumeMl
                            ? `${record.volumeMl} ${labels.ml}`
                            : labels.none}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatBagStatus(record.bloodBagStatus)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="screening" className="space-y-4">
            {isEditing && control && editLabels ? (
              <ScreeningStep control={control} t={editLabels.screening} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <ReadonlyField
                  label={labels.weight}
                  value={
                    donor.screening.weightKg != null
                      ? `${donor.screening.weightKg} kg`
                      : labels.none
                  }
                />
                <ReadonlyField
                  label={labels.bp}
                  value={
                    donor.screening.bpSystolic != null &&
                    donor.screening.bpDiastolic != null
                      ? `${donor.screening.bpSystolic}/${donor.screening.bpDiastolic}`
                      : labels.none
                  }
                />
                <ReadonlyField
                  label={labels.pulse}
                  value={
                    donor.screening.pulse != null
                      ? String(donor.screening.pulse)
                      : labels.none
                  }
                />
                <ReadonlyField
                  label={labels.hb}
                  value={
                    donor.screening.hb != null
                      ? String(donor.screening.hb)
                      : labels.none
                  }
                />
              </div>
            )}

            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noVisits}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{labels.visitDate}</TableHead>
                      <TableHead>{labels.visitStatus}</TableHead>
                      <TableHead>{labels.screenedBy}</TableHead>
                      <TableHead>{labels.bp}</TableHead>
                      <TableHead>{labels.hb}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>
                          {formatDonorDateTime(visit.createdAt, locale)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatVisitStatus(visit.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{visit.screenedBy || labels.none}</TableCell>
                        <TableCell>
                          {visit.vitals.bpSystolic != null &&
                          visit.vitals.bpDiastolic != null
                            ? `${visit.vitals.bpSystolic}/${visit.vitals.bpDiastolic}`
                            : labels.none}
                        </TableCell>
                        <TableCell>
                          {visit.vitals.hb != null
                            ? String(visit.vitals.hb)
                            : labels.none}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="medical" className="space-y-3">
            {isEditing && control && editLabels && conditionOptions && infectiousOptions ? (
              <MedicalHistoryStep
                control={control}
                conditions={conditionOptions}
                infectious={infectiousOptions}
                t={editLabels.medical}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadonlyField
                  label={labels.conditions}
                  value={
                    donor.medical.conditions.length
                      ? formatMedicalKeyList(
                          donor.medical.conditions,
                          conditionOptions ?? []
                        )
                      : labels.none
                  }
                />
                <ReadonlyField
                  label={labels.infectiousFlags}
                  value={
                    donor.medical.infectiousFlags.length
                      ? formatMedicalKeyList(
                          donor.medical.infectiousFlags,
                          infectiousOptions ?? []
                        )
                      : labels.none
                  }
                />
                <ReadonlyField
                  label={labels.medications}
                  value={donor.medical.medications || labels.none}
                />
                <ReadonlyField
                  label={labels.medicalNotes}
                  value={donor.medical.notes || labels.none}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="donation-info" className="space-y-3">
            {isEditing && control && editLabels && donationTypes ? (
              <DonationDetailsStep
                control={control}
                donationTypes={donationTypes}
                t={editLabels.donation}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadonlyField
                  label={labels.preferredType}
                  value={formatDonationType(donor.donationDetails.donationType)}
                />
                <ReadonlyField
                  label={labels.donationNotes}
                  value={donor.donationDetails.notes || labels.none}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="eid-card" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant={hasEid ? "default" : "outline"}
                className={
                  hasEid
                    ? "bg-emerald-600 text-white hover:bg-emerald-600"
                    : "text-amber-700 dark:text-amber-300"
                }
              >
                {hasEid ? labels.eidStatusIssued : labels.eidStatusPending}
              </Badge>
              {hasEid && donor.eidIssuedAt ? (
                <p className="text-sm text-muted-foreground">
                  {labels.eidIssuedAt}:{" "}
                  {formatDonorDateTime(donor.eidIssuedAt, locale)}
                </p>
              ) : null}
            </div>

            {hasEid ? (
              <DonorEidCard
                donor={donor}
                labels={eidCardLabels}
                stats={eidStats}
                useMyanmarDigits={locale === "mm"}
                className="mx-auto max-w-[540px]"
              />
            ) : hasPhoto ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {labels.eidPreviewHint}
                </p>
                <DonorEidCard
                  donor={{
                    ...donor,
                    eid: previewEid,
                  }}
                  labels={eidCardLabels}
                  stats={eidStats}
                  useMyanmarDigits={locale === "mm"}
                  isPreview
                  className="mx-auto max-w-[540px]"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {labels.eidNoPhotoHint}
              </p>
            )}

            {!hasEid ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {labels.eidNotIssuedHint}
                </p>
                <Link
                  href={`/donor/certificate?donorId=${encodeURIComponent(donor.donorId)}${donor.eid ? `&eid=${encodeURIComponent(donor.eid)}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    {labels.openEidPage}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex justify-center">
                <Link
                  href={`/donor/certificate?donorId=${encodeURIComponent(donor.donorId)}${donor.eid ? `&eid=${encodeURIComponent(donor.eid)}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    {labels.openEidPage}
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
    </div>
  )
}
