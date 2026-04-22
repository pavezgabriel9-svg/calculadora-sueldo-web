// lib/services/configService.ts

import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { AFP_DATA, BONOS_ANUALES_UF_DEFAULT, CONFIG_POR_PAIS, TAX_BRACKETS_CHILE } from '@/lib/config'
import { CountryConfig, Pais, TramosImpuesto } from '@/lib/types'

const STALE_THRESHOLDS = {
  uf:          2,
  dolar:       2,
  afp:         45,
  tasas:       60,
  taxBrackets: 30,
} as const

function isStale(updatedAt: string | null | undefined, thresholdDays: number): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return diffMs > thresholdDays * 24 * 60 * 60 * 1000
}

function getFallback(pais: Pais): CountryConfig {
  const t = CONFIG_POR_PAIS[pais]
  return {
    afpData: pais === 'chile' ? AFP_DATA : {},
    ufValue: t.UF_VALUE,
    dolarValue: t.DOLAR_VALUE,
    taxBrackets: pais === 'chile' ? TAX_BRACKETS_CHILE : [],
    bonosAnualesUF: BONOS_ANUALES_UF_DEFAULT,
    tasas: {
      TASA_SALUD_FONASA:        t.TASA_SALUD_FONASA,
      TASA_CESANTIA:            t.TASA_CESANTIA,
      TOPE_AFP_SALUD_UF:        t.TOPE_AFP_SALUD_UF,
      TOPE_CESANTIA_UF:         t.TOPE_CESANTIA_UF,
      GRATIFICACION_MAX_IMM:    t.GRATIFICACION_MAX_IMM,
      SUELDO_MINIMO:            t.SUELDO_MINIMO,
      CESANTIA_EMPLEADOR:       t.CESANTIA_EMPLEADOR,
      MUTUAL:                   t.MUTUAL,
      SIS:                      t.SIS,
      EXPECTATIVA_VIDA:         t.EXPECTATIVA_VIDA,
      AFP_EMPLEADOR:            t.AFP_EMPLEADOR,
      SEGURO_COMPLEMENTARIO_UF: t.SEGURO_COMPLEMENTARIO_UF,
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
      .select('afp_data, afp_updated_at, uf_value, uf_updated_at, dolar_value, dolar_updated_at, tasas, tasas_updated_at, tax_brackets, tax_brackets_updated_at, bonos_anuales_uf')
      .eq('pais', pais)
      .single()

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
    ? (console.warn(`[config] afp_data stale for pais=${pais}, using fallback`), fallback.afpData)
    : (row.afp_data as Record<string, number>)

  const ufValue = isStale(row.uf_updated_at as string, STALE_THRESHOLDS.uf)
    ? (console.warn(`[config] uf_value stale for pais=${pais}, using fallback`), fallback.ufValue)
    : (row.uf_value as number)

  const dolarValue = isStale(row.dolar_updated_at as string, STALE_THRESHOLDS.dolar)
    ? (console.warn(`[config] dolar_value stale for pais=${pais}, using fallback`), fallback.dolarValue)
    : ((row.dolar_value as number) ?? fallback.dolarValue)

  const tasas = isStale(row.tasas_updated_at as string, STALE_THRESHOLDS.tasas)
    ? (console.warn(`[config] tasas stale for pais=${pais}, using fallback`), fallback.tasas)
    : (row.tasas as CountryConfig['tasas'])

  const taxBrackets = isStale(row.tax_brackets_updated_at as string, STALE_THRESHOLDS.taxBrackets)
    ? (console.warn(`[config] tax_brackets stale for pais=${pais}, using fallback`), fallback.taxBrackets)
    : ((row.tax_brackets as TramosImpuesto[]) ?? fallback.taxBrackets)

  const bonosAnualesUF = row.bonos_anuales_uf
    ? (row.bonos_anuales_uf as CountryConfig['bonosAnualesUF'])
    : fallback.bonosAnualesUF

  return { afpData, ufValue, dolarValue, taxBrackets, bonosAnualesUF, tasas }
}

export const getCountryConfig = unstable_cache(
  fetchCountryConfig,
  ['country-config'],
  { revalidate: 3600 }
)
