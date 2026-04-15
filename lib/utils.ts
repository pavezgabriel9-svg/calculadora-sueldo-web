// lib/utils.ts

export const formatCLP = (value: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value)
}

export const parseNumericInput = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, "")
  return parseInt(cleaned) || 0
}

export const formatNumericInput = (value: string): string => {
  const num = parseNumericInput(value)
  if (num === 0) return ""
  return new Intl.NumberFormat("es-CL").format(num)
}

export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter((cls) => typeof cls === "string").join(" ")
}
