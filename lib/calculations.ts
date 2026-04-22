// lib/calculations.ts

import { Bono, BonoAnual, ResultadosCalculo, Modo, Pais, SistemaSalud, CountryConfig } from "./types"

function calcularBonoAnual(
  ufAmount: number,
  ufValue: number,
  tasaAFP: number,
  tasas: CountryConfig['tasas']
): BonoAnual {
  const montoImponible = Math.round(ufAmount * ufValue)
  const descuentoTrabajador = Math.round(
    montoImponible * (tasaAFP + tasas.TASA_SALUD_FONASA + tasas.TASA_CESANTIA)
  )
  const costoPatronal = Math.round(
    montoImponible * (tasas.CESANTIA_EMPLEADOR + tasas.MUTUAL + tasas.SIS + tasas.EXPECTATIVA_VIDA)
  )
  return {
    montoImponible,
    descuentoTrabajador,
    costoEmpresa: montoImponible + costoPatronal,
  }
}

interface DetallesSim {
  gratificacion: number
  imponible: number
  impAfectoAFPSalud: number
  impAfectoCesantia: number
  descuentoAFP: number
  descuentoSalud: number
  descuentoCesantia: number
  impuesto: number
  totalDescuentos: number
  totalHaberes: number
  liquido: number
}

function simular(
  sueldoBase: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonosImponibles: number,
  bonosNoImponibles: number,
  config: CountryConfig
): DetallesSim {
  const { afpData, ufValue, tasas } = config
  const tasaAFP = afpData[afpNombre] || 0.1049

  // Topes diferenciados desde Supabase (AFP/Salud vs Cesantía)
  const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue
  const topeCesantia = tasas.TOPE_CESANTIA_UF * ufValue

  const gratificacion = Math.min(
    sueldoBase * 0.25,
    (tasas.GRATIFICACION_MAX_IMM * tasas.SUELDO_MINIMO) / 12
  )

  const imponible = sueldoBase + gratificacion + bonosImponibles
  const impAfectoAFPSalud = Math.min(imponible, topeAFPSalud)
  const impAfectoCesantia = Math.min(imponible, topeCesantia)

  const descuentoAFP = impAfectoAFPSalud * tasaAFP
  const descuentoSalud = sistemaSalud === "fonasa"
    ? impAfectoAFPSalud * tasas.TASA_SALUD_FONASA
    : Math.max(impAfectoAFPSalud * tasas.TASA_SALUD_FONASA, saludUF * ufValue)
  const descuentoCesantia = impAfectoCesantia * tasas.TASA_CESANTIA

  // Base tributable: imponible completo menos descuentos previsionales
  const baseTributable = imponible - descuentoAFP - descuentoSalud - descuentoCesantia
  const impuesto = baseTributable > tasas.LIMITE_IMPUESTO
    ? (baseTributable - tasas.LIMITE_IMPUESTO) * tasas.TASA_IMPUESTO
    : 0

  const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia + impuesto
  const totalHaberes = imponible + movilizacion + bonosNoImponibles
  const liquido = totalHaberes - totalDescuentos

  return {
    gratificacion, imponible, impAfectoAFPSalud, impAfectoCesantia,
    descuentoAFP, descuentoSalud, descuentoCesantia,
    impuesto, totalDescuentos, totalHaberes, liquido,
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
  const { ufValue, tasas } = config
  const tasaAFP = config.afpData[afpNombre] || 0.1049

  const bonosImponibles = bonos.filter(b => b.imponible).reduce((s, b) => s + b.monto, 0)
  const bonosNoImponibles = bonos.filter(b => !b.imponible).reduce((s, b) => s + b.monto, 0)

  const sim = (base: number) =>
    simular(base, afpNombre, sistemaSalud, saludUF, movilizacion, bonosImponibles, bonosNoImponibles, config)

  let sueldoBase: number

  if (modo === "base_a_liquido") {
    sueldoBase = montoIngresado
  } else {
    // Iteración convergente: Líquido → Base
    const liquidoObjetivo = montoIngresado
    sueldoBase = Math.round(liquidoObjetivo * 1.35)

    for (let i = 0; i < 50; i++) {
      const diferencia = liquidoObjetivo - sim(sueldoBase).liquido
      if (Math.abs(diferencia) < 100) break
      sueldoBase = Math.round(sueldoBase + diferencia * 0.8)
    }
  }

  const d = sim(sueldoBase)

  // Costos patronales con topes diferenciados desde Supabase
  const cesantiaEmpleador = Math.round(d.impAfectoCesantia * tasas.CESANTIA_EMPLEADOR)
  const mutual            = Math.round(d.impAfectoAFPSalud * tasas.MUTUAL)
  const sis               = Math.round(d.impAfectoAFPSalud * tasas.SIS)
  const expectativaVida   = Math.round(d.impAfectoAFPSalud * tasas.EXPECTATIVA_VIDA)
  const afpEmpleador      = Math.round(d.impAfectoAFPSalud * tasas.AFP_EMPLEADOR)
  const seguroComplementario = Math.round(tasas.SEGURO_COMPLEMENTARIO_UF * ufValue)
  const totalPatronal = cesantiaEmpleador + mutual + sis + expectativaVida + afpEmpleador + seguroComplementario

  const costoTotalEmpresa = d.totalHaberes + totalPatronal

  const bonoNavidad       = calcularBonoAnual(config.bonosAnualesUF.navidad,       ufValue, tasaAFP, tasas)
  const bonoFiestasPatrias = calcularBonoAnual(config.bonosAnualesUF.fiestaPatrias, ufValue, tasaAFP, tasas)
  const bonoEscolaridad   = calcularBonoAnual(config.bonosAnualesUF.escolaridad,   ufValue, tasaAFP, tasas)

  const costoTotalEmpresaAnual =
    Math.round(costoTotalEmpresa) * 12 +
    bonoNavidad.costoEmpresa +
    bonoFiestasPatrias.costoEmpresa +
    bonoEscolaridad.costoEmpresa

  return {
    sueldoBase:             Math.round(sueldoBase),
    sueldoLiquido:          modo === "base_a_liquido" ? Math.round(d.liquido) : montoIngresado,
    gratificacion:          Math.round(d.gratificacion),
    bonosImponibles,
    bonosNoImponibles,
    totalHaberesImponibles: Math.round(d.imponible),
    movilizacion,
    totalHaberes:           Math.round(d.totalHaberes),
    cotizacionPrevisional:  Math.round(d.descuentoAFP),
    cotizacionSalud:        Math.round(d.descuentoSalud),
    cesantia:               Math.round(d.descuentoCesantia),
    impuesto:               Math.round(d.impuesto),
    totalDescuentos:        Math.round(d.totalDescuentos),
    cesantiaEmpleador,
    mutual,
    sis,
    expectativaVida,
    afpEmpleador,
    seguroComplementario,
    totalPatronal,
    costoTotalEmpresa:      Math.round(costoTotalEmpresa),
    bonoNavidad,
    bonoFiestasPatrias,
    bonoEscolaridad,
    costoTotalEmpresaAnual,
  }
}
