import { describe, it, expect } from 'vitest'
import { formatCLP, formatUSD } from '../utils'

describe('formatCLP', () => {
  it('formatea número como pesos chilenos sin decimales', () => {
    expect(formatCLP(1000000)).toBe('$1.000.000')
  })
})

describe('formatUSD', () => {
  it('formatea número como dólares con 2 decimales', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50')
  })

  it('formatea cero correctamente', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('redondea correctamente', () => {
    expect(formatUSD(1.005)).toBe('$1.01')
  })
})
