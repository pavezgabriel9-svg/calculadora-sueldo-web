// lib/types.ts

export interface Bono {
  id: string
  nombre: string
  monto: number
  imponible: boolean
}

export interface BonoAnual {
  montoImponible: number
  descuentoTrabajador: number
  costoEmpresa: number
}

export interface ResultadosCalculo {
  sueldoBase: number
  sueldoLiquido: number
  gratificacion: number
  bonosImponibles: number
  bonosNoImponibles: number
  totalHaberesImponibles: number
  movilizacion: number
  totalHaberes: number

  // Descuentos trabajador
  cotizacionPrevisional: number
  cotizacionSalud: number
  cesantia: number
  impuesto: number
  totalDescuentos: number

  // Costos patronales
  cesantiaEmpleador: number
  mutual: number
  sis: number
  expectativaVida: number
  afpEmpleador: number
  seguroComplementario: number
  totalPatronal: number

  // Provisión gratificaciones (Perú: 2 sueldos/12, Chile: 0)
  provisionGratificaciones: number
  essaludGratificaciones: number

  // Total mensual
  costoTotalEmpresa: number

  // Bonos anuales fijos
  bonoNavidad: BonoAnual
  bonoFiestasPatrias: BonoAnual
  bonoEscolaridad: BonoAnual
  costoTotalEmpresaAnual: number
}

export type Modo = "liquido_a_base" | "base_a_liquido"
export type Pais = "chile" | "peru" | "brasil"
export type SistemaSalud = "fonasa" | "isapre" | "essalud"

export interface TramoImpuesto {
  desde_uf?: number
  hasta_uf?: number | null
  tasa: number
}

export interface CountryConfig {
  afpData: Record<string, number>
  ufValue: number
  dolarRate: number
  bonosAnualesUF?: {
    navidad: number
    fiestaPatrias: number
    escolaridad: number
  }
  tasas: {
    // Remuneración Mínima y Base
    RMV?: number
    SUELDO_MINIMO: number
    SUELDOS_ANUALES?: number

    // Sistema de Salud
    TASA_SALUD_FONASA: number
    TASA_SALUD_PATRONAL?: number
    SALUD_BASE_MINIMA?: boolean

    // Sistema Previsional
    TASA_AFP_OBLIGATORIA?: number
    TASA_SEGUROS_INVALIDEZ?: number
    TASA_COMISION_AFP?: number

    // Cesantía
    TASA_CESANTIA: number
    CESANTIA_EMPLEADOR: number

    // Costos Patronales
    MUTUAL: number
    SIS: number
    EXPECTATIVA_VIDA: number

    // Gratificación/Bonos
    GRATIFICACION_MAX_IMM: number
    LIMITE_UF_IMPONIBLE: number

    // Impuesto a la Renta
    LIMITE_IMPUESTO: number
    TASA_IMPUESTO: number
    TRAMOS_IMPUESTO?: TramoImpuesto[]
    UIT?: number
    DEDUCCION_FIJA_UIT?: number
    DEDUCCION_ADICIONAL_UIT?: number
  }
}

export interface CalculatorParams {
  modo: Modo
  sueldo: string
  afp: string
  sistemaSalud: SistemaSalud
  saludUF: string
  movilizacion: string
  bonos: Bono[]
  pais: Pais
  config: CountryConfig
}
