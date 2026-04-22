import { describe, it, expect } from 'vitest'
import { calcularRemuneracion } from '../calculations'
import { FALLBACK_CONFIG } from '../config'

const config = FALLBACK_CONFIG['chile']

const casoBase = {
  afp: 'Uno',
  sistemaSalud: 'fonasa' as const,
  saludUF: 0,
  movilizacion: 0,
  bonos: [],
  pais: 'chile' as const,
  config,
}

describe('calcularRemuneracion — base_a_liquido', () => {
  it('calcula gratificación como min(base*25%, tope UF)', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    // tope = 4.75 * 39597.67 / 12 ≈ 15678 < 250000
    expect(r.gratificacion).toBeLessThan(20_000)
    expect(r.gratificacion).toBeGreaterThan(0)
  })

  it('usa topes diferenciados AFP/salud vs cesantía', () => {
    // sueldo alto que supere tope AFP/salud (89.9 UF ≈ 3.56M)
    const r = calcularRemuneracion('base_a_liquido', 5_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    const topeAFPSalud = config.tasas.TOPE_AFP_SALUD_UF * config.ufValue
    expect(r.cotizacionPrevisional).toBeLessThanOrEqual(Math.ceil(topeAFPSalud * 0.11))
  })

  it('impuesto es 0 para sueldo bajo (base tributable < primer tramo)', () => {
    const r = calcularRemuneracion('base_a_liquido', 700_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.impuesto).toBe(0)
  })

  it('impuesto > 0 para sueldo que supere primer tramo', () => {
    const r = calcularRemuneracion('base_a_liquido', 2_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.impuesto).toBeGreaterThan(0)
  })

  it('afpEmpleador > 0', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.afpEmpleador).toBeGreaterThan(0)
  })

  it('seguroComplementario > 0', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.seguroComplementario).toBeGreaterThan(0)
  })

  it('sueldo liquido < sueldo base', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoLiquido).toBeLessThan(r.sueldoBase)
  })

  it('ISAPRE: salud >= 7% del imponible', () => {
    const saludUF = 3
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, 'isapre', saludUF, 0, [], 'chile', config)
    const siete = r.totalHaberesImponibles * 0.07
    expect(r.cotizacionSalud).toBeGreaterThanOrEqual(Math.floor(siete))
  })

  it('totalDescuentos incluye impuesto', () => {
    const r = calcularRemuneracion('base_a_liquido', 3_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.totalDescuentos).toBe(r.cotizacionPrevisional + r.cotizacionSalud + r.cesantia + r.impuesto)
  })
})

describe('calcularRemuneracion — liquido_a_base', () => {
  it('base redondeada a múltiplos de 1000', () => {
    const r = calcularRemuneracion('liquido_a_base', 900_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoBase % 1000).toBe(0)
  })

  it('líquido calculado con base redondeada >= líquido objetivo', () => {
    const liquidoObjetivo = 900_000
    const r = calcularRemuneracion('liquido_a_base', liquidoObjetivo, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoLiquido).toBeGreaterThanOrEqual(liquidoObjetivo)
  })

  it('base > liquido objetivo', () => {
    const liquidoObjetivo = 1_200_000
    const r = calcularRemuneracion('liquido_a_base', liquidoObjetivo, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoBase).toBeGreaterThan(liquidoObjetivo)
  })
})
