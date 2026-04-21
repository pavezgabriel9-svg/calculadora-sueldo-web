# Guía: Conexiones con Supabase - Calculadora de Sueldo

## Arquitectura General

El proyecto utiliza Supabase para almacenar configuración variable de cálculos de remuneración por país. La arquitectura sigue un patrón **fallback-first** donde:

1. **Supabase es la fuente de verdad** para datos que cambian frecuentemente (UF, dólar, tasas de AFP)
2. **Fallback local** (`lib/config.ts`) se usa cuando:
   - Supabase no está inicializado
   - Hay error de conexión
   - Los datos están "stale" (desactualizados)
   - No hay fila en la base de datos

---

## Flujo de Carga de Configuración

### 1. **Inicialización de Supabase** (`lib/supabase.ts`)

```typescript
// Crea cliente de Supabase con credenciales de variables de entorno
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null  // Si falta una variable, supabase será null
```

**Variables requeridas:**
- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio (no la anon key)

**Nota:** Se usa clave de servicio porque las lecturas desde el servidor requieren permisos elevados.

---

### 2. **Consulta de Configuración** (`lib/services/configService.ts`)

```typescript
async function fetchCountryConfig(pais: Pais): Promise<CountryConfig>
```

**Flujo:**
```
┌─────────────────────────────────────┐
│ fetchCountryConfig(pais)            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│ ¿Supabase inicializado?             │
└─────────────────────────────────────┘
   NO ↓                              SÍ ↓
   [Usar fallback completo]    SELECT de country_config
                                    ↓
                            ┌─────────────────────────────────────┐
                            │ ¿Error o sin datos?                 │
                            └─────────────────────────────────────┘
                               SÍ ↓                  NO ↓
                        [Usar fallback]     Verificar staleness
                                            de cada campo
                                                   ↓
                            ┌─────────────────────────────────────┐
                            │ ¿Datos stale?                       │
                            │ (comparar fecha con threshold)       │
                            └─────────────────────────────────────┘
                               SÍ ↓                  NO ↓
                        [Usar fallback]    [Usar dato de BD]
```

**Thresholds de "staleness":**
- UF: 1 día (actualiza n8n diariamente)
- Dólar: 1 día (actualiza n8n diariamente)
- AFP: 45 días
- Tasas: 30 días
- Tax brackets: 30 días

---

## Estructura de Datos en Supabase

### Tabla: `public.country_config`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `pais` | TEXT | Chile, Perú, Brasil (PK) |
| `afp_data` | JSONB | Tasas de AFP por fondo (ej: `{"Uno": 0.1049, "Cuprum": 0.1149}`) |
| `afp_updated_at` | TIMESTAMPTZ | Timestamp de última actualización |
| `uf_value` | NUMERIC | Valor UF en CLP |
| `uf_updated_at` | TIMESTAMPTZ | Timestamp de última actualización |
| `dolar_value` | NUMERIC | Valor dólar en CLP |
| `dolar_updated_at` | TIMESTAMPTZ | Timestamp de última actualización |
| `tasas` | JSONB | Tasas varias (AFP, salud, cesantía, etc.) |
| `tasas_updated_at` | TIMESTAMPTZ | Timestamp de última actualización |
| `tax_brackets` | JSONB | Tramos de impuesto |
| `tax_brackets_updated_at` | TIMESTAMPTZ | Timestamp de última actualización |

---

## 🔴 PROBLEMA: Valores NaN en la Calculadora

### Causa Raíz

Los datos en Supabase tienen **nombres de claves diferentes** a los que espera el código:

#### Chile en Supabase (ACTUAL):
```json
{
  "tasas": {
    "LIMITE_UF_IMPONIBLE": 89.9,           // ❌ Nombre incorrecto
    "GRATIFICACION_MAX_IMM": 4.75,         // ❌ Nombre incorrecto
    "TASA_SALUD_FONASA": 0.07,
    "TASA_CESANTIA": 0.006,
    "TOPE_CESANTIA_UF": 135.1,
    "SUELDO_MINIMO": 539000,
    "CESANTIA_EMPLEADOR": 0.024,
    "MUTUAL": 0.0093,
    "SIS": 0.0154,
    "EXPECTATIVA_VIDA": 0.009,
    "AFP_EMPLEADOR": 0.001,
    "SEGURO_COMPLEMENTARIO_UF": 0.4822
  }
}
```

#### Lo que espera el código (en `lib/calculations.ts`):
```typescript
const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue  // ❌ undefined * ufValue = NaN
const gratificacion = Math.min(
  sueldoBase * 0.25,
  (tasas.GRATIFICACION_MAX_UF * tasas.SUELDO_MINIMO) / 12  // ❌ undefined * ... = NaN
)
```

### Cadena de Errores

1. **configService** → Lee `tasas` de Supabase con claves incorrectas
2. **calculations.ts** → Intenta acceder a `tasas.TOPE_AFP_SALUD_UF` → obtiene `undefined`
3. **Aritmética** → `undefined * 40000.61` = `NaN`
4. **Propagación** → Todos los cálculos resultan en `NaN`

---

## ✅ Soluciones

### Opción 1: Corregir los datos en Supabase (RECOMENDADO)

Actualizar la tabla `country_config` en Supabase para Chile:

```sql
UPDATE public.country_config
SET tasas = jsonb_set(
  jsonb_set(tasas, '{TOPE_AFP_SALUD_UF}', tasas->'LIMITE_UF_IMPONIBLE'),
  '{GRATIFICACION_MAX_UF}',
  tasas->'GRATIFICACION_MAX_IMM'
)
WHERE pais = 'chile';

-- Remover claves antiguas (opcional, para limpieza)
UPDATE public.country_config
SET tasas = tasas - 'LIMITE_UF_IMPONIBLE' - 'GRATIFICACION_MAX_IMM'
WHERE pais = 'chile';
```

**Ventajas:**
- Supabase es fuente única de verdad
- No requiere cambios de código
- Fallback automático si hay problemas

**Desventajas:**
- Requiere acceso a Supabase

---

### Opción 2: Normalizar datos en configService

Mapear claves de Supabase a nombres esperados:

```typescript
// En lib/services/configService.ts
const tasasRaw = row.tasas as Record<string, number>

// Normalizar nombres legados
const tasas: CountryConfig['tasas'] = {
  ...tasasRaw,
  TOPE_AFP_SALUD_UF: tasasRaw.TOPE_AFP_SALUD_UF ?? tasasRaw.LIMITE_UF_IMPONIBLE,
  GRATIFICACION_MAX_UF: tasasRaw.GRATIFICACION_MAX_UF ?? tasasRaw.GRATIFICACION_MAX_IMM,
}
```

**Ventajas:**
- Funciona inmediatamente sin cambiar BD
- Compatible con datos legados

**Desventajas:**
- Aumenta complejidad de código
- No resuelve problema de raíz

---

### Opción 3: Fallar con error claro

Validar estructura y hacer fallback explícito:

```typescript
function validateTasas(tasas: unknown): tasas is CountryConfig['tasas'] {
  if (!tasas || typeof tasas !== 'object') return false
  const t = tasas as Record<string, unknown>
  return (
    typeof t.TOPE_AFP_SALUD_UF === 'number' &&
    typeof t.GRATIFICACION_MAX_UF === 'number'
    // ... otros campos críticos
  )
}

// En fetchCountryConfig:
const tasas = validateTasas(row.tasas)
  ? (row.tasas as CountryConfig['tasas'])
  : (console.error(`[config] invalid tasas structure for ${pais}`), fallback.tasas)
```

**Ventajas:**
- Debugging más fácil
- Evita NaN silencioso

**Desventajas:**
- Más verbose

---

## Flujo de Datos en Detalle

### Página Principal (Server)
```typescript
// app/page.tsx (Server Component)
const config = await getCountryConfig('chile')
// ↓ retorna Promise<CountryConfig>

return <CalculadoraClient config={config} />
```

### Cliente
```typescript
// app/calculadora-client.tsx (Client Component)
const resultados = useCalculator({
  // ... parámetros
  config,  // Configuración pasada del servidor
})
// ↓ useCalculator llama calcularRemuneracion()

// lib/hooks.ts
return calcularRemuneracion(
  params.modo,
  montoSueldo,
  params.afp,
  params.sistemaSalud,
  parseFloat(params.saludUF || "0"),
  montoMovilizacion,
  params.bonos,
  params.pais,
  params.config  // Aquí se usan tasas
)
```

### Cálculos
```typescript
// lib/calculations.ts
function simularLiquido(..., config: CountryConfig) {
  const { tasas } = config
  
  // ❌ Si tasas.TOPE_AFP_SALUD_UF es undefined:
  const topeAFPSalud = tasas.TOPE_AFP_SALUD_UF * ufValue  // NaN
  
  // ❌ Propagación del NaN:
  const impAfectoAFPSalud = Math.min(imponible, topeAFPSalud)  // NaN
  const afp = impAfectoAFPSalud * tasaAFP  // NaN * ... = NaN
}
```

---

## Verificación de Datos Actualmente en BD

Estado actual (2026-04-21):

### Chile ✅
- `afp_data`: Completo
- `uf_value`: 40000.61 (actualizado 2026-04-21)
- `dolar_value`: 881.22 (actualizado 2026-04-21)
- `tasas`: **⚠️ ESTRUCTURA INCORRECTA** (ver problema arriba)
- `tax_brackets`: Completo

### Perú ❌
- Todos los campos: `null`

### Brasil ❌
- Todos los campos: `null`

---

## Variables de Entorno Requeridas

Para desarrollo con Supabase:

```bash
# .env.local o .env
SUPABASE_URL="https://kgdmzljlinpqbetdzell.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Nota:** El `SERVICE_ROLE_KEY` tiene permisos elevados. No commitear a repo público.

---

## Debugging

### 1. Ver qué config se está usando

Añadir log en `app/calculadora-client.tsx`:
```typescript
console.log('Config cargada:', config)
```

### 2. Ver si está usando fallback

Buscar en console: `[config]` (marca todas las advertencias del servicio)

### 3. Verificar datos en BD

```bash
# Via Supabase CLI o panel web
SELECT pais, tasas FROM public.country_config WHERE pais = 'chile'
```

### 4. Validar estructura en código

```typescript
// Verificar que tasas tenga campos esperados
console.assert(
  config.tasas.TOPE_AFP_SALUD_UF,
  'Falta TOPE_AFP_SALUD_UF en tasas'
)
```

---

## Resumen de Acciones Inmediatas

1. **CRÍTICO**: Corregir nombres de claves en `tasas` de Chile en Supabase
   - `LIMITE_UF_IMPONIBLE` → `TOPE_AFP_SALUD_UF`
   - `GRATIFICACION_MAX_IMM` → `GRATIFICACION_MAX_UF`

2. **IMPORTANTE**: Completar configuración para Perú y Brasil

3. **RECOMENDABLE**: Añadir validación de estructura en `configService.ts`

4. **FUTURO**: Crear API endpoint para actualizar config sin acceso directo a BD

---

## Referencias

- Tabla en Supabase: `public.country_config`
- Cliente Supabase: `lib/supabase.ts`
- Servicio de config: `lib/services/configService.ts`
- Lógica de cálculo: `lib/calculations.ts` (líneas 50-91)
- Config fallback: `lib/config.ts`
