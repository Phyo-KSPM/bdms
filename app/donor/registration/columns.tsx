"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDownIcon, MoreHorizontalIcon } from "lucide-react"

import type { Locale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Donor } from "@/lib/donor-store"

export function getColumns({
  onView,
  onEdit,
  onDelete,
  canDelete = false,
  locale,
}: {
  onView: (donor: Donor) => void
  onEdit: (donor: Donor) => void
  onDelete?: (donor: Donor) => void
  canDelete?: boolean
  locale: Locale
}): ColumnDef<Donor>[] {
  const t =
    locale === "en"
      ? {
          donorId: "Donor ID",
          eid: "EID",
          name: "Name",
          nrc: "NRC",
          age: "Age",
          bloodType: "Blood type",
          gender: "Gender",
          phone: "Phone",
          email: "Email",
          township: "Township",
          city: "City",
          address: "Address",
          actions: "Actions",
          copyId: "Copy donor ID",
          edit: "Edit",
          del: "Delete",
          selectAll: "Select all",
          selectRow: "Select row",
          male: "Male",
          female: "Female",
          other: "Other",
          unset: "Not set",
        }
      : {
          donorId: "Donor ID",
          eid: "EID",
          name: "အမည်",
          nrc: "NRC",
          age: "အသက်",
          bloodType: "သွေးအမျိုးအစား",
          gender: "ကျား/မ",
          phone: "ဖုန်း",
          email: "အီးမေးလ်",
          township: "မြို့နယ်",
          city: "မြို့",
          address: "လိပ်စာ",
          actions: "လုပ်ဆောင်ချက်များ",
          copyId: "Donor ID Copy",
          edit: "ပြင်မယ်",
          del: "ဖျက်မယ်",
          selectAll: "အားလုံးရွေး",
          selectRow: "ရွေး",
          male: "ကျား",
          female: "မ",
          other: "အခြား",
          unset: "မသတ်မှတ်ရသေး",
        }

  function normalizeFilterValue(value: unknown) {
    if (value == null) return "__empty__"
    if (typeof value === "string" && !value.trim()) return "__empty__"
    return String(value)
  }

  function exactFilterFn(
    row: { getValue: (id: string) => unknown },
    columnId: string,
    filterValue: unknown
  ) {
    if (!filterValue || filterValue === "all") return true
    return normalizeFilterValue(row.getValue(columnId)) === filterValue
  }

  function formatGender(value: unknown) {
    if (value === "male") return t.male
    if (value === "female") return t.female
    if (value === "other") return t.other
    return t.unset
  }

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label={t.selectAll}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={t.selectRow}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "donorId",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.donorId}
          <ArrowUpDownIcon className="ml-2" />
        </Button>
      ),
      enableGrouping: true,
      cell: ({ row }) => {
        const donor = row.original
        return (
          <Button
            variant="link"
            className="h-auto px-0 font-mono text-xs"
            onClick={() => onView(donor)}
          >
            {row.getValue("donorId")}
          </Button>
        )
      },
    },
    {
      accessorKey: "eid",
      header: t.eid,
      enableGrouping: true,
      cell: ({ row }) => {
        const value = row.getValue("eid") as string | null
        return (
          <div className="font-mono text-xs">
            {value ?? "—"}
          </div>
        )
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.name}
          <ArrowUpDownIcon className="ml-2" />
        </Button>
      ),
      enableGrouping: true,
      cell: ({ row }) => {
        const donor = row.original
        return (
          <Button
            variant="link"
            className="h-auto px-0 font-medium"
            onClick={() => onView(donor)}
          >
            {row.getValue("name")}
          </Button>
        )
      },
    },
    {
      accessorKey: "nrc",
      header: t.nrc,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="max-w-[160px] truncate">{row.getValue("nrc")}</div>
      ),
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.age}
          <ArrowUpDownIcon className="ml-2" />
        </Button>
      ),
      enableGrouping: true,
    },
    {
      accessorKey: "bloodType",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t.bloodType}
          <ArrowUpDownIcon className="ml-2" />
        </Button>
      ),
      enableGrouping: true,
      filterFn: (row, columnId, filterValue) =>
        exactFilterFn(row, columnId, filterValue),
    },
    {
      accessorKey: "gender",
      header: t.gender,
      cell: ({ row }) => (
        <div className="max-w-[120px] truncate">
          {formatGender(row.getValue("gender"))}
        </div>
      ),
      enableGrouping: true,
      filterFn: (row, columnId, filterValue) =>
        exactFilterFn(row, columnId, filterValue),
    },
    {
      accessorKey: "contactPhone",
      header: t.phone,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="max-w-[160px] truncate">{row.getValue("contactPhone")}</div>
      ),
    },
    {
      accessorKey: "contactEmail",
      header: t.email,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate">{row.getValue("contactEmail")}</div>
      ),
    },
    {
      accessorKey: "township",
      header: t.township,
      cell: ({ row }) => {
        const value = row.getValue("township")
        return (
          <div className="max-w-[140px] truncate">
            {typeof value === "string" && value.trim() ? value : t.unset}
          </div>
        )
      },
      enableGrouping: true,
      filterFn: (row, columnId, filterValue) =>
        exactFilterFn(row, columnId, filterValue),
    },
    {
      accessorKey: "city",
      header: t.city,
      cell: ({ row }) => {
        const value = row.getValue("city")
        return (
          <div className="max-w-[140px] truncate">
            {typeof value === "string" && value.trim() ? value : t.unset}
          </div>
        )
      },
      enableGrouping: true,
      filterFn: (row, columnId, filterValue) =>
        exactFilterFn(row, columnId, filterValue),
    },
    {
      accessorKey: "address",
      header: t.address,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="max-w-[260px] truncate">{row.getValue("address")}</div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const donor = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t.actions}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      void navigator.clipboard.writeText(donor.id)
                    } catch {
                      // ignore
                    }
                  }}
                >
                  {t.copyId}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(donor)}>
                  {t.edit}
                </DropdownMenuItem>
                {canDelete && onDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(donor)}
                  >
                    {t.del}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

