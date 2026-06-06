"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2Icon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

import { DataTable } from "./data-table"
import { getColumns } from "./columns"
import {
  BloodTypeSchema,
  deleteDonors,
  getNextDonorIdPreview,
  listDonations,
  listDonors,
  resetDonorLocalData,
  upsertDonor,
  type DonationRecord,
  type Donor,
} from "@/lib/donor-store"
import {
  buildDashboardFacets,
  buildDashboardRowPredicate,
  parseDonorListPreset,
} from "@/lib/donor-dashboard-navigation"
import { PermissionDeniedError } from "@/lib/permissions"
import { usePermissions } from "@/hooks/use-permissions"
import type { RowSelectionState } from "@tanstack/react-table"

const DonorFormSchema = z.object({
  nrc: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().int().min(16).max(80),
  bloodType: BloodTypeSchema,
  gender: z.enum(["male", "female", "other"]).nullable(),
  contactPhone: z.string().min(1, "Phone is required"),
  contactEmail: z.string().optional(),
  contactAddress: z.string().optional(),
  township: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
})

type DonorFormInput = z.input<typeof DonorFormSchema>
type DonorFormValues = z.output<typeof DonorFormSchema>

export default function Page() {
  return (
    <Suspense
      fallback={
        <AuthedShell title="Donor Registration">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-[320px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </AuthedShell>
      }
    >
      <DonorRegistrationPageContent />
    </Suspense>
  )
}

function DonorRegistrationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetKey = searchParams.toString()
  const { locale } = useLocale()
  const { canDeleteDonors, canResetData } = usePermissions()
  const [donors, setDonors] = useState<Donor[]>([])
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [pendingDeleteLabel, setPendingDeleteLabel] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [donorIdPreview, setDonorIdPreview] = useState<string>("")
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([])
  const [, startTransition] = useTransition()

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        shellTitle: "Donor Registration",
        donorListTitle: "Donor List",
        export: "Export",
        exportSelected: (count: number) => `Export selected (${count})`,
        exportFiltered: (count: number) => `Export filtered (${count})`,
        filteredCount: (count: number) =>
          `${count} record(s) match current filters.`,
        deleteSelected: "Delete Selected",
        clearSelection: "Clear Selection",
        newDonor: "New Donor",
        refresh: "Refresh",
        empty: "No donors yet. Click “New Donor” to register.",
        searchPlaceholder: "Search (ID / name)...",
        confirmTitle: "Delete donor(s)?",
        confirmDesc:
          "This will permanently delete donor data. This action cannot be undone.",
        cancel: "Cancel",
        delete: "Delete",
        editDonor: "Edit Donor",
        registerNew: "Register New Donor",
        donorId: "Donor ID",
        nrc: "NRC",
        name: "Name",
        age: "Age",
        bloodType: "Blood type",
        gender: "Gender",
        phone: "Phone",
        email: "Email",
        contactAddress: "Address",
        contactGroup: "Contact",
        addressGroup: "Address",
        township: "Township",
        city: "City",
        fullAddress: "Full address",
        selectPlaceholder: "Select...",
        male: "Male",
        female: "Female",
        other: "Other",
        nrcPlaceholder: "e.g. 12/ABC(N)123456",
        namePlaceholder: "e.g. Aung Aung",
        phonePlaceholder: "e.g. 09xxxxxxxx",
        emailPlaceholder: "e.g. name@example.com",
        contactAddressPlaceholder: "e.g. emergency contact",
        townshipPlaceholder: "e.g. Hlaing",
        cityPlaceholder: "e.g. Yangon",
        addressPlaceholder: "Street, ward, etc",
        update: "Update",
        register: "Register",
        showing: (from: number, to: number, total: number) =>
          `Showing ${from}-${to} of ${total}`,
        selected: (selected: number, total: number) =>
          `${selected} of ${total} row(s) selected.`,
        noResults: "No results.",
        rows: "Rows",
        clear: "Clear",
        allFilter: "All",
        notSet: "Not set",
        filters: "Filters",
        groupBy: "Group By",
        groupByNone: "None",
        groupCount: (count: number) => `${count} donor(s)`,
        clearAll: "Clear all",
        searchPrefix: "Search",
        groupByPrefix: "Group by",
        addCustomFilter: "Add custom filter",
        addCustomGroupBy: "Add custom group",
        customFilterTitle: "Custom filter",
        customGroupByTitle: "Custom group by",
        customField: "Field",
        customOperator: "Operator",
        customValue: "Value",
        customApply: "Apply",
        customCancel: "Cancel",
        customSelectField: "Select field",
        customSelectOperator: "Select operator",
        customEnterValue: "Enter value",
        opContains: "contains",
        opEquals: "is",
        opNotEquals: "is not",
        opStartsWith: "starts with",
        opIsEmpty: "is empty",
        opIsNotEmpty: "is not empty",
        opGt: ">",
        opGte: ">=",
        opLt: "<",
        opLte: "<=",
        discardTitle: "Discard changes?",
        discardDesc:
          "You have unsaved changes. Are you sure you want to close this form?",
        stay: "Stay",
        discard: "Discard",
        reset: "Reset Data",
        resetTitle: "Reset donor data?",
        resetDesc:
          "This will delete all locally saved donors and donations, and restore the default demo donors.",
        permissionDenied:
          "You do not have permission to perform this action.",
        viewTotal: "Total donors",
        viewEligible: "Eligible now",
        viewDonations: "With donations in period",
        viewSoon: "Eligible within 7 days",
        registeredBetween: (from: string, to: string) =>
          `Registered: ${from} – ${to}`,
        donationsBetween: (from: string, to: string) =>
          `Donations: ${from} – ${to}`,
      } as const
    }

    return {
      shellTitle: "Donor မှတ်ပုံတင်ခြင်း",
      donorListTitle: "Donor စာရင်း",
      export: "Export",
      exportSelected: (count: number) => `Export selected (${count})`,
      exportFiltered: (count: number) => `Export filtered (${count})`,
      filteredCount: (count: number) =>
        `filter/group နဲ့ match ဖြစ်တာ ${count} ခု`,
      deleteSelected: "ရွေးထားတာတွေ ဖျက်မယ်",
      clearSelection: "ရွေးထားတာတွေ ဖျက်ပါ",
      newDonor: "Donor အသစ်",
      refresh: "Refresh",
      empty: "Donor မရှိသေးပါ။ `Donor အသစ်` ကိုနှိပ်ပြီး မှတ်ပုံတင်ပါ။",
      searchPlaceholder: "Search (ID / အမည်)...",
      confirmTitle: "Donor ဖျက်မလား?",
      confirmDesc: "သေချာလား? ဖျက်ပြီးသွားရင် ပြန်မရနိုင်ပါ။",
      cancel: "မလုပ်တော့ဘူး",
      delete: "ဖျက်မယ်",
      editDonor: "Donor ပြင်ဆင်ရန်",
      registerNew: "Donor အသစ်မှတ်ပုံတင်ရန်",
      donorId: "Donor ID",
      nrc: "မှတ်ပုံတင်နံပါတ် (NRC)",
      name: "အမည်",
      age: "အသက်",
      bloodType: "သွေးအမျိုးအစား",
      gender: "ကျား/မ",
      phone: "ဖုန်း",
      email: "အီးမေးလ်",
      contactAddress: "လိပ်စာ",
      contactGroup: "ဆက်သွယ်ရန်",
      addressGroup: "နေရပ်လိပ်စာ",
      township: "မြို့နယ်",
      city: "မြို့",
      fullAddress: "အသေးစိတ်လိပ်စာ",
      selectPlaceholder: "ရွေးချယ်ပါ",
      male: "ကျား",
      female: "မ",
      other: "အခြား",
      nrcPlaceholder: "ဥပမာ - 12/ABC(N)123456",
      namePlaceholder: "ဥပမာ - Aung Aung",
      phonePlaceholder: "ဥပမာ - 09xxxxxxxx",
      emailPlaceholder: "ဥပမာ - name@example.com",
      contactAddressPlaceholder: "ဥပမာ - အရေးပေါ်ဆက်သွယ်ရန်",
      townshipPlaceholder: "ဥပမာ - လှိုင်",
      cityPlaceholder: "ဥပမာ - ရန်ကုန်",
      addressPlaceholder: "လမ်း/ရပ်ကွက် စသည်",
      update: "Update",
      register: "Register",
      showing: (from: number, to: number, total: number) =>
        `ပြထားသည် ${from}-${to} / စုစုပေါင်း ${total}`,
      selected: (selected: number, total: number) =>
        `ရွေးထားသည် ${selected} / ${total}`,
      noResults: "မတွေ့ပါ။",
      rows: "Rows",
      clear: "Clear",
      allFilter: "အားလုံး",
      notSet: "မသတ်မှတ်ရသေး",
      filters: "Filter",
      groupBy: "Group By",
      groupByNone: "မရှိ",
      groupCount: (count: number) => `donor ${count} ဦး`,
      clearAll: "အားလုံးဖျက်မယ်",
      searchPrefix: "Search",
      groupByPrefix: "Group by",
      addCustomFilter: "Custom filter ထည့်မယ်",
      addCustomGroupBy: "Custom group ထည့်မယ်",
      customFilterTitle: "Custom filter",
      customGroupByTitle: "Custom group by",
      customField: "Field",
      customOperator: "Operator",
      customValue: "Value",
      customApply: "Apply",
      customCancel: "Cancel",
      customSelectField: "Field ရွေးပါ",
      customSelectOperator: "Operator ရွေးပါ",
      customEnterValue: "Value ထည့်ပါ",
      opContains: "contains",
      opEquals: "is",
      opNotEquals: "is not",
      opStartsWith: "starts with",
      opIsEmpty: "is empty",
      opIsNotEmpty: "is not empty",
      opGt: ">",
      opGte: ">=",
      opLt: "<",
      opLte: "<=",
      discardTitle: "ဖြည့်ပြီးသားတွေ ဖျက်မလား?",
      discardDesc:
        "မသိမ်းရသေးတဲ့ အချက်အလက်တွေ ရှိပါတယ်။ တကယ်ပိတ်မှာ သေချာလား?",
      stay: "မပိတ်တော့ဘူး",
      discard: "ပိတ်မယ်",
      reset: "Reset Data",
      resetTitle: "Data တွေ reset လုပ်မလား?",
      resetDesc:
        "Local ထဲမှာ သိမ်းထားတဲ့ donors/donations အကုန်ဖျက်ပြီး demo donors ကို အသစ်ပြန်ပြပါမယ်။",
      permissionDenied: "ဒီလုပ်ဆောင်ချက်ကို လုပ်ခွင့် မရှိပါ။",
      viewTotal: "Donor စုစုပေါင်း",
      viewEligible: "ယခုလှူနိုင်သူ",
      viewDonations: "ကာလအတွင်း လှူဒါန်းမှု ရှိ",
      viewSoon: "၇ ရက်အတွင်း လှူနိုင်မည့်သူ",
      registeredBetween: (from: string, to: string) =>
        `မှတ်ပုံတင်သည့်နေ့: ${from} – ${to}`,
      donationsBetween: (from: string, to: string) =>
        `လှူဒါန်းမှု: ${from} – ${to}`,
    } as const
  }, [locale])

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

  const dashboardPreset = useMemo(
    () => parseDonorListPreset(searchParams),
    [searchParams, presetKey]
  )

  const dashboardInitialFacets = useMemo(() => {
    if (!dashboardPreset) return undefined
    return buildDashboardFacets(dashboardPreset, {
      viewTotal: t.viewTotal,
      viewEligible: t.viewEligible,
      viewDonations: t.viewDonations,
      viewSoon: t.viewSoon,
      bloodType: t.bloodType,
      groupByPrefix: t.groupByPrefix,
      registeredBetween: t.registeredBetween,
      donationsBetween: t.donationsBetween,
      groupFieldLabels: {
        bloodType: t.bloodType,
        gender: t.gender,
        city: t.city,
        township: t.township,
      },
    })
  }, [dashboardPreset, t])

  const dashboardRowPredicate = useMemo(() => {
    if (!dashboardPreset) return undefined
    return buildDashboardRowPredicate(dashboardPreset, donations)
  }, [dashboardPreset, donations])

  const searchRowText = useCallback(
    (donor: Donor) =>
      [
        donor.donorId,
        donor.name,
        donor.nrc,
        donor.contactPhone,
        donor.contactEmail,
        donor.township,
        donor.city,
      ]
        .filter(Boolean)
        .join(" "),
    []
  )

  const handleFilteredRowsChange = useCallback((rows: Donor[]) => {
    startTransition(() => {
      setFilteredDonors(rows)
    })
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setFilteredDonors(donors)
    }
  }, [donors, isLoading])

  function refresh() {
    setIsLoading(true)
    setDonors(listDonors())
    setDonations(listDonations())
    setIsLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!donorIdPreview) {
      setDonorIdPreview(getNextDonorIdPreview())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function requestDelete(ids: string[], label: string) {
    setPendingDeleteIds(ids)
    setPendingDeleteLabel(label)
    setIsDeleteConfirmOpen(true)
  }

  function confirmDelete() {
    try {
      deleteDonors(pendingDeleteIds)
      setRowSelection({})
      setIsDeleteConfirmOpen(false)
      setPendingDeleteIds([])
      setPendingDeleteLabel("")
      refresh()
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
        setIsDeleteConfirmOpen(false)
      } else {
        throw err
      }
    }
  }

  function onNew() {
    setDonorIdPreview(getNextDonorIdPreview())
    form.reset({
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
    })
  }

  function onView(donor: Donor) {
    router.push(`/donor/registration/${donor.id}`)
  }

  function onEdit(donor: Donor) {
    router.push(`/donor/registration/${donor.id}/edit`)
  }

  function requestCloseForm() {
    if (form.formState.isDirty) {
      setIsDiscardConfirmOpen(true)
      return
    }
    setIsDialogOpen(false)
  }

  function confirmDiscard() {
    setIsDiscardConfirmOpen(false)
    onNew()
    setIsDialogOpen(false)
  }

  function onSubmit(values: DonorFormValues) {
    const contact = [values.contactPhone, values.contactEmail, values.contactAddress]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" / ")

    upsertDonor({
      contact,
      ...values,
    })
    refresh()
    onNew()
    setIsDialogOpen(false)
  }

  const columns = useMemo(
    () =>
      getColumns({
        onView,
        onEdit,
        canDelete: canDeleteDonors,
        onDelete: canDeleteDonors
          ? (donor) => {
              requestDelete([donor.id], `${donor.donorId} • ${donor.name}`)
            }
          : undefined,
        locale,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, canDeleteDonors]
  )

  const filterGroups = useMemo(
    () => [
      {
        id: "bloodType",
        columnId: "bloodType",
        label: t.bloodType,
        options: bloodTypes.map((type) => ({ value: type, label: type })),
      },
      {
        id: "gender",
        columnId: "gender",
        label: t.gender,
        options: [
          { value: "male", label: t.male },
          { value: "female", label: t.female },
          { value: "other", label: t.other },
          { value: "__empty__", label: t.notSet },
        ],
      },
    ],
    [bloodTypes, t]
  )

  const searchFields = useMemo(
    () => [
      { id: "donorId", label: t.donorId, getValue: (donor: Donor) => donor.donorId },
      { id: "name", label: t.name, getValue: (donor: Donor) => donor.name },
      { id: "nrc", label: t.nrc, getValue: (donor: Donor) => donor.nrc },
      {
        id: "contactPhone",
        label: t.phone,
        getValue: (donor: Donor) => donor.contactPhone,
      },
      {
        id: "contactEmail",
        label: t.email,
        getValue: (donor: Donor) => donor.contactEmail,
      },
      { id: "city", label: t.city, getValue: (donor: Donor) => donor.city },
      {
        id: "township",
        label: t.township,
        getValue: (donor: Donor) => donor.township,
      },
    ],
    [t]
  )

  const groupByFields = useMemo(
    () => [
      { columnId: "bloodType", label: t.bloodType },
      { columnId: "gender", label: t.gender },
      { columnId: "city", label: t.city },
      { columnId: "township", label: t.township },
    ],
    [t]
  )

  const operatorLabels = useMemo(
    () => ({
      contains: t.opContains,
      equals: t.opEquals,
      notEquals: t.opNotEquals,
      startsWith: t.opStartsWith,
      isEmpty: t.opIsEmpty,
      isNotEmpty: t.opIsNotEmpty,
      gt: t.opGt,
      gte: t.opGte,
      lt: t.opLt,
      lte: t.opLte,
    }),
    [t]
  )

  const customFilterFields = useMemo(
    () => [
      { columnId: "donorId", label: t.donorId, type: "text" as const },
      { columnId: "name", label: t.name, type: "text" as const },
      { columnId: "nrc", label: t.nrc, type: "text" as const },
      { columnId: "age", label: t.age, type: "number" as const },
      {
        columnId: "bloodType",
        label: t.bloodType,
        type: "enum" as const,
        enumOptions: bloodTypes.map((type) => ({ value: type, label: type })),
      },
      {
        columnId: "gender",
        label: t.gender,
        type: "enum" as const,
        enumOptions: [
          { value: "male", label: t.male },
          { value: "female", label: t.female },
          { value: "other", label: t.other },
          { value: "__empty__", label: t.notSet },
        ],
      },
      { columnId: "contactPhone", label: t.phone, type: "text" as const },
      { columnId: "contactEmail", label: t.email, type: "text" as const },
      { columnId: "contactAddress", label: t.contactAddress, type: "text" as const },
      { columnId: "city", label: t.city, type: "text" as const },
      { columnId: "township", label: t.township, type: "text" as const },
      { columnId: "address", label: t.fullAddress, type: "text" as const },
    ],
    [bloodTypes, t]
  )

  const customGroupByFields = useMemo(
    () => [
      { columnId: "donorId", label: t.donorId },
      { columnId: "name", label: t.name },
      { columnId: "nrc", label: t.nrc },
      { columnId: "age", label: t.age },
      { columnId: "bloodType", label: t.bloodType },
      { columnId: "gender", label: t.gender },
      { columnId: "contactPhone", label: t.phone },
      { columnId: "contactEmail", label: t.email },
      { columnId: "contactAddress", label: t.contactAddress },
      { columnId: "city", label: t.city },
      { columnId: "township", label: t.township },
      { columnId: "address", label: t.fullAddress },
    ],
    [t]
  )

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection]
  )

  const filteredDonorIdsKey = useMemo(
    () => filteredDonors.map((donor) => donor.id).join("\0"),
    [filteredDonors]
  )

  const isFilteredView = filteredDonors.length !== donors.length

  const exportSelectedDonors = useMemo(() => {
    if (selectedIds.length === 0) return []
    const byId = new Map(donors.map((donor) => [donor.id, donor] as const))
    const filteredIds = new Set(filteredDonors.map((donor) => donor.id))
    return selectedIds
      .map((id) => byId.get(id))
      .filter(
        (donor): donor is Donor =>
          !!donor && filteredIds.has(donor.id)
      )
  }, [donors, filteredDonors, selectedIds])

  useEffect(() => {
    if (filteredDonors.length === 0) return
    const allowedIds = new Set(filteredDonors.map((donor) => donor.id))
    setRowSelection((previous) => {
      const nextEntries = Object.entries(previous).filter(
        ([id, selected]) => selected && allowedIds.has(id)
      )
      if (nextEntries.length === Object.keys(previous).filter((k) => previous[k]).length) {
        return previous
      }
      return Object.fromEntries(nextEntries)
    })
  }, [filteredDonorIdsKey, filteredDonors.length])

  function exportDonorsToCsv(rows: Donor[]) {
    if (rows.length === 0) return
    const header = [
      "donorId",
      "name",
      "nrc",
      "age",
      "bloodType",
      "gender",
      "contactPhone",
      "contactEmail",
      "contactAddress",
      "township",
      "city",
      "address",
      "createdAt",
    ]
    const escape = (value: unknown) => {
      const s = String(value ?? "")
      const needs = /[",\n]/.test(s)
      return needs ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [
      header.join(","),
      ...rows.map((d) =>
        [
          d.donorId,
          d.name,
          d.nrc,
          d.age,
          d.bloodType,
          d.gender,
          d.contactPhone,
          d.contactEmail,
          d.contactAddress,
          d.township,
          d.city,
          d.address,
          d.createdAt,
        ]
          .map(escape)
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `donors-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function handleExport() {
    if (exportSelectedDonors.length > 0) {
      exportDonorsToCsv(exportSelectedDonors)
      return
    }
    if (isFilteredView && filteredDonors.length > 0) {
      exportDonorsToCsv(filteredDonors)
    }
  }

  const exportLabel =
    exportSelectedDonors.length > 0
      ? t.exportSelected(exportSelectedDonors.length)
      : isFilteredView
        ? t.exportFiltered(filteredDonors.length)
        : t.export

  function requestReset() {
    setIsResetConfirmOpen(true)
  }

  function confirmReset() {
    try {
      resetDonorLocalData()
      setRowSelection({})
      setIsResetConfirmOpen(false)
      onNew()
      refresh()
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        toast.error(t.permissionDenied)
        setIsResetConfirmOpen(false)
      } else {
        throw err
      }
    }
  }

  return (
    <AuthedShell title={t.shellTitle}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <CardTitle className="text-base">{t.donorListTitle}</CardTitle>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {exportSelectedDonors.length > 0 ? (
                <>
                  <Button variant="secondary" onClick={handleExport}>
                    {t.exportSelected(exportSelectedDonors.length)}
                  </Button>
                  {canDeleteDonors ? (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        requestDelete(
                          exportSelectedDonors.map((donor) => donor.id),
                          `${exportSelectedDonors.length} donor(s)`
                        )
                      }}
                    >
                      {t.deleteSelected}
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => setRowSelection({})}>
                    {t.clearSelection}
                  </Button>
                </>
              ) : isFilteredView && filteredDonors.length > 0 ? (
                <Button variant="secondary" onClick={handleExport}>
                  {t.exportFiltered(filteredDonors.length)}
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  onNew()
                  setIsDialogOpen(true)
                }}
              >
                {t.newDonor}
              </Button>
              {canResetData ? (
                <Button variant="outline" onClick={requestReset}>
                  {t.reset}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={refresh}>
                {t.refresh}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 gap-2">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-28 rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-[90px] rounded-lg" />
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[120px]" />
                      <Skeleton className="ml-auto h-4 w-[28px]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-[220px]" />
                <Skeleton className="h-8 w-[240px]" />
              </div>
            </div>
          ) : donors.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t.empty}</div>
          ) : (
            <DataTable
              key={presetKey || "default"}
              columns={columns}
              data={donors}
              initialFacets={dashboardInitialFacets}
              rowPredicate={dashboardRowPredicate}
              searchPlaceholder={t.searchPlaceholder}
              searchRowText={searchRowText}
              filterGroups={filterGroups}
              groupByFields={groupByFields}
              customFilterFields={customFilterFields}
              customGroupByFields={customGroupByFields}
              searchFields={searchFields}
              formatGroupValue={(columnId, value) => {
                if (columnId === "gender") {
                  if (value === "male") return t.male
                  if (value === "female") return t.female
                  if (value === "other") return t.other
                  return t.notSet
                }
                if (columnId === "city" || columnId === "township") {
                  if (
                    value == null ||
                    (typeof value === "string" && !value.trim())
                  ) {
                    return t.notSet
                  }
                }
                return String(value ?? t.notSet)
              }}
              getRowId={(row) => (row as Donor).id}
              getColumnLabel={(id) => {
                const map =
                  locale === "en"
                    ? {
                        donorId: "Donor ID",
                        name: "Name",
                        nrc: "NRC",
                        age: "Age",
                        bloodType: "Blood type",
                        gender: "Gender",
                        contactPhone: "Phone",
                        contactEmail: "Email",
                        township: "Township",
                        city: "City",
                        address: "Address",
                      }
                    : {
                        donorId: "Donor ID",
                        name: "အမည်",
                        nrc: "NRC",
                        age: "အသက်",
                        bloodType: "သွေးအမျိုးအစား",
                        gender: "ကျား/မ",
                        contactPhone: "ဖုန်း",
                        contactEmail: "အီးမေးလ်",
                        township: "မြို့နယ်",
                        city: "မြို့",
                        address: "လိပ်စာ",
                      }
                return (map as Record<string, string>)[id] ?? id
              }}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onFilteredRowsChange={handleFilteredRowsChange}
              onExport={
                exportSelectedDonors.length > 0 ||
                (isFilteredView && filteredDonors.length > 0)
                  ? handleExport
                  : undefined
              }
              exportLabel={exportLabel}
              labels={{
                rows: t.rows,
                filters: t.filters,
                groupBy: t.groupBy,
                clearAll: t.clearAll,
                searchPrefix: t.searchPrefix,
                groupByPrefix: t.groupByPrefix,
                groupCount: t.groupCount,
                addCustomFilter: t.addCustomFilter,
                addCustomGroupBy: t.addCustomGroupBy,
                customFilterTitle: t.customFilterTitle,
                customGroupByTitle: t.customGroupByTitle,
                customField: t.customField,
                customOperator: t.customOperator,
                customValue: t.customValue,
                customApply: t.customApply,
                customCancel: t.customCancel,
                customSelectField: t.customSelectField,
                customSelectOperator: t.customSelectOperator,
                customEnterValue: t.customEnterValue,
                operatorLabels,
                columns: locale === "en" ? "Columns" : "ကော်လံများ",
                toggleColumns:
                  locale === "en"
                    ? "Show/Hide columns"
                    : "ကော်လံတွေ အဖော်/အဖျောက်",
                noResults: t.noResults,
                showing: t.showing,
                selected: t.selected,
                filteredCount: t.filteredCount,
                selectAllFiltered: (total) =>
                  locale === "en"
                    ? `Select all ${total} rows`
                    : `အားလုံးရွေးမယ် (${total})`,
                allFilteredSelected: (total) =>
                  locale === "en"
                    ? `All ${total} rows are selected.`
                    : `အားလုံးရွေးပြီးပါပြီ (${total})`,
              }}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDesc}{" "}
              {pendingDeleteLabel ? (
                <span className="font-medium text-foreground">
                  ({pendingDeleteLabel})
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setPendingDeleteIds([])
                setPendingDeleteLabel("")
              }}
            >
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-muted text-foreground dark:bg-input/40">
              <Trash2Icon />
            </AlertDialogMedia>
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

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>{t.resetTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.resetDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmReset}>
              {t.reset}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(next) => {
          if (next) setIsDialogOpen(true)
          else requestCloseForm()
        }}
      >
        <DialogContent className="tracking-normal sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.registerNew}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-2">
                <Label>{t.donorId}</Label>
                <Input
                  value={donorIdPreview}
                  disabled
                  className="font-mono"
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.name}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.namePlaceholder} {...field} />
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
                      <Input placeholder={t.nrcPlaceholder} {...field} />
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
                        <Input placeholder={t.phonePlaceholder} {...field} />
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
                        <Input placeholder={t.emailPlaceholder} {...field} />
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
                      <Input
                        placeholder={t.contactAddressPlaceholder}
                        {...field}
                      />
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
                        <Input placeholder={t.townshipPlaceholder} {...field} />
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
                        <Input placeholder={t.cityPlaceholder} {...field} />
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
                      <Textarea placeholder={t.addressPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={requestCloseForm}>
                  {t.cancel}
                </Button>
                <Button type="submit">{t.register}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AuthedShell>
  )
}

