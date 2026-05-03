# Guía de Integración: Perú → main

> Fecha de análisis: mayo 2026  
> Rama origen: `feat/peru-calculadora-completa`  
> Rama destino: `main`

---

## 1. Estado actual de cada rama

### `main` (producción en Vercel)

La calculadora funciona correctamente para **Chile**. Perú existe como opción en el selector de país pero es un **stub vacío**: el parámetro `pais` entra a `calcularRemuneracion` como `_pais` (prefijo de variable no usada) y nunca afecta ningún cálculo ni la UI.

Características de main que son relevantes para la integración:

- **`taxBrackets: TramosImpuesto[]`** vive directamente en `CountryConfig`, no dentro de `tasas`. La interfaz es `{ desde, hasta, tasa, rebaja }`.
- **`bonoEmpresaAnual`**: feature completa de bono empresa con tipos y tasas configurables (agregada en PR #5/#6, post-bifurcación de la rama Perú).
- **Dos topes diferenciados**: `TOPE_AFP_SALUD_UF` y `TOPE_CESANTIA_UF` en `tasas` — permiten topes distintos por concepto.
- **`AFP_EMPLEADOR`** y **`SEGURO_COMPLEMENTARIO_UF`** en `tasas` — costos patronales que la rama Perú no conoce.
- **`simular()`**: función interna auxiliar usada para el cálculo iterativo `liquido_a_base` (convergencia en ~50 iteraciones). La lógica inversa es robusta.
- **`dolarValue`** (no `dolarRate`) en `CountryConfig`.
- El toggle USD **ya existe en main** integrado en `Resultados` y `calculadora-client`.

### `feat/peru-calculadora-completa` (rama Peru, no mergeada)

Dos commits sobre una versión anterior de main (antes de los PRs de bono empresa):

| Commit | Qué hace |
|---|---|
| `a23a235` | Configuración parametrizada de Perú: tasas, AFP_PERU_DATA, TRAMOS_IMPUESTO_PERU, DOLAR_RATE_FALLBACK |
| `2e0ae08` | Calculadora completa: lógica de cálculo Peru, UI condicional, fetch dinámico de config, toggle USD |

Lo más valioso de esta rama:
- Lógica previsional Perú: AFP 10% obligatorio + comisión por AFP (Habitat/Integra/Prima/Profuturo)
- EsSalud 9% patronal calculado sobre `max(sueldo, RMV)`
- Impuesto a la Renta 5ta categoría: tramos progresivos sobre UIT, con deducción fija (7 UIT) + adicional (3 UIT)
- Gratificaciones anuales: 2 sueldos al año (julio + diciembre), reflejadas como costo patronal anual
- Fetch dinámico de config al cambiar país (`/api/config/[pais]`)
- UI condicional: EsSalud info-box en vez de radios Fonasa/Isapre, labels adaptadas

---

## 2. Divergencia entre ramas — qué choca

La rama Perú se bifurcó **antes** de que se agregara la feature de bono empresa a main. Las siguientes diferencias necesitan reconciliación manual:

### 2.1 Interfaz `TramosImpuesto` — naming incompatible

| Concepto | `main` | `feat/peru` |
|---|---|---|
| Tipo | `TramosImpuesto` | `TramoImpuesto` |
| Campo inicio | `desde: number` | `desde_uf?: number` |
| Campo fin | `hasta: number` | `hasta_uf?: number \| null` |
| Campo tasa | `tasa: number` | `tasa: number` |
| Campo rebaja | `rebaja: number` | ❌ no existe |

En main, los tramos chilenos usan rebaja (método de tasa marginal con rebaja). En Perú, los tramos son puramente marginales (sin rebaja). Hay que unificar el tipo o hacer el campo `rebaja` opcional.

### 2.2 `taxBrackets` vs `TRAMOS_IMPUESTO` — ubicación en el objeto config

| | `main` | `feat/peru` |
|---|---|---|
| Dónde vive | `config.taxBrackets` (nivel raíz) | `config.tasas.TRAMOS_IMPUESTO` (dentro de tasas) |

La rama Perú mete los tramos dentro de `tasas`, lo que hace el objeto `tasas` dependiente del país. Main los sacó al nivel raíz de `CountryConfig`. La integración debe unificar esto en `taxBrackets` al nivel raíz.

### 2.3 `bonoEmpresaAnual` — feature que la rama Perú no conoce

Main tiene todo el sistema de bono empresa. El bloque `if (isPeru)` de la rama Perú retorna el objeto `ResultadosCalculo` sin `bonoEmpresaAnual`, lo que causaría error de TypeScript. Hay que decidir si Perú soporta bono empresa o devuelve un objeto vacío.

### 2.4 Cálculo `liquido_a_base` no implementado para Perú

El bloque `if (isPeru)` de la rama Perú ignora el parámetro `modo`. Si el usuario selecciona Perú + "Líquido → Base", el cálculo no converge — siempre ejecuta `base_a_liquido`. Hay que agregar la iteración convergente equivalente a la de Chile.

### 2.5 `dolarValue` vs `dolarRate` — nombre inconsistente

Main usa `config.dolarValue`. La rama Perú usa `config.dolarRate`. Son lo mismo.

### 2.6 Tasas extra en `CountryConfig.tasas` que Perú no usa

Main requiere: `TOPE_AFP_SALUD_UF`, `TOPE_CESANTIA_UF`, `AFP_EMPLEADOR`, `SEGURO_COMPLEMENTARIO_UF`. Estos campos existen en `TASAS_CHILE` pero no en `TASAS_PERU`. Si el tipo los marca como requeridos, la config de Perú no compila. Hay que hacerlos opcionales o darles valor 0 en Perú.

### 2.7 `bonosAnualesUF` — opcional en Perú, requerido en main

Main asume `config.bonosAnualesUF` siempre presente (para calcular bonoNavidad, bonoFiestasPatrias, etc.). La rama Perú lo marca opcional y lo omite. El cálculo anual de Chile explotaría si por alguna razón carga config de Perú y accede sin `?.`.

---

## 3. Lo que hay que hacer — plan de integración

### Fase 0: Preparación (sin tocar lógica de negocio)

**0.1** Crear rama de trabajo desde `main`:
```bash
git checkout -b feat/integracion-peru main
```

**0.2** Identificar y documentar en código todos los lugares donde `_pais` es ignorado (buscar con `grep -rn "_pais\|TODO.*fase"`) — son los puntos de extensión.

---

### Fase 1: Unificar tipos

Archivo: `lib/types.ts`

**1.1 Unificar `TramosImpuesto`** — hacer `rebaja` opcional:
```typescript
export interface TramosImpuesto {
  desde: number
  hasta: number
  tasa: number
  rebaja?: number  // Chile lo usa, Perú no
}
```

**1.2 Actualizar `CountryConfig`** — campos opcionales de Perú/Chile:
```typescript
export interface CountryConfig {
  afpData: Record<string, number>
  ufValue: number
  dolarValue: number
  taxBrackets: TramosImpuesto[]       // Chile: tramos impuesto único; Perú: tramos 5ta categoría
  bonosAnualesUF?: { ... }            // Solo Chile
  bonosEmpresa: BonoEmpresaTipo[]     // Ambos (Peru puede tener array vacío)
  tasas: {
    // Compartidos
    SUELDO_MINIMO: number
    TASA_SALUD_FONASA: number
    TASA_CESANTIA: number
    CESANTIA_EMPLEADOR: number
    MUTUAL: number
    SIS: number
    EXPECTATIVA_VIDA: number
    GRATIFICACION_MAX_IMM: number

    // Chile only
    TOPE_AFP_SALUD_UF?: number
    TOPE_CESANTIA_UF?: number
    AFP_EMPLEADOR?: number
    SEGURO_COMPLEMENTARIO_UF?: number

    // Perú only
    RMV?: number
    SUELDOS_ANUALES?: number
    TASA_SALUD_PATRONAL?: number
    SALUD_BASE_MINIMA?: boolean
    TASA_AFP_OBLIGATORIA?: number
    TASA_SEGUROS_INVALIDEZ?: number
    TASA_COMISION_AFP?: number
    UIT?: number
    DEDUCCION_FIJA_UIT?: number
    DEDUCCION_ADICIONAL_UIT?: number
  }
}
```

**1.3 Agregar `SistemaSalud` para Perú**:
```typescript
export type SistemaSalud = "fonasa" | "isapre" | "essalud"
```

**1.4 Agregar campos a `ResultadosCalculo`**:
```typescript
// Provisión anual Perú (mutuamente excluyente con bonoNavidad/etc para Chile)
provisionGratificaciones: number
```

---

### Fase 2: Actualizar configuración de tasas

Archivo: `lib/config.ts`

**2.1 Completar `TASAS_PERU`** con los campos opcionales en 0 donde no aplican y los campos propios de Perú con sus valores reales.

**2.2 Agregar `AFP_PERU_DATA`**:
```typescript
export const AFP_PERU_DATA: Record<string, number> = {
  Habitat: 0.0147,
  Integra: 0.0155,
  Prima:   0.0160,
  Profuturo: 0.0169,
}
```

**2.3 Mover `TRAMOS_IMPUESTO_PERU`** al nivel raíz como `taxBrackets` en el objeto de config de Perú, con el formato unificado:
```typescript
// Tramos 5ta categoría Perú — en UIT, sin rebaja
export const TAX_BRACKETS_PERU: TramosImpuesto[] = [
  { desde: 0,          hasta: 5 * 5500,  tasa: 0.08 },
  { desde: 5 * 5500,   hasta: 20 * 5500, tasa: 0.14 },
  { desde: 20 * 5500,  hasta: 35 * 5500, tasa: 0.17 },
  { desde: 35 * 5500,  hasta: 45 * 5500, tasa: 0.20 },
  { desde: 45 * 5500,  hasta: Infinity,  tasa: 0.30 },
]
```

> ⚠️ Los valores `desde`/`hasta` de Perú deben estar en soles (valor absoluto), no en UIT — la conversión a UIT debe ocurrir dentro de la función de cálculo, igual que Chile convierte a UF internamente.

---

### Fase 3: Lógica de cálculo

Archivo: `lib/calculations.ts`

Esta es la fase más delicada. La estrategia recomendada es **no romper la función `simular()`** que usa Chile, sino crear una función paralela para Perú.

**3.1 Crear `simularPeru()`** siguiendo el mismo patrón que `simular()` para Chile:
```typescript
function simularPeru(
  sueldoBase: number,
  afpNombre: string,
  movilizacion: number,
  bonosImponibles: number,
  bonosNoImponibles: number,
  bonoEmpresaMonto: number,
  config: CountryConfig
): DetallesSimPeru { ... }
```

**3.2 Implementar `liquido_a_base` para Perú** usando iteración convergente, igual que Chile:
```typescript
// Mismo algoritmo de convergencia, distinta función simular
sueldoBase = Math.round(liquidoObjetivo * 1.30)
for (let i = 0; i < 50; i++) {
  const diferencia = liquidoObjetivo - simularPeru(sueldoBase, ...).liquido
  if (Math.abs(diferencia) < 1) break
  sueldoBase = Math.round(sueldoBase + diferencia * 0.8)
}
```

**3.3 En `calcularRemuneracion()`**, separar el flujo al inicio:
```typescript
if (pais === "peru") {
  return calcularRemuneracionPeru(modo, montoIngresado, ...)
}
// ... lógica Chile existente sin tocar
```

Esto evita que el `if/else` crezca dentro de una función ya larga y mantiene cada país aislado.

**3.4 Impuesto 5ta categoría**: la función `calcularImpuestoRentaPeruAnual` de la rama Perú está bien, pero debe usar `taxBrackets` (del nivel raíz del config) en vez de `config.tasas.TRAMOS_IMPUESTO`.

---

### Fase 4: Servicio de configuración

Archivo: `lib/services/configService.ts`

**4.1 Actualizar `getFallback()`** para usar `AFP_PERU_DATA` y `TAX_BRACKETS_PERU` correctamente.

**4.2 Actualizar la query a Supabase** para traer `dolar_value` (ya existe en main, confirmar que la columna exista en la tabla `country_config`).

**4.3 Ejecutar la migration SQL** `docs/migrations/01_add_peru_config.sql` en Supabase antes de desplegar — insertar la fila de `peru` en `country_config`.

> ⚠️ La migration debe adaptarse al schema actual de la tabla, que puede haber cambiado desde que se escribió la rama Perú.

---

### Fase 5: API y cliente

**5.1 El endpoint `/api/config/[pais]/route.ts`** de la rama Perú funciona tal cual — integrar directamente.

**5.2 El `useEffect` en `calculadora-client.tsx`** para re-fetch al cambiar país ya existe en main de forma parcial (hay un TODO). Tomar la implementación de la rama Perú y adaptarla al nombre `dolarValue`.

**5.3 Estado inicial de AFP y sistemaSalud al cambiar a Perú**:
```typescript
setAfp(Object.keys(newConfig.afpData)[0] ?? "")
setSistemaSalud("essalud")  // Perú no tiene elección
```

---

### Fase 6: UI

**6.1 `DatosPrincipales.tsx`**
- Pasar `pais` como prop (ya existe en main con otro uso)
- Condición `isPeru`: mostrar info-box EsSalud en vez de radios Fonasa/Isapre
- Mostrar `+ 10% obligatorio` junto al badge de comisión AFP cuando es Perú
- Agregar spinner de carga (ya existe en la rama Perú, copiar)

**6.2 `Resultados.tsx`**
- Labels condicionales: "REMUNERACIÓN NETA" / "Sueldo Líquido", "Impuesto Renta (5ta Cat.)" / "Impuesto Único"
- Ocultar `Gratificación`, `Seguro Cesantía`, `Mutual`, `SIS`, `SCS`, `Expectativa de Vida` para Perú (devuelven 0, mostrarlos es ruido)
- Mostrar "Gratificaciones anuales (×2 sueldos)" en sección patronal para Perú
- EsSalud (9%) como único costo patronal mensual para Perú
- El toggle USD ya existe en main — verificar que `dolarValue` se pase correctamente

**6.3 `ModoCalculo.tsx` (si existe)**
- Verificar que ambos modos (base→líquido y líquido→base) sean accesibles para Perú — no bloquear ninguno.

---

## 4. Riesgos y consideraciones

### Riesgo alto
| Problema | Impacto | Mitigación |
|---|---|---|
| `liquido_a_base` sin implementar para Perú | Cálculo silenciosamente incorrecto | Implementar antes de cualquier deploy |
| Migration SQL desactualizada | Fila Peru inexistente o schema incorrecto en Supabase | Revisar schema actual antes de ejecutar |
| Config fetch falla silenciosamente | UI Perú con datos de Chile | Agregar estado de error explícito en el `useEffect` |

### Riesgo medio
| Problema | Impacto | Mitigación |
|---|---|---|
| `bonosAnualesUF` opcional | Crash en cálculo anual Chile si llega config Peru | Usar `?.` en todos los accesos + valor por defecto |
| Campos requeridos en `tasas` | Error TypeScript en config Peru | Hacer opcionales con `?` o poner 0 explícito |
| Tramos Perú en UIT vs CLP | Resultado incorrecto | Definir claramente la unidad — preferir CLP absoluto en `taxBrackets` |

### Riesgo bajo
| Problema | Impacto | Mitigación |
|---|---|---|
| `dolarValue` vs `dolarRate` | Error de runtime al acceder la propiedad | Renombrar en rama Peru antes de integrar |
| AFP inicial en Perú vacío | UI muestra AFP vacío al cargar | Setear primer AFP de la lista en el `useEffect` |

---

## 5. Orden de trabajo sugerido

```
1. [ ] Crear rama feat/integracion-peru desde main
2. [ ] Fase 1: Unificar tipos (sin tocar lógica)
3. [ ] Fase 2: Completar config de Perú en lib/config.ts
4. [ ] Fase 3a: Implementar simularPeru() + calcularRemuneracionPeru()
5. [ ] Fase 3b: Implementar liquido_a_base para Perú (iteración convergente)
6. [ ] Fase 4: Actualizar configService + revisar migration SQL
7. [ ] Fase 5: Agregar /api/config/[pais] + useEffect en cliente
8. [ ] Fase 6: UI condicional por país
9. [ ] Pruebas manuales: Chile no rompió nada
10. [ ] Pruebas manuales: Perú base→líquido
11. [ ] Pruebas manuales: Perú líquido→base
12. [ ] Ejecutar migration en Supabase (staging primero, luego producción)
13. [ ] Deploy a Vercel
```

---

## 6. Casos de prueba mínimos antes de merge

### Chile (no regresión)
- [ ] Base 1.000.000 → Líquido con Fonasa, AFP Uno
- [ ] Líquido 800.000 → Base con Fonasa, AFP Habitat
- [ ] Base 1.000.000 → Líquido con Isapre 3.5 UF, AFP Modelo
- [ ] Con bono empresa activo
- [ ] Toggle USD funciona

### Perú
- [ ] Base S/ 3.000 → Neto con EsSalud, AFP Integra
- [ ] Neto S/ 2.500 → Base con EsSalud, AFP Prima
- [ ] Base S/ 12.000 (alto, entra en tramos de impuesto) — verificar impuesto 5ta categoría
- [ ] Base S/ 1.130 (RMV) — verificar EsSalud sobre base mínima
- [ ] Toggle USD funciona con tipo de cambio correcto

---

## 7. Referencias

- Rama Perú: `remotes/origin/feat/peru-calculadora-completa`
- Migration SQL: `docs/migrations/01_add_peru_config.sql`
- SUNAT — Impuesto a la Renta 5ta categoría: tramos en UIT, deducción 20% rentas de cuarta + 7 UIT fija
- EsSalud: Ley 26790, tasa 9% sobre remuneración, base mínima = RMV vigente (S/ 1.130 al 2026)
- RMV Perú 2026: S/ 1.130 (Decreto Supremo N° 003-2022-TR)
