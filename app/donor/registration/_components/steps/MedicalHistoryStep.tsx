"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

function toggleInArray(list: string[], value: string, nextChecked: boolean) {
  const set = new Set(list)
  if (nextChecked) set.add(value)
  else set.delete(value)
  return Array.from(set)
}

export function MedicalHistoryStep({
  control,
  t,
  conditions,
  infectious,
}: {
  control: any
  t: {
    conditions: string
    infectious: string
    medications: string
    notes: string
  }
  conditions: readonly { key: string; label: string }[]
  infectious: readonly { key: string; label: string }[]
}) {
  return (
    <div className="grid gap-5">
      <FormField
        control={control}
        name="medical.conditions"
        render={({ field }) => {
          const value: string[] = Array.isArray(field.value) ? field.value : []
          return (
            <FormItem>
              <FormLabel>{t.conditions}</FormLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {conditions.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={value.includes(c.key)}
                      onCheckedChange={(checked) =>
                        field.onChange(toggleInArray(value, c.key, !!checked))
                      }
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormField
        control={control}
        name="medical.infectiousFlags"
        render={({ field }) => {
          const value: string[] = Array.isArray(field.value) ? field.value : []
          return (
            <FormItem>
              <FormLabel>{t.infectious}</FormLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {infectious.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={value.includes(c.key)}
                      onCheckedChange={(checked) =>
                        field.onChange(toggleInArray(value, c.key, !!checked))
                      }
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormField
        control={control}
        name="medical.medications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.medications}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="medical.notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.notes}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

