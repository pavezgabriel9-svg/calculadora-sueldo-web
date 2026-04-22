# Toggle Moneda CLP ↔ USD — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un toggle CLP | USD en el header del card Resultados que convierte todos los valores monetarios usando el `dolarValue` proveniente de Supabase.

**Architecture:** El tipo `Moneda` y `formatUSD` se añaden a las librerías existentes. El estado `moneda` sube a `CalculadoraClient` y se pasa como prop a `Resultados`, que construye una función `format` local según la moneda activa y la aplica a cada fila. Los cálculos internos siempre permanecen en CLP.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, shadcn/ui (`ToggleGroup`), Vitest

---

## Chunk 1: Tipos y utilidades

### Task 1: Agregar tipo `Moneda` a `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`
- Test: `lib/__tests__/types.test.ts`

- [ ] **Step 1: Escribir test de tipo**

Añadir al final de `lib/__tests__/types.test.ts`:

```typescript
import type { Moneda } from '../types'

it('Moneda is CLP or USD', () => {
  expectTypeOf<Moneda>().toEqualTypeOf<'CLP' | 'USD'>()
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
cd /Users/gabrielpavez/Desktop/Repositorio/calculadora-sueldo-web
npx vitest run lib/__tests__/types.test.ts
```

Resultado esperado: FAIL — `Moneda` no está definida.

- [ ] **Step 3: Implementar el tipo**

Añadir al final de `lib/types.ts`:

```typescript
export type Moneda = 'CLP' | 'USD'
```

- [ ] **Step 4: Verificar que el test pasa**

```bash
npx vitest run lib/__tests__/types.test.ts
```

Resultado esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/__tests__/types.test.ts
git commit -m "feat(types): add Moneda type"
```

---

### Task 2: Agregar `formatUSD` a `lib/utils.ts`

**Files:**
- Modify: `lib/utils.ts`
- Test: `lib/__tests__/utils.test.ts` (nuevo)

- [ ] **Step 1: Crear archivo de test**

Crear `lib/__tests__/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatCLP, formatUSD } from '../utils'

describe('formatCLP', () => {
  it('formatea número como pesos chilenos sin decimales', () => {
    expect(formatCLP(1000000)).toBe('$1.000.000')
  })
})

describe('formatUSD', () => {
  it('formatea número como dólares con 2 decimales', () => {
    expect(formatUSD(1234.5)).toBe('$1,234.50')
  })

  it('formatea cero correctamente', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('redondea correctamente', () => {
    expect(formatUSD(1.005)).toBe('$1.01')
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
npx vitest run lib/__tests__/utils.test.ts
```

Resultado esperado: FAIL — `formatUSD` no exportada.

- [ ] **Step 3: Implementar `formatUSD`**

Añadir al final de `lib/utils.ts`:

```typescript
export const formatUSD = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
```

- [ ] **Step 4: Verificar que los tests pasan**

```bash
npx vitest run lib/__tests__/utils.test.ts
```

Resultado esperado: PASS todos.

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/__tests__/utils.test.ts
git commit -m "feat(utils): add formatUSD"
```

---

## Chunk 2: Estado en CalculadoraClient

### Task 3: Pasar `moneda`, `onMonedaChange` y `dolarValue` a `Resultados`

**Files:**
- Modify: `app/calculadora-client.tsx`

No hay lógica de negocio aquí, solo plumbing de estado. No requiere test unitario — la cobertura vendrá del componente `Resultados`.

- [ ] **Step 1: Añadir import de `Moneda` y `formatUSD`**

En `app/calculadora-client.tsx`, actualizar la línea de import de types:

```typescript
import { Bono, Pais, Modo, SistemaSalud, CountryConfig, Moneda } from "@/lib/types"
```

- [ ] **Step 2: Añadir estado `moneda`**

Dentro de `CalculadoraClient`, después de `const [bonos, setBonos] = useState<Bono[]>([])`:

```typescript
const [moneda, setMoneda] = useState<Moneda>('CLP')
```

- [ ] **Step 3: Pasar props nuevos a `<Resultados>`**

Reemplazar:
```tsx
<Resultados modo={modo} resultados={resultados} />
```

Por:
```tsx
<Resultados
  modo={modo}
  resultados={resultados}
  moneda={moneda}
  onMonedaChange={setMoneda}
  dolarValue={config.dolarValue}
/>
```

- [ ] **Step 4: Verificar que TypeScript no reporta errores**

```bash
npx tsc --noEmit
```

Resultado esperado: errores solo en `Resultados.tsx` (props no reconocidas aún) — se resuelven en el Task 4.

- [ ] **Step 5: Commit parcial (WIP)**

```bash
git add app/calculadora-client.tsx
git commit -m "feat(client): wire moneda state to Resultados props"
```

---

## Chunk 3: UI en Resultados

### Task 4: Actualizar `Resultados` con toggle, tipo de cambio y formato dinámico

**Files:**
- Modify: `components/calculator/Resultados.tsx`

- [ ] **Step 1: Actualizar imports**

Al inicio de `components/calculator/Resultados.tsx`, reemplazar:

```typescript
import { formatCLP } from "@/lib/utils"
import { ResultadosCalculo, Modo } from "@/lib/types"
```

Por:

```typescript
import { formatCLP, formatUSD } from "@/lib/utils"
import { ResultadosCalculo, Modo, Moneda } from "@/lib/types"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
```

- [ ] **Step 2: Actualizar la firma del componente `Resultados`**

Reemplazar:

```typescript
export function Resultados({
  modo,
  resultados,
}: {
  modo: Modo
  resultados: ResultadosCalculo
}) {
```

Por:

```typescript
export function Resultados({
  modo,
  resultados,
  moneda,
  onMonedaChange,
  dolarValue,
}: {
  modo: Modo
  resultados: ResultadosCalculo
  moneda: Moneda
  onMonedaChange: (m: Moneda) => void
  dolarValue: number
}) {
```

- [ ] **Step 3: Definir función `format` y valor del dólar formateado**

Añadir justo después de las declaraciones de `headerColor` y `headerTitle`:

```typescript
const format = (value: number): string =>
  moneda === 'CLP' ? formatCLP(value) : formatUSD(value / dolarValue)

const dolarFormateado = formatCLP(dolarValue)
```

- [ ] **Step 4: Actualizar el header del card**

Reemplazar el bloque del header:

```tsx
<div className={`${headerColor} text-white rounded-t-lg p-4`}>
  <h2 className="text-lg font-bold text-center">{headerTitle}</h2>
</div>
```

Por:

```tsx
<div className={`${headerColor} text-white rounded-t-lg p-4`}>
  <div className="flex items-center justify-between gap-2">
    <h2 className="text-lg font-bold">{headerTitle}</h2>
    <ToggleGroup
      type="single"
      value={moneda}
      onValueChange={(v) => v && onMonedaChange(v as Moneda)}
      className="shrink-0"
    >
      <ToggleGroupItem
        value="CLP"
        className="h-7 px-3 text-xs font-semibold text-white border-white/40 data-[state=on]:bg-white/30 data-[state=on]:text-white hover:bg-white/20 hover:text-white"
      >
        CLP
      </ToggleGroupItem>
      <ToggleGroupItem
        value="USD"
        className="h-7 px-3 text-xs font-semibold text-white border-white/40 data-[state=on]:bg-white/30 data-[state=on]:text-white hover:bg-white/20 hover:text-white"
      >
        USD
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
  <p className="text-xs text-white/60 mt-1">1 USD = {dolarFormateado}</p>
</div>
```

- [ ] **Step 5: Actualizar `ResultRow` para recibir función `format`**

Reemplazar la firma de `ResultRow`:

```typescript
function ResultRow({
  label,
  value,
  variant = "normal",
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento"
}) {
```

Por:

```typescript
function ResultRow({
  label,
  value,
  variant = "normal",
  format,
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento"
  format: (v: number) => string
}) {
```

Y en el JSX de `ResultRow`, reemplazar:

```tsx
<span className={valueClasses[variant]}>{formatCLP(value)}</span>
```

Por:

```tsx
<span className={valueClasses[variant]}>{format(value)}</span>
```

- [ ] **Step 6: Pasar `format` a todos los `<ResultRow>`**

Buscar **todas** las apariciones de `<ResultRow` en el JSX del componente `Resultados` y añadir `format={format}` como prop. Son 23 ocurrencias en total — actualizar cada una sin excepción. Ejemplo:

```tsx
<ResultRow
  label="Sueldo Base (entrada)"
  value={resultados.sueldoBase}
  variant="entrada"
  format={format}
/>
```

Hacerlo para todas las instancias de `ResultRow` dentro de `Resultados`.

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Resultado esperado: 0 errores.

- [ ] **Step 8: Verificar tests existentes**

```bash
npx vitest run
```

Resultado esperado: todos los tests pasan (los tests actuales son de `calculations` y `types`, no de componentes React).

- [ ] **Step 9: Commit**

```bash
git add components/calculator/Resultados.tsx
git commit -m "feat(Resultados): add CLP/USD toggle with exchange rate display"
```

---

## Verificación final

- [ ] **Arrancar dev server y verificar manualmente**

```bash
npm run dev
```

Abrir `http://localhost:3000` y verificar:

1. El header del card Resultados muestra el toggle `CLP | USD` y el texto `1 USD = $X.XXX`
2. Al hacer clic en `USD`, todos los valores se convierten a dólares con formato `$X,XXX.XX`
3. Al volver a `CLP`, los valores regresan al formato original `$X.XXX.XXX`
4. El estado `CLP` inicial es el correcto al cargar la página
5. Cambiar el modo de cálculo (Líquido → Base / Base → Líquido) no resetea la moneda seleccionada

- [ ] **Commit final si todo está correcto**

```bash
git add -A
git commit -m "chore: final verification toggle CLP↔USD"
```
