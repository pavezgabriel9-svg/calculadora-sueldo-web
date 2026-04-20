// lib/calculations.ts

import { Bono, ResultadosCalculo, Modo, Pais, SistemaSalud, CountryConfig, TramosImpuesto } from './types'

function calcularImpuesto(baseTributable: number, tramos: TramosImpuesto[]): number {
  if (baseTributable <= 0 || tramos.length === 0) return 0
  const tramo = tramos.find(t => baseTributable >= t.desde && baseTributable <= t.hasta)
  if (!tramo || tramo.tasa === 0) return 0
  return Math.max(0, baseTributable * tramo.tasa - tramo.rebaja)
}

function redondearMilesArriba(valor: number): number {
  if (valor <= 0) return 0
  return Math.ceil(valor / 1000) * 1000
}

interface DetallesCalculo {
  gratificacion: number
  imponible: number
  impAfectoAFPSalud: number
  afp: number
  salud: number
  cesantia: number
  impuesto: number
  baseTributable: number
  totalHaberes: number
  totalDescuentos: number
  totalPatronal: number
  cesantiaEmpleador: number
  mutual: number
  sis: number
  expectativaVida: number
  afpEmpleador: number
  seguroComplementario: number
  bonosImponibles: number
  bonosNoImponibles: number
  movilizacion: number
}

function simularLiquido(
  sueldoBase: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonosImponibles: number,
  bonosNoImponibles: number,
  config: CountryConfig
): { liquido: number; detalles: DetallesCalculo } {
  const { afpData, ufValue, taxBrackets, tasas } = config

  const tasaAFP = afpData[afpNombre] ?? 0.1049
  const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue
  const topeCesantia = tasas.TOPE_CESANTIA_UF * ufValue

  // A. Gratificación
  const gratificacion = Math.min(
    sueldoBase * 0.25,
    (tasas.GRATIFICACION_MAX_UF * tasas.SUELDO_MINIMO) / 12
  )

  // B. Total imponible antes de topes
  const imponible = sueldoBase + gratificacion + bonosImponibles

  // C. Topes diferenciados por destino
  const impAfectoAFPSalud = Math.min(imponible, topeAFPSalud)
  const impAfectoCesantia = Math.min(imponible, topeCesantia)

  // D. Descuentos trabajador
  const afp = impAfectoAFPSalud * tasaAFP
  const cesantia = impAfectoCesantia * tasas.TASA_CESANTIA
  const salud = sistemaSalud === 'fonasa'
    ? impAfectoAFPSalud * tasas.TASA_SALUD_FONASA
    : Math.max(impAfectoAFPSalud * tasas.TASA_SALUD_FONASA, saludUF * ufValue)

  // E. Impuesto — base tributable descuenta AFP + salud + cesantía
  const baseTributable = imponible - afp - salud - cesantia
  const impuesto = calcularImpuesto(baseTributable, taxBrackets)

  // F. Costos patronales
  const cesantiaEmpleador = impAfectoCesantia * tasas.CESANTIA_EMPLEADOR
  const mutual = impAfectoAFPSalud * tasas.MUTUAL
  const sis = impAfectoAFPSalud * tasas.SIS
  const expectativaVida = impAfectoAFPSalud * tasas.EXPECTATIVA_VIDA
  const afpEmpleador = impAfectoAFPSalud * tasas.AFP_EMPLEADOR
  const seguroComplementario = tasas.SEGURO_COMPLEMENTARIO_UF * ufValue

  // G. Totales
  const totalHaberes = imponible + movilizacion + bonosNoImponibles
  const totalDescuentos = afp + salud + cesantia + impuesto
  const totalPatronal = cesantiaEmpleador + mutual + sis + expectativaVida + afpEmpleador + seguroComplementario

  const liquido = totalHaberes - totalDescuentos

  return {
    liquido,
    detalles: {
      gratificacion, imponible, impAfectoAFPSalud,
      afp, salud, cesantia, impuesto, baseTributable,
      totalHaberes, totalDescuentos, totalPatronal,
      cesantiaEmpleador, mutual, sis, expectativaVida, afpEmpleador, seguroComplementario,
      bonosImponibles, bonosNoImponibles, movilizacion,
    },
  }
}

export function calcularRemuneracion(
  modo: Modo,
  montoIngresado: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonos: Bono[],
  _pais: Pais,
  config: CountryConfig
): ResultadosCalculo {
  const bonosImponibles = bonos.filter(b => b.imponible).reduce((s, b) => s + b.monto, 0)
  const bonosNoImponibles = bonos.filter(b => !b.imponible).reduce((s, b) => s + b.monto, 0)

  const sim = (base: number) =>
    simularLiquido(base, afpNombre, sistemaSalud, saludUF, movilizacion, bonosImponibles, bonosNoImponibles, config)

  let sueldoBase: number

  if (modo === 'base_a_liquido') {
    sueldoBase = montoIngresado
  } else {
    // Búsqueda binaria: Líquido → Base
    const liquidoObjetivo = montoIngresado
    let minBase = 0
    let maxBase = liquidoObjetivo * 3

    // Expandir rango si es necesario
    while (sim(maxBase).liquido < liquidoObjetivo) {
      maxBase *= 2
      if (maxBase > 100_000_000) break
    }

    let baseExacta = 0
    for (let i = 0; i < 100; i++) {
      baseExacta = (minBase + maxBase) / 2
      const liquidoCalc = sim(baseExacta).liquido
      if (Math.abs(maxBase - minBase) <= 1) break
      if (liquidoCalc < liquidoObjetivo) {
        minBase = baseExacta
      } else {
        maxBase = baseExacta
      }
    }

    // Redondear al siguiente múltiplo de 1000 para que líquido >= objetivo
    sueldoBase = redondearMilesArriba(baseExacta)
  }

  const { liquido, detalles: d } = sim(sueldoBase)

  return {
    sueldoBase:              Math.round(sueldoBase),
    sueldoLiquido:           Math.round(liquido),
    gratificacion:           Math.round(d.gratificacion),
    bonosImponibles,
    bonosNoImponibles,
    totalHaberesImponibles:  Math.round(d.imponible),
    movilizacion,
    totalHaberes:            Math.round(d.totalHaberes),
    cotizacionPrevisional:   Math.round(d.afp),
    cotizacionSalud:         Math.round(d.salud),
    cesantia:                Math.round(d.cesantia),
    impuesto:                Math.round(d.impuesto),
    totalDescuentos:         Math.round(d.totalDescuentos),
    cesantiaEmpleador:       Math.round(d.cesantiaEmpleador),
    mutual:                  Math.round(d.mutual),
    sis:                     Math.round(d.sis),
    expectativaVida:         Math.round(d.expectativaVida),
    afpEmpleador:            Math.round(d.afpEmpleador),
    seguroComplementario:    Math.round(d.seguroComplementario),
    totalPatronal:           Math.round(d.totalPatronal),
    costoTotalEmpresa:       Math.round(d.totalHaberes + d.totalPatronal),
  }
}
