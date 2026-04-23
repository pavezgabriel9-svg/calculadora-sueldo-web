# Plan: Integración Parametrizada de Perú en Calculadora de Sueldos

## Context

El proyecto requiere integrar Perú en la calculadora de sueldos **sin hardcodeos en el código**. Actualmente:
- Chile está completo con todos sus parámetros
- Perú y Brasil son placeholders con valores en cero
- La arquitectura es agnóstica a país (usa config inyectado)
- Supabase almacena configuraciones por país en JSONB

**Objetivo:** Agregar parámetros de Perú estructurados, parametrizables, y sincronizables desde Supabase:
- RMV (Remuneración Mínima Vital)
- Sistema AFP con comisiones por administradora
- Cálculo de costos patronales (14 sueldos/año)
- Impuesto a la renta con tramos progresivos (UIT 5500)
- Regla de base mínima para salud (max(sueldo, RMV))

---

## Arquitectura Propuesta

### Estructura de Configuración Bloques

Organizar `tasas` en `CountryConfig` por bloques lógicos:

```typescript
// lib/types.ts - Estructura nueva
interface CountryConfig {
  afpData: Record<string, number>              // AFP por administradora
  ufValue: number                              // UF o equivalente país
  bonosAnualesUF?: { navidad: number, ... }   // Chile específico
  tasas: {
    // Bloque: Remuneración Mínima y Base
    RMV?: number                               // Perú: 1048
    SUELDO_MINIMO?: number                     // Chile: 539000
    SUELDOS_ANUALES?: number                   // Perú: 14, Chile: 12+gratificación
    
    // Bloque: Sistema de Salud
    TASA_SALUD_FONASA?: number                // Chile: 0.07
    TASA_SALUD_PATRONAL?: number              // Perú: 0.09
    SALUD_BASE_MINIMA?: boolean               // Perú: true (usa RMV)
    
    // Bloque: Sistema Previsional (AFP/SPP)
    TASA_AFP_OBLIGATORIA?: number             // Perú: 0.10
    TASA_SEGUROS_INVALIDEZ?: number           // Perú: 0.0137
    TASA_COMISION_AFP?: number                // Perú: variable por AFp (1.47-1.69%)
    
    // Bloque: Cesantía
    TASA_CESANTIA?: number                    // Chile: 0.006
    CESANTIA_EMPLEADOR?: number               // Chile: 0.024
    
    // Bloque: Costos Patronales
    MUTUAL?: number                           // Chile: 0.0093
    SIS?: number                              // Chile: 0.0154
    EXPECTATIVA_VIDA?: number                // Chile: 0.009
    
    // Bloque: Gratificación/Bonos
    GRATIFICACION_MAX_IMM?: number            // Chile: 4.75
    LIMITE_UF_IMPONIBLE?: number              // Chile: 89.9
    
    // Bloque: Impuesto a la Renta
    LIMITE_IMPUESTO?: number                  // Monto base antes de impuesto
    TASA_IMPUESTO?: number                    // Tasa única o principal
    TRAMOS_IMPUESTO?: TamoImpuesto[]          // Perú: tramos progresivos
    UIT?: number                              // Perú: 5500
    DEDUCCION_FIJA_UIT?: number               // Perú: 7 UIT
    DEDUCCION_ADICIONAL_UIT?: number          // Perú: hasta 3 UIT
  }
}

interface TramoImpuesto {
  desde_uf?: number      // Desde X UIT
  hasta_uf?: number      // Hasta X UIT (null = sin límite)
  tasa: number           // Tasa para este tramo
}
```

---

## Cambios Implementación

### 1. Actualizar `lib/types.ts`

**Archivo:** `lib/types.ts`

- Extender `CountryConfig` con campos opcionales para Perú
- Crear tipo `TramoImpuesto` para impuestos progresivos
- Mantener retrocompatibilidad con Chile (campos existentes)
- Nota: No cambiar `Pais` type, ya incluye "peru"

**Cambios:**
- Agregar interfaz `TramoImpuesto`
- Actualizar `tasas` en `CountryConfig` - agregar campos opcionales con `?`
- Verificar que tipos usen `number` para tasas (sin cambios de estructura)

---

### 2. Agregar Configuración Perú en `lib/config.ts`

**Archivo:** `lib/config.ts`

**Agregar:**

```typescript
export const TASAS_PERU = {
  // Remuneración Mínima Vital (2026)
  RMV: 1130,
  SUELDO_MINIMO: 1130,
  SUELDOS_ANUALES: 14,  // 12 meses + 2 gratificaciones
  
  // Sistema de Salud
  TASA_SALUD_FONASA: 0,     // No aplica en Perú
  TASA_SALUD_PATRONAL: 0.09, // 9% del sueldo (costo patronal)
  SALUD_BASE_MINIMA: true,   // Usar max(sueldo, RMV)
  
  // Sistema Previsional (SPP/AFP)
  TASA_AFP_OBLIGATORIA: 0.10,    // 10% del aporte al fondo
  TASA_SEGUROS_INVALIDEZ: 0.0137, // 1.37% SIS
  TASA_COMISION_AFP: 0.0155,     // Default 1.55% (variable por AFP)
  
  // Cesantía (no aplica Perú de la misma forma que Chile)
  TASA_CESANTIA: 0,
  CESANTIA_EMPLEADOR: 0,
  
  // Costos Patronales (Perú no tiene estos)
  MUTUAL: 0,
  SIS: 0,
  EXPECTATIVA_VIDA: 0,
  
  // Gratificación
  GRATIFICACION_MAX_IMM: 0,  // Perú usa sueldos fijos
  LIMITE_UF_IMPONIBLE: 1000000,
  
  // Impuesto a la Renta
  LIMITE_IMPUESTO: 0,        // No aplica
  TASA_IMPUESTO: 0,          // No aplica (usar tramos)
  UIT: 5500,
  DEDUCCION_FIJA_UIT: 7,     // 7 UIT = 38500
  DEDUCCION_ADICIONAL_UIT: 3, // Hasta 3 UIT = 16500
}

// AFP por administradora (Perú)
export const AFP_PERU_DATA: Record<string, number> = {
  "Habitat": 0.0147,      // 1.47%
  "Integra": 0.0155,      // 1.55%
  "Prima": 0.0160,        // 1.60%
  "Profuturo": 0.0169,    // 1.69%
}

// Tramos de Impuesto a la Renta (Perú) - anual en UIT
export const TRAMOS_IMPUESTO_PERU: TramoImpuesto[] = [
  { desde_uf: 0, hasta_uf: 5, tasa: 0.08 },
  { desde_uf: 5, hasta_uf: 20, tasa: 0.14 },
  { desde_uf: 20, hasta_uf: 35, tasa: 0.17 },
  { desde_uf: 35, hasta_uf: 45, tasa: 0.20 },
  { desde_uf: 45, hasta_uf: null, tasa: 0.30 },
]
```

**Actualizar `CONFIG_POR_PAIS`:**
```typescript
export const CONFIG_POR_PAIS = {
  chile: TASAS_CHILE,
  peru: TASAS_PERU,      // ← Actualizar (antes estaba vacío)
  brasil: TASAS_BRASIL,
}
```

**Actualizar `getFallback()` en `configService.ts`:**
```typescript
function getFallback(pais: Pais): CountryConfig {
  const tasas = CONFIG_POR_PAIS[pais]
  const afpData = 
    pais === 'chile' ? AFP_DATA :
    pais === 'peru' ? AFP_PERU_DATA :
    {}
  return {
    afpData,
    ufValue: tasas.UF_VALUE || tasas.RMV || 1,
    bonosAnualesUF: pais === 'chile' ? BONOS_ANUALES_UF_DEFAULT : undefined,
    tasas: { ... }
  }
}
```

---

### 3. Implementar Lógica de Cálculos Perú en `lib/calculations.ts`

**Archivo:** `lib/calculations.ts`

**Cambios:**

1. **Detector de país dentro de calcularRemuneracion():**
   ```typescript
   const isPeru = pais === 'peru'
   const isChile = pais === 'chile'
   ```

2. **Agregar función helper para salud Perú:**
   ```typescript
   function calcularSaludPatronalPeru(sueldo: number, rmv: number, config: CountryConfig): number {
     const baseMinima = config.tasas.SALUD_BASE_MINIMA ? Math.max(sueldo, rmv) : sueldo
     return Math.round(baseMinima * (config.tasas.TASA_SALUD_PATRONAL || 0))
   }
   ```

3. **Agregar función para impuesto a la renta Perú (anual):**
   ```typescript
   function calcularImpuestoRentaPeruAnual(
     sueldoBase: number,
     config: CountryConfig
   ): { impuestoAnual: number, impuestoMensual: number } {
     const SUELDOS = config.tasas.SUELDOS_ANUALES || 14
     const UIT = config.tasas.UIT || 5500
     const DEDUCCION_FIJA = config.tasas.DEDUCCION_FIJA_UIT || 7
     const DEDUCCION_ADIC = config.tasas.DEDUCCION_ADICIONAL_UIT || 3
     
     // Ingresos anuales
     const ingresosAnuales = sueldoBase * SUELDOS
     
     // Deducción: 7 UIT fija + hasta 3 UIT adicionales
     const deduccionTotal = (DEDUCCION_FIJA + DEDUCCION_ADIC) * UIT
     const baseImponible = Math.max(0, ingresosAnuales - deduccionTotal)
     
     // Convertir a UIT para tramos
     const baseUIT = baseImponible / UIT
     
     // Calcular impuesto por tramos
     let impuestoAnual = 0
     const tramos = config.tasas.TRAMOS_IMPUESTO || TRAMOS_IMPUESTO_PERU
     
     for (const tramo of tramos) {
       const desde = tramo.desde_uf || 0
       const hasta = tramo.hasta_uf ?? Infinity
       
       if (baseUIT > desde) {
         const topeDeTramo = Math.min(baseUIT, hasta)
         const imponibleEnTramo = (topeDeTramo - desde) * UIT
         impuestoAnual += imponibleEnTramo * tramo.tasa
       }
     }
     
     return {
       impuestoAnual: Math.round(impuestoAnual),
       impuestoMensual: Math.round(impuestoAnual / 12)
     }
   }
   ```

4. **Modificar `calcularRemuneracion()` para Perú:**
   - Si `pais === 'peru'`:
     - Usar `calcularSaludPatronalPeru()` en lugar de lógica Chile
     - Calcular impuesto anual y dividir entre 12
     - Comisión AFP = buscar en `afpData[afpNombre]`
     - No aplicar Cesantía, Mutual, SIS, etc. (son cero en Perú)
     - Usar `SUELDOS_ANUALES` (14) en lugar de 12+gratificación

**Estructura de retorno `ResultadosCalculo`:**
- Mantener igual (compatible con ambos países)
- Campos no usados en Perú quedarán en 0 o undefined

---

### 4. Actualizar Supabase `country_config`

**Archivo:** Migration SQL (crear o actualizar)

**Esquema actual:** Soporta JSONB flexible, por lo que no hay cambios de schema necesarios.

**Datos a insertar/actualizar para Perú:**

```sql
UPDATE country_config
SET 
  afp_data = '{"Habitat": 0.0147, "Integra": 0.0155, "Prima": 0.0160, "Profuturo": 0.0169}'::jsonb,
  afp_updated_at = NOW(),
  uf_value = 1,
  uf_updated_at = NOW(),
  tasas = '{
    "RMV": 1130,
    "SUELDO_MINIMO": 1130,
    "SUELDOS_ANUALES": 14,
    "TASA_SALUD_FONASA": 0,
    "TASA_SALUD_PATRONAL": 0.09,
    "SALUD_BASE_MINIMA": true,
    "TASA_AFP_OBLIGATORIA": 0.10,
    "TASA_SEGUROS_INVALIDEZ": 0.0137,
    "TASA_COMISION_AFP": 0.0155,
    "TASA_CESANTIA": 0,
    "CESANTIA_EMPLEADOR": 0,
    "MUTUAL": 0,
    "SIS": 0,
    "EXPECTATIVA_VIDA": 0,
    "GRATIFICACION_MAX_IMM": 0,
    "LIMITE_UF_IMPONIBLE": 1000000,
    "LIMITE_IMPUESTO": 0,
    "TASA_IMPUESTO": 0,
    "UIT": 5500,
    "DEDUCCION_FIJA_UIT": 7,
    "DEDUCCION_ADICIONAL_UIT": 3,
    "TRAMOS_IMPUESTO": [
      {"desde_uf": 0, "hasta_uf": 5, "tasa": 0.08},
      {"desde_uf": 5, "hasta_uf": 20, "tasa": 0.14},
      {"desde_uf": 20, "hasta_uf": 35, "tasa": 0.17},
      {"desde_uf": 35, "hasta_uf": 45, "tasa": 0.20},
      {"desde_uf": 45, "hasta_uf": null, "tasa": 0.30}
    ]
  }'::jsonb,
  tasas_updated_at = NOW(),
  updated_at = NOW()
WHERE pais = 'peru';
```

Si la fila no existe:
```sql
INSERT INTO country_config (pais, afp_data, uf_value, tasas, afp_updated_at, uf_updated_at, tasas_updated_at)
VALUES ('peru', '...'::jsonb, 1, '...'::jsonb, NOW(), NOW(), NOW());
```

---

### 5. (Futuro - Fase 3) Actualizar `app/page.tsx`

**Nota:** Esto es para cuando se implemente la carga dinámica de país. Por ahora,no implementar.

```typescript
// Futuro: leer país del URL o defaultear a chile
const país = searchParams.país || 'chile'
const config = await getCountryConfig(país as Pais)
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `lib/types.ts` | ✅ Agregar `TramoImpuesto`, extender `CountryConfig` |
| `lib/config.ts` | ✅ Agregar `TASAS_PERU`, `AFP_PERU_DATA`, `TRAMOS_IMPUESTO_PERU` |
| `lib/calculations.ts` | ✅ Agregar funciones Perú, adaptar lógica por país |
| `lib/services/configService.ts` | ✅ Actualizar `getFallback()` para Perú |
| Supabase `country_config` | ✅ Insertar/actualizar fila Perú |
| `app/page.tsx` | ⏸️ Futuro (Fase 3) |

---

## Testing & Verificación

### 1. Unit Testing (local)
- [ ] Sueldo base 1130 (RMV) → Cálculos correctos
- [ ] Sueldo base 5000 → Base mínima salud = max(5000, 1130) = 5000 ✓
- [ ] AFP Integra (1.55%) aplicada correctamente
- [ ] Impuesto renta anual (14 meses):
  - Base anual = 5000 * 14 = 70000
  - Deducción = 7 * 5500 + 3 * 5500 = 55000
  - Base imponible = 15000 (2.72 UIT)
  - Tramo 0-5 UIT: 15000 * 0.08 = 1200 anual
  - Mensual: 1200 / 12 = 100 ✓

### 2. Integración Supabase
- [ ] Fila Perú existe en `country_config`
- [ ] `configService.ts` fetch retorna TASAS_PERU correctamente
- [ ] Fallback hardcodeado funciona si Supabase está down

### 3. Flujo Completo
- [ ] Usuario selecciona Perú
- [ ] Ingresa sueldo base 5000
- [ ] Selecciona AFP Integra
- [ ] Cálculos reflejan:
  - Aporte AFP = 5000 * 0.10 = 500
  - Comisión AFP = 5000 * 0.0155 = 77.5
  - Salud patronal = 5000 * 0.09 = 450
  - Impuesto mensual ≈ 100
  - Total deducción ≈ 577
  - Líquido ≈ 4423

### 4. Compatibilidad Backward
- [ ] Chile sigue funcionando igual
- [ ] Brasil no se rompe (fallback vacío)
- [ ] Componentes UI no necesitan cambios

---

## Criterios de Éxito

1. ✅ Perú completamente parametrizado (sin hardcodeo en lógica)
2. ✅ Todos los valores en Supabase + fallback config.ts
3. ✅ Impuesto a la renta con tramos progresivos funcionando
4. ✅ Regla RMV para salud implementada
5. ✅ AFP con comisión por administradora
6. ✅ Cálculo anual con 14 sueldos
7. ✅ Chile no roto
8. ✅ Código agnóstico a país (lógica adaptativa, no hardcodeada)

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Lógica de impuesto progresivo compleja | Tests unitarios antes de merge |
| Cambios en tipos rompen Chile | Mantener backward compat, campos opcionales |
| Supabase sin datos Perú | Fallback config.ts siempre disponible |
| AFP comisión no encontrada | Default a 0.0155 (Integra) |

---

## Next Steps

1. ✅ Leer y aprobar plan
2. ⏭️ Implementar cambios en orden:
   - lib/types.ts
   - lib/config.ts
   - lib/calculations.ts
   - lib/services/configService.ts
   - Supabase SQL
3. ⏭️ Testing local
4. ⏭️ Deploy y validación
