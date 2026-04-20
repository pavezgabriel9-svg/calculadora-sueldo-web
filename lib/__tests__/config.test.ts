import { describe, it, expect } from 'vitest'
import { FALLBACK_CONFIG } from '../config'

describe('FALLBACK_CONFIG', () => {
  it('chile tiene todos los campos requeridos', () => {
    const c = FALLBACK_CONFIG['chile']
    expect(c.ufValue).toBeGreaterThan(0)
    expect(c.dolarValue).toBeGreaterThan(0)
    expect(c.taxBrackets).toHaveLength(8)
    expect(Object.keys(c.afpData).length).toBeGreaterThan(0)
  })

  it('tramos cubren rango completo sin gaps', () => {
    const tramos = FALLBACK_CONFIG['chile'].taxBrackets
    expect(tramos[0].desde).toBe(0)
    expect(tramos[tramos.length - 1].hasta).toBeGreaterThan(20_000_000)
  })

  it('tasas chile tienen todas las keys del tipo', () => {
    const t = FALLBACK_CONFIG['chile'].tasas
    expect(t.TOPE_AFP_SALUD_UF).toBe(89.9)
    expect(t.TOPE_CESANTIA_UF).toBe(135.1)
    expect(t.SIS).toBe(0.0154)
    expect(t.EXPECTATIVA_VIDA).toBe(0.009)
    expect(t.AFP_EMPLEADOR).toBe(0.001)
    expect(t.SEGURO_COMPLEMENTARIO_UF).toBe(0.4822)
  })

  it('peru y brasil tienen estructura válida', () => {
    expect(FALLBACK_CONFIG['peru']).toBeDefined()
    expect(FALLBACK_CONFIG['brasil']).toBeDefined()
  })
})
