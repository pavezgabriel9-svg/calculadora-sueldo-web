# Calculadora de Sueldos Web - Implementation Plans

> **Status:** Fase 1 ✅ COMPLETADA | Fase 2 🔄 EN DESARROLLO

**Goal:** Deploy MVP of salary calculator web app on Vercel with professional design, multi-country support (Chile complete, Perú/Brasil structure ready), and calculation logic in TypeScript running in browser.

**Architecture:** Modular hybrid approach - separated UI components, centralized calculation logic, configurable by country, no external APIs.

**Tech Stack:** Next.js 16.1.6, React 19.2.3, TypeScript 5, Tailwind CSS v4, shadcn/ui basics, lucide-react, Vercel

**Spec Reference:** `docs/specs/2026-04-14-frontend-migration-design.md`

---

## ✅ FASE 1: Setup & Core Implementation - COMPLETADA

**Fecha de Inicio:** 2026-04-14  
**Fecha de Finalización:** 2026-04-14  
**Commits:** 8

### Resumen de Implementación Fase 1

#### ✅ Phase 1: Setup & Infrastructure (Tasks 1-2)
- [x] package.json actualizado con todas las dependencias necesarias
- [x] npm install ejecutado exitosamente
- [x] Estructura de carpetas creada (components/, lib/, public/)

**Commit:** `cfd74d1 chore: update dependencies for calculadora web MVP`

#### ✅ Phase 2: Core Logic & Configuration (Tasks 3-7)
- [x] `lib/types.ts` - Tipos TypeScript completos para Bono, ResultadosCalculo, Modo, Pais, SistemaSalud
- [x] `lib/config.ts` - Parámetros Chile completos (AFP_DATA, TASAS_CHILE, CONFIG_POR_PAIS)
- [x] `lib/calculations.ts` - Lógica de cálculos convertida de Python → TypeScript (calcularRemuneracion)
  - Modo Base → Líquido (cálculo directo)
  - Modo Líquido → Base (cálculo iterativo con convergencia)
  - Cálculos de haberes, descuentos, costos patronales
- [x] `lib/utils.ts` - Funciones auxiliares: formatCLP, parseNumericInput, formatNumericInput, cn
- [x] `lib/hooks.ts` - Custom hooks:
  - useCalculator (memoizado con useMemo)
  - useDarkMode (localStorage + CSS class)

**Commit:** `251193e feat: add core logic, types, config, calculations, utilities and hooks`

#### ✅ Phase 3: UI Components - shadcn/ui Basics (Tasks 8-17)
- [x] Button.tsx (variants: default, destructive, outline, secondary, ghost, link)
- [x] Input.tsx (con focus ring y accesibilidad)
- [x] Card.tsx (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- [x] Badge.tsx (variants: default, secondary, destructive, outline)
- [x] Label.tsx (accesible, con soporte disabled)
- [x] Checkbox.tsx (custom con lucide-react Check icon)
- [x] RadioGroup.tsx (con React Context, RadioGroupItem)
- [x] Select.tsx (custom select con dropdown, SelectTrigger, SelectValue, SelectContent, SelectItem)
- [x] Separator.tsx (horizontal/vertical)
- [x] ToggleGroup.tsx (con estado on/off, ToggleGroupItem)

**Commit:** `ac3ded1 feat(ui): add shadcn/ui base components (button, input, card, badge, label, checkbox, radio, select, separator, toggle)`

#### ✅ Phase 4: Calculator Components (Tasks 18-23)
- [x] Header.tsx - Componente header con:
  - Logo + Título
  - Globe icon + País selector (Chile/Perú/Brasil)
  - Dark mode toggle (Sun/Moon)
  - Status badge "ONLINE"
  - Gradient azul a azul
- [x] ModoCalculo.tsx - Toggle buttons para Líquido→Base / Base→Líquido
- [x] DatosPrincipales.tsx - Formulario con:
  - Sueldo input (con $ icon)
  - AFP selector con tasa dinámica
  - Sistema de salud (RadioGroup: Fonasa/Isapre)
  - UF condicional para Isapre
  - Movilización input
- [x] Bonos.tsx - Gestión de bonos:
  - Form para agregar bonos (nombre, monto)
  - Checkbox imponible
  - Lista de bonos con botón eliminar
  - Colores: azul (imponible), naranja (no imponible)
- [x] Resultados.tsx - Panel sticky con:
  - Header coloreado (azul para Base→Líquido, verde para Líquido→Base)
  - Secciones: Principal, Haberes, Descuentos, Costos Patronales
  - Icons: TrendingUp, TrendingDown, Shield
  - Colores: principal (verde), total (azul), descuento (rojo)
- [x] components/calculator/index.ts - Barrel export

**Commit:** `ecbc3f2 feat(calculator): add calculator components (Header, ModoCalculo, DatosPrincipales, Bonos, Resultados)`

#### ✅ Phase 5: Application Layout & Styles (Tasks 24-26)
- [x] app/layout.tsx
  - Geist fonts (sans + mono)
  - Metadata con título y descripción optimizados SEO
  - Icons (light, dark, SVG, apple)
  - Vercel Analytics (solo en producción)
  - suppressHydrationWarning en html
- [x] app/globals.css
  - @import 'tailwindcss' (v4)
  - Custom CSS variables (OKLCH color space)
  - Dark mode config
  - @theme inline con fonts y colores
  - @layer base con estilos globales
- [x] app/page.tsx - Página principal
  - Estado: pais, modo, sueldo, afp, sistemaSalud, saludUF, movilizacion, bonos
  - useDarkMode hook
  - useCalculator hook
  - Handlers: addBono, removeBono
  - Layout: Grid 5 columnas (3 inputs, 2 resultados)
  - Responsive: lg:grid-cols-5 gap-6

**Commit:** `bc40217 feat: add layout, styles, main page and configuration files`

#### ✅ Phase 6: Configuration & Testing (Tasks 27-30)
- [x] tailwind.config.ts
  - content paths para app/ y components/
  - darkMode: "class"
- [x] postcss.config.mjs
  - autoprefixer solamente (Tailwind v4 con @import)
- [x] next.config.mjs
  - Configuración básica
- [x] tsconfig.json
  - Actualizado: "@/*": ["./*"] (no ./src/*)
- [x] Development server iniciado y compilando
  - ✅ http://localhost:3000 FUNCIONANDO
  - ✅ Todos los componentes renderizando correctamente
  - ✅ Cálculos en tiempo real
  - ✅ Dark mode funcionando

**Commit:** `f8763dd fix: update tsconfig path alias and postcss config for Tailwind v4`

### Pruebas Completadas - Fase 1
- ✅ Servidor dev corriendo sin errores
- ✅ Página carga correctamente (title visible: "Calculadora de Sueldos | Remuneraciones y Costos Patronales")
- ✅ Componentes renderizando (Header, ModoCalculo, DatosPrincipales, Bonos, Resultados)
- ✅ CSS cargando correctamente (Tailwind v4)
- ✅ Dark mode toggle funcional (localStorage)
- ✅ Selector de país funcional
- ✅ Cálculos en tiempo real (useMemo)
- ✅ Responsive design

### Archivos Creados - Fase 1

**lib/** (5 archivos)
- lib/types.ts (52 líneas)
- lib/config.ts (66 líneas)
- lib/calculations.ts (234 líneas)
- lib/utils.ts (21 líneas)
- lib/hooks.ts (72 líneas)

**components/ui/** (10 archivos)
- components/ui/button.tsx (54 líneas)
- components/ui/input.tsx (23 líneas)
- components/ui/card.tsx (77 líneas)
- components/ui/badge.tsx (35 líneas)
- components/ui/label.tsx (17 líneas)
- components/ui/checkbox.tsx (27 líneas)
- components/ui/radio-group.tsx (58 líneas)
- components/ui/select.tsx (71 líneas)
- components/ui/separator.tsx (17 líneas)
- components/ui/toggle-group.tsx (57 líneas)

**components/calculator/** (6 archivos)
- components/calculator/Header.tsx (82 líneas)
- components/calculator/ModoCalculo.tsx (48 líneas)
- components/calculator/DatosPrincipales.tsx (171 líneas)
- components/calculator/Bonos.tsx (130 líneas)
- components/calculator/Resultados.tsx (235 líneas)
- components/calculator/index.ts (5 líneas)

**app/** (3 archivos actualizados)
- app/layout.tsx (38 líneas)
- app/page.tsx (99 líneas)
- app/globals.css (70 líneas)

**Configuración** (3 archivos)
- tailwind.config.ts (14 líneas)
- postcss.config.mjs (5 líneas)
- next.config.mjs (3 líneas)
- tsconfig.json (actualizado)
- package.json (actualizado)

**Total:** ~1,900 líneas de código nuevo

---

## 🔄 FASE 2: Database Integration & Multi-Country Support

**Status:** PRÓXIMA A INICIAR

### Objetivos Fase 2
1. Integrar Supabase para parámetros dinámicos (fallback a hardcoded)
2. Agregar parámetros completos para Perú y Brasil
3. Deploy a Vercel
4. Optimizaciones para producción

### Tareas Fase 2

#### Task 1: Supabase Setup
- [ ] Crear tabla `country_parameters` en Supabase con campos:
  - country (chile, peru, brasil)
  - uf_value
  - tasa_salud_fonasa
  - tasa_cesantia
  - limite_uf_imponible
  - gratificacion_max_uf
  - limite_impuesto
  - tasa_impuesto
  - cesantia_empleador
  - mutual
  - sis
  - expectativa_vida
  - updated_at
- [ ] Crear tabla `afp_rates` con campos:
  - country
  - name (Capital, Cuprum, Habitat, etc.)
  - tasa
  - updated_at
- [ ] Configurar Row Level Security (RLS) - public read
- [ ] Crear `.env.local` con SUPABASE_URL y SUPABASE_ANON_KEY

#### Task 2: Implementar Fetch de Parámetros
- [ ] Crear `lib/supabase.ts` con cliente Supabase
- [ ] Crear `lib/config-dynamic.ts`:
  - `fetchCountryConfig(pais)` con fallback a hardcoded
  - `fetchAFPData()` con fallback
  - Caching local (localStorage o memory)
  - Reintentos exponenciales
- [ ] Modificar `app/page.tsx` para cargar parámetros dinámicos al montar

#### Task 3: Parámetros para Perú y Brasil
- [ ] Investigar y documentar:
  - Tasas de impuestos Perú
  - Sistema de salud Perú
  - UIT (Unidad Impositiva Tributaria)
  - AFP Perú tasas
- [ ] Lo mismo para Brasil
- [ ] Actualizar `lib/config.ts` con valores reales (no placeholders)
- [ ] Poblar tablas Supabase con datos

#### Task 4: Deploy a Vercel
- [ ] Conectar repo a Vercel
- [ ] Configurar variables de entorno en Vercel
- [ ] Verificar build exitoso
- [ ] Test en URL de Vercel

#### Task 5: Optimizaciones Producción
- [ ] Revisar bundle size (Vercel Analytics)
- [ ] Implementar lazy loading de componentes si es necesario
- [ ] Performance testing
- [ ] Verificar dark mode persiste en reload

### Archivos a Crear/Modificar - Fase 2
**Crear:**
- lib/supabase.ts (nueva)
- lib/config-dynamic.ts (nueva)
- .env.local (actualizar)

**Modificar:**
- lib/config.ts (agregar datos Perú/Brasil)
- app/page.tsx (cargar parámetros dinámicos)
- app/layout.tsx (si aplica)

### Timeline Estimado Fase 2
- Setup Supabase: 30 min
- Fetch dinámico: 1 hora
- Parámetros Perú/Brasil: 1-2 horas (depende data disponible)
- Deploy Vercel: 30 min
- Optimizaciones: 1 hora
- **Total: 4-5 horas**

---

## Progreso General

```
FASE 1: ████████████████████ 100% ✅ COMPLETADA
FASE 2: ▌░░░░░░░░░░░░░░░░░░░░░░ 0% 🔄 PRÓXIMA

Total Commits: 8
Total Líneas de Código: ~1,900
Errores: 0 (todos resueltos)
```

---

## Siguientes Acciones

1. ✅ Verificar que todo está en git
2. ⏭️ Iniciar Fase 2 (Supabase + Parámetros Dinámicos)
3. ⏭️ Deploy a Vercel
4. ⏭️ QA final y optimizaciones

**Última actualización:** 2026-04-14 - Fase 1 completada exitosamente
