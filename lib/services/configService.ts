// lib/services/configService.ts

import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { AFP_DATA, BONOS_ANUALES_UF_DEFAULT, CONFIG_POR_PAIS } from '@/lib/config'
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
  const tasas = CONFIG_POR_PAIS[pais]
  return {
    afpData: pais === 'chile' ? AFP_DATA : {},
    ufValue: tasas.UF_VALUE,
    bonosAnualesUF: BONOS_ANUALES_UF_DEFAULT,
    tasas: {
      TASA_SALUD_FONASA: tasas.TASA_SALUD_FONASA,
      TASA_CESANTIA: tasas.TASA_CESANTIA,
      LIMITE_UF_IMPONIBLE: tasas.LIMITE_UF_IMPONIBLE,
      GRATIFICACION_MAX_IMM: tasas.GRATIFICACION_MAX_IMM,
      SUELDO_MINIMO: tasas.SUELDO_MINIMO,
      LIMITE_IMPUESTO: tasas.LIMITE_IMPUESTO,
      TASA_IMPUESTO: tasas.TASA_IMPUESTO,
      CESANTIA_EMPLEADOR: tasas.CESANTIA_EMPLEADOR,
      MUTUAL: tasas.MUTUAL,
      SIS: tasas.SIS,
      EXPECTATIVA_VIDA: tasas.EXPECTATIVA_VIDA,
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
