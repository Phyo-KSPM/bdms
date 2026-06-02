"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function buildPageItems(pageIndex: number, pageCount: number) {
  const page = pageIndex + 1
  const totalPages = Math.max(1, pageCount)
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: Array<number | "ellipsis"> = []
  const windowStart = Math.max(2, page - 1)
  const windowEnd = Math.min(totalPages - 1, page + 1)

  items.push(1)
  if (windowStart > 2) items.push("ellipsis")
  for (let p = windowStart; p <= windowEnd; p++) items.push(p)
  if (windowEnd < totalPages - 1) items.push("ellipsis")
  items.push(totalPages)

  return items
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchRowText?: (row: TData) => string
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
  getColumnLabel?: (columnId: string) => string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (next: RowSelectionState) => void
  labels?: {
    rows?: string
    clear?: string
    columns?: string
    toggleColumns?: string
    noResults?: string
    showing?: (from: number, to: number, total: number) => string
    selected?: (selected: number, total: number) => string
    selectAllFiltered?: (total: number) => string
    allFilteredSelected?: (total: number) => string
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchRowText,
  getRowId,
  getColumnLabel,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  labels,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [search, setSearch] = React.useState("")
  const [uncontrolledRowSelection, setUncontrolledRowSelection] =
    React.useState<RowSelectionState>({})

  const rowSelection = controlledRowSelection ?? uncontrolledRowSelection
  const setRowSelection = (updater: Updater<RowSelectionState>) => {
    const next =
      typeof updater === "function" ? updater(rowSelection) : updater
    onRowSelectionChange?.(next)
    if (!controlledRowSelection) {
      setUncontrolledRowSelection(next)
    }
  }

  const filteredData = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    const rowText =
      searchRowText ??
      ((row: TData) => {
        try {
          return JSON.stringify(row)
        } catch {
          return String(row)
        }
      })
    return data.filter((row) => rowText(row).toLowerCase().includes(q))
  }, [data, search, searchRowText])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  React.useEffect(() => {
    // Reset to first page when searching
    table.setPageIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRows = table.getFilteredRowModel().rows.length
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalRows)
  const pageCount = table.getPageCount()
  const pageItems = buildPageItems(pageIndex, pageCount)
  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const resolvedLabels = {
    rows: labels?.rows ?? "Rows",
    clear: labels?.clear ?? "Clear",
    columns: labels?.columns ?? "Columns",
    toggleColumns: labels?.toggleColumns ?? "Toggle columns",
    noResults: labels?.noResults ?? "No results.",
    showing:
      labels?.showing ??
      ((f: number, t: number, total: number) =>
        `Showing ${f}-${t} of ${total}`),
    selected:
      labels?.selected ??
      ((selected: number, total: number) =>
        `${selected} of ${total} row(s) selected.`),
    selectAllFiltered:
      labels?.selectAllFiltered ??
      ((total: number) => `Select all ${total} rows`),
    allFilteredSelected:
      labels?.allFilteredSelected ??
      ((total: number) => `All ${total} rows are selected.`),
  }

  const isAllPageSelected = table.getIsAllPageRowsSelected()
  const isAllFilteredSelected = table.getIsAllRowsSelected()

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full sm:max-w-sm"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="h-8" />}
            >
              {resolvedLabels.columns}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {resolvedLabels.toggleColumns}
                </DropdownMenuLabel>
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(!!checked)
                      }
                      className="capitalize"
                    >
                      {getColumnLabel?.(column.id) ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {resolvedLabels.rows}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value ?? 20))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("")
              table.resetColumnFilters()
            }}
          >
            {resolvedLabels.clear}
          </Button>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {resolvedLabels.selected(selectedCount, filteredCount)}
          </span>
          {!isAllFilteredSelected && isAllPageSelected ? (
            <Button
              variant="link"
              className="h-auto px-0"
              onClick={() => table.toggleAllRowsSelected(true)}
            >
              {resolvedLabels.selectAllFiltered(filteredCount)}
            </Button>
          ) : null}
          {isAllFilteredSelected ? (
            <span className="text-muted-foreground">
              {resolvedLabels.allFilteredSelected(filteredCount)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {resolvedLabels.noResults}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {resolvedLabels.showing(from, to, totalRows)} • Page {pageIndex + 1}/
          {Math.max(1, pageCount)}
        </div>

        <Pagination className="md:mx-0 md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={!table.getCanPreviousPage()}
                onClick={(e) => {
                  e.preventDefault()
                  table.previousPage()
                }}
              />
            </PaginationItem>

            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === pageIndex + 1}
                    onClick={(e) => {
                      e.preventDefault()
                      table.setPageIndex(item - 1)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!table.getCanNextPage()}
                onClick={(e) => {
                  e.preventDefault()
                  table.nextPage()
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

