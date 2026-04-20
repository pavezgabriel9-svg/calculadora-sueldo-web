import { describe, it, expectTypeOf } from 'vitest'
import type { CountryConfig, TramosImpuesto } from '../types'

describe('CountryConfig shape', () => {
  it('TramosImpuesto has required fields', () => {
    expectTypeOf<TramosImpuesto>().toHaveProperty('desde')
    expectTypeOf<TramosImpuesto>().toHaveProperty('hasta')
    expectTypeOf<TramosImpuesto>().toHaveProperty('tasa')
    expectTypeOf<TramosImpuesto>().toHaveProperty('rebaja')
  })

  it('CountryConfig has taxBrackets and dolarValue', () => {
    expectTypeOf<CountryConfig>().toHaveProperty('taxBrackets')
    expectTypeOf<CountryConfig>().toHaveProperty('dolarValue')
  })

  it('tasas has new keys', () => {
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('TOPE_AFP_SALUD_UF')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('TOPE_CESANTIA_UF')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('SUELDO_MINIMO')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('AFP_EMPLEADOR')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('SEGURO_COMPLEMENTARIO_UF')
  })
})
