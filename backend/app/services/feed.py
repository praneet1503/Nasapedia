import random
from typing import Dict, List, Optional, Tuple

from sqlalchemy import bindparam, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core import DatabaseQueryFailed, DatabaseUnavailable
from app.db import create_db_engine

POPULARITY_WEIGHT = 0.7
RECENCY_WEIGHT = 0.3
DEFAULT_PER_PAGE = 20
MIN_RANDOM_PER_PAGE = 3
RANDOM_POOL_MULTIPLIER = 3


def _adaptive_score_sql() -> str:
    return (
        "(" 
        "(:popularity_weight * COALESCE(p.popularity_score, 0)) + "
        "(:recency_weight * (1.0 / (GREATEST(EXTRACT(EPOCH FROM (now() - p.last_updated)) / 86400.0, 0) + 1.0)))"
        ")"
    )


def record_project_click(database_url: str, visitor_uuid: str, project_id: int) -> Dict[str, object]:
    engine = create_db_engine(database_url)
    try:
        with engine.begin() as conn:
            insert_sql = text(
                "INSERT INTO project_clicks (project_id, visitor_uuid) "
                "VALUES (:project_id, :visitor_uuid) "
                "ON CONFLICT (project_id, visitor_uuid) DO NOTHING"
            )
            result = conn.execute(
                insert_sql,
                {"project_id": project_id, "visitor_uuid": visitor_uuid},
            )

            inserted = bool(result.rowcount and result.rowcount > 0)
            if inserted:
                conn.execute(
                    text(
                        "UPDATE projects "
                        "SET popularity_score = COALESCE(popularity_score, 0) + 1 "
                        "WHERE id = :project_id"
                    ),
                    {"project_id": project_id},
                )

            return {
                "project_id": project_id,
                "visitor_uuid": visitor_uuid,
                "counted": inserted,
            }
    except OperationalError as exc:
        raise DatabaseUnavailable("Database unavailable") from exc
    except SQLAlchemyError as exc:
        raise DatabaseQueryFailed("Database query failed") from exc
    finally:
        engine.dispose()


def _get_total_count(conn, include_empty_descriptions: bool) -> int:
    if include_empty_descriptions:
        total = conn.execute(text("SELECT COUNT(*) FROM projects")).scalar_one()
    else:
        total = conn.execute(
            text("SELECT COUNT(*) FROM projects WHERE description IS NOT NULL AND btrim(description) <> ''")
        ).scalar_one()
    return int(total)


def _ranked_page_rows(conn, page: int, per_page: int, include_empty_descriptions: bool) -> List[Dict[str, object]]:
    offset = max(page - 1, 0) * per_page
    score_sql = _adaptive_score_sql()
    where_clause = ""
    if not include_empty_descriptions:
        where_clause = "WHERE p.description IS NOT NULL AND btrim(p.description) <> '' "

    sql = text(
        "SELECT p.id, p.title, p.description, p.status, p.start_date, p.end_date, p.trl, "
        "p.organization, p.technology_area, p.last_updated, COALESCE(p.popularity_score, 0) AS popularity_score, "
        f"{score_sql} AS adaptive_score "
        "FROM projects p "
        f"{where_clause}"
        "ORDER BY adaptive_score DESC, p.id "
        "LIMIT :limit OFFSET :offset"
    )

    rows = conn.execute(
        sql,
        {
            "limit": per_page,
            "offset": offset,
            "popularity_weight": POPULARITY_WEIGHT,
            "recency_weight": RECENCY_WEIGHT,
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def _random_rows(conn, exclude_ids: List[int], desired_count: int, include_empty_descriptions: bool) -> List[Dict[str, object]]:
    if desired_count <= 0:
        return []

    params: Dict[str, object] = {"limit": desired_count * RANDOM_POOL_MULTIPLIER}
    where_clauses: List[str] = []
    if exclude_ids:
        where_clauses.append("p.id NOT IN :exclude_ids")
        params["exclude_ids"] = tuple(exclude_ids)

    if not include_empty_descriptions:
        where_clauses.append("p.description IS NOT NULL AND btrim(p.description) <> ''")

    where_exclude = ""
    if where_clauses:
        where_exclude = "WHERE " + " AND ".join(where_clauses) + " "

    sql = text(
        "SELECT p.id, p.title, p.description, p.status, p.start_date, p.end_date, p.trl, "
        "p.organization, p.technology_area, p.last_updated, COALESCE(p.popularity_score, 0) AS popularity_score "
        "FROM projects p "
        f"{where_exclude}"
        "ORDER BY random() "
        "LIMIT :limit"
    )

    if exclude_ids:
        sql = sql.bindparams(bindparam("exclude_ids", expanding=True))

    if exclude_ids:
        sql = sql.bindparams(bindparam("exclude_ids", expanding=True))

    rows = conn.execute(sql, params).mappings().all()
    random_candidates = [dict(row) for row in rows]
    if len(random_candidates) <= desired_count:
        return random_candidates
    return random.sample(random_candidates, desired_count)


def _light_shuffle(items: List[Dict[str, object]], seed: int) -> List[Dict[str, object]]:
    if len(items) < 2:
        return items
    rng = random.Random(seed)
    shuffled = list(items)
    rng.shuffle(shuffled)
    return shuffled


def get_adaptive_feed(
    database_url: str,
    page: int = 1,
    per_page: int = DEFAULT_PER_PAGE,
    visitor_uuid: Optional[str] = None,
    include_empty_descriptions: bool = False,
) -> Tuple[List[Dict[str, object]], int]:
    safe_page = max(page, 1)
    safe_per_page = max(per_page, 1)

    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            total = _get_total_count(conn, include_empty_descriptions)
            ranked_rows = _ranked_page_rows(conn, safe_page, safe_per_page, include_empty_descriptions)

            ranked_ids = [int(row["id"]) for row in ranked_rows]
            max_random = min(MIN_RANDOM_PER_PAGE, max(total - len(ranked_ids), 0))
            random_rows = _random_rows(conn, ranked_ids, max_random, include_empty_descriptions)

            retained_ranked_count = max(safe_per_page - len(random_rows), 0)
            combined_rows = ranked_rows[:retained_ranked_count] + random_rows

            # Ensure no duplicates and preserve first occurrence
            unique_rows: List[Dict[str, object]] = []
            seen_ids = set()
            for row in combined_rows:
                row_id = int(row["id"])
                if row_id in seen_ids:
                    continue
                seen_ids.add(row_id)
                row.pop("adaptive_score", None)
                unique_rows.append(row)

            seed_basis = f"{visitor_uuid or 'anon'}:{safe_page}"
            seed = abs(hash(seed_basis)) % (2**32)
            final_rows = _light_shuffle(unique_rows, seed)
            return final_rows, total
    except OperationalError as exc:
        raise DatabaseUnavailable("Database unavailable") from exc
    except SQLAlchemyError as exc:
        raise DatabaseQueryFailed("Database query failed") from exc
    finally:
        engine.dispose()
