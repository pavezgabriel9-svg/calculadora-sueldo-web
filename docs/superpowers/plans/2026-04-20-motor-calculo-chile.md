# Motor de Cálculo Chile — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el motor de cálculo de remuneraciones Chile a la lógica exacta del motor Python de referencia, con todos los valores alimentados desde Supabase y fallback offline en `lib/config.ts`.

**Architecture:** Supabase es fuente de verdad (UF, AFP, tasas, tramos, dólar). `configService.ts` fetches y mapea a `CountryConfig`. `calculations.ts` recibe siempre un `CountryConfig` completo — nunca importa constantes. `lib/config.ts` solo existe como escudo offline.

**Tech Stack:** Next.js 15, TypeScript, Supabase JS v2, vitest (a instalar), Supabase MCP para migraciones.

---

## Chunk 1: Setup de tests + tipos

### Task 1: Instalar vitest y configurar

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Crear vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Agregar scripts en package.json**

En la sección `"scripts"` agregar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que vitest funciona**

```bash
npm test
```
Expected: "No test files found" (sin error de configuración).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Actualizar `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

> **Contexto:** `CountryConfig` actualmente tiene `LIMITE_UF_IMPONIBLE`, `LIMITE_IMPUESTO`, `TASA_IMPUESTO` en `tasas`. Se reemplazan. Se agregan `TramosImpuesto`, `dolarValue`, `taxBrackets` y nuevas keys en `tasas`.

- [ ] **Step 1: Escribir test que valida la forma del tipo**

Crear `lib/__tests__/types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest'
import type { CountryConfig, TramosImpuesto } from '../types'

describe('CountryConfig shape', () => {
  it('TramosImpuesto has required fields', () => {
    expectTypeOf<TramosImpuesto>().toHaveProperty('desde')
    expectTypeOf<TramosImpuesto>().toHaveProperty('hasta')
    expectTypeOf<TramosImpuesto>().toHaveProperty('tasa')
    expectTypeOf<TramosImpuesto>().toHaveProperty('rebaja')
  })

  it('CountryConfig has taxBrackets and dolarValue', () => {
    expectTypeOf<CountryConfig>().toHaveProperty('taxBrackets')
    expectTypeOf<CountryConfig>().toHaveProperty('dolarValue')
  })

  it('tasas has new keys', () => {
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('TOPE_AFP_SALUD_UF')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('TOPE_CESANTIA_UF')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('SUELDO_MINIMO')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('AFP_EMPLEADOR')
    expectTypeOf<CountryConfig['tasas']>().toHaveProperty('SEGURO_COMPLEMENTARIO_UF')
  })
})
```

- [ ] **Step 2: Correr test — debe fallar (tipos no existen aún)**

```bash
npm test lib/__tests__/types.test.ts
```
Expected: error de TypeScript / tipo no encontrado.

- [ ] **Step 3: Reescribir `lib/types.ts`**

```typescript
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
    GRATIFICACION_MAX_UF: number
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
```

- [ ] **Step 4: Correr test — debe pasar**

```bash
npm test lib/__tests__/types.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Verificar que TypeScript compila (habrá errores en otros archivos — esperado)**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: errores en `lib/config.ts`, `lib/services/configService.ts`, `lib/calculations.ts` — todos por las keys viejas. Eso es correcto, los arreglamos en los siguientes tasks.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/__tests__/types.test.ts
git commit -m "feat(types): add TramosImpuesto, extend CountryConfig with taxBrackets/dolarValue"
```

---

## Chunk 2: Fallback config + configService

### Task 3: Reescribir `lib/config.ts` como fallback offline

**Files:**
- Modify: `lib/config.ts`

> **Contexto:** El archivo actual exporta `AFP_DATA`, `TASAS_CHILE`, `CONFIG_POR_PAIS`. Todo eso desaparece. Pasa a exportar solo `FALLBACK_CONFIG` y `PAISES`.

- [ ] **Step 1: Escribir test del fallback**

Crear `lib/__tests__/config.test.ts`:

```typescript
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
    // primer tramo empieza en 0
    expect(tramos[0].desde).toBe(0)
    // último tramo llega a infinito efectivo
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
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
npm test lib/__tests__/config.test.ts
```
Expected: FAIL — `FALLBACK_CONFIG` no existe aún.

- [ ] **Step 3: Reescribir `lib/config.ts`**

```typescript
// lib/config.ts — solo fallback offline
import { CountryConfig, Pais } from './types'

export const PAISES: Pais[] = ['chile', 'peru', 'brasil']

export const FALLBACK_CONFIG: Record<string, CountryConfig> = {
  chile: {
    afpData: {
      Capital:  0.1144,
      Cuprum:   0.1144,
      Habitat:  0.1127,
      Modelo:   0.1066,
      Planvital: 0.1116,
      Provida:  0.1145,
      Uno:      0.1049,
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
      TASA_SALUD_FONASA:       0.07,
      TASA_CESANTIA:           0.006,
      TOPE_AFP_SALUD_UF:       89.9,
      TOPE_CESANTIA_UF:        135.1,
      GRATIFICACION_MAX_UF:    4.75,
      SUELDO_MINIMO:           539000,
      CESANTIA_EMPLEADOR:      0.024,
      MUTUAL:                  0.0093,
      SIS:                     0.0154,
      EXPECTATIVA_VIDA:        0.009,
      AFP_EMPLEADOR:           0.001,
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
      TOPE_CESANTIA_UF: 0, GRATIFICACION_MAX_UF: 0, SUELDO_MINIMO: 0,
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
      TOPE_CESANTIA_UF: 0, GRATIFICACION_MAX_UF: 0, SUELDO_MINIMO: 0,
      CESANTIA_EMPLEADOR: 0, MUTUAL: 0, SIS: 0, EXPECTATIVA_VIDA: 0,
      AFP_EMPLEADOR: 0, SEGURO_COMPLEMENTARIO_UF: 0,
    },
  },
}
```

- [ ] **Step 4: Correr test — debe pasar**

```bash
npm test lib/__tests__/config.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/config.ts lib/__tests__/config.test.ts
git commit -m "feat(config): rewrite as FALLBACK_CONFIG offline shield"
```

---

### Task 4: Migración Supabase

**Files:** Supabase (vía MCP)

> **Contexto:** La tabla `country_config` existe con columnas `pais`, `afp_data`, `uf_value`, `tasas`, `updated_at` y sus `_updated_at` individuales. Hay que agregar `tax_brackets`, `tax_brackets_updated_at`, `dolar_value`, `dolar_updated_at`.

- [ ] **Step 1: Aplicar migración de esquema vía MCP Supabase**

Ejecutar usando `mcp__claude_ai_Supabase__apply_migration`:

```sql
ALTER TABLE country_config
  ADD COLUMN IF NOT EXISTS tax_brackets JSONB,
  ADD COLUMN IF NOT EXISTS tax_brackets_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS dolar_value NUMERIC,
  ADD COLUMN IF NOT EXISTS dolar_updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE country_config
  ADD CONSTRAINT tax_brackets_is_array
  CHECK (tax_brackets IS NULL OR jsonb_typeof(tax_brackets) = 'array');
```

- [ ] **Step 2: Poblar `tax_brackets` Chile**

```sql
UPDATE country_config
SET
  tax_brackets = '[
    {"desde": 0,           "hasta": 938817,    "tasa": 0.00,  "rebaja": 0},
    {"desde": 938817.01,   "hasta": 2086260,   "tasa": 0.04,  "rebaja": 37552.68},
    {"desde": 2086260.01,  "hasta": 3477100,   "tasa": 0.08,  "rebaja": 121003.08},
    {"desde": 3477100.01,  "hasta": 4867940,   "tasa": 0.135, "rebaja": 312243.58},
    {"desde": 4867940.01,  "hasta": 6258780,   "tasa": 0.23,  "rebaja": 774697.88},
    {"desde": 6258780.01,  "hasta": 8345040,   "tasa": 0.304, "rebaja": 1237847.60},
    {"desde": 8345040.01,  "hasta": 21558020,  "tasa": 0.35,  "rebaja": 1621719.44},
    {"desde": 21558020.01, "hasta": 999999999, "tasa": 0.40,  "rebaja": 2699620.44}
  ]'::jsonb,
  tax_brackets_updated_at = NOW()
WHERE pais = 'chile';
```

- [ ] **Step 3: Actualizar `tasas` Chile con keys corregidas y nuevas**

```sql
UPDATE country_config
SET
  tasas = '{
    "TASA_SALUD_FONASA": 0.07,
    "TASA_CESANTIA": 0.006,
    "TOPE_AFP_SALUD_UF": 89.9,
    "TOPE_CESANTIA_UF": 135.1,
    "GRATIFICACION_MAX_UF": 4.75,
    "SUELDO_MINIMO": 539000,
    "CESANTIA_EMPLEADOR": 0.024,
    "MUTUAL": 0.0093,
    "SIS": 0.0154,
    "EXPECTATIVA_VIDA": 0.009,
    "AFP_EMPLEADOR": 0.001,
    "SEGURO_COMPLEMENTARIO_UF": 0.4822
  }'::jsonb,
  tasas_updated_at = NOW()
WHERE pais = 'chile';
```

- [ ] **Step 4: Verificar datos con SELECT**

```sql
SELECT pais,
       tax_brackets IS NOT NULL AS tiene_tramos,
       jsonb_array_length(tax_brackets) AS num_tramos,
       tasas->>'TOPE_AFP_SALUD_UF' AS tope_afp,
       tasas->>'SIS' AS sis,
       dolar_value
FROM country_config
WHERE pais = 'chile';
```
Expected: `tiene_tramos=true`, `num_tramos=8`, `tope_afp=89.9`, `sis=0.0154`.

- [ ] **Step 5: Commit nota de migración**

```bash
git commit --allow-empty -m "feat(supabase): add tax_brackets + dolar_value columns, populate Chile data"
```

---

### Task 5: Actualizar `lib/services/configService.ts`

**Files:**
- Modify: `lib/services/configService.ts`

> **Contexto:** El servicio actual importa `AFP_DATA` y `CONFIG_POR_PAIS` de `lib/config.ts` — ambos desaparecen. Pasa a importar `FALLBACK_CONFIG`. Hay que agregar fetch de `tax_brackets` y `dolar_value`, actualizar staleness thresholds.

- [ ] **Step 1: Reescribir `configService.ts`**

```typescript
// lib/services/configService.ts

import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { FALLBACK_CONFIG } from '@/lib/config'
import { CountryConfig, Pais, TramosImpuesto } from '@/lib/types'

const STALE_THRESHOLDS = {
  uf:           1,   // días — n8n actualiza diariamente
  dolar:        1,   // días — n8n actualiza diariamente
  afp:          45,
  tasas:        30,
  taxBrackets:  30,
} as const

function isStale(updatedAt: string | null | undefined, thresholdDays: number): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return diffMs > thresholdDays * 24 * 60 * 60 * 1000
}

async function fetchCountryConfig(pais: Pais): Promise<CountryConfig> {
  const fallback = FALLBACK_CONFIG[pais]

  if (!supabase) {
    console.warn(`[config] supabase client not initialized, using full fallback for pais=${pais}`)
    return fallback
  }

  let row: Record<string, unknown> | null = null

  try {
    const { data, error } = await supabase
      .from('country_config')
      .select(`
        afp_data, afp_updated_at,
        uf_value, uf_updated_at,
        dolar_value, dolar_updated_at,
        tasas, tasas_updated_at,
        tax_brackets, tax_brackets_updated_at
      `)
      .eq('pais', pais)
      .single()

    if (error) {
      console.warn(`[config] supabase error for pais=${pais}: ${error.message}, using full fallback`)
      return fallback
    }

    if (!data) {
      console.warn(`[config] no row for pais=${pais}, using full fallback`)
      return fallback
    }

    row = data
  } catch (e) {
    console.warn(`[config] supabase unreachable, using full fallback for pais=${pais}`, e)
    return fallback
  }

  const afpData = isStale(row.afp_updated_at as string, STALE_THRESHOLDS.afp)
    ? (console.warn(`[config] afp_data stale for pais=${pais}, using fallback`), fallback.afpData)
    : (row.afp_data as Record<string, number>)

  const ufValue = isStale(row.uf_updated_at as string, STALE_THRESHOLDS.uf)
    ? (console.warn(`[config] uf_value stale for pais=${pais}, using fallback`), fallback.ufValue)
    : (row.uf_value as number)

  const dolarValue = isStale(row.dolar_updated_at as string, STALE_THRESHOLDS.dolar)
    ? (console.warn(`[config] dolar_value stale for pais=${pais}, using fallback`), fallback.dolarValue)
    : ((row.dolar_value as number) ?? fallback.dolarValue)

  const tasas = isStale(row.tasas_updated_at as string, STALE_THRESHOLDS.tasas)
    ? (console.warn(`[config] tasas stale for pais=${pais}, using fallback`), fallback.tasas)
    : (row.tasas as CountryConfig['tasas'])

  const taxBrackets = isStale(row.tax_brackets_updated_at as string, STALE_THRESHOLDS.taxBrackets)
    ? (console.warn(`[config] tax_brackets stale for pais=${pais}, using fallback`), fallback.taxBrackets)
    : ((row.tax_brackets as TramosImpuesto[]) ?? fallback.taxBrackets)

  return { afpData, ufValue, dolarValue, tasas, taxBrackets }
}

export const getCountryConfig = unstable_cache(
  fetchCountryConfig,
  ['country-config'],
  { revalidate: 3600 }
)
```

- [ ] **Step 2: Verificar que TypeScript compila sin errores en este archivo**

```bash
npx tsc --noEmit 2>&1 | grep configService
```
Expected: sin errores para `configService.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/services/configService.ts
git commit -m "feat(configService): add tax_brackets + dolar_value, update staleness thresholds"
```

---

## Chunk 3: Motor de cálculo

### Task 6: Reescribir `lib/calculations.ts`

**Files:**
- Modify: `lib/calculations.ts`
- Create: `lib/__tests__/calculations.test.ts`

> **Contexto:** El motor actual usa un tope único de imponible, impuesto simplificado, loop iterativo para el inverso y deja `afpEmpleador`/`seguroComplementario` en 0. Se reescribe completo siguiendo `engine.py`.

- [ ] **Step 1: Escribir tests del motor**

Crear `lib/__tests__/calculations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calcularRemuneracion } from '../calculations'
import { FALLBACK_CONFIG } from '../config'

const config = FALLBACK_CONFIG['chile']

// Caso base: sueldo $1.000.000, AFP Uno, FONASA, sin bonos
const casoBase = {
  afp: 'Uno',
  sistemaSalud: 'fonasa' as const,
  saludUF: 0,
  movilizacion: 0,
  bonos: [],
  pais: 'chile' as const,
  config,
}

describe('calcularRemuneracion — base_a_liquido', () => {
  it('calcula gratificación como min(base*25%, tope)', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    // tope = 4.75 * 39597.67 / 12 ≈ 15678
    // 25% de 1M = 250000 → tope gana
    expect(r.gratificacion).toBeLessThan(20_000)
    expect(r.gratificacion).toBeGreaterThan(0)
  })

  it('usa topes diferenciados: AFP/salud ≠ cesantía', () => {
    // Sueldo alto que supere el tope AFP/salud (89.9 UF ≈ 3.55M) pero no cesantía
    const r = calcularRemuneracion('base_a_liquido', 5_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    const topeAFPSalud = config.tasas.TOPE_AFP_SALUD_UF * config.ufValue
    // cotización previsional no puede superar tope AFP/salud * tasa
    expect(r.cotizacionPrevisional).toBeLessThanOrEqual(Math.ceil(topeAFPSalud * 0.11))
  })

  it('impuesto es 0 para sueldo bajo primer tramo', () => {
    // base tributable de ~$700k queda en tramo 0%
    const r = calcularRemuneracion('base_a_liquido', 700_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.impuesto).toBe(0)
  })

  it('impuesto > 0 para sueldo sobre primer tramo', () => {
    // sueldo alto genera base tributable > $938.817
    const r = calcularRemuneracion('base_a_liquido', 2_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.impuesto).toBeGreaterThan(0)
  })

  it('afpEmpleador > 0', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.afpEmpleador).toBeGreaterThan(0)
  })

  it('seguroComplementario > 0', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.seguroComplementario).toBeGreaterThan(0)
  })

  it('sueldo liquido < sueldo base (hay descuentos)', () => {
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoLiquido).toBeLessThan(r.sueldoBase)
  })

  it('ISAPRE: salud = max(7%, plan)', () => {
    const saludUF = 3 // plan más caro que 7%
    const r = calcularRemuneracion('base_a_liquido', 1_000_000, casoBase.afp, 'isapre', saludUF, 0, [], 'chile', config)
    const siete = r.totalHaberesImponibles * 0.07
    expect(r.cotizacionSalud).toBeGreaterThanOrEqual(Math.floor(siete))
  })
})

describe('calcularRemuneracion — liquido_a_base', () => {
  it('base redondeada a múltiplos de 1000', () => {
    const r = calcularRemuneracion('liquido_a_base', 900_000, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    expect(r.sueldoBase % 1000).toBe(0)
  })

  it('liquido calculado con base redondeada >= liquido objetivo', () => {
    const liquidoObjetivo = 900_000
    const r = calcularRemuneracion('liquido_a_base', liquidoObjetivo, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    // Por el redondeo hacia arriba, el líquido real debe ser >= objetivo
    expect(r.sueldoLiquido).toBeGreaterThanOrEqual(liquidoObjetivo)
  })

  it('conserva el liquido objetivo como campo sueldoLiquido', () => {
    const liquidoObjetivo = 1_200_000
    const r = calcularRemuneracion('liquido_a_base', liquidoObjetivo, casoBase.afp, casoBase.sistemaSalud, 0, 0, [], 'chile', config)
    // sueldoLiquido en modo inverso = líquido real calculado con base redondeada
    expect(r.sueldoLiquido).toBeGreaterThanOrEqual(liquidoObjetivo)
    expect(r.sueldoBase).toBeGreaterThan(liquidoObjetivo)
  })
})
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
npm test lib/__tests__/calculations.test.ts
```
Expected: varios FAIL (lógica vieja no pasa los nuevos casos).

- [ ] **Step 3: Reescribir `lib/calculations.ts`**

```typescript
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

function simularLiquido(
  sueldoBase: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonosImponibles: number,
  bonosNoImponibles: number,
  config: CountryConfig
): { liquido: number; detalles: ReturnType<typeof buildDetalles> } {
  const { afpData, ufValue, taxBrackets, tasas } = config

  const tasaAFP = afpData[afpNombre] ?? 0.1049
  const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue
  const topeCesantia = tasas.TOPE_CESANTIA_UF * ufValue

  // A. Gratificación
  const gratificacion = Math.min(
    sueldoBase * 0.25,
    (tasas.GRATIFICACION_MAX_UF * ufValue) / 12
  )

  // B. Total imponible (sin tope aún — se aplica por separado)
  const imponible = sueldoBase + gratificacion + bonosImponibles

  // C. Topes diferenciados
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

  const detalles = buildDetalles({
    gratificacion, imponible, impAfectoAFPSalud,
    afp, salud, cesantia, impuesto, baseTributable,
    totalHaberes, totalDescuentos, totalPatronal,
    cesantiaEmpleador, mutual, sis, expectativaVida, afpEmpleador, seguroComplementario,
    bonosImponibles, bonosNoImponibles, movilizacion,
    tasaAFP,
  })

  return { liquido, detalles }
}

function buildDetalles(d: {
  gratificacion: number; imponible: number; impAfectoAFPSalud: number
  afp: number; salud: number; cesantia: number; impuesto: number; baseTributable: number
  totalHaberes: number; totalDescuentos: number; totalPatronal: number
  cesantiaEmpleador: number; mutual: number; sis: number
  expectativaVida: number; afpEmpleador: number; seguroComplementario: number
  bonosImponibles: number; bonosNoImponibles: number; movilizacion: number
  tasaAFP: number
}) { return d }

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

    sueldoBase = redondearMilesArriba(baseExacta)
  }

  const { liquido, detalles: d } = sim(sueldoBase)

  return {
    sueldoBase: Math.round(sueldoBase),
    sueldoLiquido: modo === 'base_a_liquido' ? Math.round(liquido) : Math.round(liquido),
    gratificacion: Math.round(d.gratificacion),
    bonosImponibles,
    bonosNoImponibles,
    totalHaberesImponibles: Math.round(d.imponible),
    movilizacion,
    totalHaberes: Math.round(d.totalHaberes),

    cotizacionPrevisional: Math.round(d.afp),
    cotizacionSalud: Math.round(d.salud),
    cesantia: Math.round(d.cesantia),
    impuesto: Math.round(d.impuesto),
    totalDescuentos: Math.round(d.totalDescuentos),

    cesantiaEmpleador: Math.round(d.cesantiaEmpleador),
    mutual: Math.round(d.mutual),
    sis: Math.round(d.sis),
    expectativaVida: Math.round(d.expectativaVida),
    afpEmpleador: Math.round(d.afpEmpleador),
    seguroComplementario: Math.round(d.seguroComplementario),
    totalPatronal: Math.round(d.totalPatronal),

    costoTotalEmpresa: Math.round(d.totalHaberes + d.totalPatronal),
  }
}
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
npm test lib/__tests__/calculations.test.ts
```
Expected: PASS (todos los tests).

- [ ] **Step 5: Correr todos los tests**

```bash
npm test
```
Expected: PASS en todos los archivos de test.

- [ ] **Step 6: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit
```
Expected: 0 errores.

- [ ] **Step 7: Commit**

```bash
git add lib/calculations.ts lib/__tests__/calculations.test.ts
git commit -m "feat(calculations): rewrite engine with tax brackets, binary search, differentiated caps"
```

---

## Chunk 4: Verificación integrada

### Task 7: Build y verificación en browser

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar servidor de desarrollo**

```bash
npm run dev
```
Expected: compila sin errores en `http://localhost:3000`.

- [ ] **Step 2: Verificar caso sueldo $1.000.000**

En el browser con base $1.000.000, AFP Uno, FONASA:
- Gratificación debe ser ~$15.678 (no $250.000)
- Impuesto debe ser $0 (base tributable < $938.817)
- Aporte AFP Empleador debe ser > $0
- Seguro Complementario Salud debe ser > $0

- [ ] **Step 3: Verificar caso sueldo $3.000.000**

Con base $3.000.000, AFP Uno, FONASA:
- Impuesto debe ser > $0 (base tributable supera primer tramo)
- Verificar que los costos patronales son razonables

- [ ] **Step 4: Verificar modo líquido → base**

Con líquido objetivo $900.000:
- Sueldo base resultante debe ser múltiplo de 1000
- Líquido calculado debe ser >= $900.000

- [ ] **Step 5: Build de producción**

```bash
npm run build
```
Expected: build exitoso sin errores de TypeScript ni warnings críticos.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat(motor-chile): complete calculation engine migration from Python reference"
```

---

## Resumen de archivos

| Archivo | Acción |
|---|---|
| `vitest.config.ts` | Crear |
| `package.json` | Agregar scripts test |
| `lib/types.ts` | Reescribir |
| `lib/config.ts` | Reescribir como FALLBACK_CONFIG |
| `lib/services/configService.ts` | Actualizar |
| `lib/calculations.ts` | Reescribir |
| `lib/__tests__/types.test.ts` | Crear |
| `lib/__tests__/config.test.ts` | Crear |
| `lib/__tests__/calculations.test.ts` | Crear |
| Supabase `country_config` | ALTER TABLE + UPDATE (vía MCP) |
