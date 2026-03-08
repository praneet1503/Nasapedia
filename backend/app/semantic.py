"""
Semantic Search Module

Provides hybrid search combining:
1. Keyword-based full-text search (PostgreSQL tsvector)
2. Semantic similarity (pgvector embeddings)
3. Popularity/Recency ranking

The hybrid approach balances precision (keyword) and recall (semantic).
"""

import time
import logging
from typing import Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core import DatabaseQueryFailed, DatabaseUnavailable
from app.db import create_db_engine
from app.embedding_model import embed_text

logger = logging.getLogger(__name__)


def search_projects_hybrid(
    database_url: str,
    params: Dict[str, object],
    limit: int,
    offset: int,
    order: str,
    search_type: str = "keyword",
) -> Tuple[List[Dict[str, object]], int]:
    """
    Hybrid search combining keyword and semantic search.
    
    Args:
        database_url: PostgreSQL connection string
        params: Search parameters (q, trl_min, trl_max, organization, technology_area)
        limit: Results per page
        offset: Pagination offset
        order: Sort order
        search_type: "keyword" or "semantic" or "hybrid"
        
    Returns:
        Tuple of (results, total_count)
    """
    start_time = time.perf_counter()
    
    # Only semantic search requires embedding; keyword search is standard full-text
    if search_type == "semantic" and params.get("q"):
        return _semantic_search(database_url, params, limit, offset, order, start_time)
    elif search_type == "hybrid" and params.get("q"):
        return _hybrid_search(database_url, params, limit, offset, order, start_time)
    else:
        # Fall back to keyword search
        from app.core import _build_where, _order_sql
        return _keyword_search(database_url, params, limit, offset, order, start_time)


def _keyword_search(
    database_url: str,
    params: Dict[str, object],
    limit: int,
    offset: int,
    order: str,
    start_time: float,
) -> Tuple[List[Dict[str, object]], int]:
    """Standard full-text keyword search."""
    from app.core import _build_where, _order_sql
    
    where_sql, sql_params = _build_where(params)
    sql_params["limit"] = limit
    sql_params["offset"] = offset
    
    order_sql = _order_sql(order, params.get("q") if params else None)
    
    sql = text(
        "SELECT id, title, description, status, start_date, end_date, trl, "
        "organization, technology_area, last_updated, COALESCE(popularity_score, 0) AS popularity_score, "
        "COUNT(*) OVER() AS total_count "
        "FROM projects"
        f"{where_sql}"
        f"{order_sql}"
        " LIMIT :limit OFFSET :offset"
    )
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, sql_params).mappings().all()
            
            total = int(rows[0]['total_count']) if rows else 0
            result_rows = [{k: v for k, v in dict(row).items() if k != 'total_count'} for row in rows]
            
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                f"keyword_search: {elapsed_ms:.1f}ms | query='{params.get('q')}' | "
                f"results={len(result_rows)}/{total}"
            )
            
            return result_rows, total
    except OperationalError as exc:
        raise Exception("Database unavailable") from exc
    except SQLAlchemyError as exc:
        raise Exception("Database query failed") from exc


def _semantic_search(
    database_url: str,
    params: Dict[str, object],
    limit: int,
    offset: int,
    order: str,
    start_time: float,
) -> Tuple[List[Dict[str, object]], int]:
    """
    Pure semantic search using embeddings.
    
    Finds projects with similar meaning to the search query, regardless of exact keyword match.
    """
    logger.info("Starting Semantic Search V2")
    q = params.get("q", "")
    if not q:
        from app.core import _build_where, _order_sql
        return _keyword_search(database_url, params, limit, offset, order, start_time)
    
    try:
        # Generate embedding for the search query
        query_embedding = embed_text(str(q))
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        # Fall back to keyword search on error
        from app.core import _build_where, _order_sql
        return _keyword_search(database_url, params, limit, offset, order, start_time)
    
    # Build WHERE clause for filters (trl_min, trl_max, organization, etc.)
    where_parts = []
    sql_params = {}
    
    trl_min = params.get("trl_min")
    if trl_min is not None:
        where_parts.append("trl >= :trl_min")
        sql_params["trl_min"] = trl_min
    
    trl_max = params.get("trl_max")
    if trl_max is not None:
        where_parts.append("trl <= :trl_max")
        sql_params["trl_max"] = trl_max
    
    organization = params.get("organization")
    if organization:
        where_parts.append("organization = :organization")
        sql_params["organization"] = organization
    
    technology_area = params.get("technology_area")
    if technology_area:
        where_parts.append("technology_area = :technology_area")
        sql_params["technology_area"] = technology_area
    
    # Only search projects with embeddings
    where_parts.append("embedding IS NOT NULL")
    
    where_sql = " WHERE " + " AND ".join(where_parts) if where_parts else " WHERE embedding IS NOT NULL"
    
    sql_params["limit"] = limit
    sql_params["offset"] = offset
    # Convert embedding list to string format '[1.0,2.0,...]' for pgvector
    sql_params["embedding"] = str(query_embedding)
    
    # Semantic search: use <-> operator (cosine distance)
    # PostgreSQL pgvector: smaller distance = more similar
    sql = text(
        "SELECT id, title, description, status, start_date, end_date, trl, "
        "organization, technology_area, last_updated, COALESCE(popularity_score, 0) AS popularity_score, "
        "1 - (embedding <-> CAST(:embedding AS vector)) AS semantic_score, "
        "COUNT(*) OVER() AS total_count "
        "FROM projects"
        f"{where_sql}"
        " ORDER BY semantic_score DESC, id"
        " LIMIT :limit OFFSET :offset"
    )
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, sql_params).mappings().all()
            
            total = int(rows[0]['total_count']) if rows else 0
            # Remove internal scoring columns
            result_rows = [
                {k: v for k, v in dict(row).items() if k not in ('total_count', 'semantic_score')}
                for row in rows
            ]
            
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return result_rows, total
    except OperationalError as exc:
        raise Exception("Database unavailable") from exc
    except SQLAlchemyError as exc:
        logger.error(f"Semantic search query failed: {exc}")
        raise Exception("Database query failed") from exc


def _hybrid_search(
    database_url: str,
    params: Dict[str, object],
    limit: int,
    offset: int,
    order: str,
    start_time: float,
) -> Tuple[List[Dict[str, object]], int]:
    """
    Hybrid search combining keyword and semantic scoring.
    
    Combines:
    - Keyword relevance (ts_rank): 40%
    - Semantic similarity: 50%
    - Popularity/Recency bonus: 10%
    """
    q = params.get("q", "")
    if not q:
        from app.core import _build_where, _order_sql
        return _keyword_search(database_url, params, limit, offset, order, start_time)
    
    try:
        query_embedding = embed_text(str(q))
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        from app.core import _build_where, _order_sql
        return _keyword_search(database_url, params, limit, offset, order, start_time)
    
    # Build WHERE clause for filters
    where_parts = []
    where_parts.append(
        "to_tsvector('english', title || ' ' || coalesce(description, '')) "
        "@@ plainto_tsquery('english', :q)"
    )
    sql_params = {"q": q}
    
    trl_min = params.get("trl_min")
    if trl_min is not None:
        where_parts.append("trl >= :trl_min")
        sql_params["trl_min"] = trl_min
    
    trl_max = params.get("trl_max")
    if trl_max is not None:
        where_parts.append("trl <= :trl_max")
        sql_params["trl_max"] = trl_max
    
    organization = params.get("organization")
    if organization:
        where_parts.append("organization = :organization")
        sql_params["organization"] = organization
    
    technology_area = params.get("technology_area")
    if technology_area:
        where_parts.append("technology_area = :technology_area")
        sql_params["technology_area"] = technology_area
    
    where_sql = " WHERE " + " AND ".join(where_parts) if where_parts else ""
    
    sql_params["limit"] = limit
    sql_params["offset"] = offset
    # Convert embedding list to string format '[1.0,2.0,...]' for pgvector
    # This ensures it's treated as a vector literal, not a Postgres array
    sql_params["embedding"] = str(query_embedding)
    
    # Hybrid scoring: keyword (40%) + semantic (50%) + popularity (10%)
    sql = text(
        "SELECT id, title, description, status, start_date, end_date, trl, "
        "organization, technology_area, last_updated, COALESCE(popularity_score, 0) AS popularity_score, "
        "("
        "  ts_rank(to_tsvector('english', title || ' ' || coalesce(description, '')), "
        "          plainto_tsquery('english', :q)) * 0.4 + "
        "  COALESCE((1 - (embedding <-> CAST(:embedding AS vector))::numeric), 0) * 0.5 + "
        "  COALESCE((COALESCE(popularity_score, 0) / NULLIF(MAX(popularity_score) OVER(), 0)), 0) * 0.1 "
        ") AS combined_score, "
        "COUNT(*) OVER() AS total_count "
        "FROM projects"
        f"{where_sql}"
        " ORDER BY combined_score DESC, id"
        " LIMIT :limit OFFSET :offset"
    )
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, sql_params).mappings().all()
            
            total = int(rows[0]['total_count']) if rows else 0
            # Remove internal scoring columns
            result_rows = [
                {k: v for k, v in dict(row).items() if k not in ('total_count', 'combined_score')}
                for row in rows
            ]
            
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return result_rows, total
    except OperationalError as exc:
        raise Exception("Database unavailable") from exc
    except SQLAlchemyError as exc:
        logger.error(f"Hybrid search query failed: {exc}")
        raise Exception("Database query failed") from exc
