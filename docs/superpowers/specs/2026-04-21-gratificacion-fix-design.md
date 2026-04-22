# Fix: Cálculo de Gratificación y Normalización de Tasas

**Fecha:** 2026-04-21  
**Autor:** GabrielPavezSilva

---

## Contexto

Se detectaron tres bugs al comparar el código contra los datos reales en Supabase (`country_config`):

1. **Gratificación calcula el tope con UF en vez de IMM** — error crítico de lógica legal.
2. **Campo `TOPE_AFP_SALUD_UF` en Supabase no coincide con `LIMITE_UF_IMPONIBLE` en el código** — el valor en Supabase (89.9) está actualizado pero el código nunca lo recibe.
3. **Fallbacks en `config.ts` desactualizados** — `SIS`, `EXPECTATIVA_VIDA` y `LIMITE_UF_IMPONIBLE` difieren de los valores reales en Supabase.

---

## Bug #1 — Gratificación (crítico)

### Problema

El Art. 50 del Código del Trabajo establece que la gratificación mensual equivale al 25% del sueldo base, con tope de **4.75 Ingresos Mínimos Mensuales (IMM)** anuales, es decir `(4.75 × IMM) / 12` por mes.

El código usa `(tasas.GRATIFICACION_MAX_UF × ufValue) / 12`, multiplicando 4.75 por la UF (~$40.000), obteniendo un tope de ~$15.833/mes en vez de ~$213.354/mes.

| Sueldo base | Tope correcto (IMM) | Tope actual (UF, erróneo) |
|---|---|---|
| $700.000 | $175.000 (25%) | $15.833 |
| $1.500.000 | $213.354 (tope) | $15.833 |

### Fix

- Renombrar `GRATIFICACION_MAX_UF` → `GRATIFICACION_MAX_IMM` en Supabase y en el tipo.
- Agregar `SUELDO_MINIMO` al tipo `CountryConfig['tasas']` (ya existe en Supabase).
- Cambiar la fórmula: `(tasas.GRATIFICACION_MAX_IMM × tasas.SUELDO_MINIMO) / 12`.

---

## Bug #2 — Nombre inconsistente: TOPE_AFP_SALUD_UF vs LIMITE_UF_IMPONIBLE

### Problema

Supabase almacena `TOPE_AFP_SALUD_UF: 89.9` pero el código espera `LIMITE_UF_IMPONIBLE`. Al recibir el JSONB de Supabase, el campo queda `undefined` y el cálculo del imponible falla silenciosamente.

### Fix (Opción A — Supabase como dato, código como contrato)

Actualizar el JSONB en Supabase: renombrar `TOPE_AFP_SALUD_UF` → `LIMITE_UF_IMPONIBLE`. El código y los tipos TypeScript son el contrato; Supabase almacena datos.

---

## Bug #3 — Fallbacks desactualizados en `config.ts`

| Campo | Valor actual (fallback) | Valor correcto (Supabase) |
|---|---|---|
| `SIS` | 0.0141 | 0.0154 |
| `EXPECTATIVA_VIDA` | 0.002 | 0.009 |
| `LIMITE_UF_IMPONIBLE` | 81.6 | 89.9 |
| `SUELDO_MINIMO` | no existe | 539.000 |

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| Supabase `country_config.tasas` | SQL UPDATE: renombrar 2 campos en JSONB |
| `lib/types.ts` | Renombrar campo, agregar `SUELDO_MINIMO` |
| `lib/config.ts` | Renombrar campo, actualizar 3 valores, agregar `SUELDO_MINIMO` |
| `lib/calculations.ts` | Cambiar fórmula gratificación (3 ocurrencias) |

`lib/services/configService.ts` — sin cambios (castea `row.tasas` al tipo directamente).

---

## Fuera de alcance

- Cálculo de impuesto único / `tax_brackets` — ya funciona correctamente.
- Países Perú y Brasil — placeholders, sin datos reales.
