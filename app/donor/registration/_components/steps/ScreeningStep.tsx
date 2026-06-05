"use client"

import { useWatch } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { kgToLb } from "@/lib/weight"

export function ScreeningStep({
  control,
  t,
}: {
  control: any
  t: {
    weightKg: string
    weightLbHint: (lb: number) => string
    bpSystolic: string
    bpDiastolic: string
    pulse: string
    hb: string
    lastDonationDate: string
    neverDonatedHint: string
  }
}) {
  const weightKg = useWatch({ control, name: "screening.weightKg" })

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="screening.weightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.weightKg}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              {typeof weightKg === "number" && Number.isFinite(weightKg) ? (
                <p className="text-xs text-muted-foreground">
                  {t.weightLbHint(kgToLb(weightKg))}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="screening.hb"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.hb}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="screening.bpSystolic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.bpSystolic}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="screening.bpDiastolic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.bpDiastolic}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="screening.pulse"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.pulse}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="screening.lastDonationDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.lastDonationDate}</FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                value={
                  field.value
                    ? new Date(field.value).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value
                  field.onChange(v ? new Date(v).toISOString() : null)
                }}
              />
            </FormControl>
            <div className="text-xs text-muted-foreground">
              {t.neverDonatedHint}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

