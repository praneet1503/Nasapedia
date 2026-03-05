import argparse
import logging
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
import json

import requests
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_thread_local = threading.local()
SESSION_POOL_SIZE = 10

def get_session() -> requests.Session:
    """Return a thread-local requests.Session configured with a pooled HTTPAdapter
    and retries. SESSION_POOL_SIZE should be set in main() after parsing args."""
    s = getattr(_thread_local, "session", None)
    if s is None:
        s = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["GET", "POST", "PUT", "DELETE", "HEAD"]),
        )
        adapter = HTTPAdapter(pool_connections=SESSION_POOL_SIZE, pool_maxsize=SESSION_POOL_SIZE, max_retries=retries)
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        _thread_local.session = s
    return s

try:
    from tqdm import tqdm
except Exception:
    tqdm = None

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.append(str(BACKEND_DIR))

from app.db import create_db_engine, get_required_env

engine = None


API_BASE_URL = "https://techport.nasa.gov/api"

UPSERT_SQL = text(
    "INSERT INTO projects ("
    "id, title, description, status, start_date, end_date, trl, "
    "organization, technology_area, last_updated"
    ") VALUES ("
    ":id, :title, :description, :status, :start_date, :end_date, :trl, "
    ":organization, :technology_area, now()"
    ") ON CONFLICT (id) DO UPDATE SET "
    "title = EXCLUDED.title, "
    "description = EXCLUDED.description, "
    "status = EXCLUDED.status, "
    "start_date = EXCLUDED.start_date, "
    "end_date = EXCLUDED.end_date, "
    "trl = EXCLUDED.trl, "
    "organization = EXCLUDED.organization, "
    "technology_area = EXCLUDED.technology_area, "
    "last_updated = now()"
)


def parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def parse_trl(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def normalize_project(project: Dict[str, Any]) -> Dict[str, Any]:
    lead_org = project.get("leadOrganization") or {}
    organizations = project.get("organizations") or []

    organization = lead_org.get("name")
    if not organization and organizations:
        organization = organizations[0].get("name")

    status_value = project.get("status")
    if isinstance(status_value, dict):
        status_value = status_value.get("description") or status_value.get("name")

    tech_area = project.get("technologyArea") or {}

    raw_id = project.get("id") or project.get("projectId")
    if raw_id is None:
        raise ValueError("Missing project id")

    return {
        "id": int(raw_id),
        "title": project.get("title") or "",
        "description": project.get("description"),
        "status": status_value,
        "start_date": parse_date(project.get("startDate")),
        "end_date": parse_date(project.get("endDate")),
        "trl": parse_trl(project.get("trl")),
        "organization": organization,
        "technology_area": tech_area.get("title"),
    }


def fetch_project_ids(api_key: str) -> Iterable[int]:
    offset = 0
    limit = 100

    while True:
        logging.debug("Fetching project list offset=%d limit=%d", offset, limit)
        session = get_session()
        response = session.get(
            f"{API_BASE_URL}/projects",
            params={"api_key": api_key, "offset": offset, "limit": limit},
            timeout=30,
        )
        if response.status_code != 200:
            raise RuntimeError(
                f"Failed to fetch project list: {response.status_code} {response.text}"
            )

        try:
            data = response.json()
        except Exception as exc:
            logging.error("Failed to parse JSON for offset=%d: %s", offset, exc)
            break

        projects = data.get("projects") if isinstance(data, dict) else None
        total_count = None
        if isinstance(data, dict) and "totalCount" in data:
            try:
                total_count = int(data.get("totalCount"))
            except Exception:
                total_count = None

        if projects is None:
            if isinstance(data, list):
                projects = data
            else:
                logging.debug("No 'projects' list in response for offset=%d; keys=%s", offset, list(data.keys()) if isinstance(data, dict) else type(data))
                break

        if not projects:
            logging.debug("No items returned for offset=%d", offset)
            break

        ids: List[int] = []
        for it in projects:
            if not isinstance(it, dict):
                continue
            pid = it.get("projectId") or it.get("id")
            if pid is None:
                continue
            try:
                ids.append(int(pid))
            except Exception:
                continue

        if ids:
            logging.info("Fetched %d items for offset=%d — ids %s..%s", len(projects), offset, ids[0], ids[-1])
        else:
            logging.info("Fetched %d items for offset=%d (no numeric projectId fields)", len(projects), offset)

        for it in projects:
            if isinstance(it, dict):
                pid = it.get("projectId") or it.get("id")
                if pid is not None:
                    try:
                        yield int(pid)
                    except Exception:
                        continue

        if total_count is not None:
            if offset + len(projects) >= total_count:
                break
        else:
            if len(projects) < limit:
                break
        offset += limit


def fetch_project_detail(api_key: str, project_id: int) -> Dict[str, Any]:
    session = get_session()
    response = session.get(
        f"{API_BASE_URL}/projects/{project_id}",
        params={"api_key": api_key},
        timeout=30,
    )
    if response.status_code != 200:
        # provide clearer message for rate limiting
        if response.status_code == 429:
            raise RuntimeError(f"Rate limited fetching project {project_id}: {response.status_code} {response.text}")
        raise RuntimeError(
            f"Failed to fetch project {project_id}: {response.status_code} {response.text}"
        )

    data = response.json()
    project = data.get("project") or data.get("projects") or data
    if not isinstance(project, dict):
        raise RuntimeError(f"Unexpected project payload for {project_id}")

    return project


def upsert_projects(records: List[Dict[str, Any]]) -> None:
    if not records:
        return
    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, records)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Ingest NASA TechPort projects")
    parser.add_argument("--limit", type=int, default=0, help="Limit projects fetched (for testing)")
    parser.add_argument("--batch-size", type=int, default=200, help="Number of records to upsert per transaction")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose per-project logging")
    parser.add_argument("--start-index", type=int, default=0, help="Skip the first N project ids when resuming")
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip fetching details for project IDs that already exist in the database",
    )
    parser.add_argument(
        "--use-state-file",
        action="store_true",
        help="Persist resume state to backend/.ingest_state and resume from it",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=32,
        help="Number of parallel worker threads to use when fetching project details (soft-capped)",
    )

    def state_file_path() -> Path:
        return BACKEND_DIR / ".ingest_state"

    def load_state() -> Optional[int]:
        p = state_file_path()
        if not p.exists():
            return None
        try:
            data = json.loads(p.read_text())
            return int(data.get("last_index", 0))
        except Exception:
            return None

    def save_state(last_index: int) -> None:
        p = state_file_path()
        try:
            p.write_text(json.dumps({"last_index": int(last_index)}))
        except Exception:
            logging.debug("Failed to write state file %s", p)

    def interactive_menu() -> List[str]:
        cfg = {
            "limit": 10,
            "batch_size": 10,
            "verbose": True,
            "start_index": 0,
            "skip_existing": True,
            "use_state_file": False,
            "workers": 32,
        }

        def print_menu():
            print("\nIngest options — choose an option number and press Enter:")
            print(f" 1) Set limit ............ {cfg['limit']}")
            print(f" 2) Set batch size ....... {cfg['batch_size']}")
            print(f" 3) Toggle verbose ........ {cfg['verbose']}")
            print(f" 4) Set start index ...... {cfg['start_index']}")
            print(f" 5) Toggle skip-existing . {cfg['skip_existing']}")
            print(f" 6) Toggle use-state-file  {cfg['use_state_file']}")
            print(f" 7) Set workers .......... {cfg['workers']}")
            print(" 8) Run now")
            print(" 0) Quit")

        while True:
            print_menu()
            try:
                choice = input("Select> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                return []

            if not choice:
                continue
            if choice == "0":
                return []
            if choice == "7":
                argv_out: List[str] = []
                if cfg["limit"]:
                    argv_out += ["--limit", str(cfg["limit"])]
                if cfg["batch_size"]:
                    argv_out += ["--batch-size", str(cfg["batch_size"])]
                if cfg["verbose"]:
                    argv_out += ["--verbose"]
                if cfg["start_index"]:
                    argv_out += ["--start-index", str(cfg["start_index"])]
                if cfg["skip_existing"]:
                    argv_out += ["--skip-existing"]
                if cfg["use_state_file"]:
                    argv_out += ["--use-state-file"]
                return argv_out

            if choice == "1":
                val = input("Enter numeric limit (0 for no limit): ").strip()
                try:
                    cfg["limit"] = int(val)
                except ValueError:
                    print("Invalid number")
                continue

            if choice == "2":
                val = input("Enter batch size (e.g. 200): ").strip()
                try:
                    cfg["batch_size"] = int(val)
                except ValueError:
                    print("Invalid number")
                continue

            if choice == "3":
                cfg["verbose"] = not cfg["verbose"]
                print(f"verbose set to {cfg['verbose']}")
                continue

            if choice == "4":
                val = input("Enter start index (0 to start at beginning): ").strip()
                try:
                    cfg["start_index"] = int(val)
                except ValueError:
                    print("Invalid number")
                continue

            if choice == "5":
                cfg["skip_existing"] = not cfg["skip_existing"]
                print(f"skip_existing set to {cfg['skip_existing']}")
                continue

            if choice == "6":
                cfg["use_state_file"] = not cfg["use_state_file"]
                print(f"use_state_file set to {cfg['use_state_file']}")
                continue

            if choice == "7":
                val = input("Enter number of workers (e.g. 8): ").strip()
                try:
                    cfg["workers"] = int(val)
                except ValueError:
                    print("Invalid number")
                continue

            if choice == "8":
                argv_out: List[str] = []
                if cfg["limit"]:
                    argv_out += ["--limit", str(cfg["limit"])]
                if cfg["batch_size"]:
                    argv_out += ["--batch-size", str(cfg["batch_size"])]
                if cfg["verbose"]:
                    argv_out += ["--verbose"]
                if cfg["start_index"]:
                    argv_out += ["--start-index", str(cfg["start_index"])]
                if cfg["skip_existing"]:
                    argv_out += ["--skip-existing"]
                if cfg["use_state_file"]:
                    argv_out += ["--use-state-file"]
                if cfg["workers"]:
                    argv_out += ["--workers", str(cfg["workers"])]
                return argv_out

            print("Unknown selection — choose a number from the menu")


    # If running interactively and no CLI args provided, show menu
    if argv is None and sys.stdin.isatty() and len(sys.argv) == 1:
        menu_args = interactive_menu()
        if not menu_args:
            print("No options selected — exiting.")
            return 1
        args = parser.parse_args(menu_args)
    else:
        args = parser.parse_args(argv) 

    logging.basicConfig(
        level=logging.INFO if not args.verbose else logging.DEBUG,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    max_workers_cap = 128
    if args.workers > max_workers_cap:
        logging.warning("--workers value %d capped to %d", args.workers, max_workers_cap)
        args.workers = max_workers_cap

    global SESSION_POOL_SIZE
    SESSION_POOL_SIZE = min(max(10, args.workers), 200)

    api_key = get_required_env("NASA_TECHPORT_API_KEY")

    global engine
    engine = create_db_engine(get_required_env("DATABASE_URL"))

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError as exc:
        logging.error("Database unavailable: %s", exc)
        return 1

    logging.info("Fetching NASA TechPort project list")

    try:
        project_ids = list(fetch_project_ids(api_key))
    except RuntimeError as exc:
        logging.error("%s", exc)
        return 1
    
    _ = get_session()


    if args.use_state_file:
        saved = load_state()
        if saved:
            logging.info("Found saved state: last_index=%d", saved)

            if args.start_index and args.start_index > 0:
                logging.info("Using provided --start-index %d instead of saved state", args.start_index)
            else:
                args.start_index = saved

    if args.start_index and args.start_index > 0:
        logging.info("Resuming from start index %d", args.start_index)
        project_ids = project_ids[args.start_index:]

    if args.limit and args.limit > 0:
        project_ids = project_ids[: args.limit]

    total = len(project_ids)
    logging.info("Found %d projects (using limit=%s)", total, args.limit or "none")

    batch: List[Dict[str, Any]] = []
    start_time = time.time()
    last_log_time = start_time
    upserted_count = 0


    def fetch_worker(pid: int):

        try:
            if args.skip_existing:
                with engine.connect() as conn:
                    exists = conn.execute(
                        text("SELECT 1 FROM projects WHERE id = :id LIMIT 1"), {"id": pid}
                    ).first()
                if exists:
                    logging.debug("Skipping existing project %s", pid)
                    return ("skip", pid, None)
            project = fetch_project_detail(api_key, pid)
            record = normalize_project(project)
            return ("ok", pid, record)
        except RuntimeError as exc:
            logging.error("%s", exc)
            return ("error", pid, exc)
        except (TypeError, ValueError) as exc:
            logging.error("Failed to normalize project %s: %s", pid, exc)
            return ("error", pid, exc)

    id_to_index = {pid: idx for idx, pid in enumerate(project_ids, start=1)}
    processed = 0

    pbar = tqdm(total=total) if tqdm else None
    try:
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {executor.submit(fetch_worker, pid): pid for pid in project_ids}
            for fut in as_completed(futures):
                status, pid, payload = fut.result()
                index = id_to_index[futures[fut]]
                processed += 1

                # Update progress UI
                if pbar:
                    pbar.update(1)
                else:
                    now = time.time()
                    if args.verbose:
                        logging.debug("Processing %d/%d project_id=%s", index, total, pid)
                    elif now - last_log_time >= 5:
                        pct = (processed / total) * 100 if total else 0
                        elapsed = now - start_time
                        rate = processed / elapsed if elapsed > 0 else 0
                        remaining = (total - processed) / rate if rate > 0 else 0
                        progress_line = (
                            f"Progress: {processed}/{total} ({pct:.1f}%) — rate: {rate:.2f}/s — eta: {remaining:.0f}s"
                        )
                        print(progress_line, end="\r", flush=True)
                        last_log_time = now

                if status == "ok":
                    batch.append(payload)

                if len(batch) >= args.batch_size:
                    try:
                        upsert_projects(batch)
                    except (OperationalError, SQLAlchemyError) as exc:
                        logging.error("Database write failed: %s", exc)
                        if pbar:
                            pbar.close()
                        return 1
                    upserted_count += len(batch)
                    logging.info("Upserted %d/%d projects", upserted_count, total)
                    if args.use_state_file:
                        save_state(index)
                    batch = []
    finally:
        if pbar:
            pbar.close()

    if batch:
        try:
            upsert_projects(batch)
        except (OperationalError, SQLAlchemyError) as exc:
            logging.error("Database write failed: %s", exc)
            return 1
        upserted_count += len(batch)
        logging.info("Upserted %d/%d projects", upserted_count, total)
        if args.use_state_file:
            save_state(total)

    elapsed = time.time() - start_time
    logging.info("Ingestion complete: %d projects in %.1fs (%.2f/s)", upserted_count, elapsed, upserted_count / elapsed if elapsed else 0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
