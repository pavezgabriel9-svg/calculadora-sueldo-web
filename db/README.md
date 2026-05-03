# Schema `mercado` — Datos de mercado para la calculadora

Documentación del schema `mercado` en la base **`rh_cramer`** y de los procesos
de carga / consulta que lo alimentan.

> **Estado**: diseño cerrado. Pendiente: ejecutar `schema_mercado.sql` en el
> servidor de RRHH y correr el primer `load_mercado_csv.py`.

---

## 1. Visión general

La calculadora de compensaciones necesita comparar lo que la empresa paga (o
está por ofrecer) contra el mercado. Para eso requiere:

1. **Datos de mercado** crudos por cargo (estudios tipo TRS, Mercer, etc.).
2. **Catálogo propio de cargos** de la empresa (no `rh.employees.name_role`,
   que tiene variantes/ruido).
3. **Homologación** entre ambos: qué cargo de empresa corresponde a qué cargo
   del estudio. Asistida por IA (embeddings + GPT) y validable por humanos.
4. **Vista plana** lista para que la calculadora consulte en una sola query.

El schema `mercado` resuelve los cuatro puntos. Vive en `rh_cramer` junto al
schema `rh` existente, sin acoplarse a sus tablas.

---

## 2. Diagrama del modelo

```
                    ┌────────────────────┐
                    │ mercado.estudios   │   ← TRS 2024, TRS 2025, Mercer 2025…
                    └──────────┬─────────┘     (uno "vigente" por proveedor)
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
   ┌─────────────────┐  ┌─────────────────────┐
   │ mercado.cargos  │  │mercado.homologacion │
   │  (catálogo TRS) │◄─│      _cargos        │
   └────────┬────────┘  └──────────┬──────────┘
            │                      │
            │                      ▼
            │             ┌──────────────────────┐
            │             │mercado.cargos_empresa│
            │             │  (catálogo propio)   │
            │             └──────────┬───────────┘
            │                        │
            ▼                        ▼
   ┌─────────────────┐   ┌──────────────────────┐
   │mercado.         │   │mercado.embeddings_   │
   │  compensacion   │   │  cargos_empresa      │
   │ (long, anual)   │   │  vector(1536)        │
   └─────────────────┘   └──────────────────────┘
            │
   ┌─────────────────┐
   │mercado.         │
   │  embeddings     │
   │  vector(1536)   │
   └─────────────────┘

   ─────── consume la calculadora ───────
   mercado.v_cargo_empresa_mercado_vigente   ← vista materializada
```

---

## 3. Tablas

### `mercado.estudios`
Catálogo de estudios cargados en el sistema.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `SERIAL PK` | |
| `nombre` | `VARCHAR(100)` | "TRS 2025" |
| `proveedor` | `VARCHAR(100)` | "TRS", "Mercer", "Korn Ferry" |
| `año` | `INT` | |
| `fecha_publicacion` | `DATE` | Cuando salió el estudio |
| `fecha_carga` | `TIMESTAMP` | Cuando lo cargamos a la BD |
| `moneda` | `VARCHAR(10)` | Default `'CLP'` |
| `pais` | `VARCHAR(50)` | Default `'Chile'` |
| `vigente` | `BOOLEAN` | **Solo uno vigente por proveedor** (índice parcial único). El que alimenta la calculadora. |

> **Por qué versionar por año**: cuando llega TRS 2026, no pisa TRS 2025.
> Cargás el nuevo, marcás `vigente=TRUE` (desmarca el anterior automáticamente
> vía el loader), y la vista materializada se refresca contra el nuevo.

### `mercado.cargos`
Catálogo de cargos del estudio (los CSV). Una fila por **(estudio, código)**.

Si TRS 2025 y TRS 2026 traen el mismo código `ITC.08.000.M30`, son **dos filas
distintas**. Esto permite que el catálogo evolucione (cambios de descripción,
familias renombradas, etc.) sin perder historia.

Columnas relevantes:
- `codigo` (`ITC.08.000.M30`)
- `familia_codigo`, `subfamilia_codigo`, `especializacion_codigo`, `nivel_codigo`
- `titulo_puesto`, `titulo_tipico` (alias, solo dataset Jobs), `descripcion`
- `familia_nombre`, `subfamilia_nombre`, `nivel_nombre`
- `dataset`: **`'core_jobs'`** | **`'jobs'`** ← clave para la estrategia de granularidad

### `mercado.compensacion`
**Long format**: una fila por (cargo, tipo de compensación). 8 filas por cargo.

| Columna | Tipo | Notas |
|---|---|---|
| `cargo_id` | FK → `cargos.id` | |
| `tipo_comp` | `VARCHAR(50)` | Uno de los 8 tipos (ver abajo) |
| `n_companias` | `INT` | |
| `n_observaciones` | `INT` | |
| `percentil_25` | `NUMERIC(15,2)` | **Anual** en moneda del estudio |
| `promedio` | `NUMERIC(15,2)` | |
| `mediana` | `NUMERIC(15,2)` | |
| `percentil_75` | `NUMERIC(15,2)` | |

**Los 8 tipos de compensación** (en orden CSV):

| `tipo_comp` | Origen CSV | Significado |
|---|---|---|
| `salario_base` | COMP1 | Salario base anual |
| `efectivo_garantizado` | COMP2 | Salario base + bonos garantizados |
| `efectivo_total_target` | COMP3 TARGET | Efectivo total (con variable a 100%) |
| `efectivo_total_real` | COMP3 REAL | Efectivo total (variable real pagada) |
| `comp_total_directa_target` | COMP4 TARGET | Efectivo + acciones (target) |
| `comp_total_directa_real` | COMP4 REAL | Efectivo + acciones (real) |
| `remuneracion_total_target` | COMP5 TARGET | Compensación total directa + beneficios (target) |
| `remuneracion_total_real` | COMP5 REAL | Compensación total directa + beneficios (real) |

> **Anual, no mensual**. La calculadora divide por 12 en backend cuando lo necesita.
> Esto evita redundancia y mantiene la BD como fuente de verdad de los datos del estudio.

### `mercado.cargos_empresa`
Catálogo **propio** de cargos. No usa `rh.employees.name_role` directamente
porque ese campo tiene variantes ("Analista RRHH", "Analista de RRHH",
"Analista Recursos Humanos") que ensucian el matching.

Campos clave:
- `nombre_cargo` (UNIQUE), `descriptor`
- `codigo_interno` (opcional, código propio si lo manejan)
- `area_id` ← **soft-reference** a `rh.areas.id`. Sin FK formal para no acoplar schemas.
- `banda_min_mensual`, `banda_max_mensual` ← banda salarial interna **mensual CLP**
- `nivel_jerarquico` (P3, M3, etc.)
- `vigente`

### `mercado.homologacion_cargos`
La **tabla puente**. Un cargo de empresa se relaciona con uno o varios
candidatos del mercado (top 5), por estudio.

| Campo | Para qué sirve |
|---|---|
| `cargo_empresa_id` | FK |
| `cargo_mercado_id` | FK |
| `estudio_id` | FK — **la homologación es contra un estudio específico** |
| `ranking` | 1..5 (ranking dentro del top) |
| `score` | 0–100, dado por GPT |
| `score_embedding` | 0–1, similitud coseno (pre-filtro) |
| `justificacion` | Texto generado por GPT |
| `es_principal` | **Solo uno por (cargo_empresa, estudio)**. Es el match elegido. |
| `validado_humano` | TRUE si compensaciones revisó y aprobó |
| `validado_por`, `fecha_validacion` | Auditoría |

> **Por qué guardar el top 5 en lugar de solo el ganador**: cuando un humano
> revisa la homologación, ve los 5 candidatos en pantalla y puede cambiar el
> `es_principal` a otro con un click. No requiere re-llamar a OpenAI.
> El matcher solo corre cuando es un cargo nuevo o cuando se pide
> explícitamente "re-buscar".

### `mercado.embeddings` y `mercado.embeddings_cargos_empresa`
Embeddings precomputados (`vector(1536)` de `text-embedding-3-small`).
Índice `ivfflat` con `vector_cosine_ops`. Permite búsqueda semántica en
milisegundos sobre los 5600 cargos.

Campo `hash_texto` (SHA-256 del texto fuente): si la descripción del cargo
cambia, el hash difiere → se regenera el embedding. Si no, se reusa.

### `mercado.v_cargo_empresa_mercado_vigente` (vista materializada)
**Lo que consume la calculadora**. Una fila por (cargo_empresa, tipo_comp).

Une cargo_empresa + match principal + percentiles del estudio vigente.
Refrescable concurrentemente sin lock:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente;
```

Cuándo refrescar:
- Después de cargar un estudio nuevo (`load_mercado_csv.py`)
- Después de validar/cambiar homologaciones
- Después de agregar/editar `cargos_empresa`

---

## 4. Estrategia: Core Jobs vs Jobs

Los CSV TRS tienen dos archivos:

| Archivo | Patrón de código | Significado | Filas |
|---|---|---|---|
| **Core Jobs** | `ITC.08.`**`000`**`.M30` | Especialización=000 → cargo "paraguas" | ~1240 |
| **Jobs** | `SCN.03.`**`017`**`.M30` | Especialización≠0 → variante específica | ~4395 |

Ejemplo:
- `ITC.08.000.M30` (Core) = "Administración de Sistemas e Infraestructura TI - Gerente"
  → 29 compañías, 66 observaciones ✅
- `ITC.08.074.M30` (Jobs) = "Administración de **Bases de Datos** TI - Gerente"
  (especialización 074 = bases de datos)
  → 4 compañías, 6 observaciones ⚠️

### Fase 1 — MVP
- Cargar **ambos** datasets a la BD.
- Calculadora **solo lee `dataset='core_jobs'`** → ~1240 cargos con buena
  cobertura estadística.
- Matcher solo evalúa candidatos `core_jobs`.

### Fase 2 — Granularidad
- Cuando un cargo de empresa amerite mayor especificidad (ej. un DBA, no un
  "ingeniero TI" genérico), re-homologar contra un código de Jobs.
- La tabla puente lo soporta sin cambios — solo cambia `cargo_mercado_id`.
- La UI muestra badge: "Dato por cargo (n=24)" vs "Dato por familia (n=312)".

---

## 5. Flujo de datos

```
┌──────────────────────┐
│ CSV TRS (Core Jobs)  │──┐
└──────────────────────┘  │  load_mercado_csv.py
┌──────────────────────┐  ├──────────────────────►  mercado.estudios
│ CSV TRS (Jobs)       │──┘                          mercado.cargos
└──────────────────────┘                             mercado.compensacion

   (más adelante, refactor de matchs.py)

┌──────────────────────┐
│ CSV cargos empresa   │──►  matchs.py (BD-backed) ──►  mercado.cargos_empresa
└──────────────────────┘         │                       mercado.embeddings*
                                 │                       mercado.homologacion_cargos
                                 ▼
                       OpenAI Embeddings + GPT

REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente
                                 │
                                 ▼
                       Calculadora (Next.js)
```

---

## 6. Operaciones comunes

### 6.1 Crear el schema (una sola vez)

```bash
psql -h <host> -U <user> -d rh_cramer -f db/schema_mercado.sql
```

Requiere extensiones `vector` (pgvector) y `pg_trgm` instalables por superuser.

### 6.2 Cargar un estudio

```bash
# Core Jobs
python db/load_mercado_csv.py "/ruta/trs_2025_core_jobs.csv" \
    --estudio-nombre "TRS 2025" \
    --estudio-proveedor "TRS" \
    --estudio-año 2025 \
    --vigente

# Jobs (mismo estudio, ya creado, no necesita --vigente otra vez)
python db/load_mercado_csv.py "/ruta/trs_2025_jobs.csv" \
    --estudio-nombre "TRS 2025" \
    --estudio-proveedor "TRS" \
    --estudio-año 2025
```

El loader:
- Detecta automáticamente `core_jobs` o `jobs` por número de columnas.
- Es idempotente (re-correr no duplica).
- Si `--vigente`, desmarca el anterior estudio vigente del mismo proveedor.
- Soporta `--dry-run` (todo en transacción, rollback al final).

### 6.3 Refrescar la vista materializada

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente;
```

Sin lock para lectura. Tarda segundos.

### 6.4 Consultar percentiles para un cargo (MVP)

```sql
SELECT
    nombre_cargo,
    titulo_mercado,
    estudio_nombre,
    n_observaciones,
    p25_anual,
    mediana_anual,
    p75_anual
FROM mercado.v_cargo_empresa_mercado_vigente
WHERE nombre_cargo = 'Analista de Compensaciones'
  AND tipo_comp = 'salario_base'
  AND dataset_mercado = 'core_jobs';   -- filtro MVP
```

### 6.5 Validar una homologación

```sql
UPDATE mercado.homologacion_cargos
SET validado_humano = TRUE,
    validado_por = 'gabriel.pavez',
    fecha_validacion = NOW()
WHERE id = <id>;
```

Para **cambiar el match principal** (elegir otro candidato del top 5):

```sql
BEGIN;
UPDATE mercado.homologacion_cargos
SET es_principal = FALSE
WHERE cargo_empresa_id = 42 AND estudio_id = 1 AND es_principal = TRUE;

UPDATE mercado.homologacion_cargos
SET es_principal = TRUE
WHERE id = <id_del_nuevo_principal>;
COMMIT;

REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente;
```

---

## 7. Variables de entorno

`load_mercado_csv.py` y (próximamente) `matchs.py` requieren:

```env
# Conexión Postgres (rh_cramer)
PG_HOST=<host>
PG_PORT=5432
PG_DATABASE=rh_cramer
PG_USER=<user>
PG_PASSWORD=<password>
# o alternativamente:
# PG_DSN=host=... port=... dbname=... user=... password=...

# Para matchs.py (próximo):
OPENAI_API_KEY=sk-...
```

---

## 8. Notas y decisiones de diseño

- **Schema separado `mercado`**, no colgar de `rh`. Razón: data externa,
  ciclo de vida propio, permisos diferenciables.
- **Long format en `compensacion`** (no 48 columnas). Si TRS agrega COMP6 en
  2026, solo se inserta filas; no `ALTER TABLE`.
- **`vector(1536)` con `ivfflat`**, `lists=100` (≈ √5600). Si la tabla crece
  significativamente, recrear el índice con más `lists` para mantener
  rendimiento.
- **`area_id` en `cargos_empresa`** es soft-reference a `rh.areas.id`. Sin FK
  formal: si `rh.areas` se reorganiza, no rompe `mercado`.
- **Top 5 candidatos** en `homologacion_cargos`, con `es_principal` único por
  (cargo_empresa, estudio). Mejor UX de validación, sin re-llamar a OpenAI.
- **Anual, no mensual** en BD. El backend de la calculadora divide por 12
  cuando consume la vista.
- **Sin FK cross-schema dura**: la única referencia a `rh.*` es via
  `area_id INT` (sin FOREIGN KEY). Soft coupling intencional.

---

## 9. Pendientes del proyecto

- [ ] Refactor `matchs.py` → BD-backed (lee `cargos`, escribe
  `embeddings`, `homologacion_cargos`)
- [ ] Backend de la calculadora consume `v_cargo_empresa_mercado_vigente`
- [ ] Componentes React: `MercadoBand`, `CompaRatio`, `MercadoCompare`,
  `HomologacionPicker`
- [ ] UI admin de validación de homologaciones
- [ ] Migración Supabase → `rh_cramer` documentada
