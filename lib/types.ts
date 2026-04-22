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
export type SistemaSalud = "fonasa" | "isapre"

export interface CountryConfig {
  afpData: Record<string, number>
  ufValue: number
  bonosAnualesUF: {
    navidad: number
    fiestaPatrias: number
    escolaridad: number
  }
  tasas: {
    TASA_SALUD_FONASA: number
    TASA_CESANTIA: number
    TOPE_AFP_SALUD_UF: number
    TOPE_CESANTIA_UF: number
    GRATIFICACION_MAX_IMM: number
    SUELDO_MINIMO: number
    LIMITE_IMPUESTO: number
    TASA_IMPUESTO: number
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
