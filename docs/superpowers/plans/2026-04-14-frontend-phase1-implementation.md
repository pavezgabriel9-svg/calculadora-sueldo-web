# Calculadora de Sueldos Web - Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy MVP of salary calculator web app on Vercel with professional design, multi-country support (Chile complete, Perú/Brasil structure ready), and calculation logic in TypeScript running in browser.

**Architecture:** Modular hybrid approach - separated UI components, centralized calculation logic, configurable by country, no external APIs. Lógica completa convertida de Python → TypeScript.

**Tech Stack:** Next.js 16.1.6, React 19.2.3, TypeScript 5, Tailwind CSS v4, shadcn/ui basics, lucide-react, Vercel

**Spec Reference:** `docs/specs/2026-04-14-frontend-migration-design.md`

---

## Phase 1: Setup & Infrastructure

### Task 1: Update package.json with required dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Open and review current package.json**

Current state should have:
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.99.1",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Add UI and icon dependencies**

Replace entire `package.json` with:

```json
{
  "name": "calculadora-sueldo-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "@vercel/analytics": "1.6.1",
    "lucide-react": "^0.564.0",
    "clsx": "^2.1.1",
    "class-variance-authority": "^0.7.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "postcss": "^8.5",
    "autoprefixer": "^10.4.20"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: All packages install successfully, no peer dependency warnings.

- [ ] **Step 4: Verify installation**

```bash
npm list react react-dom next typescript
```

Expected output should show:
```
├── next@16.1.6
├── react@19.2.3
├── react-dom@19.2.3
└── typescript@5.x.x
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: update dependencies for calculadora web MVP"
```

---

### Task 2: Create folder structure for app

**Files:**
- Create: `components/ui/` (directory)
- Create: `components/calculator/` (directory)
- Create: `lib/` (directory)
- Create: `public/` (directory - already exists, verify)

- [ ] **Step 1: Create all necessary directories**

```bash
mkdir -p components/ui
mkdir -p components/calculator
mkdir -p lib
mkdir -p public
```

- [ ] **Step 2: Verify structure**

```bash
find . -type d -name "components" -o -type d -name "lib" | head -10
```

Expected: Output shows `./components` and `./lib` directories.

- [ ] **Step 3: Commit structure (empty)**

```bash
git add components/ lib/ public/
git commit -m "chore: create folder structure for frontend"
```

---

## Phase 2: Core Logic & Configuration

### Task 3: Create TypeScript types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create types file with all interfaces**

```typescript
// lib/types.ts

export interface Bono {
  id: string
  nombre: string
  monto: number
  imponible: boolean
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

export interface CalculatorParams {
  modo: Modo
  sueldo: string
  afp: string
  sistemaSalud: SistemaSalud
  saludUF: string
  movilizacion: string
  bonos: Bono[]
  pais: Pais
}
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la lib/types.ts
```

Expected: File listed with size > 0.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit lib/types.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add TypeScript types for calculator"
```

---

### Task 4: Create configuration with Chile parameters

**Files:**
- Create: `lib/config.ts`

- [ ] **Step 1: Create config file with Chile parameters**

```typescript
// lib/config.ts

import { Pais } from "./types"

export const PAISES: Pais[] = ["chile", "peru", "brasil"]

// AFP tasas por fondo (Chile)
export const AFP_DATA: Record<string, number> = {
  Capital: 0.1149,
  Cuprum: 0.1149,
  Habitat: 0.1127,
  Modelo: 0.1058,
  Planvital: 0.1116,
  Provida: 0.1145,
  Uno: 0.1049,
}

// Tasas y parámetros Chile
export const TASAS_CHILE = {
  UF_VALUE: 38000,
  TASA_SALUD_FONASA: 0.07,
  TASA_CESANTIA: 0.006,
  LIMITE_UF_IMPONIBLE: 81.6,
  GRATIFICACION_MAX_UF: 4.75,
  LIMITE_IMPUESTO: 800000,
  TASA_IMPUESTO: 0.04,
  CESANTIA_EMPLEADOR: 0.024,
  MUTUAL: 0.0093,
  SIS: 0.0141,
  EXPECTATIVA_VIDA: 0.002,
}

// Tasas y parámetros Perú (placeholder para Fase 2)
export const TASAS_PERU = {
  UF_VALUE: 1, // TBD
  TASA_SALUD_FONASA: 0.0,
  TASA_CESANTIA: 0.0,
  LIMITE_UF_IMPONIBLE: 0,
  GRATIFICACION_MAX_UF: 0,
  LIMITE_IMPUESTO: 0,
  TASA_IMPUESTO: 0,
  CESANTIA_EMPLEADOR: 0,
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,
}

// Tasas y parámetros Brasil (placeholder para Fase 2)
export const TASAS_BRASIL = {
  UF_VALUE: 1, // TBD
  TASA_SALUD_FONASA: 0.0,
  TASA_CESANTIA: 0.0,
  LIMITE_UF_IMPONIBLE: 0,
  GRATIFICACION_MAX_UF: 0,
  LIMITE_IMPUESTO: 0,
  TASA_IMPUESTO: 0,
  CESANTIA_EMPLEADOR: 0,
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,
}

export const CONFIG_POR_PAIS = {
  chile: TASAS_CHILE,
  peru: TASAS_PERU,
  brasil: TASAS_BRASIL,
}

export type CountryConfig = typeof TASAS_CHILE
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la lib/config.ts
```

Expected: File listed with size > 0.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit lib/config.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/config.ts
git commit -m "feat: add Chile configuration with AFP tasas and limits"
```

---

### Task 5: Create calculation logic module

**Files:**
- Create: `lib/calculations.ts`

- [ ] **Step 1: Create calculations file with main function**

```typescript
// lib/calculations.ts

import { Bono, ResultadosCalculo, Modo, Pais, SistemaSalud } from "./types"
import { AFP_DATA, CONFIG_POR_PAIS } from "./config"

export function calcularRemuneracion(
  modo: Modo,
  montoIngresado: number,
  afpNombre: string,
  sistemaSalud: SistemaSalud,
  saludUF: number,
  movilizacion: number,
  bonos: Bono[],
  pais: Pais = "chile"
): ResultadosCalculo {
  const config = CONFIG_POR_PAIS[pais]
  const tasaAFP = AFP_DATA[afpNombre] || 0.1049
  
  const tasaSalud =
    sistemaSalud === "fonasa"
      ? config.TASA_SALUD_FONASA
      : Math.max(config.TASA_SALUD_FONASA, (saludUF * config.UF_VALUE) / 1000000)

  const bonosImponibles = bonos
    .filter((b) => b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  const bonosNoImponibles = bonos
    .filter((b) => !b.imponible)
    .reduce((sum, b) => sum + b.monto, 0)

  let sueldoBase: number
  let sueldoLiquido: number

  if (modo === "base_a_liquido") {
    sueldoBase = montoIngresado
    
    // Cálculo directo: Base → Líquido
    const gratificacion = Math.min(
      sueldoBase * 0.25,
      (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
    )
    
    const totalImponible = Math.min(
      sueldoBase + gratificacion + bonosImponibles,
      config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
    )
    
    const descuentoAFP = totalImponible * tasaAFP
    const descuentoSalud =
      sistemaSalud === "fonasa"
        ? totalImponible * 0.07
        : Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE)
    const descuentoCesantia = totalImponible * config.TASA_CESANTIA
    
    const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
    const baseImponible = totalImponible - totalDescuentos
    const impuesto =
      baseImponible > config.LIMITE_IMPUESTO
        ? (baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO
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
        (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
      )

      const totalImponible = Math.min(
        sueldoBase + gratificacion + bonosImponibles,
        config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
      )

      const descuentoAFP = totalImponible * tasaAFP
      const descuentoSalud =
        sistemaSalud === "fonasa"
          ? totalImponible * 0.07
          : Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE)
      const descuentoCesantia = totalImponible * config.TASA_CESANTIA

      const totalDescuentos = descuentoAFP + descuentoSalud + descuentoCesantia
      const baseImponible = totalImponible - totalDescuentos
      const impuesto =
        baseImponible > config.LIMITE_IMPUESTO
          ? (baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO
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
    (config.GRATIFICACION_MAX_UF * config.UF_VALUE) / 12
  )

  const totalImponible = Math.min(
    sueldoBase + gratificacion + bonosImponibles,
    config.LIMITE_UF_IMPONIBLE * config.UF_VALUE
  )

  const cotizacionPrevisional = Math.round(totalImponible * tasaAFP)
  const cotizacionSalud =
    sistemaSalud === "fonasa"
      ? Math.round(totalImponible * 0.07)
      : Math.round(Math.max(totalImponible * 0.07, saludUF * config.UF_VALUE))
  const cesantia = Math.round(totalImponible * config.TASA_CESANTIA)

  const totalDescuentos = cotizacionPrevisional + cotizacionSalud + cesantia
  const baseImponible = totalImponible - totalDescuentos
  const impuesto =
    baseImponible > config.LIMITE_IMPUESTO
      ? Math.round((baseImponible - config.LIMITE_IMPUESTO) * config.TASA_IMPUESTO)
      : 0

  // Costos patronales
  const cesantiaEmpleador = Math.round(totalImponible * config.CESANTIA_EMPLEADOR)
  const mutual = Math.round(totalImponible * config.MUTUAL)
  const sis = Math.round(totalImponible * config.SIS)
  const expectativaVida = Math.round(totalImponible * config.EXPECTATIVA_VIDA)
  const afpEmpleador = 0
  const seguroComplementario = 0
  const totalPatronal =
    cesantiaEmpleador + mutual + sis + expectativaVida + afpEmpleador + seguroComplementario

  const totalHaberes =
    sueldoBase + gratificacion + bonosImponibles + bonosNoImponibles + movilizacion
  const costoTotalEmpresa = totalHaberes + totalPatronal

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
  }
}
```

- [ ] **Step 2: Verify file exists and type-checks**

```bash
npx tsc --noEmit lib/calculations.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/calculations.ts
git commit -m "feat: implement salary calculation logic for Chile"
```

---

### Task 6: Create utility functions

**Files:**
- Create: `lib/utils.ts`

- [ ] **Step 1: Create utils file with formatters and parsers**

```typescript
// lib/utils.ts

export const formatCLP = (value: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value)
}

export const parseNumericInput = (value: string): number => {
  const cleaned = value.replace(/[^\d]/g, "")
  return parseInt(cleaned) || 0
}

export const formatNumericInput = (value: string): string => {
  const num = parseNumericInput(value)
  if (num === 0) return ""
  return new Intl.NumberFormat("es-CL").format(num)
}

export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter((cls) => typeof cls === "string").join(" ")
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit lib/utils.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/utils.ts
git commit -m "feat: add utility functions for formatting and parsing"
```

---

### Task 7: Create custom hooks

**Files:**
- Create: `lib/hooks.ts`

- [ ] **Step 1: Create hooks file with useCalculator**

```typescript
// lib/hooks.ts

"use client"

import { useMemo, useState, useEffect } from "react"
import { calcularRemuneracion } from "./calculations"
import { parseNumericInput } from "./utils"
import { ResultadosCalculo, CalculatorParams } from "./types"

export function useCalculator(params: CalculatorParams): ResultadosCalculo {
  return useMemo(() => {
    const montoSueldo = parseNumericInput(params.sueldo)
    const montoMovilizacion = parseNumericInput(params.movilizacion)

    if (montoSueldo === 0) {
      return calcularRemuneracion(
        params.modo,
        1000000,
        params.afp,
        params.sistemaSalud,
        parseFloat(params.saludUF || "0"),
        montoMovilizacion,
        params.bonos,
        params.pais
      )
    }

    return calcularRemuneracion(
      params.modo,
      montoSueldo,
      params.afp,
      params.sistemaSalud,
      parseFloat(params.saludUF || "0"),
      montoMovilizacion,
      params.bonos,
      params.pais
    )
  }, [
    params.modo,
    params.sueldo,
    params.afp,
    params.sistemaSalud,
    params.saludUF,
    params.movilizacion,
    params.bonos,
    params.pais,
  ])
}

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Cargar de localStorage al montar
    const saved = localStorage.getItem("darkMode")
    if (saved !== null) {
      const isDark = JSON.parse(saved)
      setDarkMode(isDark)
      applyDarkMode(isDark)
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newValue = !prev
      localStorage.setItem("darkMode", JSON.stringify(newValue))
      applyDarkMode(newValue)
      return newValue
    })
  }

  const applyDarkMode = (isDark: boolean) => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }

  return { darkMode, toggleDarkMode }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit lib/hooks.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks.ts
git commit -m "feat: add custom hooks for calculator and dark mode"
```

---

## Phase 3: UI Components - shadcn/ui Base Components

### Task 8: Create Button component

**Files:**
- Create: `components/ui/button.tsx`

- [ ] **Step 1: Create Button component with variants**

```typescript
// components/ui/button.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/button.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat(ui): add Button component with variants"
```

---

### Task 9: Create Input component

**Files:**
- Create: `components/ui/input.tsx`

- [ ] **Step 1: Create Input component**

```typescript
// components/ui/input.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/input.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/input.tsx
git commit -m "feat(ui): add Input component"
```

---

### Task 10: Create Card component

**Files:**
- Create: `components/ui/card.tsx`

- [ ] **Step 1: Create Card component with variants**

```typescript
// components/ui/card.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/card.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/card.tsx
git commit -m "feat(ui): add Card component with subcomponents"
```

---

### Task 11: Create Badge component

**Files:**
- Create: `components/ui/badge.tsx`

- [ ] **Step 1: Create Badge component**

```typescript
// components/ui/badge.tsx

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/badge.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "feat(ui): add Badge component"
```

---

### Task 12: Create Label component

**Files:**
- Create: `components/ui/label.tsx`

- [ ] **Step 1: Create Label component**

```typescript
// components/ui/label.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/label.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/label.tsx
git commit -m "feat(ui): add Label component"
```

---

### Task 13: Create Checkbox component

**Files:**
- Create: `components/ui/checkbox.tsx`

- [ ] **Step 1: Create Checkbox component**

```typescript
// components/ui/checkbox.tsx

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative flex items-center">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none bg-background checked:bg-primary checked:border-primary",
        className
      )}
      {...props}
    />
    <Check className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/checkbox.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/checkbox.tsx
git commit -m "feat(ui): add Checkbox component"
```

---

### Task 14: Create RadioGroup component

**Files:**
- Create: `components/ui/radio-group.tsx`

- [ ] **Step 1: Create RadioGroup component**

```typescript
// components/ui/radio-group.tsx

import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
  value: string
  onChange: (value: string) => void
} | null>(null)

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    onValueChange: (value: string) => void
  }
>(({ className, value, onValueChange, ...props }, ref) => (
  <RadioGroupContext.Provider value={{ value, onChange: onValueChange }}>
    <div ref={ref} className={cn("flex items-center gap-4", className)} {...props} />
  </RadioGroupContext.Provider>
))
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    value: string
  }
>(({ className, value, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext)
  if (!context) throw new Error("RadioGroupItem must be used inside RadioGroup")

  return (
    <div className="relative flex items-center">
      <input
        type="radio"
        ref={ref}
        value={value}
        checked={context.value === value}
        onChange={(e) => context.onChange(e.target.value)}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none bg-background checked:border-primary",
          className
        )}
        {...props}
      />
      <Circle className="pointer-events-none absolute left-1 top-1 h-2 w-2 fill-primary text-primary opacity-0 peer-checked:opacity-100" />
    </div>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/radio-group.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/radio-group.tsx
git commit -m "feat(ui): add RadioGroup component"
```

---

### Task 15: Create Select component

**Files:**
- Create: `components/ui/select.tsx`

- [ ] **Step 1: Create Select component**

```typescript
// components/ui/select.tsx

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <SelectContext.Provider
      value={{ value, onChange: onValueChange, isOpen, setIsOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be inside Select")

  return (
    <button
      ref={ref}
      onClick={() => context.setIsOpen(!context.isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be inside Select")

  return (
    <span className="text-foreground">
      {context.value || placeholder}
    </span>
  )
}

const SelectContent = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be inside Select")

  if (!context.isOpen) return null

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 z-50 mt-2 rounded-md border border-input bg-background shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

const SelectItem = ({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectItem must be inside Select")

  return (
    <button
      onClick={() => {
        context.onChange(value)
        context.setIsOpen(false)
      }}
      className={cn(
        "block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
        context.value === value && "bg-primary text-primary-foreground"
      )}
    >
      {children}
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/select.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/select.tsx
git commit -m "feat(ui): add Select component"
```

---

### Task 16: Create Separator component

**Files:**
- Create: `components/ui/separator.tsx`

- [ ] **Step 1: Create Separator component**

```typescript
// components/ui/separator.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
  }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/separator.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/separator.tsx
git commit -m "feat(ui): add Separator component"
```

---

### Task 17: Create ToggleGroup component

**Files:**
- Create: `components/ui/toggle-group.tsx`

- [ ] **Step 1: Create ToggleGroup component**

```typescript
// components/ui/toggle-group.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

const ToggleGroupContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  type: "single" | "multiple"
} | null>(null)

const ToggleGroup = ({
  children,
  value,
  onValueChange,
  type = "single",
  className,
}: {
  children: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  type?: "single" | "multiple"
  className?: string
}) => {
  return (
    <ToggleGroupContext.Provider
      value={{ value, onChange: onValueChange, type }}
    >
      <div className={cn("flex gap-2", className)}>{children}</div>
    </ToggleGroupContext.Provider>
  )
}

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  }
>(({ value, className, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext)
  if (!context) throw new Error("ToggleGroupItem must be inside ToggleGroup")

  const isSelected = context.value === value

  return (
    <button
      ref={ref}
      onClick={() => context.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
      data-state={isSelected ? "on" : "off"}
      {...props}
    >
      {props.children}
    </button>
  )
})
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/ui/toggle-group.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/toggle-group.tsx
git commit -m "feat(ui): add ToggleGroup component"
```

---

## Phase 4: Calculator Components

### Task 18: Create Header component

**Files:**
- Create: `components/calculator/Header.tsx`

- [ ] **Step 1: Create Header component**

```typescript
// components/calculator/Header.tsx

"use client"

import { Calculator, Globe, Moon, Sun } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Pais } from "@/lib/types"

export function Header({
  pais,
  onPaisChange,
  darkMode,
  onDarkModeToggle,
}: {
  pais: Pais
  onPaisChange: (p: Pais) => void
  darkMode: boolean
  onDarkModeToggle: () => void
}) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Sueldos</h1>
              <p className="text-blue-100 text-sm">
                Remuneraciones y Costos Patronales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">
              <span className="h-2 w-2 bg-white rounded-full mr-2 animate-pulse" />
              ONLINE
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDarkModeToggle}
              className="text-white hover:bg-white/20 hover:text-white h-9 w-9 p-0"
              aria-label={
                darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
              }
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-200" />
              <ToggleGroup
                type="single"
                value={pais}
                onValueChange={(v) => v && onPaisChange(v as Pais)}
              >
                <ToggleGroupItem
                  value="chile"
                  className="data-[state=on]:bg-amber-400 data-[state=on]:text-black text-white border-white/30"
                >
                  🇨🇱 Chile
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="peru"
                  className="data-[state=on]:bg-amber-400 data-[state=on]:text-black text-white border-white/30"
                >
                  🇵🇪 Perú
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="brasil"
                  className="data-[state=on]:bg-amber-400 data-[state=on]:text-black text-white border-white/30"
                >
                  🇧🇷 Brasil
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/Header.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/Header.tsx
git commit -m "feat(calculator): add Header component"
```

---

### Task 19: Create ModoCalculo component

**Files:**
- Create: `components/calculator/ModoCalculo.tsx`

- [ ] **Step 1: Create ModoCalculo component**

```typescript
// components/calculator/ModoCalculo.tsx

import { Calculator } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Modo } from "@/lib/types"

export function ModoCalculo({
  modo,
  onModoChange,
}: {
  modo: Modo
  onModoChange: (m: Modo) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Modo de Cálculo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          type="single"
          value={modo}
          onValueChange={(v) => v && onModoChange(v as Modo)}
          className="w-full"
        >
          <ToggleGroupItem
            value="liquido_a_base"
            className="flex-1 data-[state=on]:bg-emerald-600 data-[state=on]:text-white h-12"
          >
            Líquido → Base
          </ToggleGroupItem>
          <ToggleGroupItem
            value="base_a_liquido"
            className="flex-1 data-[state=on]:bg-blue-600 data-[state=on]:text-white h-12"
          >
            Base → Líquido
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground mt-3">
          💡{" "}
          {modo === "liquido_a_base"
            ? "Ingresa el sueldo líquido deseado y calcula el sueldo base necesario"
            : "Ingresa el sueldo base y calcula el sueldo líquido resultante"}
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/ModoCalculo.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/ModoCalculo.tsx
git commit -m "feat(calculator): add ModoCalculo component"
```

---

### Task 20: Create DatosPrincipales component

**Files:**
- Create: `components/calculator/DatosPrincipales.tsx`

- [ ] **Step 1: Create DatosPrincipales component**

```typescript
// components/calculator/DatosPrincipales.tsx

import { Building2, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AFP_DATA } from "@/lib/config"
import { formatCLP, formatNumericInput } from "@/lib/utils"
import { Modo, SistemaSalud } from "@/lib/types"

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
}: {
  modo: Modo
  sueldo: string
  onSueldoChange: (v: string) => void
  afp: string
  onAfpChange: (v: string) => void
  sistemaSalud: SistemaSalud
  onSistemaSaludChange: (v: SistemaSalud) => void
  saludUF: string
  onSaludUFChange: (v: string) => void
  movilizacion: string
  onMovilizacionChange: (v: string) => void
}) {
  const tasaAFP = AFP_DATA[afp] || 0.1049

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Datos Principales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Sueldo Principal */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            {modo === "liquido_a_base" ? "Sueldo Líquido Deseado" : "Sueldo Base"}
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={sueldo}
              onChange={(e) => onSueldoChange(formatNumericInput(e.target.value))}
              placeholder={
                modo === "liquido_a_base" ? "Ej: 1.000.000" : "Ej: 1.500.000"
              }
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* AFP */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">AFP</Label>
          <div className="flex gap-3">
            <Select value={afp} onValueChange={onAfpChange}>
              <SelectTrigger className="flex-1 h-11">
                <SelectValue placeholder="Selecciona AFP" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(AFP_DATA).map((afpName) => (
                  <SelectItem key={afpName} value={afpName}>
                    {afpName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="h-11 px-4 flex items-center text-sm">
              {(tasaAFP * 100).toFixed(2)}%
            </Badge>
          </div>
        </div>

        {/* Sistema de Salud */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Sistema de Salud</Label>
          <RadioGroup
            value={sistemaSalud}
            onValueChange={(v) =>
              onSistemaSaludChange(v as SistemaSalud)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fonasa" id="fonasa" />
              <Label htmlFor="fonasa" className="cursor-pointer">
                Fonasa
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="isapre" id="isapre" />
              <Label htmlFor="isapre" className="cursor-pointer">
                Isapre
              </Label>
            </div>
          </RadioGroup>

          {sistemaSalud === "isapre" && (
            <div className="flex items-center gap-3 mt-2">
              <Label className="text-sm">UF:</Label>
              <Input
                type="text"
                value={saludUF}
                onChange={(e) => onSaludUFChange(e.target.value)}
                placeholder="Ej: 3.5"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                ({formatCLP(parseFloat(saludUF || "0") * 38000)})
              </span>
            </div>
          )}
        </div>

        {/* Movilización */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Movilización</Label>
          <Input
            type="text"
            value={movilizacion}
            onChange={(e) =>
              onMovilizacionChange(formatNumericInput(e.target.value))
            }
            placeholder="Ej: 40.000"
            className="h-11"
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/DatosPrincipales.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/DatosPrincipales.tsx
git commit -m "feat(calculator): add DatosPrincipales component"
```

---

### Task 21: Create Bonos component

**Files:**
- Create: `components/calculator/Bonos.tsx`

- [ ] **Step 1: Create Bonos component**

```typescript
// components/calculator/Bonos.tsx

"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCLP, formatNumericInput, parseNumericInput } from "@/lib/utils"
import { Bono } from "@/lib/types"

export function Bonos({
  bonos,
  onAddBono,
  onRemoveBono,
}: {
  bonos: Bono[]
  onAddBono: (bono: Omit<Bono, "id">) => void
  onRemoveBono: (id: string) => void
}) {
  const [nombre, setNombre] = useState("")
  const [monto, setMonto] = useState("")
  const [imponible, setImponible] = useState(true)

  const handleAdd = () => {
    if (!nombre.trim() || !monto) return
    onAddBono({
      nombre: nombre.trim(),
      monto: parseNumericInput(monto),
      imponible,
    })
    setNombre("")
    setMonto("")
    setImponible(true)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-600" />
          Bonos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Producción"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monto</Label>
            <Input
              value={monto}
              onChange={(e) => setMonto(formatNumericInput(e.target.value))}
              placeholder="$ 0"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="imponible"
              checked={imponible}
              onCheckedChange={(c) => setImponible(c === true)}
            />
            <Label htmlFor="imponible" className="text-sm cursor-pointer">
              Imponible
            </Label>
          </div>
          <Button
            onClick={handleAdd}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        {bonos.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
            {bonos.map((bono, i) => (
              <div key={bono.id} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {bono.nombre} | {formatCLP(bono.monto)} |
                  <span
                    className={
                      bono.imponible ? "text-blue-600" : "text-orange-600"
                    }
                  >
                    {" "}
                    {bono.imponible ? "IMPONIBLE" : "NO IMPONIBLE"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveBono(bono.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/Bonos.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/Bonos.tsx
git commit -m "feat(calculator): add Bonos component"
```

---

### Task 22: Create Resultados component

**Files:**
- Create: `components/calculator/Resultados.tsx`

- [ ] **Step 1: Create Resultados component**

```typescript
// components/calculator/Resultados.tsx

import {
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCLP } from "@/lib/utils"
import { ResultadosCalculo, Modo } from "@/lib/types"

export function Resultados({
  modo,
  resultados,
}: {
  modo: Modo
  resultados: ResultadosCalculo
}) {
  const headerColor =
    modo === "base_a_liquido"
      ? "bg-gradient-to-r from-blue-600 to-blue-700"
      : "bg-gradient-to-r from-emerald-600 to-emerald-700"

  const headerTitle =
    modo === "base_a_liquido"
      ? "CÁLCULO: BASE → LÍQUIDO"
      : "CÁLCULO: LÍQUIDO → BASE"

  return (
    <Card className="sticky top-4">
      <div className={`${headerColor} text-white rounded-t-lg p-4`}>
        <h2 className="text-lg font-bold text-center">{headerTitle}</h2>
      </div>

      <CardContent className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Sección Principal */}
        <div className="space-y-2">
          {modo === "base_a_liquido" ? (
            <>
              <ResultRow
                label="Sueldo Base (entrada)"
                value={resultados.sueldoBase}
                variant="entrada"
              />
              <Separator />
              <ResultRow
                label="SUELDO LÍQUIDO"
                value={resultados.sueldoLiquido}
                variant="principal"
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Líquido Objetivo (entrada)"
                value={resultados.sueldoLiquido}
                variant="entrada"
              />
              <Separator />
              <ResultRow
                label="SUELDO BASE"
                value={resultados.sueldoBase}
                variant="principal"
              />
            </>
          )}
        </div>

        <Separator />

        {/* Costo Total Empresa */}
        <ResultRow
          label="COSTO TOTAL EMPRESA"
          value={resultados.costoTotalEmpresa}
          variant="total-header"
        />

        <Separator />

        {/* Haberes */}
        <div className="space-y-2">
          <SectionHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="HABERES"
          />
          <ResultRow label="Gratificación" value={resultados.gratificacion} />
          {resultados.bonosImponibles > 0 && (
            <ResultRow
              label="Bonos Imponibles"
              value={resultados.bonosImponibles}
            />
          )}
          <ResultRow
            label="Total Haberes Imponibles"
            value={resultados.totalHaberesImponibles}
            variant="total"
          />
          <ResultRow
            label="Movilización"
            value={resultados.movilizacion}
          />
          {resultados.bonosNoImponibles > 0 && (
            <ResultRow
              label="Bonos No Imponibles"
              value={resultados.bonosNoImponibles}
            />
          )}
          <ResultRow
            label="Total Haberes"
            value={resultados.totalHaberes}
            variant="total"
          />
        </div>

        <Separator />

        {/* Descuentos */}
        <div className="space-y-2">
          <SectionHeader
            icon={<TrendingDown className="h-4 w-4" />}
            title="DESCUENTOS TRABAJADOR"
          />
          <ResultRow
            label="Cotización Previsional (AFP)"
            value={resultados.cotizacionPrevisional}
          />
          <ResultRow
            label="Cotización Salud"
            value={resultados.cotizacionSalud}
          />
          <ResultRow
            label="Seguro Cesantía"
            value={resultados.cesantia}
          />
          <ResultRow
            label="Impuesto Único"
            value={resultados.impuesto}
          />
          <ResultRow
            label="Total Descuentos"
            value={resultados.totalDescuentos}
            variant="descuento"
          />
        </div>

        <Separator />

        {/* Costos Patronales */}
        <div className="space-y-2">
          <SectionHeader
            icon={<Shield className="h-4 w-4" />}
            title="COSTOS PATRONALES"
          />
          <ResultRow
            label="Seguro Cesantía Empleador"
            value={resultados.cesantiaEmpleador}
          />
          <ResultRow label="Mutual" value={resultados.mutual} />
          <ResultRow label="SIS" value={resultados.sis} />
          <ResultRow
            label="Cotización Expectativa Vida"
            value={resultados.expectativaVida}
          />
          <ResultRow
            label="Aporte AFP Empleador"
            value={resultados.afpEmpleador}
          />
          <ResultRow
            label="Seguro Complementario Salud"
            value={resultados.seguroComplementario}
          />
          <ResultRow
            label="TOTAL COSTOS PATRONALES"
            value={resultados.totalPatronal}
            variant="total"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      {icon}
      <span className="font-bold text-sm text-foreground">{title}</span>
    </div>
  )
}

function ResultRow({
  label,
  value,
  variant = "normal",
}: {
  label: string
  value: number
  variant?: "normal" | "entrada" | "principal" | "total" | "total-header" | "descuento"
}) {
  const valueClasses = {
    normal: "text-foreground",
    entrada: "text-muted-foreground font-semibold",
    principal: "text-emerald-600 font-bold text-lg",
    total: "text-blue-600 font-semibold",
    "total-header": "text-blue-600 font-bold text-lg",
    descuento: "text-red-600 font-semibold",
  }

  const labelClasses = {
    normal: "text-sm text-muted-foreground",
    entrada: "text-sm font-medium",
    principal: "text-sm font-bold",
    total: "text-sm font-semibold",
    "total-header": "text-sm font-bold",
    descuento: "text-sm font-semibold",
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={labelClasses[variant]}>{label}</span>
      <span className={valueClasses[variant]}>{formatCLP(value)}</span>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/Resultados.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/Resultados.tsx
git commit -m "feat(calculator): add Resultados component"
```

---

### Task 23: Create calculator components index

**Files:**
- Create: `components/calculator/index.ts`

- [ ] **Step 1: Create index file**

```typescript
// components/calculator/index.ts

export { Header } from "./Header"
export { ModoCalculo } from "./ModoCalculo"
export { DatosPrincipales } from "./DatosPrincipales"
export { Bonos } from "./Bonos"
export { Resultados } from "./Resultados"
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit components/calculator/index.ts
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/calculator/index.ts
git commit -m "chore: add calculator components index"
```

---

## Phase 5: Application Layout & Styles

### Task 24: Create layout.tsx with root configuration

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

```typescript
// app/layout.tsx

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Calculadora de Sueldos | Remuneraciones y Costos Patronales",
  description:
    "Calculadora profesional de sueldos para Chile, Perú y Brasil. Calcula sueldos base, líquido, descuentos y costos patronales.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit app/layout.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update layout with metadata and Analytics"
```

---

### Task 25: Create globals.css with theme

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css**

```css
/* app/globals.css */

@import 'tailwindcss';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
}

@theme inline {
  --font-sans: 'Geist', 'Geist Fallback';
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Verify CSS file**

```bash
ls -la app/globals.css
```

Expected: File exists and is valid CSS.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add global styles with OKLCH theme"
```

---

### Task 26: Create main page.tsx (app orchestrator)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Create main page component**

```typescript
// app/page.tsx

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
import { formatNumericInput, parseNumericInput } from "@/lib/utils"
import { Bono, Pais, Modo, SistemaSalud } from "@/lib/types"

export default function CalculadoraSueldos() {
  // Dark mode
  const { darkMode, toggleDarkMode } = useDarkMode()

  // State
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

  // Calculación en tiempo real
  const resultados = useCalculator({
    modo,
    sueldo,
    afp,
    sistemaSalud,
    saludUF,
    movilizacion,
    bonos,
    pais,
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
          {/* Panel Izquierdo - Inputs */}
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
            />

            <Bonos
              bonos={bonos}
              onAddBono={addBono}
              onRemoveBono={removeBono}
            />
          </div>

          {/* Panel Derecho - Resultados */}
          <div className="lg:col-span-2">
            <Resultados modo={modo} resultados={resultados} />
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit app/page.tsx
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: create main page with full calculator UI"
```

---

## Phase 6: Configuration & Testing

### Task 27: Verify Tailwind configuration

**Files:**
- Verify: `tailwind.config.ts`

- [ ] **Step 1: Check existing tailwind.config.ts**

```bash
cat tailwind.config.ts
```

Expected output should have basic Next.js config.

- [ ] **Step 2: If not exists, create default config**

If file doesn't exist, create:

```typescript
// tailwind.config.ts

import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: "class",
}

export default config
```

- [ ] **Step 3: Commit if created**

```bash
git add tailwind.config.ts
git commit -m "chore: configure Tailwind CSS"
```

---

### Task 28: Verify PostCSS configuration

**Files:**
- Verify: `postcss.config.mjs`

- [ ] **Step 1: Check existing postcss.config.mjs**

```bash
cat postcss.config.mjs
```

Expected output should have Tailwind plugin.

- [ ] **Step 2: If not exists, create config**

If file doesn't exist:

```javascript
// postcss.config.mjs

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Commit if created**

```bash
git add postcss.config.mjs
git commit -m "chore: configure PostCSS"
```

---

### Task 29: Verify Next.js configuration

**Files:**
- Verify: `next.config.mjs`

- [ ] **Step 1: Check existing next.config.mjs**

```bash
cat next.config.mjs
```

Expected: File should exist with basic config.

- [ ] **Step 2: If not exists, create default**

If file doesn't exist:

```javascript
// next.config.mjs

export default {
  // Configuration here
}
```

- [ ] **Step 3: Commit if created**

```bash
git add next.config.mjs
git commit -m "chore: configure Next.js"
```

---

### Task 30: Run development server

**Files:**
- Test: All

- [ ] **Step 1: Install dependencies again (safety check)**

```bash
npm install
```

Expected: All packages installed, no errors.

- [ ] **Step 2: Start development server**

```bash
npm run dev
```

Expected: Output shows:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
```

- [ ] **Step 3: Test in browser**

Open http://localhost:3000 in browser.

Expected:
- Header with calculator title + country selector + dark mode toggle
- Panel with "Modo de Cálculo" toggle buttons
- "Datos Principales" section with inputs
- "Bonos" section
- Right panel with "Resultados" showing calculations

Try:
- Change sueldo input → see results update
- Toggle modo → see layout change
- Change AFP → see tasa update
- Add/remove bonos → see results change
- Toggle dark mode → see theme apply

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: complete Fase 1 implementation - MVP ready"
```

---

## Summary

**Phase 1 Complete:**
✅ Setup: Dependencies, folder structure  
✅ Core Logic: Types, config, calculations, hooks  
✅ UI Components: shadcn/ui basics + calculator components  
✅ Application: Page layout, routing, styling  
✅ Testing: Local dev server working  

**Next Steps (Fase 2):**
- [ ] Integrate Supabase/BD for dynamic parameters
- [ ] Add Perú/Brasil parameters
- [ ] Deploy to Vercel
- [ ] Production testing

---

**End of Plan**

Estimated total time: **4-6 hours** for a skilled developer.
