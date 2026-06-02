"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DonationDetailsStep({
  control,
  t,
  donationTypes,
}: {
  control: any
  t: {
    donationType: string
    notes: string
    selectPlaceholder: string
  }
  donationTypes: readonly { key: string; label: string }[]
}) {
  return (
    <div className="grid gap-4">
      <FormField
        control={control}
        name="donationDetails.donationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.donationType}</FormLabel>
            <Select
              value={field.value ?? ""}
              onValueChange={(v) => field.onChange(v ? v : null)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectPlaceholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {donationTypes.map((dt) => (
                  <SelectItem key={dt.key} value={dt.key}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="donationDetails.notes"
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

