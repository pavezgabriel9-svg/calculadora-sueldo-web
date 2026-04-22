// lib/config.ts — solo fallback offline
import { CountryConfig, Pais } from './types'

export const PAISES: Pais[] = ['chile', 'peru', 'brasil']

export const FALLBACK_CONFIG: Record<string, CountryConfig> = {
  chile: {
    afpData: {
      Capital:   0.1144,
      Cuprum:    0.1144,
      Habitat:   0.1127,
      Modelo:    0.1066,
      Planvital: 0.1116,
      Provida:   0.1145,
      Uno:       0.1049,
    },
    ufValue: 39597.67,
    dolarValue: 950,
    taxBrackets: [
      { desde: 0,            hasta: 938817,     tasa: 0.00,  rebaja: 0           },
      { desde: 938817.01,    hasta: 2086260,    tasa: 0.04,  rebaja: 37552.68    },
      { desde: 2086260.01,   hasta: 3477100,    tasa: 0.08,  rebaja: 121003.08   },
      { desde: 3477100.01,   hasta: 4867940,    tasa: 0.135, rebaja: 312243.58   },
      { desde: 4867940.01,   hasta: 6258780,    tasa: 0.23,  rebaja: 774697.88   },
      { desde: 6258780.01,   hasta: 8345040,    tasa: 0.304, rebaja: 1237847.60  },
      { desde: 8345040.01,   hasta: 21558020,   tasa: 0.35,  rebaja: 1621719.44  },
      { desde: 21558020.01,  hasta: 999999999,  tasa: 0.40,  rebaja: 2699620.44  },
    ],
    tasas: {
      TASA_SALUD_FONASA:        0.07,
      TASA_CESANTIA:            0.006,
      TOPE_AFP_SALUD_UF:        89.9,
      TOPE_CESANTIA_UF:         135.1,
      GRATIFICACION_MAX_IMM:     4.75,
      SUELDO_MINIMO:            539000,
      CESANTIA_EMPLEADOR:       0.024,
      MUTUAL:                   0.0093,
      SIS:                      0.0154,
      EXPECTATIVA_VIDA:         0.009,
      AFP_EMPLEADOR:            0.001,
      SEGURO_COMPLEMENTARIO_UF: 0.4822,
    },
  },
  peru: {
    afpData: {},
    ufValue: 1,
    dolarValue: 1,
    taxBrackets: [],
    tasas: {
      TASA_SALUD_FONASA: 0, TASA_CESANTIA: 0, TOPE_AFP_SALUD_UF: 0,
      TOPE_CESANTIA_UF: 0, GRATIFICACION_MAX_IMM: 0, SUELDO_MINIMO: 0,
      CESANTIA_EMPLEADOR: 0, MUTUAL: 0, SIS: 0, EXPECTATIVA_VIDA: 0,
      AFP_EMPLEADOR: 0, SEGURO_COMPLEMENTARIO_UF: 0,
    },
  },
  brasil: {
    afpData: {},
    ufValue: 1,
    dolarValue: 1,
    taxBrackets: [],
    tasas: {
      TASA_SALUD_FONASA: 0, TASA_CESANTIA: 0, TOPE_AFP_SALUD_UF: 0,
      TOPE_CESANTIA_UF: 0, GRATIFICACION_MAX_IMM: 0, SUELDO_MINIMO: 0,
      CESANTIA_EMPLEADOR: 0, MUTUAL: 0, SIS: 0, EXPECTATIVA_VIDA: 0,
      AFP_EMPLEADOR: 0, SEGURO_COMPLEMENTARIO_UF: 0,
    },
  },
}
