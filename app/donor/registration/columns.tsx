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
  locale,
}: {
  onView: (donor: Donor) => void
  onEdit: (donor: Donor) => void
  onDelete: (donor: Donor) => void
  locale: Locale
}): ColumnDef<Donor>[] {
  const t =
    locale === "en"
      ? {
          donorId: "Donor ID",
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
        }
      : {
          donorId: "Donor ID",
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
    },
    {
      accessorKey: "gender",
      header: t.gender,
      cell: ({ row }) => (
        <div className="max-w-[120px] truncate">{row.getValue("gender")}</div>
      ),
    },
    {
      accessorKey: "contactPhone",
      header: t.phone,
      cell: ({ row }) => (
        <div className="max-w-[160px] truncate">{row.getValue("contactPhone")}</div>
      ),
    },
    {
      accessorKey: "contactEmail",
      header: t.email,
      cell: ({ row }) => (
        <div className="max-w-[220px] truncate">{row.getValue("contactEmail")}</div>
      ),
    },
    {
      accessorKey: "township",
      header: t.township,
      cell: ({ row }) => (
        <div className="max-w-[140px] truncate">{row.getValue("township")}</div>
      ),
    },
    {
      accessorKey: "city",
      header: t.city,
      cell: ({ row }) => (
        <div className="max-w-[140px] truncate">{row.getValue("city")}</div>
      ),
    },
    {
      accessorKey: "address",
      header: t.address,
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
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(donor)}
                >
                  {t.del}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

