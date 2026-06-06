"use client"

type FieldGroupProps = {
  title: string
  children: React.ReactNode
}

export function DonorFieldGroup({ title, children }: FieldGroupProps) {
  return (
    <section className="rounded-lg border bg-muted/15 p-5 sm:p-6">
      <h3 className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

export function DonorReadonlyField({
  label,
  value,
  className,
  mono,
}: {
  label: string
  value: string
  className?: string
  mono?: boolean
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 text-sm font-medium break-words ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  )
}

export function DonorFormField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}
