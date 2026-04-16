# Supabase Integration (Fase 2) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar valores hardcodeados en `lib/config.ts` por datos dinámicos desde Supabase con fallback granular por campo según staleness.

**Architecture:** `app/page.tsx` se convierte en async Server Component que llama `getCountryConfig(pais)`, luego pasa la config como prop a un nuevo `<CalculadoraClient>`. `lib/calculations.ts` y `lib/hooks.ts` reciben config explícitamente en lugar de importarla. `DatosPrincipales` recibe `afpData` como prop.

**Tech Stack:** Next.js 16 Server Components, @supabase/supabase-js, TypeScript 5, SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-only env vars).

---

## File Map

| Acción | Archivo | Responsabilidad |
|--------|---------|----------------|
| NEW | `lib/supabase.ts` | Cliente Supabase singleton server-side |
| NEW | `lib/services/configService.ts` | Fetch + staleness + fallback granular |
| NEW | `app/calculadora-client.tsx` | Client Component con todo el estado e interactividad |
| MODIFY | `app/page.tsx` | Convertir a async Server Component, fetcha config |
| MODIFY | `lib/types.ts` | Agregar tipo `CountryConfig` |
| MODIFY | `lib/calculations.ts` | Aceptar `config` como parámetro en lugar de importar |
| MODIFY | `lib/hooks.ts` | Pasar `config` a `calcularRemuneracion` |
| MODIFY | `components/calculator/DatosPrincipales.tsx` | Recibir `afpData` como prop |
| MODIFY | `.env.local` | Agregar SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY |

---

## Chunk 1: Fundación — tipos, cliente, variables de entorno

### Task 1: Instalar dependencia Supabase

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar @supabase/supabase-js**

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` incluye `"@supabase/supabase-js": "^2.x.x"`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js"
```

---

### Task 2: Agregar tipo `CountryConfig` a `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

Este tipo unifica la config que puede venir de Supabase o del fallback hardcoded.

- [ ] **Step 1: Agregar al final de `lib/types.ts`**

```typescript
export interface CountryConfig {
  afpData: Record<string, number>      // { Capital: 0.1149, ... }
  ufValue: number                       // 38000
  tasas: {
    TASA_SALUD_FONASA: number
    TASA_CESANTIA: number
    LIMITE_UF_IMPONIBLE: number
    GRATIFICACION_MAX_UF: number
    LIMITE_IMPUESTO: number
    TASA_IMPUESTO: number
    CESANTIA_EMPLEADOR: number
    MUTUAL: number
    SIS: number
    EXPECTATIVA_VIDA: number
  }
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add CountryConfig interface"
```

---

### Task 3: Crear cliente Supabase server-side

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Crear `lib/supabase.ts`**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  // No lanzar error — configService lo manejará con fallback
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null
```

> **Nota:** Exportar `null` cuando no hay credenciales permite que `configService` active el fallback total sin lanzar errores en desarrollo local.

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat(supabase): add server-side Supabase client"
```

---

### Task 4: Agregar variables de entorno

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Agregar al `.env.local`**

```bash
# Supabase — server-side only (sin NEXT_PUBLIC_)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

Reemplazar `xxxx` con el Project ID real de Supabase (Settings → API).

> **Importante:** `SUPABASE_SERVICE_ROLE_KEY` nunca debe ser `NEXT_PUBLIC_`. Esta key solo existe en el servidor.

- [ ] **Step 2: Verificar que `.gitignore` incluye `.env.local`**

```bash
grep ".env.local" .gitignore
```

Expected: línea con `.env.local` presente.

---

## Chunk 2: configService — fetch, staleness y fallback

### Task 5: Crear `lib/services/configService.ts`

**Files:**
- Create: `lib/services/configService.ts`

Este es el corazón de Fase 2. Centraliza toda la lógica de fetch y decisión de fallback.

- [ ] **Step 1: Crear directorio**

```bash
mkdir -p lib/services
```

- [ ] **Step 2: Crear `lib/services/configService.ts`**

```typescript
// lib/services/configService.ts

import { supabase } from '@/lib/supabase'
import { AFP_DATA, CONFIG_POR_PAIS } from '@/lib/config'
import { CountryConfig, Pais } from '@/lib/types'

// Umbrales de staleness en días
const STALE_THRESHOLDS = {
  uf: 2,
  afp: 45,
  tasas: 60,
} as const

function isStale(updatedAt: string | null | undefined, thresholdDays: number): boolean {
  if (!updatedAt) return true
  const diffMs = Date.now() - new Date(updatedAt).getTime()
  return diffMs > thresholdDays * 24 * 60 * 60 * 1000
}

function getFallback(pais: Pais): CountryConfig {
  const tasas = CONFIG_POR_PAIS[pais]
  return {
    afpData: pais === 'chile' ? AFP_DATA : {},
    ufValue: tasas.UF_VALUE,
    tasas: {
      TASA_SALUD_FONASA: tasas.TASA_SALUD_FONASA,
      TASA_CESANTIA: tasas.TASA_CESANTIA,
      LIMITE_UF_IMPONIBLE: tasas.LIMITE_UF_IMPONIBLE,
      GRATIFICACION_MAX_UF: tasas.GRATIFICACION_MAX_UF,
      LIMITE_IMPUESTO: tasas.LIMITE_IMPUESTO,
      TASA_IMPUESTO: tasas.TASA_IMPUESTO,
      CESANTIA_EMPLEADOR: tasas.CESANTIA_EMPLEADOR,
      MUTUAL: tasas.MUTUAL,
      SIS: tasas.SIS,
      EXPECTATIVA_VIDA: tasas.EXPECTATIVA_VIDA,
    },
  }
}

// Caché Next.js: re-fetch máximo cada 1 hora sin redeploy
import { unstable_cache } from 'next/cache'

async function fetchCountryConfig(pais: Pais): Promise<CountryConfig> {
  const fallback = getFallback(pais)

  // Si no hay cliente (env vars no configuradas), fallback total silencioso
  if (!supabase) {
    console.warn(`[config] supabase client not initialized, using full fallback for pais=${pais}`)
    return fallback
  }

  let row: Record<string, unknown> | null = null

  try {
    const { data, error } = await supabase
      .from('country_config')
      .select('afp_data, afp_updated_at, uf_value, uf_updated_at, tasas, tasas_updated_at')
      .eq('pais', pais)
      .single()
      // Nota: el cliente Supabase no expone `next.revalidate` directamente.
      // El cache de Next.js se gestiona envolviendo con `unstable_cache` (ver abajo).

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

  // Fallback granular por campo
  const afpData = isStale(row.afp_updated_at as string, STALE_THRESHOLDS.afp)
    ? (console.warn(`[config] afp_data stale or null for pais=${pais}, using fallback`), fallback.afpData)
    : (row.afp_data as Record<string, number>)

  const ufValue = isStale(row.uf_updated_at as string, STALE_THRESHOLDS.uf)
    ? (console.warn(`[config] uf_value stale or null for pais=${pais}, using fallback`), fallback.ufValue)
    : (row.uf_value as number)

  const tasas = isStale(row.tasas_updated_at as string, STALE_THRESHOLDS.tasas)
    ? (console.warn(`[config] tasas stale or null for pais=${pais}, using fallback`), fallback.tasas)
    : (row.tasas as CountryConfig['tasas'])

  return { afpData, ufValue, tasas }
}

// Exportar envuelto en unstable_cache para revalidar cada 1 hora
export const getCountryConfig = unstable_cache(
  fetchCountryConfig,
  ['country-config'],
  { revalidate: 3600 }
)
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/services/configService.ts
git commit -m "feat(config): add configService with Supabase fetch and granular staleness fallback"
```

---

## Chunk 3: Cálculos y hooks — pasar config explícitamente

### Task 6: Actualizar `lib/calculations.ts` para aceptar `config`

**Files:**
- Modify: `lib/calculations.ts`

Actualmente `calcularRemuneracion` importa `AFP_DATA` y `CONFIG_POR_PAIS` globalmente. Hay que hacerlo explícito para que el server pueda inyectar config dinámica.

- [ ] **Step 1: Leer el archivo actual**

```bash
# Revisar lib/calculations.ts para entender la firma actual
```

Lee `lib/calculations.ts` completo antes de editar.

- [ ] **Step 2: Modificar la firma de `calcularRemuneracion`**

Reemplazar la línea de imports:
```typescript
// ANTES
import { Bono, ResultadosCalculo, Modo, Pais, SistemaSalud } from "./types"
import { AFP_DATA, CONFIG_POR_PAIS } from "./config"

// DESPUÉS
import { Bono, ResultadosCalculo, Modo, Pais, SistemaSalud, CountryConfig } from "./types"
// eliminar import de config
```

Actualizar la firma de la función — agregar `config: CountryConfig` y quitar el default de `pais`:
```typescript
export function calcularRemuneracion(
  modo: Modo,
  montoIngresado: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonos: Bono[],
  pais: Pais,
  config: CountryConfig        // ← NUEVO parámetro al final
): ResultadosCalculo {
```

- [ ] **Step 3: Reemplazar TODOS los usos internos de `config` (el viejo) por el nuevo shape**

Al inicio de la función, reemplazar las dos líneas de resolución:
```typescript
// ANTES (líneas 16-17)
const config = CONFIG_POR_PAIS[pais]
const tasaAFP = AFP_DATA[afpNombre] || 0.1049

// DESPUÉS — destructurar para mantener el resto de la función legible
const { afpData, ufValue, tasas } = config
const tasaAFP = afpData[afpNombre] || 0.1049
```

Luego reemplazar **todos** los usos de `config.X` por su equivalente nuevo. Mapa completo:

| Antes | Después |
|-------|---------|
| `config.TASA_SALUD_FONASA` | `tasas.TASA_SALUD_FONASA` |
| `config.UF_VALUE` | `ufValue` |
| `config.GRATIFICACION_MAX_UF` | `tasas.GRATIFICACION_MAX_UF` |
| `config.LIMITE_UF_IMPONIBLE` | `tasas.LIMITE_UF_IMPONIBLE` |
| `config.TASA_CESANTIA` | `tasas.TASA_CESANTIA` |
| `config.LIMITE_IMPUESTO` | `tasas.LIMITE_IMPUESTO` |
| `config.TASA_IMPUESTO` | `tasas.TASA_IMPUESTO` |
| `config.CESANTIA_EMPLEADOR` | `tasas.CESANTIA_EMPLEADOR` |
| `config.MUTUAL` | `tasas.MUTUAL` |
| `config.SIS` | `tasas.SIS` |
| `config.EXPECTATIVA_VIDA` | `tasas.EXPECTATIVA_VIDA` |

> **Nota:** El parámetro `pais: Pais` se mantiene en la firma aunque ya no se usa internamente (lo necesita `useCalculator` para registrar el país activo).

- [ ] **Step 4: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add lib/calculations.ts
git commit -m "refactor(calculations): accept CountryConfig param instead of importing from config"
```

---

### Task 7: Actualizar `lib/hooks.ts` para pasar `config`

**Files:**
- Modify: `lib/hooks.ts`
- Modify: `lib/types.ts` (agregar `config` a `CalculatorParams`)

- [ ] **Step 1: Agregar `config` a `CalculatorParams` en `lib/types.ts`**

```typescript
export interface CalculatorParams {
  modo: Modo
  sueldo: string
  afp: string
  sistemaSalud: SistemaSalud
  saludUF: string
  movilizacion: string
  bonos: Bono[]
  pais: Pais
  config: CountryConfig        // ← NUEVO
}
```

- [ ] **Step 2: Actualizar `useCalculator` en `lib/hooks.ts`**

Pasar `params.config` a `calcularRemuneracion`:

```typescript
return calcularRemuneracion(
  params.modo,
  montoSueldo,
  params.afp,
  params.sistemaSalud,
  parseFloat(params.saludUF || "0"),
  montoMovilizacion,
  params.bonos,
  params.pais,
  params.config        // ← NUEVO
)
```

Agregar `params.config` al array de dependencias del `useMemo`:
```typescript
], [
  params.modo,
  params.sueldo,
  params.afp,
  params.sistemaSalud,
  params.saludUF,
  params.movilizacion,
  params.bonos,
  params.pais,
  params.config,       // ← NUEVO
])
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: sin errores (page.tsx puede fallar aún — se corrige en Task 9).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/hooks.ts
git commit -m "refactor(hooks): thread CountryConfig through useCalculator"
```

---

## Chunk 4: Componentes — separar Server/Client y propagar config

### Task 8: Actualizar `DatosPrincipales` para recibir `afpData` como prop

**Files:**
- Modify: `components/calculator/DatosPrincipales.tsx`

Actualmente importa `AFP_DATA` directamente desde `lib/config`. Hay que recibirlo como prop.

- [ ] **Step 1: Reemplazar import por prop**

```typescript
// ANTES — eliminar esta línea:
import { AFP_DATA } from "@/lib/config"

// DESPUÉS — agregar prop al componente:
afpData: Record<string, number>
```

Firma actualizada:
```typescript
export function DatosPrincipales({
  modo,
  sueldo,
  onSueldoChange,
  afp,
  onAfpChange,
  sistemaSalud,
  onSistemaSaludChange,
  saludUF,
  onSaludUFChange,
  movilizacion,
  onMovilizacionChange,
  afpData,                    // ← NUEVO
}: {
  // ...props anteriores...
  afpData: Record<string, number>   // ← NUEVO
}) {
  const tasaAFP = afpData[afp] || 0.1049
  // ...resto igual, reemplazar AFP_DATA por afpData
```

- [ ] **Step 2: Reemplazar `AFP_DATA` por `afpData` en el JSX**

```typescript
// ANTES
{Object.keys(AFP_DATA).map((afpName) => (

// DESPUÉS
{Object.keys(afpData).map((afpName) => (
```

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Expected: error en quien llama a `DatosPrincipales` (se corrige en Task 9).

- [ ] **Step 4: Commit**

```bash
git add components/calculator/DatosPrincipales.tsx
git commit -m "refactor(DatosPrincipales): receive afpData as prop instead of importing from config"
```

---

### Task 9: Extraer `CalculadoraClient` y convertir `page.tsx` a Server Component

**Files:**
- Create: `app/calculadora-client.tsx`
- Modify: `app/page.tsx`

Este es el paso de integración final. `page.tsx` pasa de `"use client"` a async Server Component. Todo el estado e interactividad va al nuevo `CalculadoraClient`.

- [ ] **Step 1: Crear `app/calculadora-client.tsx`**

Mover todo el contenido actual de `app/page.tsx` a este archivo, renombrando el componente y agregando `config` como prop:

```typescript
// app/calculadora-client.tsx
"use client"

import { useState } from "react"
import {
  Header,
  ModoCalculo,
  DatosPrincipales,
  Bonos,
  Resultados,
} from "@/components/calculator"
import { useCalculator, useDarkMode } from "@/lib/hooks"
import { formatNumericInput } from "@/lib/utils"
import { Bono, Pais, Modo, SistemaSalud, CountryConfig } from "@/lib/types"

export function CalculadoraClient({ config }: { config: CountryConfig }) {
  const { darkMode, toggleDarkMode } = useDarkMode()

  const [pais, setPais] = useState<Pais>("chile")
  const [modo, setModo] = useState<Modo>("liquido_a_base")
  const [sueldo, setSueldo] = useState("1.000.000")
  const [afp, setAfp] = useState("Uno")
  const [sistemaSalud, setSistemaSalud] = useState<SistemaSalud>("fonasa")
  const [saludUF, setSaludUF] = useState("")
  const [movilizacion, setMovilizacion] = useState("40.000")
  const [bonos, setBonos] = useState<Bono[]>([
    { id: "1", nombre: "Producción", monto: 100000, imponible: true },
    { id: "2", nombre: "Colación", monto: 50000, imponible: false },
  ])

  const resultados = useCalculator({
    modo,
    sueldo,
    afp,
    sistemaSalud,
    saludUF,
    movilizacion,
    bonos,
    pais,
    config,             // ← usa config del servidor
  })

  const addBono = (bono: Omit<Bono, "id">) => {
    setBonos([...bonos, { ...bono, id: Date.now().toString() }])
  }

  const removeBono = (id: string) => {
    setBonos(bonos.filter((b) => b.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header
        pais={pais}
        onPaisChange={setPais}
        darkMode={darkMode}
        onDarkModeToggle={toggleDarkMode}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <ModoCalculo modo={modo} onModoChange={setModo} />

            <DatosPrincipales
              modo={modo}
              sueldo={sueldo}
              onSueldoChange={setSueldo}
              afp={afp}
              onAfpChange={setAfp}
              sistemaSalud={sistemaSalud}
              onSistemaSaludChange={setSistemaSalud}
              saludUF={saludUF}
              onSaludUFChange={setSaludUF}
              movilizacion={movilizacion}
              onMovilizacionChange={setMovilizacion}
              afpData={config.afpData}     // ← prop nuevo
            />

            <Bonos
              bonos={bonos}
              onAddBono={addBono}
              onRemoveBono={removeBono}
            />
          </div>

          <div className="lg:col-span-2">
            <Resultados modo={modo} resultados={resultados} />
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Reemplazar `app/page.tsx` completo**

```typescript
// app/page.tsx
import { getCountryConfig } from "@/lib/services/configService"
import { CalculadoraClient } from "./calculadora-client"

export default async function Page() {
  const config = await getCountryConfig("chile")
  return <CalculadoraClient config={config} />
}
```

> **Nota:** Sin `"use client"` — este es el Server Component. El fetch ocurre en el servidor.

> **Limitación conocida (fuera de scope Fase 2):** `page.tsx` fetcha config solo para `'chile'`. El selector de país en el Header cambia el estado local del cliente pero **no** recarga la config del servidor. Perú y Brasil usarán la config de fallback hardcoded hasta que se implemente re-fetch por país (Fase 3). Agregar un comentario `// TODO(fase3): re-fetch config when pais changes` en `CalculadoraClient`.

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Levantar dev server y verificar**

```bash
npm run dev
```

Abrir `http://localhost:3000`. Verificar:
- La calculadora carga y funciona igual que Fase 1
- En la terminal del servidor se ve el log de fallback (si no hay Supabase configurado): `[config] supabase client not initialized, using full fallback for pais=chile`
- No hay errores en consola del browser

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/calculadora-client.tsx
git commit -m "feat(phase2): convert page to async Server Component, extract CalculadoraClient, wire config from Supabase"
```

---

## Chunk 5: Supabase — crear tabla e insertar datos iniciales

### Task 10: Crear tabla `country_config` en Supabase

**Files:**
- No hay archivos de código — acción en Supabase Dashboard o SQL Editor.

- [ ] **Step 1: Ejecutar DDL en Supabase SQL Editor**

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

- [ ] **Step 2: Insertar fila inicial para Chile**

```sql
INSERT INTO country_config (pais, afp_data, uf_value, tasas)
VALUES (
  'chile',
  '{
    "Capital": 0.1149,
    "Cuprum": 0.1149,
    "Habitat": 0.1127,
    "Modelo": 0.1058,
    "Planvital": 0.1116,
    "Provida": 0.1145,
    "Uno": 0.1049
  }'::jsonb,
  38000,
  '{
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
  }'::jsonb
);
```

- [ ] **Step 3: Insertar filas placeholder para Perú y Brasil**

```sql
INSERT INTO country_config (pais) VALUES ('peru'), ('brasil');
```

Estos tienen `NULL` en todos los campos de datos — el fallback los cubre automáticamente.

- [ ] **Step 4: Configurar `.env.local` con credenciales reales**

En Supabase Dashboard → Settings → API:
- `Project URL` → `SUPABASE_URL`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 5: Verificar con dev server que los datos vienen de Supabase**

```bash
npm run dev
```

En la terminal del servidor: **no debe aparecer** el log `[config] supabase client not initialized`. Si aparece, revisar env vars.

Confirmar que la calculadora sigue funcionando correctamente.

- [ ] **Step 6: Verificar fallback total**

Cambiar temporalmente `SUPABASE_URL` a un valor inválido en `.env.local`, reiniciar dev server y verificar:
- Calculadora sigue funcionando (fallback hardcoded)
- Log en terminal: `[config] supabase error` o `supabase unreachable`

Restaurar valor correcto.

---

## Chunk 6: Deploy en Vercel

### Task 11: Configurar env vars en Vercel y deployar

**Files:**
- No hay archivos de código.

- [ ] **Step 1: Agregar env vars en Vercel**

En Vercel Dashboard → proyecto → Settings → Environment Variables:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Production, Preview |

> **Importante:** NO marcar como `NEXT_PUBLIC_`. Deben ser server-only.

- [ ] **Step 2: Push a main para trigger deploy**

```bash
git push origin main
```

- [ ] **Step 3: Verificar en Vercel logs**

En Vercel Dashboard → Deployment → Function Logs:
- No debe aparecer `supabase client not initialized`
- Si hay error de conexión, revisar que las env vars estén guardadas correctamente

- [ ] **Step 4: Smoke test en producción**

Abrir URL de Vercel, verificar:
- Calculadora carga
- Cálculos funcionan
- AFP selector muestra las AFPs (datos vienen de Supabase)

---

## Criterios de Éxito

- [ ] Datos cargan desde Supabase en server-side (sin log de fallback en prod)
- [ ] Fallback total funciona si falla conexión (test: SUPABASE_URL inválida)
- [ ] Fallback parcial funciona por staleness (test: `uf_updated_at` con fecha antigua)
- [ ] UF, AFP y tasas son independientes (n8n puede actualizar cada una sin afectar las otras)
- [ ] TypeScript compila sin errores (`npx tsc --noEmit`)
- [ ] Deploy en Vercel exitoso

---

## Queries n8n de referencia

```sql
-- Actualizar UF (flujo diario)
UPDATE country_config
SET uf_value = :nuevo_valor, uf_updated_at = NOW(), updated_at = NOW()
WHERE pais = 'chile';

-- Actualizar tasas AFP (flujo mensual/trimestral)
UPDATE country_config
SET afp_data = :nuevo_json::jsonb, afp_updated_at = NOW(), updated_at = NOW()
WHERE pais = 'chile';

-- Actualizar tasas fiscales
UPDATE country_config
SET tasas = :nuevo_json::jsonb, tasas_updated_at = NOW(), updated_at = NOW()
WHERE pais = 'chile';
```
