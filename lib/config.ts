// lib/config.ts

import { Pais, TramoImpuesto } from "./types"

export const PAISES: Pais[] = ["chile", "peru", "brasil"]

// AFP tasas por fondo (Chile)
export const AFP_DATA: Record<string, number> = {
  Capital: 0.1149,
  Cuprum: 0.1149,
  Habitat: 0.1127,
  Modelo: 0.1058,
  Planvital: 0.1116,
  Provida: 0.1145,
  Uno: 0.1049,
}

// AFP por administradora (Perú)
export const AFP_PERU_DATA: Record<string, number> = {
  Habitat: 0.0147,
  Integra: 0.0155,
  Prima: 0.0160,
  Profuturo: 0.0169,
}

// Tasas y parámetros Chile
export const TASAS_CHILE = {
  UF_VALUE: 38000,
  TASA_SALUD_FONASA: 0.07,
  TASA_CESANTIA: 0.006,
  LIMITE_UF_IMPONIBLE: 89.9,
  GRATIFICACION_MAX_IMM: 4.75,
  SUELDO_MINIMO: 539000,
  LIMITE_IMPUESTO: 800000,
  TASA_IMPUESTO: 0.04,
  CESANTIA_EMPLEADOR: 0.024,
  MUTUAL: 0.0093,
  SIS: 0.0154,
  EXPECTATIVA_VIDA: 0.009,
}

// Tramos de Impuesto a la Renta (Perú) - anual en UIT
export const TRAMOS_IMPUESTO_PERU: TramoImpuesto[] = [
  { desde_uf: 0, hasta_uf: 5, tasa: 0.08 },
  { desde_uf: 5, hasta_uf: 20, tasa: 0.14 },
  { desde_uf: 20, hasta_uf: 35, tasa: 0.17 },
  { desde_uf: 35, hasta_uf: 45, tasa: 0.20 },
  { desde_uf: 45, hasta_uf: null, tasa: 0.30 },
]

// Tasas y parámetros Perú
export const TASAS_PERU = {
  UF_VALUE: 1,
  RMV: 1130,
  SUELDO_MINIMO: 1130,
  SUELDOS_ANUALES: 14,

  // Sistema de Salud
  TASA_SALUD_FONASA: 0,
  TASA_SALUD_PATRONAL: 0.09,
  SALUD_BASE_MINIMA: true,

  // Sistema Previsional (SPP/AFP)
  TASA_AFP_OBLIGATORIA: 0.10,
  TASA_SEGUROS_INVALIDEZ: 0.0137,
  TASA_COMISION_AFP: 0.0155,

  // Cesantía (no aplica en Perú de la misma forma)
  TASA_CESANTIA: 0,
  CESANTIA_EMPLEADOR: 0,

  // Costos Patronales (Perú no tiene estos)
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,

  // Gratificación
  GRATIFICACION_MAX_IMM: 0,
  LIMITE_UF_IMPONIBLE: 1000000,

  // Impuesto a la Renta
  LIMITE_IMPUESTO: 0,
  TASA_IMPUESTO: 0,
  UIT: 5500,
  DEDUCCION_FIJA_UIT: 7,
  DEDUCCION_ADICIONAL_UIT: 3,
}

// Tasas y parámetros Brasil (placeholder para Fase 2)
export const TASAS_BRASIL = {
  UF_VALUE: 1,
  SUELDO_MINIMO: 0,
  TASA_SALUD_FONASA: 0,
  TASA_CESANTIA: 0,
  LIMITE_UF_IMPONIBLE: 0,
  GRATIFICACION_MAX_IMM: 0,
  LIMITE_IMPUESTO: 0,
  TASA_IMPUESTO: 0,
  CESANTIA_EMPLEADOR: 0,
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,
}

export const CONFIG_POR_PAIS = {
  chile: TASAS_CHILE,
  peru: TASAS_PERU,
  brasil: TASAS_BRASIL,
}

export const DOLAR_RATE_FALLBACK: Record<string, number> = {
  chile: 960,
  peru: 3.44,
  brasil: 5.8,
}

export const BONOS_ANUALES_UF_DEFAULT = {
  navidad: 7,
  fiestaPatrias: 6,
  escolaridad: 3,
}
