"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CustomFilterOperator =
  | "contains"
  | "equals"
  | "notEquals"
  | "startsWith"
  | "isEmpty"
  | "isNotEmpty"
  | "gt"
  | "gte"
  | "lt"
  | "lte"

export type CustomFilterFieldType = "text" | "number" | "enum"

export type OdooCustomFilterField = {
  columnId: string
  label: string
  type: CustomFilterFieldType
  enumOptions?: Array<{ value: string; label: string }>
}

export type OdooCustomGroupByField = {
  columnId: string
  label: string
}

type OperatorOption = {
  value: CustomFilterOperator
  label: string
}

type CustomFilterDialogLabels = {
  title: string
  field: string
  operator: string
  value: string
  apply: string
  cancel: string
  selectField: string
  selectOperator: string
  enterValue: string
}

type CustomGroupByDialogLabels = {
  title: string
  field: string
  apply: string
  cancel: string
  selectField: string
}

type CustomFilterDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: OdooCustomFilterField[]
  operatorLabels: Record<CustomFilterOperator, string>
  onApply: (payload: {
    columnId: string
    operator: CustomFilterOperator
    value: string
    label: string
  }) => void
  labels: CustomFilterDialogLabels
}

type CustomGroupByDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: OdooCustomGroupByField[]
  onApply: (columnId: string, label: string) => void
  labels: CustomGroupByDialogLabels
}

function operatorsForField(
  field: OdooCustomFilterField | undefined,
  operatorLabels: Record<CustomFilterOperator, string>
): OperatorOption[] {
  if (!field) return []

  if (field.type === "number") {
    return (
      ["equals", "notEquals", "gt", "gte", "lt", "lte"] as CustomFilterOperator[]
    ).map((value) => ({ value, label: operatorLabels[value] }))
  }

  if (field.type === "enum") {
    return (
      ["equals", "notEquals", "isEmpty", "isNotEmpty"] as CustomFilterOperator[]
    ).map((value) => ({ value, label: operatorLabels[value] }))
  }

  return (
    [
      "contains",
      "equals",
      "notEquals",
      "startsWith",
      "isEmpty",
      "isNotEmpty",
    ] as CustomFilterOperator[]
  ).map((value) => ({ value, label: operatorLabels[value] }))
}

function defaultOperator(field: OdooCustomFilterField | undefined) {
  if (!field) return "contains" as CustomFilterOperator
  if (field.type === "number") return "equals" as CustomFilterOperator
  if (field.type === "enum") return "equals" as CustomFilterOperator
  return "contains" as CustomFilterOperator
}

export function CustomFilterDialog({
  open,
  onOpenChange,
  fields,
  operatorLabels,
  onApply,
  labels,
}: CustomFilterDialogProps) {
  const [columnId, setColumnId] = React.useState(fields[0]?.columnId ?? "")
  const [operator, setOperator] = React.useState<CustomFilterOperator>("contains")
  const [value, setValue] = React.useState("")

  const selectedField = fields.find((field) => field.columnId === columnId)
  const operatorOptions = operatorsForField(selectedField, operatorLabels)
  const valueHidden = operator === "isEmpty" || operator === "isNotEmpty"
  const useEnumValue =
    selectedField?.type === "enum" &&
    !valueHidden &&
    (selectedField.enumOptions?.length ?? 0) > 0

  React.useEffect(() => {
    if (!open) return
    const first = fields[0]
    setColumnId(first?.columnId ?? "")
    setOperator(defaultOperator(first))
    setValue("")
  }, [open, fields])

  React.useEffect(() => {
    const field = fields.find((item) => item.columnId === columnId)
    if (!field) return
    setOperator(defaultOperator(field))
    setValue("")
  }, [columnId, fields])

  function handleApply() {
    if (!selectedField) return
    if (!valueHidden && !useEnumValue && !value.trim()) return
    if (!valueHidden && useEnumValue && !value) return

    const operatorLabel = operatorLabels[operator]
    const displayValue = valueHidden
      ? ""
      : useEnumValue
        ? selectedField.enumOptions?.find((option) => option.value === value)
            ?.label ?? value
        : value.trim()

    const facetLabel = valueHidden
      ? `${selectedField.label} ${operatorLabel}`
      : `${selectedField.label} ${operatorLabel} ${displayValue}`

    onApply({
      columnId: selectedField.columnId,
      operator,
      value: valueHidden ? "" : useEnumValue ? value : value.trim(),
      label: facetLabel,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{labels.field}</Label>
            <Select
              value={columnId}
              onValueChange={(next) => {
                if (next) setColumnId(next)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={labels.selectField} />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.columnId} value={field.columnId}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{labels.operator}</Label>
            <Select
              value={operator}
              onValueChange={(next) => {
                if (next) setOperator(next as CustomFilterOperator)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={labels.selectOperator} />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!valueHidden ? (
            <div className="grid gap-2">
              <Label>{labels.value}</Label>
              {useEnumValue ? (
                <Select value={value} onValueChange={(next) => setValue(next ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder={labels.enterValue} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedField?.enumOptions?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={labels.enterValue}
                  type={selectedField?.type === "number" ? "number" : "text"}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleApply()
                    }
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button onClick={handleApply}>{labels.apply}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CustomGroupByDialog({
  open,
  onOpenChange,
  fields,
  onApply,
  labels,
}: CustomGroupByDialogProps) {
  const [columnId, setColumnId] = React.useState(fields[0]?.columnId ?? "")

  React.useEffect(() => {
    if (!open) return
    setColumnId(fields[0]?.columnId ?? "")
  }, [open, fields])

  function handleApply() {
    const selected = fields.find((field) => field.columnId === columnId)
    if (!selected) return
    onApply(selected.columnId, selected.label)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label>{labels.field}</Label>
          <Select
            value={columnId}
            onValueChange={(next) => {
              if (next) setColumnId(next)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={labels.selectField} />
            </SelectTrigger>
            <SelectContent>
              {fields.map((field) => (
                <SelectItem key={field.columnId} value={field.columnId}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button onClick={handleApply}>{labels.apply}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CustomMenuAction({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground"
      onClick={onClick}
    >
      <PlusIcon className="size-3.5 opacity-70" />
      {label}
    </button>
  )
}

export function buildCustomFilterFacetId(
  columnId: string,
  operator: CustomFilterOperator,
  value: string
) {
  return `customFilter:${columnId}:${operator}:${value}`
}

export function matchesCustomFilter(
  row: unknown,
  columnId: string,
  operator: CustomFilterOperator,
  filterValue: string,
  getColumnValue: (row: unknown, columnId: string) => unknown
) {
  const raw = getColumnValue(row, columnId)

  if (operator === "isEmpty") {
    if (raw == null) return true
    if (typeof raw === "string" && !raw.trim()) return true
    return false
  }

  if (operator === "isNotEmpty") {
    if (raw == null) return false
    if (typeof raw === "string" && !raw.trim()) return false
    return true
  }

  if (typeof raw === "number") {
    const num = raw
    const target = Number(filterValue)
    if (Number.isNaN(target)) return false
    switch (operator) {
      case "equals":
        return num === target
      case "notEquals":
        return num !== target
      case "gt":
        return num > target
      case "gte":
        return num >= target
      case "lt":
        return num < target
      case "lte":
        return num <= target
      default:
        return false
    }
  }

  const text = String(raw ?? "")
  const normalized = text.trim().toLowerCase()
  const needle = filterValue.trim().toLowerCase()

  switch (operator) {
    case "contains":
      return normalized.includes(needle)
    case "equals":
      return filterValue === "__empty__"
        ? normalized === ""
        : normalized === needle
    case "notEquals":
      return filterValue === "__empty__"
        ? normalized !== ""
        : normalized !== needle
    case "startsWith":
      return normalized.startsWith(needle)
    default:
      return false
  }
}
