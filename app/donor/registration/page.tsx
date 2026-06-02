"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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

import { DataTable } from "./data-table"
import { getColumns } from "./columns"
import {
  BloodTypeSchema,
  deleteDonors,
  getNextDonorIdPreview,
  listDonors,
  resetDonorLocalData,
  upsertDonor,
  type Donor,
} from "@/lib/donor-store"
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
  const router = useRouter()
  const { locale } = useLocale()
  const [donors, setDonors] = useState<Donor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [pendingDeleteLabel, setPendingDeleteLabel] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [donorIdPreview, setDonorIdPreview] = useState<string>("")
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        shellTitle: "Donor Registration",
        donorListTitle: "Donor List",
        export: "Export",
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
        discardTitle: "Discard changes?",
        discardDesc:
          "You have unsaved changes. Are you sure you want to close this form?",
        stay: "Stay",
        discard: "Discard",
        reset: "Reset Data",
        resetTitle: "Reset donor data?",
        resetDesc:
          "This will delete all locally saved donors and donations, and restore the default demo donors.",
      } as const
    }

    return {
      shellTitle: "Donor မှတ်ပုံတင်ခြင်း",
      donorListTitle: "Donor စာရင်း",
      export: "Export",
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
      discardTitle: "ဖြည့်ပြီးသားတွေ ဖျက်မလား?",
      discardDesc:
        "မသိမ်းရသေးတဲ့ အချက်အလက်တွေ ရှိပါတယ်။ တကယ်ပိတ်မှာ သေချာလား?",
      stay: "မပိတ်တော့ဘူး",
      discard: "ပိတ်မယ်",
      reset: "Reset Data",
      resetTitle: "Data တွေ reset လုပ်မလား?",
      resetDesc:
        "Local ထဲမှာ သိမ်းထားတဲ့ donors/donations အကုန်ဖျက်ပြီး demo donors ကို အသစ်ပြန်ပြပါမယ်။",
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

  function refresh() {
    setIsLoading(true)
    setDonors(listDonors())
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
    deleteDonors(pendingDeleteIds)
    setRowSelection({})
    setIsDeleteConfirmOpen(false)
    setPendingDeleteIds([])
    setPendingDeleteLabel("")
    refresh()
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
        onDelete: (donor) => {
          requestDelete([donor.id], `${donor.donorId} • ${donor.name}`)
        },
        locale,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  )

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((k) => rowSelection[k]),
    [rowSelection]
  )

  const selectedDonors = useMemo(() => {
    if (selectedIds.length === 0) return []
    const byId = new Map(donors.map((d) => [d.id, d] as const))
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as Donor[]
  }, [donors, selectedIds])

  function exportSelectedToCsv() {
    const rows = selectedDonors
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

  function requestReset() {
    setIsResetConfirmOpen(true)
  }

  function confirmReset() {
    resetDonorLocalData()
    setRowSelection({})
    setIsResetConfirmOpen(false)
    onNew()
    refresh()
  }

  return (
    <AuthedShell title={t.shellTitle}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <CardTitle className="text-base">{t.donorListTitle}</CardTitle>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {selectedIds.length > 0 ? (
                <>
                  <Button variant="secondary" onClick={exportSelectedToCsv}>
                    {t.export} ({selectedIds.length})
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      requestDelete(selectedIds, `${selectedIds.length} donor(s)`)
                    }}
                  >
                    {t.deleteSelected}
                  </Button>
                  <Button variant="outline" onClick={() => setRowSelection({})}>
                    {t.clearSelection}
                  </Button>
                </>
              ) : null}
              <Button
                onClick={() => {
                  onNew()
                  setIsDialogOpen(true)
                }}
              >
                {t.newDonor}
              </Button>
              <Button variant="outline" onClick={requestReset}>
                {t.reset}
              </Button>
              <Button variant="secondary" onClick={refresh}>
                {t.refresh}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-8 w-full sm:max-w-sm" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-[90px]" />
                  <Skeleton className="h-8 w-[72px]" />
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
              columns={columns}
              data={donors}
              searchPlaceholder={t.searchPlaceholder}
              searchRowText={(d) =>
                [
                  d.donorId,
                  d.name,
                  d.nrc,
                  d.contactPhone,
                  d.contactEmail,
                  d.township,
                  d.city,
                ]
                  .filter(Boolean)
                  .join(" ")
              }
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
              labels={{
                rows: t.rows,
                clear: t.clear,
                columns: locale === "en" ? "Columns" : "ကော်လံများ",
                toggleColumns:
                  locale === "en"
                    ? "Show/Hide columns"
                    : "ကော်လံတွေ အဖော်/အဖျောက်",
                noResults: t.noResults,
                showing: t.showing,
                selected: t.selected,
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

