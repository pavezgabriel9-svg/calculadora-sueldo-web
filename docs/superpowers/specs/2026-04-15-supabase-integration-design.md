# Supabase Integration Design: Fase 2 — Calculadora de Sueldos Web
**Date:** 2026-04-15  
**Status:** Aprobado — Listo para implementación  
**Author:** Gabriel Pavez

---

## Objetivo

Reemplazar los valores hardcodeados en `lib/config.ts` por datos dinámicos desde Supabase, con fallback granular por campo según umbrales de staleness. n8n actúa como pipeline de actualización; la app Next.js solo lee, server-side.

---

## Schema de Base de Datos

```sql
CREATE TABLE country_config (
  pais TEXT PRIMARY KEY,

  afp_data JSONB,
  afp_updated_at TIMESTAMPTZ DEFAULT NOW(),

  uf_value NUMERIC,
  uf_updated_at TIMESTAMPTZ DEFAULT NOW(),

  tasas JSONB,
  tasas_updated_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (pais IN ('chile', 'peru', 'brasil')),
  CHECK (afp_data IS NULL OR jsonb_typeof(afp_data) = 'object'),
  CHECK (tasas IS NULL OR jsonb_typeof(tasas) = 'object')
);
```

**Filas iniciales:** `INSERT` con valores actuales de `lib/config.ts` para `chile`. Perú y Brasil con `NULL` en campos de datos (fallback total hasta que n8n los pueble).

### Estructura JSON esperada

**`afp_data`:**
```json
{ "Capital": 0.1149, "Cuprum": 0.1149, "Habitat": 0.1127, "Modelo": 0.1058, "Planvital": 0.1116, "Provida": 0.1145, "Uno": 0.1049 }
```

**`tasas`:**
```json
{
  "TASA_SALUD_FONASA": 0.07,
  "TASA_CESANTIA": 0.006,
  "LIMITE_UF_IMPONIBLE": 81.6,
  "GRATIFICACION_MAX_UF": 4.75,
  "LIMITE_IMPUESTO": 800000,
  "TASA_IMPUESTO": 0.04,
  "CESANTIA_EMPLEADOR": 0.024,
  "MUTUAL": 0.0093,
  "SIS": 0.0141,
  "EXPECTATIVA_VIDA": 0.002
}
```

---

## Política de Staleness

| Campo | Umbral fallback | Justificación |
|-------|----------------|---------------|
| `uf_value` | > 2 días | La UF cambia diariamente |
| `afp_data` | > 45 días | Las tasas AFP cambian trimestralmente |
| `tasas` | > 60 días | Parámetros fiscales cambian raramente |

Un campo `NULL` en BD se trata como stale (fallback inmediato).

---

## Arquitectura de Código

### Archivos nuevos

**`lib/supabase.ts`** — Cliente Supabase server-side (singleton):
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
```

**`lib/country-config.ts`** — Fetch + staleness + fallback:
```typescript
export async function getCountryConfig(pais: Pais): Promise<CountryConfig>
```

Lógica interna:
```typescript
// 1. Fetch desde Supabase
// 2. Si error → fallback total + log
// 3. Si fila no existe → fallback total + log
// 4. Por campo: isStale(campo_updated_at, umbralDias) → fallback solo ese campo + log
// 5. Retorna config mergeada
```

Función de staleness:
```typescript
function isStale(updatedAt: string | null, thresholdDays: number): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return diffMs > thresholdDays * 24 * 60 * 60 * 1000
}
```

### Archivos modificados

**`lib/config.ts`** — Exporta hardcoded como fallback explícito (sin cambios de nombre, solo claridad semántica).

**`app/page.tsx`** — Convertir a Server Component async:
```typescript
export default async function Page() {
  const config = await getCountryConfig('chile')
  return <CalculadoraClient config={config} />
}
```

**`components/calculator/` (DatosPrincipales, Resultados, etc.)** — Reciben `config` como prop en lugar de importar `lib/config.ts` directamente.

### Sin cambios

- `lib/hooks.ts` — `useCalculator` sigue siendo síncrono, recibe `config` via props
- `lib/calculations.ts` — lógica pura, sin tocar
- `lib/types.ts` — agregar `CountryConfig` como tipo exportado si no existe

---

## Flujo de Datos

```
app/page.tsx (Server Component, async)
  └── getCountryConfig('chile')
        ├── supabase.from('country_config').select('*').eq('pais','chile').single()
        ├── catch error → return FALLBACK_CHILE, console.warn
        ├── uf_value: isStale(uf_updated_at, 2) ? TASAS_CHILE.UF_VALUE : row.uf_value
        ├── afp_data: isStale(afp_updated_at, 45) ? AFP_DATA : row.afp_data
        └── tasas: isStale(tasas_updated_at, 60) ? TASAS_CHILE : row.tasas
  └── <CalculadoraClient config={mergedConfig} />
        └── useCalculator({ ...params, config })
```

**Caché Next.js:** `{ next: { revalidate: 3600 } }` — refresco máximo cada 1 hora en producción sin redeploy.

---

## Manejo de Errores y Logging

| Situación | Comportamiento | Log |
|-----------|---------------|-----|
| Supabase no responde | Fallback total | `[config] supabase unreachable, using full fallback` |
| Credenciales inválidas | Fallback total | `[config] supabase auth error: <status>` |
| Fila inexistente | Fallback total | `[config] no row for pais=chile, using full fallback` |
| Campo stale | Fallback ese campo | `[config] uf stale (Xd), using fallback` |
| Campo null en BD | Fallback ese campo | `[config] uf_value null, using fallback` |

Logging via `console.warn` en servidor (visible en Vercel logs). Sin exposición al cliente.

---

## Variables de Entorno

```bash
# .env.local (nunca NEXT_PUBLIC_ — solo server-side)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJh...
```

Agregar a Vercel: Settings → Environment Variables → Production + Preview.

---

## Integración n8n

Cada flujo n8n actualiza solo su dominio:

```sql
-- Flujo UF (diario)
UPDATE country_config
SET uf_value = 38500, uf_updated_at = NOW(), updated_at = NOW()
WHERE pais = 'chile';

-- Flujo AFP (mensual/trimestral)
UPDATE country_config
SET afp_data = '{"Capital": 0.1149, ...}'::jsonb, afp_updated_at = NOW(), updated_at = NOW()
WHERE pais = 'chile';
```

`pais` siempre en lowercase para evitar inconsistencias con el `CHECK` constraint.

---

## Criterios de Éxito

- [ ] Tabla `country_config` creada en Supabase con fila inicial Chile
- [ ] `getCountryConfig('chile')` retorna datos desde BD en producción
- [ ] Fallback total funciona cuando Supabase no responde (test: credenciales incorrectas)
- [ ] Fallback granular funciona por campo stale (test: `uf_updated_at` con fecha antigua)
- [ ] Logs de fallback visibles en Vercel
- [ ] UF actualizable desde n8n sin redeploy
- [ ] `page.tsx` funciona como Server Component async sin romper interactividad cliente

---

## Dependencias a Instalar

```bash
npm install @supabase/supabase-js
```

---

## Lo que NO cambia en Fase 2

- Lógica de cálculos (`lib/calculations.ts`)
- Custom hooks (`lib/hooks.ts`) — siguen síncronos
- Componentes UI — solo reciben `config` como prop adicional
- Deploy en Vercel — mismo pipeline, solo agregar env vars
