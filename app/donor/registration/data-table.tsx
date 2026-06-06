"use client"

import * as React from "react"
import {
  type ColumnDef,
  type GroupingState,
  type VisibilityState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  OdooSearchBar,
  buildFilterFacetId,
  buildGroupByFacetId,
  buildSearchFacetId,
  type OdooFacet,
  type OdooFilterGroup,
  type OdooGroupByField,
} from "./odoo-search-bar"
import {
  buildCustomFilterFacetId,
  matchesCustomFilter,
  type CustomFilterOperator,
  type OdooCustomFilterField,
  type OdooCustomGroupByField,
} from "./custom-filter-dialogs"

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

function normalizeFilterValue(value: unknown) {
  if (value == null) return "__empty__"
  if (typeof value === "string" && !value.trim()) return "__empty__"
  return String(value)
}

function getRowColumnValue(row: unknown, columnId: string) {
  if (!row || typeof row !== "object") return undefined
  return (row as Record<string, unknown>)[columnId]
}

export type DataTableSearchField<TData> = {
  id: string
  label: string
  getValue: (row: TData) => string | null | undefined
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchRowText?: (row: TData) => string
  searchFields?: DataTableSearchField<TData>[]
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
  getColumnLabel?: (columnId: string) => string
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (next: RowSelectionState) => void
  onFilteredRowsChange?: (rows: TData[]) => void
  onExport?: () => void
  exportLabel?: string
  filterGroups?: OdooFilterGroup[]
  groupByFields?: OdooGroupByField[]
  customFilterFields?: OdooCustomFilterField[]
  customGroupByFields?: OdooCustomGroupByField[]
  formatGroupValue?: (columnId: string, value: unknown) => string
  initialFacets?: OdooFacet[]
  rowPredicate?: (row: TData) => boolean
  labels?: {
    rows?: string
    columns?: string
    toggleColumns?: string
    noResults?: string
    showing?: (from: number, to: number, total: number) => string
    selected?: (selected: number, total: number) => string
    selectAllFiltered?: (total: number) => string
    allFilteredSelected?: (total: number) => string
    groupCount?: (count: number) => string
    filters?: string
    groupBy?: string
    clearAll?: string
    searchPrefix?: string
    groupByPrefix?: string
    filteredCount?: (total: number) => string
    addCustomFilter?: string
    addCustomGroupBy?: string
    customFilterTitle?: string
    customGroupByTitle?: string
    customField?: string
    customOperator?: string
    customValue?: string
    customApply?: string
    customCancel?: string
    customSelectField?: string
    customSelectOperator?: string
    customEnterValue?: string
    operatorLabels?: Record<CustomFilterOperator, string>
  }
}

function facetsEqual(a: OdooFacet[], b: OdooFacet[]) {
  if (a.length !== b.length) return false
  return a.every((facet, index) => {
    const other = b[index]
    if (!other || facet.kind !== other.kind || facet.id !== other.id) return false
    if (facet.kind === "meta" && other.kind === "meta") {
      return facet.label === other.label
    }
    if ("label" in facet && "label" in other) {
      return facet.label === other.label
    }
    return true
  })
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchRowText,
  searchFields,
  getRowId,
  getColumnLabel,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  onFilteredRowsChange,
  onExport,
  exportLabel,
  filterGroups,
  groupByFields,
  customFilterFields,
  customGroupByFields,
  formatGroupValue,
  initialFacets,
  rowPredicate,
  labels,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [facets, setFacets] = React.useState<OdooFacet[]>(
    initialFacets ?? []
  )
  const filteredRowsSignatureRef = React.useRef<string | null>(null)
  const onFilteredRowsChangeRef = React.useRef(onFilteredRowsChange)
  const isMountedRef = React.useRef(false)

  React.useEffect(() => {
    onFilteredRowsChangeRef.current = onFilteredRowsChange
  }, [onFilteredRowsChange])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    if (!initialFacets?.length) return
    setFacets((current) =>
      facetsEqual(current, initialFacets) ? current : initialFacets
    )
  }, [initialFacets])
  const [searchInput, setSearchInput] = React.useState("")
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

  const grouping = React.useMemo<GroupingState>(
    () =>
      facets
        .filter((facet): facet is Extract<OdooFacet, { kind: "groupBy" }> => {
          return facet.kind === "groupBy"
        })
        .map((facet) => facet.columnId),
    [facets]
  )

  const filteredData = React.useMemo(() => {
    let rows = data
    const rowText =
      searchRowText ??
      ((row: TData) => {
        try {
          return JSON.stringify(row)
        } catch {
          return String(row)
        }
      })

    for (const facet of facets) {
      if (facet.kind === "search") {
        const q = facet.value.toLowerCase()
        rows = rows.filter((row) => rowText(row).toLowerCase().includes(q))
      }
    }

    const filterFacets = facets.filter(
      (
        facet
      ): facet is
        | Extract<OdooFacet, { kind: "filter" }>
        | Extract<OdooFacet, { kind: "customFilter" }> =>
        facet.kind === "filter" || facet.kind === "customFilter"
    )
    if (filterFacets.length > 0) {
      const byGroup = new Map<string, typeof filterFacets>()
      for (const facet of filterFacets) {
        const group = byGroup.get(facet.groupId) ?? []
        group.push(facet)
        byGroup.set(facet.groupId, group)
      }

      rows = rows.filter((row) => {
        for (const groupFacets of byGroup.values()) {
          const matchesGroup = groupFacets.some((facet) => {
            if (facet.kind === "customFilter") {
              return matchesCustomFilter(
                row,
                facet.columnId,
                facet.operator,
                facet.value,
                getRowColumnValue
              )
            }
            return (
              normalizeFilterValue(getRowColumnValue(row, facet.columnId)) ===
              facet.value
            )
          })
          if (!matchesGroup) return false
        }
        return true
      })
    }

    if (rowPredicate) {
      rows = rows.filter(rowPredicate)
    }

    return rows
  }, [data, facets, rowPredicate, searchRowText])

  const suggestions = React.useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q || !searchFields?.length) return []

    const seen = new Set<string>()
    const items: Array<{
      id: string
      value: string
      label: string
      fieldLabel?: string
    }> = []

    for (const field of searchFields) {
      for (const row of data) {
        const raw = field.getValue(row)
        const value = String(raw ?? "").trim()
        if (!value.toLowerCase().includes(q)) continue

        const id = `${field.id}:${value.toLowerCase()}`
        if (seen.has(id)) continue
        seen.add(id)

        items.push({
          id,
          value,
          label: `${field.label}: ${value}`,
          fieldLabel: field.label,
        })

        if (items.length >= 8) return items
      }
    }

    return items
  }, [data, searchFields, searchInput])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId,
    state: {
      sorting,
      columnVisibility,
      grouping,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  React.useEffect(() => {
    if (!onFilteredRowsChangeRef.current || !isMountedRef.current) return

    const signature = filteredData
      .map((row, index) => getRowId?.(row, index, undefined) ?? String(index))
      .join("\0")

    if (signature === filteredRowsSignatureRef.current) return
    filteredRowsSignatureRef.current = signature

    const notifyParent = () => {
      if (!isMountedRef.current) return
      onFilteredRowsChangeRef.current?.(filteredData)
    }

    const timer = window.setTimeout(notifyParent, 0)
    return () => window.clearTimeout(timer)
  }, [filteredData, getRowId])

  React.useEffect(() => {
    table.setPageIndex(0)
    if (grouping.length > 0) {
      table.toggleAllRowsExpanded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets, filteredData.length])

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
    groupCount: labels?.groupCount ?? ((count: number) => `${count} donors`),
    filters: labels?.filters ?? "Filters",
    groupBy: labels?.groupBy ?? "Group By",
    clearAll: labels?.clearAll ?? "Clear",
    searchPrefix: labels?.searchPrefix ?? "Search",
    groupByPrefix: labels?.groupByPrefix ?? "Group by",
    filteredCount:
      labels?.filteredCount ??
      ((total: number) => `${total} record(s) match current filters.`),
    addCustomFilter: labels?.addCustomFilter ?? "Add custom filter",
    addCustomGroupBy: labels?.addCustomGroupBy ?? "Add custom group",
    customFilterTitle: labels?.customFilterTitle ?? "Custom filter",
    customGroupByTitle: labels?.customGroupByTitle ?? "Custom group by",
    customField: labels?.customField ?? "Field",
    customOperator: labels?.customOperator ?? "Operator",
    customValue: labels?.customValue ?? "Value",
    customApply: labels?.customApply ?? "Apply",
    customCancel: labels?.customCancel ?? "Cancel",
    customSelectField: labels?.customSelectField ?? "Select field",
    customSelectOperator: labels?.customSelectOperator ?? "Select operator",
    customEnterValue: labels?.customEnterValue ?? "Enter value",
    operatorLabels: labels?.operatorLabels ?? {
      contains: "contains",
      equals: "is",
      notEquals: "is not",
      startsWith: "starts with",
      isEmpty: "is empty",
      isNotEmpty: "is not empty",
      gt: ">",
      gte: ">=",
      lt: "<",
      lte: "<=",
    },
  }

  const isAllPageSelected = table.getIsAllPageRowsSelected()
  const isAllFilteredSelected = table.getIsAllRowsSelected()

  function formatGroupLabel(columnId: string, value: unknown) {
    return formatGroupValue?.(columnId, value) ?? String(value ?? "—")
  }

  function addSearchFacet(value: string, label?: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    const id = buildSearchFacetId(trimmed)
    setFacets((current) => {
      if (current.some((facet) => facet.id === id)) return current
      return [
        ...current,
        {
          kind: "search",
          id,
          value: trimmed,
          label: label ?? trimmed,
        },
      ]
    })
  }

  function toggleFilterFacet(
    groupId: string,
    columnId: string,
    value: string,
    label: string
  ) {
    const id = buildFilterFacetId(columnId, value)
    setFacets((current) => {
      if (current.some((facet) => facet.id === id)) {
        return current.filter((facet) => facet.id !== id)
      }
      return [
        ...current,
        { kind: "filter", id, groupId, columnId, value, label },
      ]
    })
  }

  function toggleGroupByFacet(columnId: string, label: string) {
    const id = buildGroupByFacetId(columnId)
    setFacets((current) => {
      if (current.some((facet) => facet.id === id)) {
        return current.filter((facet) => facet.id !== id)
      }
      return [
        ...current,
        {
          kind: "groupBy",
          id,
          columnId,
          label,
        },
      ]
    })
  }

  function addCustomFilterFacet(payload: {
    columnId: string
    operator: CustomFilterOperator
    value: string
    label: string
  }) {
    const id = buildCustomFilterFacetId(
      payload.columnId,
      payload.operator,
      payload.value
    )
    setFacets((current) => {
      if (current.some((facet) => facet.id === id)) return current
      return [
        ...current,
        {
          kind: "customFilter" as const,
          id,
          groupId: id,
          columnId: payload.columnId,
          operator: payload.operator,
          value: payload.value,
          label: payload.label,
        },
      ]
    })
  }

  function addCustomGroupByFacet(columnId: string, label: string) {
    toggleGroupByFacet(columnId, label)
  }

  function removeFacet(id: string) {
    setFacets((current) => current.filter((facet) => facet.id !== id))
  }

  function clearAllFacets() {
    setFacets([])
    setSearchInput("")
  }

  function isFilterActive(columnId: string, value: string) {
    return facets.some(
      (facet) =>
        facet.kind === "filter" &&
        facet.columnId === columnId &&
        facet.value === value
    )
  }

  function isGroupByActive(columnId: string) {
    return facets.some(
      (facet) => facet.kind === "groupBy" && facet.columnId === columnId
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <OdooSearchBar
          facets={facets}
          inputValue={searchInput}
          onInputChange={setSearchInput}
          onAddSearch={addSearchFacet}
          onRemoveFacet={removeFacet}
          onClearAll={clearAllFacets}
          filterGroups={filterGroups ?? []}
          groupByFields={groupByFields ?? []}
          customFilterFields={customFilterFields ?? []}
          customGroupByFields={customGroupByFields ?? []}
          suggestions={suggestions}
          onToggleFilter={toggleFilterFacet}
          onToggleGroupBy={toggleGroupByFacet}
          isFilterActive={isFilterActive}
          isGroupByActive={isGroupByActive}
          onAddCustomFilter={addCustomFilterFacet}
          onAddCustomGroupBy={addCustomGroupByFacet}
          labels={{
            placeholder: searchPlaceholder,
            filters: resolvedLabels.filters,
            groupBy: resolvedLabels.groupBy,
            clearAll: resolvedLabels.clearAll,
            searchPrefix: resolvedLabels.searchPrefix,
            groupByPrefix: resolvedLabels.groupByPrefix,
            addCustomFilter: resolvedLabels.addCustomFilter,
            addCustomGroupBy: resolvedLabels.addCustomGroupBy,
            customFilterTitle: resolvedLabels.customFilterTitle,
            customGroupByTitle: resolvedLabels.customGroupByTitle,
            customField: resolvedLabels.customField,
            customOperator: resolvedLabels.customOperator,
            customValue: resolvedLabels.customValue,
            customApply: resolvedLabels.customApply,
            customCancel: resolvedLabels.customCancel,
            customSelectField: resolvedLabels.customSelectField,
            customSelectOperator: resolvedLabels.customSelectOperator,
            customEnterValue: resolvedLabels.customEnterValue,
            operatorLabels: resolvedLabels.operatorLabels,
          }}
        />

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-10 rounded-lg" />
              }
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
              <SelectTrigger className="h-10 w-[90px] rounded-lg">
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
        </div>
      </div>

      {selectedCount > 0 || facets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {selectedCount > 0 ? (
            <>
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
              {onExport && exportLabel ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={onExport}
                >
                  {exportLabel}
                </Button>
              ) : null}
            </>
          ) : facets.length > 0 ? (
            <>
              <span className="text-muted-foreground">
                {resolvedLabels.filteredCount(filteredCount)}
              </span>
              <Button
                variant="link"
                className="h-auto px-0"
                onClick={() => table.toggleAllRowsSelected(true)}
              >
                {resolvedLabels.selectAllFiltered(filteredCount)}
              </Button>
              {onExport && exportLabel ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto h-8"
                  onClick={onExport}
                >
                  {exportLabel}
                </Button>
              ) : null}
            </>
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
              table.getRowModel().rows.map((row) => {
                if (row.getIsGrouped()) {
                  const columnId = row.groupingColumnId ?? grouping[0] ?? ""
                  const groupValue = row.getGroupingValue(columnId)
                  const depth = row.depth
                  const visibleColumnCount = table.getVisibleLeafColumns().length
                  const isAllSubRowsSelected = row.getIsAllSubRowsSelected()
                  const isSomeSubRowsSelected = row.getIsSomeSelected()

                  return (
                    <TableRow
                      key={row.id}
                      className="bg-muted/30 hover:bg-muted/30"
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          aria-label="Select group"
                          checked={isAllSubRowsSelected}
                          indeterminate={
                            isSomeSubRowsSelected && !isAllSubRowsSelected
                          }
                          onCheckedChange={(value) =>
                            row.toggleSelected(!!value)
                          }
                        />
                      </TableCell>
                      <TableCell colSpan={Math.max(1, visibleColumnCount - 1)}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 font-medium"
                          style={{ paddingLeft: `${depth * 16 + 8}px` }}
                          onClick={row.getToggleExpandedHandler()}
                        >
                          {row.getIsExpanded() ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                          <span>
                            {getColumnLabel?.(columnId) ?? columnId}:{" "}
                            {formatGroupLabel(columnId, groupValue)}
                          </span>
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            ({resolvedLabels.groupCount(row.subRows.length)})
                          </span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                }

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
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
