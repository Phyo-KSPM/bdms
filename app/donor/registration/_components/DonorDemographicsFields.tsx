"use client"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DonorFieldGroup,
  DonorFormField,
} from "@/app/donor/registration/_components/DonorFormSheet"

type DemographicsLabels = {
  identity: string
  contactGroup: string
  locationGroup: string
  donorId: string
  name: string
  nrc: string
  age: string
  bloodType: string
  gender: string
  phone: string
  email: string
  contactAddress: string
  township: string
  city: string
  fullAddress: string
  selectPlaceholder: string
  male: string
  female: string
  other: string
}

export function DonorDemographicsFields({
  control,
  donorId,
  bloodTypes,
  labels: t,
}: {
  control: any
  donorId: string
  bloodTypes: readonly string[]
  labels: DemographicsLabels
}) {
  return (
    <>
      <DonorFieldGroup title={t.identity}>
        <DonorFormField label={t.donorId}>
          <Input value={donorId} disabled className="h-8 font-mono" />
        </DonorFormField>

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.name}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="nrc"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.nrc}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="bloodType"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.bloodType}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8">
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
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.gender}>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v ? v : null)}
                >
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={t.selectPlaceholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{t.male}</SelectItem>
                    <SelectItem value="female">{t.female}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="age"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.age}>
                <FormControl>
                  <Input
                    type="number"
                    min={16}
                    max={80}
                    className="h-8"
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
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />
      </DonorFieldGroup>

      <DonorFieldGroup title={t.contactGroup}>
        <FormField
          control={control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.phone}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.email}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contactAddress"
          render={({ field }) => (
            <FormItem className="space-y-1 sm:col-span-2">
              <DonorFormField label={t.contactAddress}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />
      </DonorFieldGroup>

      <DonorFieldGroup title={t.locationGroup}>
        <FormField
          control={control}
          name="township"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.township}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <DonorFormField label={t.city}>
                <FormControl>
                  <Input className="h-8" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-1 sm:col-span-2">
              <DonorFormField label={t.fullAddress}>
                <FormControl>
                  <Textarea className="min-h-[72px] resize-y" {...field} />
                </FormControl>
              </DonorFormField>
              <FormMessage />
            </FormItem>
          )}
        />
      </DonorFieldGroup>
    </>
  )
}
