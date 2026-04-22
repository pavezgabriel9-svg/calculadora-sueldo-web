// lib/calculations.ts

import { Bono, BonoAnual, ResultadosCalculo, Modo, Pais, SistemaSalud, CountryConfig, TramoImpuesto } from "./types"
import { TRAMOS_IMPUESTO_PERU } from "./config"

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

function calcularSaludPatronalPeru(
  sueldo: number,
  config: CountryConfig
): number {
  const rmv = config.tasas.RMV || 0
  const baseMinima = config.tasas.SALUD_BASE_MINIMA ? Math.max(sueldo, rmv) : sueldo
  return Math.round(baseMinima * (config.tasas.TASA_SALUD_PATRONAL || 0))
}

function calcularImpuestoRentaPeruAnual(
  sueldoBase: number,
  config: CountryConfig
): { impuestoAnual: number; impuestoMensual: number } {
  const SUELDOS = config.tasas.SUELDOS_ANUALES || 14
  const UIT = config.tasas.UIT || 5500
  const DEDUCCION_FIJA = config.tasas.DEDUCCION_FIJA_UIT || 7
  const DEDUCCION_ADIC = config.tasas.DEDUCCION_ADICIONAL_UIT || 3

  // Ingresos anuales
  const ingresosAnuales = sueldoBase * SUELDOS

  // Deducción: fija + adicional
  const deduccionTotal = (DEDUCCION_FIJA + DEDUCCION_ADIC) * UIT
  const baseImponible = Math.max(0, ingresosAnuales - deduccionTotal)

  // Convertir a UIT para tramos
  const baseUIT = baseImponible / UIT

  // Calcular impuesto por tramos progresivos
  let impuestoAnual = 0
  const tramos = config.tasas.TRAMOS_IMPUESTO || TRAMOS_IMPUESTO_PERU

  for (const tramo of tramos) {
    const desde = tramo.desde_uf ?? 0
    const hasta = tramo.hasta_uf ?? Infinity

    if (baseUIT > desde) {
      const topeDeTramo = Math.min(baseUIT, hasta)
      const imponibleEnTramo = (topeDeTramo - desde) * UIT
      impuestoAnual += imponibleEnTramo * tramo.tasa
    }
  }

  return {
    impuestoAnual: Math.round(impuestoAnual),
    impuestoMensual: Math.round(impuestoAnual / 12),
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
  pais: Pais,
  config: CountryConfig
): ResultadosCalculo {
  const { afpData, ufValue, tasas } = config
  const isPeru = pais === "peru"
  const isChile = pais === "chile"

  // AFP rate - Perú y Chile tienen estructuras diferentes
  const tasaAFP = isPeru
    ? (config.tasas.TASA_AFP_OBLIGATORIA || 0.10) // Aporte obligatorio Perú
    : afpData[afpNombre] || 0.1049 // Chile usa tasas de AFP

  // Comisión AFP (Perú) o tasa adicional
  const tasaComisionAFP = isPeru ? (afpData[afpNombre] || config.tasas.TASA_COMISION_AFP || 0.0155) : 0

  const tasaSalud =
    sistemaSalud === "fonasa"
      ? tasas.TASA_SALUD_FONASA
      : Math.max(tasas.TASA_SALUD_FONASA, (saludUF * ufValue) / 1000000)

  const bonosImponibles = bonos
    .filter((b) => b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  const bonosNoImponibles = bonos
    .filter((b) => !b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  let sueldoBase: number
  let sueldoLiquido: number

  // === LÓGICA ESPECÍFICA POR PAÍS ===

  if (isPeru) {
    // ========== PERÚ ==========
    sueldoBase = montoIngresado

    // Perú no tiene gratificación en el mismo sentido que Chile
    const gratificacion = 0

    const totalImponible = sueldoBase + bonosImponibles

    // Descuentos previsionales del trabajador
    const descuentoAFP = Math.round(totalImponible * tasaAFP)
    const descuentoComisionAFP = Math.round(totalImponible * tasaComisionAFP)
    const descuentoSeguros = Math.round(totalImponible * (config.tasas.TASA_SEGUROS_INVALIDEZ || 0.0137))

    // Salud: costo patronal (no es descuento del trabajador en Perú)
    // Se calcula sobre base mínima RMV
    const saludPatronal = calcularSaludPatronalPeru(sueldoBase, config)

    // Impuesto a la renta anual de quinta categoría
    const { impuestoMensual } = calcularImpuestoRentaPeruAnual(sueldoBase, config)

    // Total descuentos trabajador (AFP + Seguros + Impuesto)
    const totalDescuentos = descuentoAFP + descuentoComisionAFP + descuentoSeguros + impuestoMensual

    sueldoLiquido = sueldoBase + bonosImponibles + bonosNoImponibles + movilizacion - totalDescuentos

    // Costos patronales: solo salud en Perú (los demás son cero)
    const cesantiaEmpleador = 0
    const mutual = 0
    const sis = 0
    const expectativaVida = 0
    const afpEmpleador = 0
    const seguroComplementario = 0
    const totalPatronal = saludPatronal

    const totalHaberes = sueldoBase + bonosImponibles + bonosNoImponibles + movilizacion
    const costoTotalEmpresa = totalHaberes + totalPatronal

    // Bonos anuales no aplican en Perú
    const bonoNavidad: BonoAnual = {
      montoImponible: 0,
      descuentoTrabajador: 0,
      costoEmpresa: 0,
    }
    const bonoFiestasPatrias: BonoAnual = {
      montoImponible: 0,
      descuentoTrabajador: 0,
      costoEmpresa: 0,
    }
    const bonoEscolaridad: BonoAnual = {
      montoImponible: 0,
      descuentoTrabajador: 0,
      costoEmpresa: 0,
    }

    const costoTotalEmpresaAnual = Math.round(costoTotalEmpresa * 12)

    return {
      sueldoBase: Math.round(sueldoBase),
      sueldoLiquido: Math.round(sueldoLiquido),
      gratificacion: 0,
      bonosImponibles,
      bonosNoImponibles,
      totalHaberesImponibles: Math.round(totalImponible),
      movilizacion,
      totalHaberes: Math.round(totalHaberes),
      cotizacionPrevisional: descuentoAFP,
      cotizacionSalud: descuentoComisionAFP + descuentoSeguros,
      cesantia: 0,
      impuesto: impuestoMensual,
      totalDescuentos,
      cesantiaEmpleador,
      mutual,
      sis,
      expectativaVida,
      afpEmpleador,
      seguroComplementario,
      totalPatronal,
      costoTotalEmpresa: Math.round(costoTotalEmpresa),
      bonoNavidad,
      bonoFiestasPatrias,
      bonoEscolaridad,
      costoTotalEmpresaAnual,
    }
  } else {
    // ========== CHILE (y otros) ==========
    if (modo === "base_a_liquido") {
      sueldoBase = montoIngresado

      // Cálculo directo: Base → Líquido
      const gratificacion = Math.min(
        sueldoBase * 0.25,
        (tasas.GRATIFICACION_MAX_IMM * tasas.SUELDO_MINIMO) / 12
      )

      const totalImponible = Math.min(
        sueldoBase + gratificacion + bonosImponibles,
        tasas.LIMITE_UF_IMPONIBLE * ufValue
      )

      const descuentoAFP = totalImponible * tasaAFP
      const descuentoSalud =
        sistemaSalud === "fonasa"
          ? totalImponible * 0.07
          : Math.max(totalImponible * 0.07, saludUF * ufValue)
      const descuentoCesantia = totalImponible * tasas.TASA_CESANTIA

      const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
      const baseImponible = totalImponible - totalDescuentos
      const impuesto =
        baseImponible > tasas.LIMITE_IMPUESTO
          ? (baseImponible - tasas.LIMITE_IMPUESTO) * tasas.TASA_IMPUESTO
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
          (tasas.GRATIFICACION_MAX_IMM * tasas.SUELDO_MINIMO) / 12
        )

        const totalImponible = Math.min(
          sueldoBase + gratificacion + bonosImponibles,
          tasas.LIMITE_UF_IMPONIBLE * ufValue
        )

        const descuentoAFP = totalImponible * tasaAFP
        const descuentoSalud =
          sistemaSalud === "fonasa"
            ? totalImponible * 0.07
            : Math.max(totalImponible * 0.07, saludUF * ufValue)
        const descuentoCesantia = totalImponible * tasas.TASA_CESANTIA

        const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
        const baseImponible = totalImponible - totalDescuentos
        const impuesto =
          baseImponible > tasas.LIMITE_IMPUESTO
            ? (baseImponible - tasas.LIMITE_IMPUESTO) * tasas.TASA_IMPUESTO
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
      (tasas.GRATIFICACION_MAX_IMM * tasas.SUELDO_MINIMO) / 12
    )

    const totalImponible = Math.min(
      sueldoBase + gratificacion + bonosImponibles,
      tasas.LIMITE_UF_IMPONIBLE * ufValue
    )

    const cotizacionPrevisional = Math.round(totalImponible * tasaAFP)
    const cotizacionSalud =
      sistemaSalud === "fonasa"
        ? Math.round(totalImponible * 0.07)
        : Math.round(Math.max(totalImponible * 0.07, saludUF * ufValue))
    const cesantia = Math.round(totalImponible * tasas.TASA_CESANTIA)

    const totalDescuentos = cotizacionPrevisional + cotizacionSalud + cesantia
    const baseImponible = totalImponible - totalDescuentos
    const impuesto =
      baseImponible > tasas.LIMITE_IMPUESTO
        ? Math.round((baseImponible - tasas.LIMITE_IMPUESTO) * tasas.TASA_IMPUESTO)
        : 0

    // Costos patronales
    const cesantiaEmpleador = Math.round(totalImponible * tasas.CESANTIA_EMPLEADOR)
    const mutual = Math.round(totalImponible * tasas.MUTUAL)
    const sis = Math.round(totalImponible * tasas.SIS)
    const expectativaVida = Math.round(totalImponible * tasas.EXPECTATIVA_VIDA)
    const afpEmpleador = 0
    const seguroComplementario = 0
    const totalPatronal =
      cesantiaEmpleador + mutual + sis + expectativaVida + afpEmpleador + seguroComplementario

    const totalHaberes =
      sueldoBase + gratificacion + bonosImponibles + bonosNoImponibles + movilizacion
    const costoTotalEmpresa = totalHaberes + totalPatronal

    const bonoNavidad = config.bonosAnualesUF
      ? calcularBonoAnual(config.bonosAnualesUF.navidad, ufValue, tasaAFP, tasas)
      : { montoImponible: 0, descuentoTrabajador: 0, costoEmpresa: 0 }
    const bonoFiestasPatrias = config.bonosAnualesUF
      ? calcularBonoAnual(config.bonosAnualesUF.fiestaPatrias, ufValue, tasaAFP, tasas)
      : { montoImponible: 0, descuentoTrabajador: 0, costoEmpresa: 0 }
    const bonoEscolaridad = config.bonosAnualesUF
      ? calcularBonoAnual(config.bonosAnualesUF.escolaridad, ufValue, tasaAFP, tasas)
      : { montoImponible: 0, descuentoTrabajador: 0, costoEmpresa: 0 }

    const costoTotalEmpresaAnual =
      Math.round(costoTotalEmpresa) * 12 +
      bonoNavidad.costoEmpresa +
      bonoFiestasPatrias.costoEmpresa +
      bonoEscolaridad.costoEmpresa

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
      bonoNavidad,
      bonoFiestasPatrias,
      bonoEscolaridad,
      costoTotalEmpresaAnual,
    }
  }
}
