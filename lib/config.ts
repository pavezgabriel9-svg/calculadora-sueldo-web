// lib/config.ts

import { Pais } from "./types"

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

// Tasas y parámetros Perú (placeholder para Fase 2)
export const TASAS_PERU = {
  UF_VALUE: 1,
  TASA_SALUD_FONASA: 0.0,
  TASA_CESANTIA: 0.0,
  LIMITE_UF_IMPONIBLE: 0,
  GRATIFICACION_MAX_IMM: 0,
  SUELDO_MINIMO: 0,
  LIMITE_IMPUESTO: 0,
  TASA_IMPUESTO: 0,
  CESANTIA_EMPLEADOR: 0,
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,
}

// Tasas y parámetros Brasil (placeholder para Fase 2)
export const TASAS_BRASIL = {
  UF_VALUE: 1,
  TASA_SALUD_FONASA: 0.0,
  TASA_CESANTIA: 0.0,
  LIMITE_UF_IMPONIBLE: 0,
  GRATIFICACION_MAX_IMM: 0,
  SUELDO_MINIMO: 0,
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

export const BONOS_ANUALES_UF_DEFAULT = {
  navidad: 7,
  fiestaPatrias: 6,
  escolaridad: 3,
}

export type CountryConfig = typeof TASAS_CHILE
