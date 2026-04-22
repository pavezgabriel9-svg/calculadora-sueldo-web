-- Migration: Add Peru country configuration to country_config table
-- Date: 2026-04-22
-- Purpose: Insert Peru's tax rates, AFP data, and income tax brackets

-- Insert or update Peru configuration
INSERT INTO country_config (pais, afp_data, afp_updated_at, uf_value, uf_updated_at, tasas, tasas_updated_at, updated_at)
VALUES (
  'peru',
  '{"Habitat": 0.0147, "Integra": 0.0155, "Prima": 0.0160, "Profuturo": 0.0169}'::jsonb,
  NOW(),
  1,
  NOW(),
  '{
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
  NOW(),
  NOW()
)
ON CONFLICT (pais) DO UPDATE SET
  afp_data = EXCLUDED.afp_data,
  afp_updated_at = EXCLUDED.afp_updated_at,
  uf_value = EXCLUDED.uf_value,
  uf_updated_at = EXCLUDED.uf_updated_at,
  tasas = EXCLUDED.tasas,
  tasas_updated_at = EXCLUDED.tasas_updated_at,
  updated_at = EXCLUDED.updated_at;
