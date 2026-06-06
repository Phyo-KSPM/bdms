"use client"

import { format, formatDistanceToNow } from "date-fns"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DonorAuditEntry } from "@/lib/donor-audit-log"
import { cn } from "@/lib/utils"
import {
  donorProfileBadgesClass,
  donorProfileCardClass,
  donorProfileCardHeaderClass,
  donorProfileHeaderRowClass,
} from "@/app/donor/registration/_components/donor-profile-layout"

type DonorActionLogLabels = {
  title: string
  empty: string
  activitySingular: string
  activityPlural: string
  created: string
  updated: string
  deleted: string
  registered: string
  system: string
  changed: string
  from: string
  to: string
}

type DonorActionLogProps = {
  entries: DonorAuditEntry[]
  fieldLabels: Record<string, string>
  labels: DonorActionLogLabels
  className?: string
}

function ActionIcon({ action }: { action: DonorAuditEntry["action"] }) {
  if (action === "created") {
    return <PlusIcon className="size-3.5" />
  }
  if (action === "deleted") {
    return <Trash2Icon className="size-3.5" />
  }
  return <PencilIcon className="size-3.5" />
}

function actionBadgeClass(action: DonorAuditEntry["action"]) {
  switch (action) {
    case "created":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    case "deleted":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400"
    default:
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
  }
}

export function DonorActionLog({
  entries,
  fieldLabels,
  labels,
  className,
}: DonorActionLogProps) {
  return (
    <Card
      className={cn(
        donorProfileCardClass,
        "flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)] lg:self-start",
        className
      )}
    >
      <CardHeader className={cn("shrink-0", donorProfileCardHeaderClass)}>
        <div className={donorProfileHeaderRowClass}>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{labels.title}</CardTitle>
            {entries.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {entries.length}{" "}
                {entries.length === 1
                  ? labels.activitySingular
                  : labels.activityPlural}
              </p>
            ) : null}
          </div>
          <div className={donorProfileBadgesClass}>
            <Badge variant="outline">{entries.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        {entries.length === 0 ? (
          <div className="m-5 rounded-lg border bg-muted/15 p-5 sm:m-6 sm:p-6">
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[calc(100vh-11rem)]">
            <div className="divide-y">
              {entries.map((entry) => (
                <div key={entry.id} className="px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        actionBadgeClass(entry.action)
                      )}
                    >
                      <ActionIcon action={entry.action} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium">
                          {entry.actorName}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-[10px]",
                            actionBadgeClass(entry.action)
                          )}
                        >
                          {entry.action === "created"
                            ? labels.created
                            : entry.action === "deleted"
                              ? labels.deleted
                              : labels.updated}
                        </Badge>
                      </div>
                      <p className="text-sm leading-snug">{entry.summary}</p>
                      <p
                        className="text-xs text-muted-foreground"
                        title={format(new Date(entry.at), "PPpp")}
                      >
                        {formatDistanceToNow(new Date(entry.at), {
                          addSuffix: true,
                        })}
                      </p>
                      {entry.changes?.length ? (
                        <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/15 p-4">
                          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {labels.changed}
                          </p>
                          {entry.changes.map((change) => (
                            <div
                              key={`${entry.id}-${change.field}`}
                              className="text-xs leading-relaxed"
                            >
                              <span className="font-medium">
                                {change.label ??
                                  fieldLabels[change.field] ??
                                  change.field}
                                :
                              </span>{" "}
                              <span className="text-muted-foreground line-through">
                                {change.oldValue}
                              </span>{" "}
                              <span className="text-muted-foreground">→</span>{" "}
                              <span>{change.newValue}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
