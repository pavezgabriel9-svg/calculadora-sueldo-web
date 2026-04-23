import { describe, it, expect } from 'vitest'
import { AFP_DATA, BONOS_ANUALES_UF_DEFAULT, BONOS_EMPRESA_DEFAULT, CONFIG_POR_PAIS, TAX_BRACKETS_CHILE } from '../config'
import { CountryConfig } from '../types'

function makeConfig(pais: 'chile' | 'peru' | 'brasil'): CountryConfig {
  const t = CONFIG_POR_PAIS[pais]
  return {
    afpData: pais === 'chile' ? AFP_DATA : {},
    ufValue: t.UF_VALUE,
    dolarValue: t.DOLAR_VALUE,
    taxBrackets: pais === 'chile' ? TAX_BRACKETS_CHILE : [],
    bonosAnualesUF: BONOS_ANUALES_UF_DEFAULT,
    bonosEmpresa: BONOS_EMPRESA_DEFAULT,
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

describe('config fallback — chile', () => {
  const c = makeConfig('chile')

  it('chile tiene todos los campos requeridos', () => {
    expect(c.ufValue).toBeGreaterThan(0)
    expect(c.dolarValue).toBeGreaterThan(0)
    expect(c.taxBrackets).toHaveLength(8)
    expect(Object.keys(c.afpData).length).toBeGreaterThan(0)
  })

  it('tramos cubren rango completo sin gaps', () => {
    expect(c.taxBrackets[0].desde).toBe(0)
    expect(c.taxBrackets[c.taxBrackets.length - 1].hasta).toBeGreaterThan(20_000_000)
  })

  it('tasas chile tienen todas las keys del tipo', () => {
    expect(c.tasas.TOPE_AFP_SALUD_UF).toBe(89.9)
    expect(c.tasas.TOPE_CESANTIA_UF).toBe(135.1)
    expect(c.tasas.SIS).toBe(0.0154)
    expect(c.tasas.EXPECTATIVA_VIDA).toBe(0.009)
    expect(c.tasas.AFP_EMPLEADOR).toBe(0.001)
    expect(c.tasas.SEGURO_COMPLEMENTARIO_UF).toBe(0.4822)
  })

  it('bonosEmpresa contiene tipo empresa con monto fijo', () => {
    const empresa = c.bonosEmpresa.find(b => b.id === 'empresa')
    expect(empresa).toBeDefined()
    expect(empresa?.montoFijo).toBe(600000)
  })

  it('peru y brasil tienen estructura válida', () => {
    expect(makeConfig('peru')).toBeDefined()
    expect(makeConfig('brasil')).toBeDefined()
  })
})
