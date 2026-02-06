from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.db import engine
from app.schemas import ProjectOut

app = FastAPI()

# Enable CORS for frontend development server(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://192.168.1.227:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_db_check():
    """Verify DATABASE_URL connects successfully at startup."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connection established successfully.")
    except Exception as exc:  # pylint: disable=broad-except
        print("Database connection failed at startup:", exc)
        raise



@app.get("/health")
def health() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok"}


@app.get("/api/projects", response_model=List[ProjectOut])
def search_projects(
    q: Optional[str] = Query(default=None),
    trl_min: Optional[int] = Query(default=None),
    trl_max: Optional[int] = Query(default=None),
    organization: Optional[str] = Query(default=None),
    technology_area: Optional[str] = Query(default=None),
    order: Optional[str] = Query(default="title_asc"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    response: Response = None,
) -> List[ProjectOut]:
    where_clauses = []
    params = {"limit": limit, "offset": offset}

    if q:
        where_clauses.append(
            "to_tsvector('english', title || ' ' || coalesce(description, '')) "
            "@@ plainto_tsquery('english', :q)"
        )
        params["q"] = q

    if trl_min is not None:
        where_clauses.append("trl >= :trl_min")
        params["trl_min"] = trl_min

    if trl_max is not None:
        where_clauses.append("trl <= :trl_max")
        params["trl_max"] = trl_max

    if organization:
        where_clauses.append("organization = :organization")
        params["organization"] = organization

    if technology_area:
        where_clauses.append("technology_area = :technology_area")
        params["technology_area"] = technology_area

    where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    # Validate order param
    allowed_orders = {"relevance", "title_asc", "title_desc", "newest", "oldest", "id"}
    if order not in allowed_orders:
        raise HTTPException(status_code=400, detail="Invalid order parameter")

    # Compute ORDER BY SQL
    if order == "relevance" and q:
        order_sql = (
            " ORDER BY ts_rank(to_tsvector('english', title || ' ' "
            "|| coalesce(description, '')), plainto_tsquery('english', :q)) DESC, id"
        )
    elif order == "title_asc":
        order_sql = " ORDER BY lower(title) ASC, id"
    elif order == "title_desc":
        order_sql = " ORDER BY lower(title) DESC, id"
    elif order == "newest":
        order_sql = " ORDER BY last_updated DESC, id"
    elif order == "oldest":
        order_sql = " ORDER BY last_updated ASC, id"
    else:
        # Fallback to alphabetical when relevance isn't applicable
        order_sql = " ORDER BY lower(title) ASC, id"

    sql = text(
        "SELECT id, title, description, status, start_date, end_date, trl, "
        "organization, technology_area, last_updated "
        "FROM projects"
        f"{where_sql}"
        f"{order_sql}"
        " LIMIT :limit OFFSET :offset"
    )

    try:
        with engine.connect() as conn:
            # Get total count for pagination
            count_params = {k: v for k, v in params.items() if k not in ("limit", "offset")}
            count_sql = text("SELECT COUNT(*) FROM projects" + where_sql)
            total = conn.execute(count_sql, count_params).scalar_one()

            results = conn.execute(sql, params).mappings().all()
    except OperationalError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database query failed")

    # Set total count header for the frontend pagination UI
    if response is not None:
        response.headers["X-Total-Count"] = str(total)

    return [ProjectOut(**row) for row in results]

@app.get("/api/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int) -> ProjectOut:
    sql = text(
        "SELECT id, title, description, status, start_date, end_date, trl, "
        "organization, technology_area, last_updated "
        "FROM projects WHERE id = :project_id"
    )

    try:
        with engine.connect() as conn:
            result = conn.execute(sql, {"project_id": project_id}).mappings().first()
    except OperationalError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database query failed")

    if not result:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectOut(**result)
