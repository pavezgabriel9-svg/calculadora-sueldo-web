import { describe, it, expect } from 'vitest'
import { calcularRemuneracion } from '../calculations'
import { AFP_DATA, BONOS_ANUALES_UF_DEFAULT, BONOS_EMPRESA_DEFAULT, TASAS_CHILE, TAX_BRACKETS_CHILE } from '../config'
import { CountryConfig } from '../types'

const config: CountryConfig = {
  afpData: AFP_DATA,
  ufValue: TASAS_CHILE.UF_VALUE,
  dolarValue: TASAS_CHILE.DOLAR_VALUE,
  taxBrackets: TAX_BRACKETS_CHILE,
  bonosAnualesUF: BONOS_ANUALES_UF_DEFAULT,
  bonosEmpresa: BONOS_EMPRESA_DEFAULT,
  tasas: {
    TASA_SALUD_FONASA:        TASAS_CHILE.TASA_SALUD_FONASA,
    TASA_CESANTIA:            TASAS_CHILE.TASA_CESANTIA,
    TOPE_AFP_SALUD_UF:        TASAS_CHILE.TOPE_AFP_SALUD_UF,
    TOPE_CESANTIA_UF:         TASAS_CHILE.TOPE_CESANTIA_UF,
    GRATIFICACION_MAX_IMM:    TASAS_CHILE.GRATIFICACION_MAX_IMM,
    SUELDO_MINIMO:            TASAS_CHILE.SUELDO_MINIMO,
    CESANTIA_EMPLEADOR:       TASAS_CHILE.CESANTIA_EMPLEADOR,
    MUTUAL:                   TASAS_CHILE.MUTUAL,
    SIS:                      TASAS_CHILE.SIS,
    EXPECTATIVA_VIDA:         TASAS_CHILE.EXPECTATIVA_VIDA,
    AFP_EMPLEADOR:            TASAS_CHILE.AFP_EMPLEADOR,
    SEGURO_COMPLEMENTARIO_UF: TASAS_CHILE.SEGURO_COMPLEMENTARIO_UF,
  },
}

const calc = (modo: 'base_a_liquido' | 'liquido_a_base', monto: number, overrides?: { sistemaSalud?: 'fonasa' | 'isapre', saludUF?: number }) =>
  calcularRemuneracion(modo, monto, 'Uno', overrides?.sistemaSalud ?? 'fonasa', overrides?.saludUF ?? 0, 0, 0, 0, [], 'chile', config)

describe('calcularRemuneracion — base_a_liquido', () => {
  it('calcula gratificación como min(base*25%, tope UF)', () => {
    const r = calc('base_a_liquido', 1_000_000)
    expect(r.gratificacion).toBeLessThan(20_000)
    expect(r.gratificacion).toBeGreaterThan(0)
  })

  it('usa topes diferenciados AFP/salud vs cesantía', () => {
    const r = calc('base_a_liquido', 5_000_000)
    const topeAFPSalud = config.tasas.TOPE_AFP_SALUD_UF * config.ufValue
    expect(r.cotizacionPrevisional).toBeLessThanOrEqual(Math.ceil(topeAFPSalud * 0.11))
  })

  it('impuesto es 0 para sueldo bajo (base tributable < primer tramo)', () => {
    const r = calc('base_a_liquido', 700_000)
    expect(r.impuesto).toBe(0)
  })

  it('impuesto > 0 para sueldo que supere primer tramo', () => {
    const r = calc('base_a_liquido', 2_000_000)
    expect(r.impuesto).toBeGreaterThan(0)
  })

  it('afpEmpleador > 0', () => {
    const r = calc('base_a_liquido', 1_000_000)
    expect(r.afpEmpleador).toBeGreaterThan(0)
  })

  it('seguroComplementario > 0', () => {
    const r = calc('base_a_liquido', 1_000_000)
    expect(r.seguroComplementario).toBeGreaterThan(0)
  })

  it('sueldo liquido < sueldo base', () => {
    const r = calc('base_a_liquido', 1_000_000)
    expect(r.sueldoLiquido).toBeLessThan(r.sueldoBase)
  })

  it('ISAPRE: salud >= 7% del imponible', () => {
    const r = calc('base_a_liquido', 1_000_000, { sistemaSalud: 'isapre', saludUF: 3 })
    const siete = r.totalHaberesImponibles * 0.07
    expect(r.cotizacionSalud).toBeGreaterThanOrEqual(Math.floor(siete))
  })

  it('totalDescuentos incluye impuesto', () => {
    const r = calc('base_a_liquido', 3_000_000)
    expect(r.totalDescuentos).toBe(r.cotizacionPrevisional + r.cotizacionSalud + r.cesantia + r.impuesto)
  })
})

describe('calcularRemuneracion — liquido_a_base', () => {
  it('base redondeada a múltiplos de 1000', () => {
    const r = calc('liquido_a_base', 900_000)
    expect(r.sueldoBase % 1000).toBe(0)
  })

  it('líquido calculado con base redondeada >= líquido objetivo', () => {
    const liquidoObjetivo = 900_000
    const r = calc('liquido_a_base', liquidoObjetivo)
    expect(r.sueldoLiquido).toBeGreaterThanOrEqual(liquidoObjetivo)
  })

  it('base > liquido objetivo', () => {
    const liquidoObjetivo = 1_200_000
    const r = calc('liquido_a_base', liquidoObjetivo)
    expect(r.sueldoBase).toBeGreaterThan(liquidoObjetivo)
  })
})
