// lib/utils.ts

import type { Pais } from "@/lib/types"

export const formatCLP = (value: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value)
}

const CURRENCY_MAP: Record<Pais, { locale: string; currency: string }> = {
  chile:  { locale: "es-CL", currency: "CLP" },
  peru:   { locale: "es-PE", currency: "PEN" },
  brasil: { locale: "pt-BR", currency: "BRL" },
}

export const formatCurrency = (value: number, pais: Pais): string => {
  const { locale, currency } = CURRENCY_MAP[pais]
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value)
}

export const formatUSD = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value)

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
