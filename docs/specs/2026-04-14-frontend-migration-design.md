# Frontend Migration Design: Calculadora de Sueldos Web
**Date:** 2026-04-14  
**Status:** Design Approved  
**Version:** 1.0

---

## Executive Summary

Upgrade de **calculadora_sueldo** (proyecto desktop Python) a **calculadora-sueldo-web** (web MVP en Vercel). Se migrará el diseño profesional de `b_fc7tatT10DT/` manteniendo arquitectura limpia, modular y preparada para integración con BD en Fase 2.

**Fase 1 (actual):** Diseño + estructura preparada, valores hardcodeados.  
**Fase 2 (futura):** Integración con BD (Supabase o túnel SSH) con fallback.

---

## Objetivos

1. ✅ Desplegar MVP en Vercel con calculadora de sueldos profesional
2. ✅ Lógica de cálculos en TypeScript (navegador, sin APIs externas)
3. ✅ Arquitectura preparada para Fase 2 (integración BD)
4. ✅ Soporte para 3 países: Chile (Fase 1), Perú y Brasil (estructura lista)
5. ✅ Bundle optimizado para Vercel

---

## Requisitos Funcionales (Fase 1)

### Alcance Geográfico
- **Chile:** Completo (AFP, tasas, UF, sistema de salud Fonasa/Isapre)
- **Perú:** Estructura lista, parámetros TBD
- **Brasil:** Estructura lista, parámetros TBD

### Funcionalidades Calculadora
- Dos modos de cálculo:
  - Base → Líquido (sueldo base → sueldo líquido)
  - Líquido → Base (sueldo líquido deseado → sueldo base necesario)
- Bonos imponibles y no imponibles (agregar/remover)
- AFP múltiples (capital, Cuprum, Habitat, Modelo, Planvital, Provida, Uno)
- Sistema de salud (Fonasa con tasa fija 7%, Isapre con UF variable)
- Movilización
- Cálculos en tiempo real (memoizado)
- Resultados detallados:
  - Haberes (sueldo base, gratificación, bonos, movilización)
  - Descuentos trabajador (AFP, salud, cesantía, impuesto)
  - Costos patronales (cesantía empleador, mutual, SIS, expectativa vida)
  - Costo total empresa

### UI/UX
- Header con:
  - Logo + título
  - Selector de país (toggle buttons)
  - Toggle dark/light mode
  - Status badge "ONLINE"
- Layout responsivo:
  - Desktop: Panel inputs (3/5 ancho) + Panel resultados sticky (2/5 ancho)
  - Mobile: Stacked (inputs, luego resultados)
- Dark mode (localStorage + clase CSS)
- Componentes shadcn/ui: Button, Input, Card, Badge, Checkbox, RadioGroup, Select, ToggleGroup, Label, Separator
- Iconos lucide-react

---

## Arquitectura Técnica

### Stack
- **Runtime:** Next.js 16.1.6 + React 19.2.3
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS v4 + PostCSS v4
- **Componentes:** shadcn/ui basics (DIY, no Radix UI en Fase 1)
- **Fonts:** Geist (Google Fonts)
- **Analytics:** Vercel Analytics (prod only)
- **Dark Mode:** localStorage + CSS class
- **Deployment:** Vercel (con opción tunel SSH local para testing)

### Estructura de Carpetas

```
calculadora-sueldo-web/
├── app/
│   ├── layout.tsx              [Root layout, metadata, Analytics, fonts]
│   ├── page.tsx                [Main page - orquestador componentes]
│   ├── globals.css             [Estilos globales, tema OKLCH]
│   └── favicon.ico
├── components/
│   ├── ui/                     [Componentes shadcn/ui básicos reutilizables]
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── toggle-group.tsx
│   │   └── label.tsx
│   ├── calculator/             [Componentes específicos de calculadora]
│   │   ├── Header.tsx          [Header con país selector, dark mode]
│   │   ├── ModoCalculo.tsx     [Toggle: Líquido→Base o Base→Líquido]
│   │   ├── DatosPrincipales.tsx[Sueldo, AFP, Sistema salud, Movilización]
│   │   ├── Bonos.tsx           [Agregar/remover bonos]
│   │   ├── Resultados.tsx      [Panel sticky con resultados]
│   │   └── index.ts            [Barrel export]
│   └── theme-provider.tsx      [Si se usa context para tema]
├── lib/
│   ├── calculations.ts         [Lógica de cálculos (de Python → TS)]
│   ├── config.ts               [Parámetros por país (tasas, UF, límites)]
│   ├── hooks.ts                [Custom hooks: useCalculator, useDarkMode]
│   ├── types.ts                [TypeScript interfaces]
│   ├── utils.ts                [Helpers: formatCLP, parseNumericInput, etc.]
│   └── constants.ts            [Valores constantes: países, modos]
├── public/
│   ├── icon.svg
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   └── apple-icon.png
├── docs/
│   └── specs/
│       └── 2026-04-14-frontend-migration-design.md [Este archivo]
├── .env.local                  [Variables de entorno (local)]
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
└── README.md
```

### Componentes Detalle

#### `app/page.tsx` - Orquestador Principal
- State: pais, darkMode, modo, sueldo, afp, sistemaSalud, saludUF, movilizacion, bonos
- Hook: `useCalculator()` (memoizado, recalcula solo si deps cambian)
- Layout: Grid 2 columnas (desktop) / 1 columna (mobile)
- Callbacks: setPais, setDarkMode, setModo, setSueldo, setAfp, etc.

#### `components/calculator/Header.tsx`
- Logo + título
- Globe icon + ToggleGroup para pais (Chile/Perú/Brasil)
- Button dark/light toggle
- Badge status "ONLINE"

#### `components/calculator/ModoCalculo.tsx`
- ToggleGroup con 2 opciones: "Líquido → Base" / "Base → Líquido"
- Descripción dinámica según modo seleccionado

#### `components/calculator/DatosPrincipales.tsx`
- Input: Sueldo (con $ icon, parsing numérico)
- Select: AFP (Capital, Cuprum, Habitat, Modelo, Planvital, Provida, Uno)
- Badge: Tasa AFP correspondiente
- RadioGroup: Sistema Salud (Fonasa / Isapre)
- Condicional: Si Isapre, Input UF con conversión a CLP
- Input: Movilización

#### `components/calculator/Bonos.tsx`
- Grid 2 cols: Input nombre + Input monto
- Checkbox: Imponible
- Button: Agregar
- Lista scrollable: Bonos agregados (número, nombre, monto, tipo, botón eliminar)

#### `components/calculator/Resultados.tsx` (Sticky)
- Header coloreado (gradient azul para Base→Líquido, verde para Líquido→Base)
- Secciones:
  - **Sección Principal:** Entrada + Resultado (grandes, coloreados)
  - **Costo Total Empresa:** (prominent)
  - **Haberes:** Gratificación, bonos, total imponibles, movilización, total
  - **Descuentos:** AFP, salud, cesantía, impuesto, total
  - **Costos Patronales:** Cesantía empleador, mutual, SIS, expectativa vida, aporte AFP, seguro complementario, total
- Formato CLP (moneda chilena)
- Scrollable interno si overflow

### Flujo de Datos

```
Usuario input (setSueldo, setAfp, etc.)
         ↓
State actualiza
         ↓
useCalculator hook dispara (dependencias: modo, sueldo, afp, sistemaSalud, saludUF, movilizacion, bonos, pais)
         ↓
calcularRemuneracion() ejecuta (lógica pura)
         ↓
ResultadosCalculo retorna
         ↓
useMemo cachea resultado
         ↓
<Resultados> renderiza
```

### Módulo de Cálculos (`lib/calculations.ts`)

**Función principal:**
```typescript
export function calcularRemuneracion(
  modo: "liquido_a_base" | "base_a_liquido",
  montoIngresado: number,
  afpNombre: string,
  sistemaSalud: "fonasa" | "isapre",
  saludUF: number,
  movilizacion: number,
  bonos: Bono[],
  pais: "chile" | "peru" | "brasil" = "chile"
): ResultadosCalculo
```

**Lógica:**
1. Obtener config por país (AFP_DATA, TASAS_CHILE, etc.)
2. Calcular bonos imponibles/no imponibles
3. Si modo "base_a_liquido": cálculo directo
4. Si modo "liquido_a_base": cálculo iterativo (ajustar sueldoBase hasta convergencia)
5. Retornar ResultadosCalculo con todos los valores

**Valores memoizados en `lib/config.ts`:**
- AFP_DATA: Tasas por AFP
- TASAS_CHILE: UF, tasas impositivas, límites
- TASAS_PERU: (TBD)
- TASAS_BRASIL: (TBD)

### Tipos (`lib/types.ts`)

```typescript
interface Bono {
  id: string
  nombre: string
  monto: number
  imponible: boolean
}

interface ResultadosCalculo {
  sueldoBase: number
  sueldoLiquido: number
  gratificacion: number
  bonosImponibles: number
  bonosNoImponibles: number
  totalHaberesImponibles: number
  movilizacion: number
  totalHaberes: number
  cotizacionPrevisional: number
  cotizacionSalud: number
  cesantia: number
  impuesto: number
  totalDescuentos: number
  cesantiaEmpleador: number
  mutual: number
  sis: number
  expectativaVida: number
  afpEmpleador: number
  seguroComplementario: number
  totalPatronal: number
  costoTotalEmpresa: number
}

type Modo = "liquido_a_base" | "base_a_liquido"
type Pais = "chile" | "peru" | "brasil"
type SistemaSalud = "fonasa" | "isapre"
```

### Custom Hooks (`lib/hooks.ts`)

**`useCalculator(params)`**
- Recibe: modo, sueldo, afp, sistemaSalud, saludUF, movilizacion, bonos, pais
- Retorna: ResultadosCalculo
- Usa `useMemo` para caché

**`useDarkMode()`** (opcional)
- Maneja localStorage para persistencia
- Aplica clase CSS a `<html>`

---

## Dependencias (Fase 1)

### Instalación
```bash
npm install next@16.1.6 react@19.2.3 react-dom@19.2.3 \
  @vercel/analytics@1.6.1 lucide-react@0.564.0 \
  clsx@2.1.1 class-variance-authority@0.7.1 tailwind-merge@3.3.1

npm install --save-dev @tailwindcss/postcss@4 tailwindcss@4 typescript@5 \
  @types/node@20 @types/react@19 @types/react-dom@19 postcss@8.5
```

**NO incluidos en Fase 1:**
- ❌ `@radix-ui/*` (usaremos componentes shadcn DIY con Tailwind)
- ❌ `react-hook-form`, `zod` (validación simple por ahora)
- ❌ `next-themes` (localStorage es suficiente)
- ❌ `recharts` (gráficos, si aplica en futuro)

---

## Configuración Vercel

**`vercel.json`:**
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SITE_URL": "@site-url"
  }
}
```

**`.env.local`:**
```
NEXT_PUBLIC_SITE_URL=https://calculadora-sueldo-web.vercel.app
```

**Optimizaciones:**
- Vercel Analytics en `layout.tsx` (solo prod)
- Next.js Image Optimization (automático)
- Tailwind CSS minification (v4)
- Code splitting por componentes
- Fonts optimizados (Geist via Google)

---

## Fase 2: Integración BD (Preparación)

**No implementado ahora, pero arquitectura preparada:**

### Estrategia BD
1. Cargar parámetros desde **Supabase** (ideal) O **túnel SSH a servidor local** (testing)
2. Si falla conexión, fallback a valores hardcodeados en código
3. Cambio mínimo: Actualizar `lib/config.ts` para fetchar datos dinámicamente

### Cambios mínimos necesarios:
- Agregar async `fetchCountryConfig(pais)` en `lib/config.ts`
- Modificar `useCalculator` para invocar fetch (con fallback)
- Agregar `.env.local` para URLs de BD

---

## Testing y QA (Fase 1)

**Manual testing:**
- ✅ Inputs numéricos (parsing, formatting)
- ✅ Modo Líquido→Base (convergencia iterativa)
- ✅ Modo Base→Líquido (cálculo directo)
- ✅ Bonos (agregar, remover, imponible/no imponible)
- ✅ AFP selector (cambio de tasa)
- ✅ Sistema salud (Fonasa vs Isapre con UF)
- ✅ Dark mode (toggle, persistencia localStorage)
- ✅ Responsividad (desktop, tablet, mobile)
- ✅ Vercel deploy (build, load time)

**No requerido Fase 1:**
- ❌ Tests unitarios (jest/vitest)
- ❌ E2E tests (cypress/playwright)

---

## Deployment

### Local
```bash
npm install
npm run dev
# http://localhost:3000
```

### Vercel
```bash
# Conectar repo en https://vercel.com
# Vercel auto-detecta next.js
# Deploy automático en cada push a main
```

---

## Consideraciones de Performance

1. **useMemo en useCalculator:** Caché de resultados mientras deps no cambien
2. **Componentes separados:** Code splitting automático por Next.js
3. **Sin bundling de librerías pesadas:** shadcn DIY + Tailwind (ligero)
4. **Analytics en prod only:** `process.env.NODE_ENV === 'production'`
5. **Lazy loading de componentes:** Opción futura si crece

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Lógica Python compleja no translada bien | Testing exhaustivo en Fase 1, validar vs original |
| Cálculo iterativo (Líquido→Base) lento | Límite a 20 iteraciones, timeout check |
| BD Supabase no disponible en Fase 2 | Fallback a hardcoded values |
| Bundle size crece | Monitorear Vercel Analytics, lazy load si necesario |
| Dark mode flickering en reload | Usar `suppressHydrationWarning` en `<html>` |

---

## Timeline (Estimado)

- **Fase 1 (Setup + Dev):** 1-2 días (setup, componentes, lógica, testing)
- **Fase 1 (Deploy):** 1 día (Vercel config, validación)
- **Fase 2 (BD):** 2-3 días (Supabase/túnel SSH, fetch logic, fallback)
- **Fase 2+ (Perú/Brasil):** Según data available

---

## Next Steps

1. **Approval:** Usuario revisa y aprueba spec
2. **Writing-plans:** Crear plan de implementación detallado
3. **Implementation:** Ejecutar plan
4. **Testing:** QA local
5. **Deploy:** Vercel

---

**Documento aprobado por:** [Usuario]  
**Fecha aprobación:** [TBD]  
**Version:** 1.0
