// lib/calculations.ts

import { Bono, ResultadosCalculo, Modo, Pais, SistemaSalud } from "./types"
import { AFP_DATA, CONFIG_POR_PAIS } from "./config"

export function calcularRemuneracion(
  modo: Modo,
  montoIngresado: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonos: Bono[],
  pais: Pais = "chile"
): ResultadosCalculo {
  const config = CONFIG_POR_PAIS[pais]
  const tasaAFP = AFP_DATA[afpNombre] || 0.1049

  const tasaSalud =
    sistemaSalud === "fonasa"
      ? config.TASA_SALUD_FONASA
      : Math.max(config.TASA_SALUD_FONASA, (saludUF * config.UF_VALUE) / 1000000)

  const bonosImponibles = bonos
    .filter((b) => b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  const bonosNoImponibles = bonos
    .filter((b) => !b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  let sueldoBase: number
  let sueldoLiquido: number

  if (modo === "base_a_liquido") {
    sueldoBase = montoIngresado

    // Cálculo directo: Base → Líquido
    const gratificacion = Math.min(
      sueldoBase * 0.25,
      (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
    )

    const totalImponible = Math.min(
      sueldoBase + gratificacion + bonosImponibles,
      config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
    )

    const descuentoAFP = totalImponible * tasaAFP
    const descuentoSalud =
      sistemaSalud === "fonasa"
        ? totalImponible * 0.07
        : Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE)
    const descuentoCesantia = totalImponible * config.TASA_CESANTIA

    const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
    const baseImponible = totalImponible - totalDescuentos
    const impuesto =
      baseImponible > config.LIMITE_IMPUESTO
        ? (baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO
        : 0

    sueldoLiquido =
      sueldoBase +
      gratificacion +
      bonosImponibles +
      bonosNoImponibles +
      movilizacion -
      totalDescuentos -
      impuesto
  } else {
    // Cálculo inverso: Líquido → Base (iterativo)
    sueldoLiquido = montoIngresado
    sueldoBase = Math.round(sueldoLiquido * 1.35)

    // Iteración para convergencia
    for (let i = 0; i < 20; i++) {
      const gratificacion = Math.min(
        sueldoBase * 0.25,
        (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
      )

      const totalImponible = Math.min(
        sueldoBase + gratificacion + bonosImponibles,
        config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
      )

      const descuentoAFP = totalImponible * tasaAFP
      const descuentoSalud =
        sistemaSalud === "fonasa"
          ? totalImponible * 0.07
          : Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE)
      const descuentoCesantia = totalImponible * config.TASA_CESANTIA

      const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
      const baseImponible = totalImponible - totalDescuentos
      const impuesto =
        baseImponible > config.LIMITE_IMPUESTO
          ? (baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO
          : 0

      const liquidoCalculado =
        sueldoBase +
        gratificacion +
        bonosImponibles +
        bonosNoImponibles +
        movilizacion -
        totalDescuentos -
        impuesto
      const diferencia = sueldoLiquido - liquidoCalculado

      if (Math.abs(diferencia) < 100) break
      sueldoBase = Math.round(sueldoBase + diferencia * 0.8)
    }
  }

  // Cálculos finales para retorno
  const gratificacion = Math.min(
    sueldoBase * 0.25,
    (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
  )

  const totalImponible = Math.min(
    sueldoBase + gratificacion + bonosImponibles,
    config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
  )

  const cotizacionPrevisional = Math.round(totalImponible * tasaAFP)
  const cotizacionSalud =
    sistemaSalud === "fonasa"
      ? Math.round(totalImponible * 0.07)
      : Math.round(Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE))
  const cesantia = Math.round(totalImponible * config.TASA_CESANTIA)

  const totalDescuentos = cotizacionPrevisional + cotizacionSalud + cesantia
  const baseImponible = totalImponible - totalDescuentos
  const impuesto =
    baseImponible > config.LIMITE_IMPUESTO
      ? Math.round((baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO)
      : 0

  // Costos patronales
  const cesantiaEmpleador = Math.round(
    totalImponible * config.CESANTIA_EMPLEADOR
  )
  const mutual = Math.round(totalImponible * config.MUTUAL)
  const sis = Math.round(totalImponible * config.SIS)
  const expectativaVida = Math.round(totalImponible * config.EXPECTATIVA_VIDA)
  const afpEmpleador = 0
  const seguroComplementario = 0
  const totalPatronal =
    cesantiaEmpleador +
    mutual +
    sis +
    expectativaVida +
    afpEmpleador +
    seguroComplementario

  const totalHaberes =
    sueldoBase + gratificacion + bonosImponibles + bonosNoImponibles + movilizacion
  const costoTotalEmpresa = totalHaberes + totalPatronal

  return {
    sueldoBase: Math.round(sueldoBase),
    sueldoLiquido:
      modo === "base_a_liquido"
        ? Math.round(totalHaberes - totalDescuentos - impuesto)
        : montoIngresado,
    gratificacion: Math.round(gratificacion),
    bonosImponibles,
    bonosNoImponibles,
    totalHaberesImponibles: Math.round(totalImponible),
    movilizacion,
    totalHaberes: Math.round(totalHaberes),
    cotizacionPrevisional,
    cotizacionSalud,
    cesantia,
    impuesto,
    totalDescuentos: totalDescuentos + impuesto,
    cesantiaEmpleador,
    mutual,
    sis,
    expectativaVida,
    afpEmpleador,
    seguroComplementario,
    totalPatronal,
    costoTotalEmpresa: Math.round(costoTotalEmpresa),
  }
}
