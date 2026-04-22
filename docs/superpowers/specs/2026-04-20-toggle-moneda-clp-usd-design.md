# Toggle de Moneda CLP ↔ USD en Panel de Resultados

**Fecha:** 2026-04-20  
**Estado:** Aprobado

## Objetivo

Permitir al usuario ver todos los valores del panel de resultados en CLP (pesos chilenos) o USD (dólares), usando el valor del dólar observado almacenado en Supabase (`country_config.dolar_value`).

## Alcance

- Solo el panel `Resultados` — ningún otro componente muestra el toggle
- Todos los valores monetarios se convierten (haberes, descuentos, costos patronales)
- El `dolarValue` ya llega desde Supabase vía `configService` → `CountryConfig.dolarValue`

## Arquitectura

### Estado

`moneda: 'CLP' | 'USD'` vive en `CalculadoraClient` (no en `Resultados`), lo que permite acceso futuro desde otros componentes sin refactor.

```
CalculadoraClient
  ├── useState<Moneda>('CLP')
  └── <Resultados moneda={moneda} onMonedaChange={setMoneda} dolarValue={config.dolarValue} />
```

### Conversión

- CLP → `formatCLP(value)`
- USD → `formatUSD(value / dolarValue)`

La función `format` se construye dentro de `Resultados` según la moneda activa y se pasa a cada `ResultRow`.

## UI

El header del card `Resultados` (franja de color azul/verde existente) incorpora:

1. **Tipo de cambio** — texto pequeño `1 USD = $X.XXX` en blanco semitransparente, alineado a la izquierda bajo el título
2. **Toggle CLP | USD** — `ToggleGroup` con estilo `bg-white/20` para integrarse al gradiente, alineado a la derecha

Layout del header:
```
| CÁLCULO: BASE → LÍQUIDO          [CLP] [USD] |
| 1 USD = $972,50                              |
```

## Cambios por archivo

| Archivo | Cambio |
|---|---|
| `lib/types.ts` | Agregar `export type Moneda = 'CLP' \| 'USD'` |
| `lib/utils.ts` | Agregar `formatUSD(value: number): string` con `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })` |
| `app/calculadora-client.tsx` | `useState<Moneda>('CLP')`, pasar `moneda`, `onMonedaChange`, `dolarValue` a `Resultados` |
| `components/calculator/Resultados.tsx` | Header con toggle + tipo de cambio; `ResultRow` recibe función `format(v: number): string` en lugar de llamar `formatCLP` directamente |

## Archivos sin cambios

- `lib/services/configService.ts` — `dolarValue` ya se fetcha
- `lib/calculations.ts` — los cálculos siempre son en CLP; la conversión es solo display
- `lib/config.ts` — sin cambios
- Todos los demás componentes (`Header`, `ModoCalculo`, `DatosPrincipales`, `Bonos`)

## Criterios de éxito

- El toggle aparece en el header del card de resultados
- Al cambiar a USD, todos los valores se dividen por `dolarValue` y se formatean con `$` y 2 decimales
- El tipo de cambio (`1 USD = $X.XXX`) es visible en el header
- Al cambiar de país o recalcular, la moneda seleccionada se mantiene
- El estado inicial es siempre CLP
