// lib/services/configService.ts

import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { AFP_DATA, AFP_PERU_DATA, BONOS_ANUALES_UF_DEFAULT, CONFIG_POR_PAIS, TRAMOS_IMPUESTO_PERU } from '@/lib/config'
import { CountryConfig, Pais } from '@/lib/types'

// Umbrales de staleness en días
const STALE_THRESHOLDS = {
  uf: 2,
  afp: 45,
  tasas: 60,
} as const

function isStale(updatedAt: string | null | undefined, thresholdDays: number): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return diffMs > thresholdDays * 24 * 60 * 60 * 1000
}

function getFallback(pais: Pais): CountryConfig {
  const baseTasas = CONFIG_POR_PAIS[pais] as Record<string, unknown>
  const afpData =
    pais === 'chile' ? AFP_DATA :
    pais === 'peru' ? AFP_PERU_DATA :
    {}

  return {
    afpData,
    ufValue: (baseTasas.UF_VALUE as number) || 1,
    bonosAnualesUF: pais === 'chile' ? BONOS_ANUALES_UF_DEFAULT : undefined,
    tasas: {
      // Remuneración Mínima y Base
      RMV: baseTasas.RMV as number | undefined,
      SUELDO_MINIMO: baseTasas.SUELDO_MINIMO as number,
      SUELDOS_ANUALES: baseTasas.SUELDOS_ANUALES as number | undefined,

      // Sistema de Salud
      TASA_SALUD_FONASA: baseTasas.TASA_SALUD_FONASA as number,
      TASA_SALUD_PATRONAL: baseTasas.TASA_SALUD_PATRONAL as number | undefined,
      SALUD_BASE_MINIMA: baseTasas.SALUD_BASE_MINIMA as boolean | undefined,

      // Sistema Previsional
      TASA_AFP_OBLIGATORIA: baseTasas.TASA_AFP_OBLIGATORIA as number | undefined,
      TASA_SEGUROS_INVALIDEZ: baseTasas.TASA_SEGUROS_INVALIDEZ as number | undefined,
      TASA_COMISION_AFP: baseTasas.TASA_COMISION_AFP as number | undefined,

      // Cesantía
      TASA_CESANTIA: baseTasas.TASA_CESANTIA as number,
      CESANTIA_EMPLEADOR: baseTasas.CESANTIA_EMPLEADOR as number,

      // Costos Patronales
      MUTUAL: baseTasas.MUTUAL as number,
      SIS: baseTasas.SIS as number,
      EXPECTATIVA_VIDA: baseTasas.EXPECTATIVA_VIDA as number,

      // Gratificación/Bonos
      GRATIFICACION_MAX_IMM: baseTasas.GRATIFICACION_MAX_IMM as number,
      LIMITE_UF_IMPONIBLE: baseTasas.LIMITE_UF_IMPONIBLE as number,

      // Impuesto a la Renta
      LIMITE_IMPUESTO: baseTasas.LIMITE_IMPUESTO as number,
      TASA_IMPUESTO: baseTasas.TASA_IMPUESTO as number,
      TRAMOS_IMPUESTO: pais === 'peru' ? TRAMOS_IMPUESTO_PERU : undefined,
      UIT: baseTasas.UIT as number | undefined,
      DEDUCCION_FIJA_UIT: baseTasas.DEDUCCION_FIJA_UIT as number | undefined,
      DEDUCCION_ADICIONAL_UIT: baseTasas.DEDUCCION_ADICIONAL_UIT as number | undefined,
    },
  }
}

async function fetchCountryConfig(pais: Pais): Promise<CountryConfig> {
  const fallback = getFallback(pais)

  if (!supabase) {
    console.warn(`[config] supabase client not initialized, using full fallback for pais=${pais}`)
    return fallback
  }

  let row: Record<string, unknown> | null = null

  try {
    const { data, error } = await supabase
      .from('country_config')
      .select('afp_data, afp_updated_at, uf_value, uf_updated_at, tasas, tasas_updated_at, bonos_anuales_uf')
      .eq('pais', pais)
      .single()
      // Nota: el cliente Supabase no expone `next.revalidate` directamente.
      // El cache de Next.js se gestiona envolviendo con `unstable_cache` (ver abajo).

    if (error) {
      console.warn(`[config] supabase error for pais=${pais}: ${error.message}, using full fallback`)
      return fallback
    }

    if (!data) {
      console.warn(`[config] no row for pais=${pais}, using full fallback`)
      return fallback
    }

    row = data
  } catch (e) {
    console.warn(`[config] supabase unreachable, using full fallback for pais=${pais}`, e)
    return fallback
  }

  const afpData = isStale(row.afp_updated_at as string, STALE_THRESHOLDS.afp)
    ? (console.warn(`[config] afp_data stale or null for pais=${pais}, using fallback`), fallback.afpData)
    : (row.afp_data as Record<string, number>)

  const ufValue = isStale(row.uf_updated_at as string, STALE_THRESHOLDS.uf)
    ? (console.warn(`[config] uf_value stale or null for pais=${pais}, using fallback`), fallback.ufValue)
    : (row.uf_value as number)

  const tasas = isStale(row.tasas_updated_at as string, STALE_THRESHOLDS.tasas)
    ? (console.warn(`[config] tasas stale or null for pais=${pais}, using fallback`), fallback.tasas)
    : (row.tasas as CountryConfig['tasas'])

  const bonosAnualesUF = row.bonos_anuales_uf
    ? (row.bonos_anuales_uf as CountryConfig['bonosAnualesUF'])
    : fallback.bonosAnualesUF

  return { afpData, ufValue, bonosAnualesUF, tasas }
}

// Exportar envuelto en unstable_cache para revalidar cada 1 hora
export const getCountryConfig = unstable_cache(
  fetchCountryConfig,
  ['country-config'],
  { revalidate: 3600 }
)
