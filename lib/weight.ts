const KG_TO_LB = 2.2046226218

export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 10) / 10
}

export function formatWeightDual(kg: number | null | undefined): string {
  if (kg == null || !Number.isFinite(kg)) return "—"
  return `${kg} kg (${kgToLb(kg)} lb)`
}
