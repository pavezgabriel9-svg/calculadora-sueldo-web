# Spec: Bonos Anuales Fijos + Resultados Anualizados + Panel Colapsable

**Fecha:** 2026-04-21  
**Estado:** Aprobado

---

## Contexto

La calculadora de sueldo chilena actualmente muestra resultados mensuales detallados en un panel lateral con secciones fijas (Haberes, Descuentos Trabajador, Costos Patronales). Se requiere:

1. Agregar tres bonos anuales fijos imponibles (no configurables por el usuario)
2. Mostrar el costo empresa anualizado considerando esos bonos
3. Rediseñar el panel de resultados con acordeones por sección para reducir la información visible por defecto

---

## 1. Bonos Anuales Fijos

### Definición

Tres bonos imponibles de pago anual. Sus valores en UF viven en Supabase (tabla `country_config`) junto con el resto de la configuración dinámica, con fallback a los valores por defecto en `lib/config.ts`. No aparecen en los parámetros de entrada del usuario.

| Bono | Valor por defecto |
|---|---|
| Bono Navidad | 7 UF |
| Bono Fiestas Patrias | 6 UF |
| Bono Escolaridad | 3 UF |

Los montos UF son la **base imponible bruta** — no son montos netos ni líquidos.

### Cálculo por bono (`calcularBonoAnual`)

Nueva función en `lib/calculations.ts`:

```
montoImponible = ufAmount × ufValue
descuentoTrabajador = montoImponible × (tasaAFP + TASA_SALUD_FONASA + TASA_CESANTIA)
costoPatronal = montoImponible × (CESANTIA_EMPLEADOR + MUTUAL + SIS + EXPECTATIVA_VIDA)
costoEmpresa = montoImponible + costoPatronal
```

Nota: Se usa siempre FONASA 7% para el cálculo de los bonos anuales (tasa base), independiente de si el trabajador tiene ISAPRE. Los bonos anuales no están sujetos a impuesto único (monto individual por bono es bajo).

### Costo empresa anual

```
costoTotalEmpresaAnual = costoTotalEmpresa × 12
                        + bonoNavidad.costoEmpresa
                        + bonoFiestasPatrias.costoEmpresa
                        + bonoEscolaridad.costoEmpresa
```

---

## 2. Tipos de Datos

### Nuevo tipo `BonoAnual` en `lib/types.ts`

```typescript
interface BonoAnual {
  montoImponible: number       // UF × valorUF
  descuentoTrabajador: number  // cotizaciones trabajador sobre el bono
  costoEmpresa: number         // montoImponible + cotizaciones patronales
}
```

### Extensión de `ResultadosCalculo`

Agregar al final de la interfaz:

```typescript
bonoNavidad: BonoAnual
bonoFiestasPatrias: BonoAnual
bonoEscolaridad: BonoAnual
costoTotalEmpresaAnual: number
```

### Extensión de `CountryConfig` en `lib/types.ts`

Agregar campo para que los valores UF de los bonos fluyan desde Supabase:

```typescript
bonosAnualesUF: {
  navidad: number        // default 7
  fiestaPatrias: number  // default 6
  escolaridad: number    // default 3
}
```

---

## 3. Rediseño del Panel de Resultados

### Vista colapsada (default)

Muestra solo 6 líneas informativas:

```
Sueldo Base / Líquido ingresado     $1.500.000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUELDO LÍQUIDO                      $1.189.450   ← destacado (grande, color)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Haberes                       $1.680.000   [▼ ver detalle]
Descuentos Trabajador                 $310.550   [▼ ver detalle]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Costo Empresa Mensual               $1.780.000   [▼ ver detalle]
Costo Empresa Anual                $22.380.000   [▼ ver detalle]
```

### Acordeones expandibles (independientes)

Cada sección tiene su propio toggle. Se pueden abrir/cerrar de forma independiente.

**Total Haberes [▼]:**
- Sueldo Base
- Gratificación
- Bonos Imponibles (dinámicos del usuario, si existen)
- Movilización
- Bonos No Imponibles (dinámicos del usuario, si existen)

**Descuentos Trabajador [▼]:**
- Cotización Previsional (AFP)
- Cotización Salud
- Seguro Cesantía
- Impuesto Único (solo si aplica)

**Costo Empresa Mensual [▼]:**
- Cesantía Empleador
- Mutual
- SIS
- Cotización Expectativa Vida
- Aporte AFP Empleador
- Seguro Complementario Salud

**Costo Empresa Anual [▼]:**
- Costo mensual × 12
- Bono Navidad (7 UF) → `$266.000` | Costo empresa: `$285.000`
- Bono Fiestas Patrias (6 UF) → `$228.000` | Costo empresa: `$244.000`
- Bono Escolaridad (3 UF) → `$114.000` | Costo empresa: `$122.000`

---

## 4. Archivos Afectados

| Archivo | Tipo de cambio |
|---|---|
| `lib/types.ts` | Agregar `BonoAnual`, extender `ResultadosCalculo` y `CountryConfig` |
| `lib/config.ts` | Agregar fallback `BONOS_ANUALES_UF_DEFAULT = { navidad: 7, fiestaPatrias: 6, escolaridad: 3 }` |
| `lib/services/configService.ts` | Leer `bonosAnualesUF` desde Supabase y mapear a `CountryConfig`, con fallback a los valores por defecto |
| `lib/calculations.ts` | Agregar `calcularBonoAnual()`, leer UF desde `config.bonosAnualesUF`, integrar al resultado |
| `components/calculator/Resultados.tsx` | Rediseño completo con acordeones por sección |

### Archivos sin cambios

- `lib/hooks.ts` — `useCalculator` no requiere cambios (retorna el resultado completo)
- `app/calculadora-client.tsx` — Sin cambios
- `components/calculator/DatosPrincipales.tsx` — Sin cambios
- `components/calculator/Bonos.tsx` — Sin cambios

---

## 5. Notas de Implementación

- Los valores UF de los bonos anuales viven en Supabase (`country_config`) y se propagan via `CountryConfig.bonosAnualesUF`; si Supabase no los retorna, se usa el fallback de `lib/config.ts`
- El valor UF (precio en CLP) se toma del mismo `config.ufValue` que ya usa el cálculo mensual
- Los bonos anuales no modifican el cálculo mensual — son adicionales, solo visibles en la sección anual
- El acordeón se implementa con estado local en `Resultados.tsx` (no necesita subir al estado global)
- Mantener compatibilidad con dark mode y los colores existentes del sistema de diseño
- Respetar el patrón `ResultRow` existente para las filas de detalle dentro de los acordeones
