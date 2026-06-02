"use client"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BloodTypeSchema, GenderSchema } from "@/lib/donor-store"
import type { z } from "zod"

export type DemographicsValues = {
  name: string
  age: number | string
  bloodType: z.infer<typeof BloodTypeSchema>
  contactPhone: string
  contactEmail: string
  contactAddress: string
  nrc: string
  gender: z.infer<typeof GenderSchema> | null
  address: string
  township: string
  city: string
}

export function DemographicsStep({
  control,
  bloodTypes,
  t,
}: {
  control: any
  bloodTypes: readonly string[]
  t: {
    name: string
    age: string
    bloodType: string
    contact: string
    phone: string
    email: string
    contactAddress: string
    nrc: string
    gender: string
    address: string
    township: string
    city: string
    addressGroup: string
    contactGroup: string
    selectPlaceholder: string
    genderMale: string
    genderFemale: string
    genderOther: string
    namePlaceholder: string
    phonePlaceholder: string
    emailPlaceholder: string
    contactAddressPlaceholder: string
    nrcPlaceholder: string
    townshipPlaceholder: string
    cityPlaceholder: string
    addressPlaceholder: string
  }
}) {
  return (
    <div className="grid gap-4">
      <FormField
        control={control}
        name="nrc"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.nrc}</FormLabel>
            <FormControl>
              <Input placeholder={t.nrcPlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.name}</FormLabel>
            <FormControl>
              <Input placeholder={t.namePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.age}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={16}
                  max={80}
                  value={
                    typeof field.value === "number" || typeof field.value === "string"
                      ? field.value
                      : ""
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="bloodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.bloodType}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.gender}</FormLabel>
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
                  <SelectItem value="male">{t.genderMale}</SelectItem>
                  <SelectItem value="female">{t.genderFemale}</SelectItem>
                  <SelectItem value="other">{t.genderOther}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-2 rounded-lg border p-4">
        <div className="text-sm font-medium">{t.contactGroup}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.phone}</FormLabel>
                <FormControl>
                  <Input placeholder={t.phonePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.email}</FormLabel>
              <FormControl>
                <Input placeholder={t.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="contactAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.contactAddress}</FormLabel>
              <FormControl>
                <Input placeholder={t.contactAddressPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2 rounded-lg border p-4">
          <div className="text-sm font-medium">{t.addressGroup}</div>
          <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="township"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.township}</FormLabel>
              <FormControl>
                <Input placeholder={t.townshipPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.city}</FormLabel>
              <FormControl>
                <Input placeholder={t.cityPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          </div>

        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.address}</FormLabel>
              <FormControl>
                <Textarea placeholder={t.addressPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
      </div>
    </div>
  )
}

