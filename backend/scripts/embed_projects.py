"""
Batch Embedding Generation Script

Generates embeddings for all NASA projects using sentence-transformers.
Can be run as a Modal function with: modal run scripts/embed_projects.py

Features:
- Processes projects in batches of 100 to avoid timeouts
- Updates embedding_updated_at and embedding_model columns
- Skips projects that already have embeddings (can force refresh with --refresh flag)
- Provides progress tracking and performance metrics
"""

import sys
import os
import time
import logging
from typing import Optional

# Add backend to path for imports
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text
from app.db import create_db_engine, get_required_env
from app.embedding_model import embed_batch, MODEL_NAME, EMBEDDING_DIMENSION

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BATCH_SIZE = 100  # Process in batches to avoid timeouts


def get_projects_without_embeddings(
    database_url: str,
    limit: int = 1000,
) -> list[dict]:
    """Get projects that don't have embeddings yet."""
    sql = text(
        "SELECT id, title, description "
        "FROM projects "
        "WHERE embedding IS NULL "
        "LIMIT :limit"
    )
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, {"limit": limit}).mappings().all()
            return [dict(row) for row in rows]
    finally:
        engine.dispose()


def get_all_projects_for_refresh(
    database_url: str,
    limit: int = 1000,
) -> list[dict]:
    """Get all projects to refresh embeddings."""
    sql = text(
        "SELECT id, title, description "
        "FROM projects "
        "LIMIT :limit"
    )
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            rows = conn.execute(sql, {"limit": limit}).mappings().all()
            return [dict(row) for row in rows]
    finally:
        engine.dispose()


def update_embeddings(
    database_url: str,
    projects_with_embeddings: list[tuple],
) -> int:
    """
    Update the database with embeddings.
    
    Args:
        database_url: Database connection string
        projects_with_embeddings: List of (project_id, embedding_vector)
        
    Returns:
        Number of updated rows
    """
    if not projects_with_embeddings:
        return 0
    
    engine = create_db_engine(database_url)
    try:
        with engine.connect() as conn:
            updated_count = 0
            
            # Update in small batches to avoid overwhelming the connection
            for project_id, embedding_vector in projects_with_embeddings:
                sql = text(
                    "UPDATE projects "
                    "SET embedding = :embedding, "
                    "    embedding_updated_at = NOW(), "
                    "    embedding_model = :model "
                    "WHERE id = :id"
                )
                
                result = conn.execute(
                    sql,
                    {
                        "id": project_id,
                        "embedding": embedding_vector,
                        "model": f"{MODEL_NAME}-v1",
                    }
                )
                updated_count += result.rowcount
            
            conn.commit()
            return updated_count
    finally:
        engine.dispose()


def embed_projects(
    database_url: str,
    force_refresh: bool = False,
    max_projects: Optional[int] = None,
) -> dict:
    """
    Generate embeddings for projects.
    
    Args:
        database_url: Database connection string
        force_refresh: If True, refresh embeddings for all projects
        max_projects: Maximum number of projects to process
        
    Returns:
        Statistics about the embedding generation
    """
    logger.info(f"Starting embedding generation (force_refresh={force_refresh})")
    
    # Get projects needing embeddings
    if force_refresh:
        projects = get_all_projects_for_refresh(database_url, max_projects or 10000)
        logger.info(f"Force-refreshing embeddings for {len(projects)} projects")
    else:
        projects = get_projects_without_embeddings(database_url, max_projects or 10000)
        logger.info(f"Found {len(projects)} projects without embeddings")
    
    if not projects:
        logger.info("No projects to embed")
        return {
            "total_processed": 0,
            "embeddings_generated": 0,
            "elapsed_seconds": 0,
        }
    
    start_time = time.perf_counter()
    total_processed = 0
    projects_with_embeddings = []
    
    # Process in batches
    for i in range(0, len(projects), BATCH_SIZE):
        batch = projects[i : i + BATCH_SIZE]
        batch_start = time.perf_counter()
        
        logger.info(f"Processing batch {i // BATCH_SIZE + 1}: {len(batch)} projects")
        
        # Prepare text for embedding (combine title + description)
        texts = [
            f"{p['title']} {p['description'] or ''}"
            for p in batch
        ]
        
        try:
            # Generate embeddings for the batch
            embeddings = embed_batch(texts)
            
            # Pair project IDs with embeddings
            for project, embedding_vector in zip(batch, embeddings):
                projects_with_embeddings.append((project['id'], embedding_vector))
            
            # Update database with this batch
            updated = update_embeddings(database_url, [(p[0], p[1]) for p in projects_with_embeddings])
            projects_with_embeddings = []  # Clear for next batch
            
            batch_elapsed = time.perf_counter() - batch_start
            logger.info(
                f"Batch completed: {len(batch)} projects, "
                f"{updated} embeddings stored, {batch_elapsed:.1f}s"
            )
            total_processed += len(batch)
            
        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            # Continue with next batch
            continue
    
    elapsed = time.perf_counter() - start_time
    
    logger.info(
        f"Embedding generation complete: {total_processed} projects in {elapsed:.1f}s"
    )
    
    return {
        "total_processed": total_processed,
        "embeddings_generated": total_processed,
        "elapsed_seconds": elapsed,
        "avg_time_per_project": elapsed / total_processed if total_processed > 0 else 0,
    }


if __name__ == "__main__":
    # Can be run as a script or as a Modal function
    database_url = get_required_env("DATABASE_URL")
    
    # Check for --refresh flag to force refresh
    force_refresh = "--refresh" in sys.argv
    max_projects = None
    
    # Check for --max-projects argument
    if "--max-projects" in sys.argv:
        idx = sys.argv.index("--max-projects")
        if idx + 1 < len(sys.argv):
            max_projects = int(sys.argv[idx + 1])
    
    results = embed_projects(database_url, force_refresh=force_refresh, max_projects=max_projects)
    print("\n" + "=" * 60)
    print("Embedding Generation Results:")
    print("=" * 60)
    for key, value in results.items():
        print(f"  {key}: {value}")
    print("=" * 60)
