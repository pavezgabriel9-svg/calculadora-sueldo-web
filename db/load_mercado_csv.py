"""
load_mercado_csv.py — Loader autónomo de CSV de mercado al schema `mercado`.

Parsea CSV de estudios tipo TRS (Core Jobs y Jobs) e inserta en:
  - mercado.estudios
  - mercado.cargos
  - mercado.compensacion

Idempotente: usa ON CONFLICT DO UPDATE, se puede reejecutar.

Uso típico:
    python load_mercado_csv.py /ruta/al/archivo.csv \\
        --estudio-nombre "TRS 2025" \\
        --estudio-proveedor "TRS" \\
        --estudio-año 2025 \\
        --vigente

Variables de entorno (.env):
    PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD
    o bien PG_DSN (string completo psycopg2)

Dependencias:
    pip install pandas psycopg2-binary python-dotenv
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
log = logging.getLogger('load_mercado_csv')


# =====================================================================
# Mapeo CSV → BD
# =====================================================================

# Orden de los 8 tipos de compensación tal como aparecen en el CSV.
# Cada tipo ocupa 6 columnas consecutivas (n_companias, n_obs, p25, prom, mediana, p75).
COMP_TYPES: List[str] = [
    'salario_base',                    # COMP1: Salario Base Anual
    'efectivo_garantizado',            # COMP2: Efectivo Garantizado Anual
    'efectivo_total_target',           # COMP3 TARGET: Efectivo Total Anual
    'efectivo_total_real',             # COMP3 REAL: Efectivo Total Anual
    'comp_total_directa_target',       # COMP4 TARGET: Compensación Total Directa Anual
    'comp_total_directa_real',         # COMP4 REAL: Compensación Total Directa Anual
    'remuneracion_total_target',       # COMP5 TARGET: Remuneración Total Anual
    'remuneracion_total_real',         # COMP5 REAL: Remuneración Total Anual
]

COMP_METRICS: List[str] = [
    'n_companias', 'n_observaciones', 'p25', 'promedio', 'mediana', 'p75'
]

# Columnas de metadata del cargo, por tipo de dataset.
META_COLS_CORE: List[str] = [
    'codigo', 'familia_codigo', 'subfamilia_codigo', 'especializacion_codigo',
    'nivel_codigo', 'titulo_puesto', 'descripcion',
    'familia_nombre', 'subfamilia_nombre', 'nivel_nombre',
]

META_COLS_JOBS: List[str] = [
    'codigo', 'familia_codigo', 'subfamilia_codigo', 'especializacion_codigo',
    'nivel_codigo', 'titulo_puesto', 'titulo_tipico', 'descripcion',
    'familia_nombre', 'subfamilia_nombre', 'nivel_nombre',
]

# Total esperado: meta + 8 comp × 6 métricas = 58 (core) o 59 (jobs).
EXPECTED_COLS_CORE = len(META_COLS_CORE) + len(COMP_TYPES) * len(COMP_METRICS)   # 58
EXPECTED_COLS_JOBS = len(META_COLS_JOBS) + len(COMP_TYPES) * len(COMP_METRICS)   # 59


def comp_column_names() -> List[str]:
    """Genera los 48 nombres de columnas de compensación: '<tipo>__<metrica>'."""
    return [f'{tipo}__{metrica}' for tipo in COMP_TYPES for metrica in COMP_METRICS]


# =====================================================================
# Parsing
# =====================================================================

def parse_chilean_number(val) -> Optional[float]:
    """
    Convierte número formato chileno a float.
        '55.714.472'   → 55714472.0    (puntos = miles)
        '1.234,56'     → 1234.56       (coma = decimal)
        '' / '-' / NaN → None
    """
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s in ('', '-'):
        return None
    try:
        if ',' in s:
            return float(s.replace('.', '').replace(',', '.'))
        return float(s.replace('.', ''))
    except ValueError:
        log.warning(f"Valor numérico no parseable: {val!r}")
        return None


def detect_dataset(csv_path: Path) -> str:
    """
    Detecta si el CSV es 'core_jobs' (58 cols) o 'jobs' (59 cols)
    leyendo solo las primeras filas de datos.
    """
    df = pd.read_csv(csv_path, skiprows=2, header=None, nrows=5, dtype=str, keep_default_na=False)
    n_cols = df.shape[1]
    if n_cols == EXPECTED_COLS_CORE:
        return 'core_jobs'
    if n_cols == EXPECTED_COLS_JOBS:
        return 'jobs'
    raise ValueError(
        f"Número de columnas inesperado: {n_cols}. "
        f"Esperaba {EXPECTED_COLS_CORE} (core_jobs) o {EXPECTED_COLS_JOBS} (jobs)."
    )


def load_csv(csv_path: Path, dataset: str) -> Tuple[pd.DataFrame, List[str]]:
    """Carga el CSV completo aplicando los nombres de columna correctos."""
    meta_cols = META_COLS_CORE if dataset == 'core_jobs' else META_COLS_JOBS
    all_cols = meta_cols + comp_column_names()

    df = pd.read_csv(
        csv_path,
        skiprows=2,
        header=None,
        names=all_cols,
        dtype=str,
        keep_default_na=False,
        na_values=[''],
    )

    # Filtra filas sin código (típicamente líneas vacías al final).
    df = df[df['codigo'].notna() & (df['codigo'].str.strip() != '')]
    log.info(f"CSV cargado: {len(df)} filas de cargos, dataset='{dataset}'")
    return df, meta_cols


def _clean(s) -> Optional[str]:
    """Strip y conversión de '' a None."""
    if s is None or pd.isna(s):
        return None
    s = str(s).strip()
    return s if s else None


# =====================================================================
# Carga a BD
# =====================================================================

def get_or_create_estudio(
    conn,
    nombre: str,
    proveedor: str,
    año: int,
    vigente: bool,
) -> int:
    """Devuelve el id del estudio, creándolo si no existe. Si vigente=True, marca este y desmarca otros del mismo proveedor."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM mercado.estudios WHERE nombre=%s AND proveedor=%s AND año=%s",
            (nombre, proveedor, año),
        )
        row = cur.fetchone()
        if row:
            estudio_id = row[0]
            log.info(f"Estudio existente: id={estudio_id}")
        else:
            cur.execute(
                """INSERT INTO mercado.estudios (nombre, proveedor, año, vigente)
                   VALUES (%s, %s, %s, FALSE)
                   RETURNING id""",
                (nombre, proveedor, año),
            )
            estudio_id = cur.fetchone()[0]
            log.info(f"Estudio creado: id={estudio_id}")

        if vigente:
            # Desmarca el anterior vigente del mismo proveedor (índice parcial único).
            cur.execute(
                "UPDATE mercado.estudios SET vigente=FALSE WHERE proveedor=%s AND vigente=TRUE AND id<>%s",
                (proveedor, estudio_id),
            )
            cur.execute(
                "UPDATE mercado.estudios SET vigente=TRUE WHERE id=%s",
                (estudio_id,),
            )
            log.info(f"Estudio id={estudio_id} marcado como vigente para proveedor '{proveedor}'")

        return estudio_id


def insert_cargos(
    conn,
    df: pd.DataFrame,
    meta_cols: List[str],
    estudio_id: int,
    dataset: str,
) -> Dict[str, int]:
    """INSERT/UPDATE en mercado.cargos. Devuelve {codigo: cargo_id}."""
    has_titulo_tipico = 'titulo_tipico' in meta_cols
    rows = []
    for _, row in df.iterrows():
        codigo = _clean(row['codigo'])
        if not codigo:
            continue
        rows.append((
            estudio_id,
            codigo,
            _clean(row['familia_codigo']),
            _clean(row['subfamilia_codigo']),
            _clean(row['especializacion_codigo']),
            _clean(row['nivel_codigo']),
            _clean(row['titulo_puesto']),
            _clean(row['titulo_tipico']) if has_titulo_tipico else None,
            _clean(row['descripcion']),
            _clean(row['familia_nombre']),
            _clean(row['subfamilia_nombre']),
            _clean(row['nivel_nombre']),
            dataset,
        ))

    sql = """
        INSERT INTO mercado.cargos (
            estudio_id, codigo, familia_codigo, subfamilia_codigo,
            especializacion_codigo, nivel_codigo, titulo_puesto, titulo_tipico,
            descripcion, familia_nombre, subfamilia_nombre, nivel_nombre, dataset
        ) VALUES %s
        ON CONFLICT (estudio_id, codigo) DO UPDATE SET
            familia_codigo         = EXCLUDED.familia_codigo,
            subfamilia_codigo      = EXCLUDED.subfamilia_codigo,
            especializacion_codigo = EXCLUDED.especializacion_codigo,
            nivel_codigo           = EXCLUDED.nivel_codigo,
            titulo_puesto          = EXCLUDED.titulo_puesto,
            titulo_tipico          = EXCLUDED.titulo_tipico,
            descripcion            = EXCLUDED.descripcion,
            familia_nombre         = EXCLUDED.familia_nombre,
            subfamilia_nombre      = EXCLUDED.subfamilia_nombre,
            nivel_nombre           = EXCLUDED.nivel_nombre
        RETURNING id, codigo
    """

    with conn.cursor() as cur:
        results = execute_values(cur, sql, rows, fetch=True, page_size=500)

    cargo_ids = {codigo: cargo_id for cargo_id, codigo in results}
    log.info(f"Cargos insertados/actualizados: {len(cargo_ids)}")
    return cargo_ids


def insert_compensacion(conn, df: pd.DataFrame, cargo_ids: Dict[str, int]) -> None:
    """INSERT/UPDATE en mercado.compensacion. Hasta 8 filas por cargo."""
    rows = []
    skipped_empty = 0

    for _, csv_row in df.iterrows():
        codigo = _clean(csv_row['codigo'])
        cargo_id = cargo_ids.get(codigo)
        if not cargo_id:
            continue

        for tipo_comp in COMP_TYPES:
            n_comp = parse_chilean_number(csv_row[f'{tipo_comp}__n_companias'])
            n_obs = parse_chilean_number(csv_row[f'{tipo_comp}__n_observaciones'])
            p25 = parse_chilean_number(csv_row[f'{tipo_comp}__p25'])
            promedio = parse_chilean_number(csv_row[f'{tipo_comp}__promedio'])
            mediana = parse_chilean_number(csv_row[f'{tipo_comp}__mediana'])
            p75 = parse_chilean_number(csv_row[f'{tipo_comp}__p75'])

            # Salta filas enteramente vacías (sin compañías ni observaciones ni percentiles).
            if all(v is None for v in (n_comp, n_obs, p25, promedio, mediana, p75)):
                skipped_empty += 1
                continue

            rows.append((
                cargo_id,
                tipo_comp,
                int(n_comp) if n_comp is not None else None,
                int(n_obs) if n_obs is not None else None,
                p25, promedio, mediana, p75,
            ))

    sql = """
        INSERT INTO mercado.compensacion (
            cargo_id, tipo_comp, n_companias, n_observaciones,
            percentil_25, promedio, mediana, percentil_75
        ) VALUES %s
        ON CONFLICT (cargo_id, tipo_comp) DO UPDATE SET
            n_companias     = EXCLUDED.n_companias,
            n_observaciones = EXCLUDED.n_observaciones,
            percentil_25    = EXCLUDED.percentil_25,
            promedio        = EXCLUDED.promedio,
            mediana         = EXCLUDED.mediana,
            percentil_75    = EXCLUDED.percentil_75
    """
    with conn.cursor() as cur:
        execute_values(cur, sql, rows, page_size=500)
    log.info(f"Compensación insertada/actualizada: {len(rows)} filas. Saltadas (vacías): {skipped_empty}")


# =====================================================================
# Conexión
# =====================================================================

def build_dsn() -> str:
    """Construye un DSN psycopg2 desde PG_DSN o variables individuales."""
    dsn = os.getenv('PG_DSN')
    if dsn:
        return dsn

    host = os.getenv('PG_HOST')
    port = os.getenv('PG_PORT', '5432')
    database = os.getenv('PG_DATABASE')
    user = os.getenv('PG_USER')
    password = os.getenv('PG_PASSWORD')

    missing = [k for k, v in [
        ('PG_HOST', host), ('PG_DATABASE', database),
        ('PG_USER', user), ('PG_PASSWORD', password)
    ] if not v]
    if missing:
        raise RuntimeError(
            f"Faltan variables de entorno: {missing}. "
            f"Definí PG_DSN o PG_HOST/PG_DATABASE/PG_USER/PG_PASSWORD."
        )
    return f"host={host} port={port} dbname={database} user={user} password={password}"


def verify_schema(conn) -> None:
    """Verifica que el schema mercado y sus tablas existan antes de cargar."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'mercado'
              AND table_name IN ('estudios', 'cargos', 'compensacion')
        """)
        found = {r[0] for r in cur.fetchall()}
    missing = {'estudios', 'cargos', 'compensacion'} - found
    if missing:
        raise RuntimeError(
            f"El schema 'mercado' no tiene las tablas requeridas: {missing}. "
            f"Ejecutá primero db/schema_mercado.sql."
        )


# =====================================================================
# Main
# =====================================================================

def main() -> int:
    parser = argparse.ArgumentParser(
        description='Carga CSV de mercado (TRS y similares) al schema mercado de rh_cramer.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('csv_path', type=str, help='Ruta al CSV.')
    parser.add_argument('--estudio-nombre', required=True, help='ej. "TRS 2025"')
    parser.add_argument('--estudio-proveedor', required=True, help='ej. "TRS", "Mercer"')
    parser.add_argument('--estudio-año', type=int, required=True, help='Año del estudio')
    parser.add_argument('--vigente', action='store_true',
                        help='Marca este estudio como vigente (desmarca otros del mismo proveedor).')
    parser.add_argument('--dataset', choices=['core_jobs', 'jobs', 'auto'], default='auto',
                        help='Forzar dataset o autodetectar por nº de columnas (default: auto).')
    parser.add_argument('--dry-run', action='store_true',
                        help='Ejecuta todo pero hace ROLLBACK al final (validación end-to-end).')
    args = parser.parse_args()

    csv_path = Path(args.csv_path).expanduser().resolve()
    if not csv_path.exists():
        log.error(f"No existe el archivo: {csv_path}")
        return 1

    dataset = args.dataset if args.dataset != 'auto' else detect_dataset(csv_path)
    log.info(f"CSV: {csv_path}")
    log.info(f"Dataset: {dataset}")

    df, meta_cols = load_csv(csv_path, dataset)

    try:
        dsn = build_dsn()
    except RuntimeError as e:
        log.error(str(e))
        return 1

    conn = psycopg2.connect(dsn)
    try:
        verify_schema(conn)

        estudio_id = get_or_create_estudio(
            conn,
            args.estudio_nombre,
            args.estudio_proveedor,
            args.estudio_año,
            args.vigente,
        )

        cargo_ids = insert_cargos(conn, df, meta_cols, estudio_id, dataset)
        insert_compensacion(conn, df, cargo_ids)

        if args.dry_run:
            conn.rollback()
            log.warning("DRY RUN: rollback ejecutado. Nada se persistió.")
        else:
            conn.commit()
            log.info("✓ Commit completado.")

            # Sugerencia de refresh, no la corremos automáticamente: solo si ya hay homologaciones.
            log.info(
                "Recordá refrescar la vista materializada cuando haya homologaciones nuevas:\n"
                "    REFRESH MATERIALIZED VIEW CONCURRENTLY mercado.v_cargo_empresa_mercado_vigente;"
            )
        return 0

    except Exception:
        conn.rollback()
        log.exception("Error durante la carga, rollback ejecutado.")
        return 1
    finally:
        conn.close()


if __name__ == '__main__':
    sys.exit(main())
