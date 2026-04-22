# Spec: Motor de Cálculo Chile — Migración desde Python

**Fecha:** 2026-04-20  
**Estado:** Aprobado  
**Scope:** Corrección del motor de cálculo de remuneraciones Chile, alineando la lógica web con la implementación Python de referencia (`calculadora_sueldo`).

---

## Contexto

La calculadora web actual tiene un motor de cálculo desactualizado y con errores:
- Impuesto único calculado con una regla simplificada `(base - $800k) × 4%` en lugar de los 8 tramos reales del SII
- Tope imponible único de 81.6 UF cuando la ley diferencia AFP/salud (89.9 UF) de cesantía (135.1 UF)
- `afpEmpleador` y `seguroComplementario` hardcodeados en `0`
- Tasas SIS y expectativa de vida incorrectas
- Inverso Líquido→Base usa convergencia iterativa en lugar de búsqueda binaria con redondeo a miles

La fuente de verdad es el motor Python en `calculadora_sueldo/SERVICE/engine.py` y `DATA/data.py`.

---

## Principio de datos

- **Supabase** → fuente de verdad para todos los valores numéricos
- **`lib/config.ts`** → fallback offline únicamente (valores hardcodeados usados si Supabase falla)
- **`calculations.ts`** → recibe siempre un `CountryConfig` completo; nunca importa constantes directamente

---

## Cambios por capa

### 1. Supabase — `country_config`

#### Migración de esquema
```sql
ALTER TABLE country_config
  ADD COLUMN tax_brackets JSONB,
  ADD COLUMN tax_brackets_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN dolar_value NUMERIC,
  ADD COLUMN dolar_updated_at TIMESTAMPTZ DEFAULT NOW();

CHECK (tax_brackets IS NULL OR jsonb_typeof(tax_brackets) = 'array')
```

#### Datos Chile — `tax_brackets`
```sql
UPDATE country_config
SET
  tax_brackets = '[
    {"desde": 0,            "hasta": 938817,    "tasa": 0.00, "rebaja": 0},
    {"desde": 938817.01,    "hasta": 2086260,   "tasa": 0.04, "rebaja": 37552.68},
    {"desde": 2086260.01,   "hasta": 3477100,   "tasa": 0.08, "rebaja": 121003.08},
    {"desde": 3477100.01,   "hasta": 4867940,   "tasa": 0.135,"rebaja": 312243.58},
    {"desde": 4867940.01,   "hasta": 6258780,   "tasa": 0.23, "rebaja": 774697.88},
    {"desde": 6258780.01,   "hasta": 8345040,   "tasa": 0.304,"rebaja": 1237847.60},
    {"desde": 8345040.01,   "hasta": 21558020,  "tasa": 0.35, "rebaja": 1621719.44},
    {"desde": 21558020.01,  "hasta": 999999999, "tasa": 0.40, "rebaja": 2699620.44}
  ]'::jsonb,
  tax_brackets_updated_at = NOW()
WHERE pais = 'chile';
```

#### Datos Chile — `tasas` (corregidas y extendidas)
```sql
UPDATE country_config
SET tasas = '{
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
}'::jsonb
WHERE pais = 'chile';
```

**Keys eliminadas:** `LIMITE_UF_IMPONIBLE`, `LIMITE_IMPUESTO`, `TASA_IMPUESTO` (reemplazadas).  
**Keys nuevas:** `TOPE_AFP_SALUD_UF`, `TOPE_CESANTIA_UF`, `SUELDO_MINIMO`, `AFP_EMPLEADOR`, `SEGURO_COMPLEMENTARIO_UF`.  
**Corregidas:** `SIS` 0.0141→0.0154, `EXPECTATIVA_VIDA` 0.002→0.009.

---

### 2. `lib/types.ts`

Agregar interface `TramosImpuesto` y extender `CountryConfig`:

```typescript
export interface TramosImpuesto {
  desde: number
  hasta: number
  tasa: number
  rebaja: number
}

export interface CountryConfig {
  afpData: Record<string, number>
  ufValue: number
  dolarValue: number
  taxBrackets: TramosImpuesto[]
  tasas: {
    TASA_SALUD_FONASA: number
    TASA_CESANTIA: number
    TOPE_AFP_SALUD_UF: number       // reemplaza LIMITE_UF_IMPONIBLE
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
```

---

### 3. `lib/config.ts` — solo fallback offline

Reescribir como un único `FALLBACK_CONFIG: Record<string, CountryConfig>`. Eliminar exports `AFP_DATA`, `TASAS_CHILE`, `CONFIG_POR_PAIS`.

Valores fallback Chile:
- `ufValue`: 39597.67
- `dolarValue`: 950
- `taxBrackets`: 8 tramos completos (mismos que Supabase)
- `tasas`: todos los campos del tipo, con valores del motor Python

Peru y Brasil mantienen estructura con valores en cero (placeholder).

---

### 4. `lib/services/configService.ts`

#### Staleness actualizado
| Campo | Antes | Después |
|---|---|---|
| `uf_value` | 2 días | **1 día** |
| `dolar_value` | — | **1 día** (nuevo) |
| `afp_data` | 45 días | 45 días |
| `tasas` | 60 días | **30 días** |
| `tax_brackets` | — | **30 días** (nuevo) |

#### Lógica de fetch
- Leer `tax_brackets` y `dolar_value` de la fila de Supabase
- Mapear al tipo `CountryConfig` con fallback granular campo a campo
- Si `tax_brackets` está vacío o es null → usar `FALLBACK_CONFIG[pais].taxBrackets`

---

### 5. `lib/calculations.ts` — motor reescrito

#### Topes diferenciados
```typescript
const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue
const topeCesantia = tasas.TOPE_CESANTIA_UF * ufValue
const impAfectoAFPSalud = Math.min(imponible, topeAFPSalud)
const impAfectoCesantia = Math.min(imponible, topeCesantia)
```

#### Impuesto por tramos
```typescript
function calcularImpuesto(baseTributable: number, tramos: TramosImpuesto[]): number {
  if (baseTributable <= 0) return 0
  const tramo = tramos.find(t => baseTributable >= t.desde && baseTributable <= t.hasta)
  if (!tramo || tramo.tasa === 0) return 0
  return Math.max(0, baseTributable * tramo.tasa - tramo.rebaja)
}
```

#### Base tributable (orden correcto)
```typescript
// AFP + salud + cesantía se descuentan ANTES de calcular impuesto
const baseTributable = impAfectoAFPSalud - afp - salud - cesantia
const impuesto = calcularImpuesto(baseTributable, taxBrackets)
```

#### ISAPRE
```typescript
const salud = sistemaSalud === 'fonasa'
  ? impAfectoAFPSalud * tasas.TASA_SALUD_FONASA
  : Math.max(impAfectoAFPSalud * tasas.TASA_SALUD_FONASA, saludUF * ufValue)
```

#### Gratificación
```typescript
const gratificacion = Math.min(
  sueldoBase * 0.25,
  (tasas.GRATIFICACION_MAX_UF * ufValue) / 12
)
// Nota: tope alternativo por sueldo mínimo: min(base*25%, 4.75*SUELDO_MINIMO/12)
// Ambas fórmulas son equivalentes cuando SUELDO_MINIMO está actualizado en config
```

#### Inverso — búsqueda binaria
```typescript
function redondearMilesArriba(valor: number): number {
  return Math.ceil(valor / 1000) * 1000
}

// Búsqueda binaria (reemplaza loop iterativo)
// 1. Expandir max_base hasta que simular(max_base) >= liquido_objetivo
// 2. Bisección hasta precisión < 1 peso (max 100 iteraciones)
// 3. Redondear resultado al siguiente múltiplo de 1000
// 4. Recalcular con base redondeada para obtener resultados finales exactos
```

#### Costos patronales completos
```typescript
const cesantiaEmpleador = Math.round(impAfectoCesantia * tasas.CESANTIA_EMPLEADOR)
const mutual           = Math.round(impAfectoAFPSalud * tasas.MUTUAL)
const sis              = Math.round(impAfectoAFPSalud * tasas.SIS)
const expectativaVida  = Math.round(impAfectoAFPSalud * tasas.EXPECTATIVA_VIDA)
const afpEmpleador     = Math.round(impAfectoAFPSalud * tasas.AFP_EMPLEADOR)
const seguroCompl      = Math.round(tasas.SEGURO_COMPLEMENTARIO_UF * ufValue)
```

---

### 6. `components/calculator/Resultados.tsx`

**Sin cambios.** Todos los campos ya están renderizados. Los valores dejarán de ser `0` automáticamente.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| Supabase `country_config` | `ALTER TABLE` + `UPDATE` datos Chile |
| `lib/types.ts` | `TramosImpuesto` + extender `CountryConfig` |
| `lib/config.ts` | Reescribir como `FALLBACK_CONFIG` |
| `lib/services/configService.ts` | Mapear `tax_brackets`, `dolar_value`, staleness |
| `lib/calculations.ts` | Reescribir motor completo |

## Archivos sin cambios

`Resultados.tsx`, `DatosPrincipales.tsx`, `hooks.ts`, `utils.ts`, `app/page.tsx`, `calculadora-client.tsx`, todos los componentes UI.
