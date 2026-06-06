"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  FilterIcon,
  LayersIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  CustomFilterDialog,
  CustomGroupByDialog,
  CustomMenuAction,
  type CustomFilterOperator,
  type OdooCustomFilterField,
  type OdooCustomGroupByField,
} from "./custom-filter-dialogs"

export type OdooFilterGroup = {
  id: string
  columnId: string
  label: string
  options: Array<{ value: string; label: string }>
}

export type OdooGroupByField = {
  columnId: string
  label: string
}

export type OdooSearchSuggestion = {
  id: string
  value: string
  label: string
  fieldLabel?: string
}

export type OdooFacet =
  | {
      kind: "search"
      id: string
      value: string
      label: string
    }
  | {
      kind: "filter"
      id: string
      groupId: string
      columnId: string
      value: string
      label: string
    }
  | {
      kind: "customFilter"
      id: string
      groupId: string
      columnId: string
      operator: CustomFilterOperator
      value: string
      label: string
    }
  | {
      kind: "groupBy"
      id: string
      columnId: string
      label: string
    }
  | {
      kind: "meta"
      id: string
      label: string
    }

type OdooSearchBarLabels = {
  placeholder: string
  filters: string
  groupBy: string
  clearAll: string
  searchPrefix: string
  groupByPrefix: string
  addCustomFilter: string
  addCustomGroupBy: string
  customFilterTitle: string
  customGroupByTitle: string
  customField: string
  customOperator: string
  customValue: string
  customApply: string
  customCancel: string
  customSelectField: string
  customSelectOperator: string
  customEnterValue: string
  operatorLabels: Record<CustomFilterOperator, string>
}

type OdooSearchBarProps = {
  facets: OdooFacet[]
  inputValue: string
  onInputChange: (value: string) => void
  onAddSearch: (value: string, label?: string) => void
  onRemoveFacet: (id: string) => void
  onClearAll: () => void
  filterGroups: OdooFilterGroup[]
  groupByFields: OdooGroupByField[]
  customFilterFields: OdooCustomFilterField[]
  customGroupByFields: OdooCustomGroupByField[]
  suggestions: OdooSearchSuggestion[]
  onToggleFilter: (
    groupId: string,
    columnId: string,
    value: string,
    label: string
  ) => void
  onToggleGroupBy: (columnId: string, label: string) => void
  isFilterActive: (columnId: string, value: string) => boolean
  isGroupByActive: (columnId: string) => boolean
  onAddCustomFilter: (payload: {
    columnId: string
    operator: CustomFilterOperator
    value: string
    label: string
  }) => void
  onAddCustomGroupBy: (columnId: string, label: string) => void
  labels: OdooSearchBarLabels
}

function FacetIcon({ kind }: { kind: OdooFacet["kind"] }) {
  if (kind === "search") return <SearchIcon className="size-3 shrink-0 opacity-70" />
  if (kind === "meta") return <FilterIcon className="size-3 shrink-0 opacity-70" />
  if (kind === "filter" || kind === "customFilter") {
    return <FilterIcon className="size-3 shrink-0 opacity-70" />
  }
  return <LayersIcon className="size-3 shrink-0 opacity-70" />
}

function FacetChip({
  facet,
  onRemove,
}: {
  facet: OdooFacet
  onRemove: () => void
}) {
  return (
    <span className="inline-flex h-7 max-w-[240px] items-center gap-1 rounded-md border border-border/80 bg-muted/60 pl-2 text-xs text-foreground">
      <FacetIcon kind={facet.kind} />
      <span className="truncate">{facet.label}</span>
      <button
        type="button"
        className="ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
        aria-label={`Remove ${facet.label}`}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  )
}

export function OdooSearchBar({
  facets,
  inputValue,
  onInputChange,
  onAddSearch,
  onRemoveFacet,
  onClearAll,
  filterGroups,
  groupByFields,
  customFilterFields,
  customGroupByFields,
  suggestions,
  onToggleFilter,
  onToggleGroupBy,
  isFilterActive,
  isGroupByActive,
  onAddCustomFilter,
  onAddCustomGroupBy,
  labels,
}: OdooSearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = React.useState(false)
  const [customFilterOpen, setCustomFilterOpen] = React.useState(false)
  const [customGroupByOpen, setCustomGroupByOpen] = React.useState(false)

  const filterCount = facets.filter(
    (facet) => facet.kind === "filter" || facet.kind === "customFilter"
  ).length
  const groupByCount = facets.filter((facet) => facet.kind === "groupBy").length
  const showSuggestions =
    isFocused && inputValue.trim().length > 0 && suggestions.length > 0

  function commitSearch(value: string, label?: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    onAddSearch(trimmed, label)
    onInputChange("")
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <div
            className={cn(
              "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-3 py-2 transition-[border-color,box-shadow]",
              isFocused
                ? "border-ring/60 ring-2 ring-ring/20"
                : "border-input hover:border-ring/40"
            )}
            onClick={() => inputRef.current?.focus()}
          >
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            {facets.map((facet) => (
              <FacetChip
                key={facet.id}
                facet={facet}
                onRemove={() => onRemoveFacet(facet.id)}
              />
            ))}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsFocused(false), 120)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  if (suggestions.length === 1) {
                    const item = suggestions[0]
                    commitSearch(item.value, item.label)
                    return
                  }
                  commitSearch(inputValue)
                }
                if (
                  event.key === "Backspace" &&
                  !inputValue &&
                  facets.length > 0
                ) {
                  onRemoveFacet(facets[facets.length - 1].id)
                }
              }}
              placeholder={facets.length === 0 ? labels.placeholder : ""}
              className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {showSuggestions ? (
            <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border bg-popover py-1 shadow-lg">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commitSearch(item.value, item.label)}
                >
                  <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5 rounded-lg px-3"
                />
              }
            >
              <FilterIcon className="size-3.5" />
              {labels.filters}
              {filterCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {filterCount}
                </Badge>
              ) : null}
              <ChevronDownIcon className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {filterGroups.map((group, index) => (
                <DropdownMenuGroup key={group.id}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={`${group.columnId}:${option.value}`}
                      checked={isFilterActive(group.columnId, option.value)}
                      onCheckedChange={() =>
                        onToggleFilter(
                          group.id,
                          group.columnId,
                          option.value,
                          `${group.label}: ${option.label}`
                        )
                      }
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              ))}
              <DropdownMenuSeparator />
              <CustomMenuAction
                label={labels.addCustomFilter}
                onClick={() => setCustomFilterOpen(true)}
              />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5 rounded-lg px-3"
                />
              }
            >
              <LayersIcon className="size-3.5" />
              {labels.groupBy}
              {groupByCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {groupByCount}
                </Badge>
              ) : null}
              <ChevronDownIcon className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                {groupByFields.map((field) => (
                  <DropdownMenuCheckboxItem
                    key={field.columnId}
                    checked={isGroupByActive(field.columnId)}
                    onCheckedChange={() =>
                      onToggleGroupBy(field.columnId, field.label)
                    }
                  >
                    {field.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <CustomMenuAction
                  label={labels.addCustomGroupBy}
                  onClick={() => setCustomGroupByOpen(true)}
                />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {facets.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg px-3 text-muted-foreground"
              onClick={onClearAll}
            >
              {labels.clearAll}
            </Button>
          ) : null}
        </div>
      </div>

      <CustomFilterDialog
        open={customFilterOpen}
        onOpenChange={setCustomFilterOpen}
        fields={customFilterFields}
        operatorLabels={labels.operatorLabels}
        onApply={onAddCustomFilter}
        labels={{
          title: labels.customFilterTitle,
          field: labels.customField,
          operator: labels.customOperator,
          value: labels.customValue,
          apply: labels.customApply,
          cancel: labels.customCancel,
          selectField: labels.customSelectField,
          selectOperator: labels.customSelectOperator,
          enterValue: labels.customEnterValue,
        }}
      />
      <CustomGroupByDialog
        open={customGroupByOpen}
        onOpenChange={setCustomGroupByOpen}
        fields={customGroupByFields}
        onApply={onAddCustomGroupBy}
        labels={{
          title: labels.customGroupByTitle,
          field: labels.customField,
          apply: labels.customApply,
          cancel: labels.customCancel,
          selectField: labels.customSelectField,
        }}
      />
    </div>
  )
}

export function buildSearchFacetId(value: string) {
  return `search:${value.toLowerCase()}`
}

export function buildFilterFacetId(columnId: string, value: string) {
  return `filter:${columnId}:${value}`
}

export function buildGroupByFacetId(columnId: string) {
  return `groupBy:${columnId}`
}
