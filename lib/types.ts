// lib/types.ts

export interface Bono {
  id: string
  nombre: string
  monto: number
  imponible: boolean
}

export interface TramosImpuesto {
  desde: number
  hasta: number
  tasa: number
  rebaja: number
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

  // Total
  costoTotalEmpresa: number
}

export type Modo = "liquido_a_base" | "base_a_liquido"
export type Pais = "chile" | "peru" | "brasil"
export type SistemaSalud = "fonasa" | "isapre"
export type Moneda = 'CLP' | 'USD'

export interface CountryConfig {
  afpData: Record<string, number>
  ufValue: number
  dolarValue: number
  taxBrackets: TramosImpuesto[]
  tasas: {
    TASA_SALUD_FONASA: number
    TASA_CESANTIA: number
    TOPE_AFP_SALUD_UF: number
    TOPE_CESANTIA_UF: number
    GRATIFICACION_MAX_IMM: number
    SUELDO_MINIMO: number
    CESANTIA_EMPLEADOR: number
    MUTUAL: number
    SIS: number
    EXPECTATIVA_VIDA: number
    AFP_EMPLEADOR: number
    SEGURO_COMPLEMENTARIO_UF: number
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
