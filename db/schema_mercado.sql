-- =====================================================================
-- Schema: mercado
-- Propósito: Datos de mercado para compensaciones (estudios TRS y similares),
--            catálogo propio de cargos de empresa, y homologación entre ambos.
-- Motor:    PostgreSQL 13+ con extensiones pgvector y pg_trgm.
-- Destino:  Base rh_cramer (servidor RRHH).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS mercado;
COMMENT ON SCHEMA mercado IS
    'Datos de mercado, cargos de empresa y homologación para la calculadora de compensaciones.';

-- =====================================================================
-- Funciones de utilidad
-- =====================================================================

CREATE OR REPLACE FUNCTION mercado.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Tabla: estudios
-- Catálogo de estudios de mercado cargados (TRS 2024, TRS 2025, etc.).
-- =====================================================================

CREATE TABLE mercado.estudios (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,        -- 'TRS 2025'
    proveedor           VARCHAR(100) NOT NULL,        -- 'Mercer', 'WTW', 'Korn Ferry'
    año                 INT NOT NULL,
    fecha_publicacion   DATE,
    fecha_carga         TIMESTAMP DEFAULT NOW(),
    moneda              VARCHAR(10) DEFAULT 'CLP',
    pais                VARCHAR(50) DEFAULT 'Chile',
    vigente             BOOLEAN DEFAULT FALSE,
    notas               TEXT,
    UNIQUE(proveedor, año, nombre)
);

-- Garantiza un único estudio vigente por proveedor (permite múltiples proveedores en paralelo).
CREATE UNIQUE INDEX idx_estudios_vigente_unico_por_proveedor
    ON mercado.estudios(proveedor)
    WHERE vigente = TRUE;

COMMENT ON TABLE  mercado.estudios          IS 'Estudios de mercado disponibles. El flag "vigente" indica cuál alimenta la calculadora.';
COMMENT ON COLUMN mercado.estudios.vigente  IS 'TRUE = es la fuente actual para la calculadora. Solo uno por proveedor.';

-- =====================================================================
-- Tabla: cargos
-- Catálogo de cargos del estudio de mercado (filas de los CSV).
-- Una fila por (estudio, codigo): permite que el catálogo evolucione año a año.
-- =====================================================================

CREATE TABLE mercado.cargos (
    id                      SERIAL PRIMARY KEY,
    estudio_id              INT NOT NULL REFERENCES mercado.estudios(id) ON DELETE CASCADE,
    codigo                  VARCHAR(50) NOT NULL,    -- 'ITC.08.000.M30'
    familia_codigo          VARCHAR(10),
    subfamilia_codigo       VARCHAR(10),
    especializacion_codigo  VARCHAR(10),
    nivel_codigo            VARCHAR(10),             -- 'M30', 'P20', 'S40'
    titulo_puesto           VARCHAR(500) NOT NULL,
    titulo_tipico           VARCHAR(500),            -- alias del cargo (solo dataset 'jobs')
    descripcion             TEXT,
    familia_nombre          VARCHAR(255),
    subfamilia_nombre       VARCHAR(255),
    nivel_nombre            VARCHAR(100),
    dataset                 VARCHAR(20) NOT NULL,    -- 'core_jobs' | 'jobs'
    created_at              TIMESTAMP DEFAULT NOW(),
    UNIQUE(estudio_id, codigo),
    CHECK (dataset IN ('core_jobs', 'jobs'))
);

CREATE INDEX idx_cargos_estudio      ON mercado.cargos(estudio_id);
CREATE INDEX idx_cargos_codigo       ON mercado.cargos(codigo);
CREATE INDEX idx_cargos_familia      ON mercado.cargos(familia_codigo, subfamilia_codigo);
CREATE INDEX idx_cargos_nivel        ON mercado.cargos(nivel_codigo);
CREATE INDEX idx_cargos_dataset      ON mercado.cargos(dataset);
CREATE INDEX idx_cargos_titulo_trgm  ON mercado.cargos USING gin(titulo_puesto gin_trgm_ops);

COMMENT ON TABLE  mercado.cargos          IS 'Catálogo de cargos del estudio de mercado. Una fila por (estudio, código).';
COMMENT ON COLUMN mercado.cargos.dataset  IS 'Origen del registro: "core_jobs" o "jobs" (los dos CSV del estudio TRS).';

-- =====================================================================
-- Tabla: compensacion (long format)
-- Datos de compensación por cargo y tipo. 8 filas por cargo (8 tipos de comp).
-- Valores en MONTO ANUAL en la moneda del estudio (típicamente CLP anuales).
-- =====================================================================

CREATE TABLE mercado.compensacion (
    id              SERIAL PRIMARY KEY,
    cargo_id        INT NOT NULL REFERENCES mercado.cargos(id) ON DELETE CASCADE,
    tipo_comp       VARCHAR(50) NOT NULL,
    n_companias     INT,
    n_observaciones INT,
    percentil_25    NUMERIC(15,2),
    promedio        NUMERIC(15,2),
    mediana         NUMERIC(15,2),
    percentil_75    NUMERIC(15,2),
    UNIQUE(cargo_id, tipo_comp),
    CHECK (tipo_comp IN (
        'salario_base',                    -- COMP1
        'efectivo_garantizado',            -- COMP2
        'efectivo_total_target',           -- COMP3 TARGET
        'efectivo_total_real',             -- COMP3 REAL
        'comp_total_directa_target',       -- COMP4 TARGET
        'comp_total_directa_real',         -- COMP4 REAL
        'remuneracion_total_target',       -- COMP5 TARGET
        'remuneracion_total_real'          -- COMP5 REAL
    ))
);

CREATE INDEX idx_compensacion_cargo ON mercado.compensacion(cargo_id);
CREATE INDEX idx_compensacion_tipo  ON mercado.compensacion(tipo_comp);

COMMENT ON TABLE  mercado.compensacion           IS 'Datos de compensación en formato long. Valores ANUALES en moneda del estudio.';
COMMENT ON COLUMN mercado.compensacion.tipo_comp IS 'Tipo de compensación según taxonomía del estudio (8 tipos: COMP1 a COMP5 con variantes TARGET/REAL).';

-- =====================================================================
-- Tabla: cargos_empresa
-- Catálogo PROPIO de cargos de la empresa.
-- No usa rh.employees.name_role directo (tiene variantes/ruido por cargo escrito a mano).
-- =====================================================================

CREATE TABLE mercado.cargos_empresa (
    id                  SERIAL PRIMARY KEY,
    nombre_cargo        VARCHAR(255) NOT NULL UNIQUE,
    descriptor          TEXT,
    codigo_interno      VARCHAR(50),                 -- código propio opcional
    area_id             INT,                         -- soft-ref a rh.areas.id (sin FK formal, evita acoplar schemas)
    banda_min_mensual   NUMERIC(15,2),               -- banda salarial interna mensual CLP
    banda_max_mensual   NUMERIC(15,2),
    nivel_jerarquico    VARCHAR(50),                 -- ej. 'P3', 'M3', etc. (interno o homologado)
    vigente             BOOLEAN DEFAULT TRUE,
    notas               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cargos_empresa_nombre      ON mercado.cargos_empresa(nombre_cargo);
CREATE INDEX idx_cargos_empresa_nombre_trgm ON mercado.cargos_empresa USING gin(nombre_cargo gin_trgm_ops);
CREATE INDEX idx_cargos_empresa_area        ON mercado.cargos_empresa(area_id);
CREATE INDEX idx_cargos_empresa_vigente     ON mercado.cargos_empresa(vigente) WHERE vigente = TRUE;

CREATE TRIGGER trg_cargos_empresa_updated_at
    BEFORE UPDATE ON mercado.cargos_empresa
    FOR EACH ROW EXECUTE FUNCTION mercado.set_updated_at();

COMMENT ON TABLE  mercado.cargos_empresa         IS 'Catálogo propio de cargos de la empresa, base para homologación con mercado.';
COMMENT ON COLUMN mercado.cargos_empresa.area_id IS 'Soft-reference a rh.areas.id. Sin FK formal para no acoplar schemas.';

-- =====================================================================
-- Tabla: homologacion_cargos
-- Vincula cargos_empresa con cargos de mercado, por estudio.
-- Guarda hasta 5 candidatos por cargo (ranking 1-5), uno marcado como principal.
-- Atar al estudio permite re-homologar cuando el catálogo del estudio cambia (TRS 2026, etc.).
-- =====================================================================

CREATE TABLE mercado.homologacion_cargos (
    id                  SERIAL PRIMARY KEY,
    cargo_empresa_id    INT NOT NULL REFERENCES mercado.cargos_empresa(id) ON DELETE CASCADE,
    cargo_mercado_id    INT NOT NULL REFERENCES mercado.cargos(id) ON DELETE CASCADE,
    estudio_id          INT NOT NULL REFERENCES mercado.estudios(id) ON DELETE CASCADE,
    ranking             INT NOT NULL,
    score               NUMERIC(5,2),               -- 0-100, calculado por GPT
    score_embedding     NUMERIC(6,4),               -- 0-1, similitud coseno (pre-filtro)
    justificacion       TEXT,
    es_principal        BOOLEAN DEFAULT FALSE,
    validado_humano     BOOLEAN DEFAULT FALSE,
    validado_por        VARCHAR(100),
    fecha_homologacion  TIMESTAMP DEFAULT NOW(),
    fecha_validacion    TIMESTAMP,
    notas               TEXT,
    UNIQUE(cargo_empresa_id, cargo_mercado_id, estudio_id),
    CHECK (ranking BETWEEN 1 AND 5),
    CHECK (score IS NULL OR score BETWEEN 0 AND 100),
    CHECK (score_embedding IS NULL OR score_embedding BETWEEN 0 AND 1)
);

-- Solo un principal por (cargo_empresa, estudio).
CREATE UNIQUE INDEX idx_homologacion_principal_unico
    ON mercado.homologacion_cargos(cargo_empresa_id, estudio_id)
    WHERE es_principal = TRUE;

CREATE INDEX idx_homologacion_cargo_empresa ON mercado.homologacion_cargos(cargo_empresa_id);
CREATE INDEX idx_homologacion_cargo_mercado ON mercado.homologacion_cargos(cargo_mercado_id);
CREATE INDEX idx_homologacion_estudio       ON mercado.homologacion_cargos(estudio_id);
CREATE INDEX idx_homologacion_validado      ON mercado.homologacion_cargos(validado_humano);

COMMENT ON TABLE  mercado.homologacion_cargos              IS 'Vínculo cargo_empresa ↔ cargo_mercado, por estudio. Top 5 candidatos por cargo.';
COMMENT ON COLUMN mercado.homologacion_cargos.es_principal IS 'TRUE = match elegido (validado o ranking #1). Único por (cargo_empresa, estudio).';

-- =====================================================================
-- Tabla: embeddings (cargos de mercado)
-- =====================================================================

CREATE TABLE mercado.embeddings (
    cargo_id        INT PRIMARY KEY REFERENCES mercado.cargos(id) ON DELETE CASCADE,
    modelo          VARCHAR(100) NOT NULL,
    embedding       vector(1536) NOT NULL,
    hash_texto      VARCHAR(64),                    -- SHA-256 del texto fuente, para invalidación
    generado_at     TIMESTAMP DEFAULT NOW()
);

-- ivfflat con cosine similarity (text-embedding-3-small).
-- lists ≈ sqrt(n_filas). Para ~5600 cargos: sqrt = 75 → redondeo a 100.
CREATE INDEX idx_embeddings_vector
    ON mercado.embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMENT ON TABLE mercado.embeddings IS 'Embeddings precomputados de los cargos de mercado, para búsqueda semántica.';

-- =====================================================================
-- Tabla: embeddings_cargos_empresa
-- =====================================================================

CREATE TABLE mercado.embeddings_cargos_empresa (
    cargo_empresa_id    INT PRIMARY KEY REFERENCES mercado.cargos_empresa(id) ON DELETE CASCADE,
    modelo              VARCHAR(100) NOT NULL,
    embedding           vector(1536) NOT NULL,
    hash_texto          VARCHAR(64),
    generado_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_embeddings_empresa_vector
    ON mercado.embeddings_cargos_empresa USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

COMMENT ON TABLE mercado.embeddings_cargos_empresa IS 'Embeddings de cargos de empresa, para matching de cargos nuevos vs catálogo.';

-- =====================================================================
-- Vista materializada: lo que consume la calculadora.
-- Cargo de empresa + match principal + percentiles del estudio vigente.
-- Una fila por (cargo_empresa, tipo_comp).
-- Refrescar tras cargar estudio nuevo o validar homologación:
--    REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente;
-- =====================================================================

CREATE MATERIALIZED VIEW mercado.v_cargo_empresa_mercado_vigente AS
SELECT
    ce.id                       AS cargo_empresa_id,
    ce.nombre_cargo,
    ce.codigo_interno,
    ce.area_id,
    ce.banda_min_mensual        AS banda_interna_min_mensual,
    ce.banda_max_mensual        AS banda_interna_max_mensual,
    mc.id                       AS mercado_cargo_id,
    mc.codigo                   AS codigo_mercado,
    mc.titulo_puesto            AS titulo_mercado,
    mc.familia_nombre,
    mc.subfamilia_nombre,
    mc.nivel_nombre,
    mc.dataset                  AS dataset_mercado,    -- 'core_jobs' (MVP) | 'jobs' (granular)
    est.id                      AS estudio_id,
    est.nombre                  AS estudio_nombre,
    est.proveedor               AS estudio_proveedor,
    est.año                     AS estudio_año,
    est.moneda,
    comp.tipo_comp,
    comp.n_companias,
    comp.n_observaciones,
    -- Valores ANUALES (como vienen del estudio).
    -- La conversión a mensual (anual / 12 para Chile) la hace el backend de la calculadora.
    comp.percentil_25           AS p25_anual,
    comp.mediana                AS mediana_anual,
    comp.promedio               AS promedio_anual,
    comp.percentil_75           AS p75_anual,
    h.score                     AS score_homologacion,
    h.justificacion             AS homologacion_justificacion,
    h.validado_humano           AS homologacion_validada
FROM      mercado.cargos_empresa     ce
JOIN      mercado.homologacion_cargos h   ON h.cargo_empresa_id = ce.id AND h.es_principal = TRUE
JOIN      mercado.estudios            est ON est.id = h.estudio_id     AND est.vigente    = TRUE
JOIN      mercado.cargos              mc  ON mc.id  = h.cargo_mercado_id
JOIN      mercado.compensacion        comp ON comp.cargo_id = mc.id
WHERE     ce.vigente = TRUE;

-- Índice único requerido para REFRESH MATERIALIZED VIEW CONCURRENTLY (sin lock).
CREATE UNIQUE INDEX idx_vw_cargo_empresa_mercado_pk
    ON mercado.v_cargo_empresa_mercado_vigente(cargo_empresa_id, tipo_comp);

CREATE INDEX idx_vw_cargo_empresa_mercado_nombre
    ON mercado.v_cargo_empresa_mercado_vigente(nombre_cargo);

COMMENT ON MATERIALIZED VIEW mercado.v_cargo_empresa_mercado_vigente IS
    'Vista plana para la calculadora: cargo de empresa + percentiles de mercado del estudio vigente. Refrescar con REFRESH MATERIALIZED VIEW CONCURRENTLY tras cargas/validaciones.';

-- =====================================================================
-- Permisos sugeridos (ajustar a roles reales del DBA)
-- =====================================================================

-- App de la calculadora (solo lectura):
-- GRANT USAGE  ON SCHEMA mercado TO calculadora_app;
-- GRANT SELECT ON ALL TABLES IN SCHEMA mercado TO calculadora_app;
-- GRANT SELECT ON mercado.v_cargo_empresa_mercado_vigente TO calculadora_app;

-- ETL/loader (escritura):
-- GRANT USAGE             ON SCHEMA mercado TO etl_loader;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA mercado TO etl_loader;
-- GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA mercado TO etl_loader;
