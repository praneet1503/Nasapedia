import argparse
import logging
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, cast
import json
import random
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.exceptions import RequestException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Optional visual progress (Rich)
from rich.progress import (
    Progress,
    SpinnerColumn,
    TextColumn,
    BarColumn,
    TaskProgressColumn,
    DownloadColumn,
    TransferSpeedColumn,
    TimeRemainingColumn,
)

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.append(str(BACKEND_DIR))

from app.db import engine, get_required_env


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
        response = requests.get(
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

        # Normalize: look for 'projects' list and optional totalCount
        projects = data.get("projects") if isinstance(data, dict) else None
        total_count = None
        if isinstance(data, dict) and "totalCount" in data:
            try:
                total_count = int(data.get("totalCount") or 0)
            except Exception:
                total_count = None

        if projects is None:
            # fallback: data may itself be the list
            if isinstance(data, list):
                projects = data
            else:
                logging.debug("No 'projects' list in response for offset=%d; keys=%s", offset, list(data.keys()) if isinstance(data, dict) else type(data))
                break

        if not projects:
            logging.debug("No items returned for offset=%d", offset)
            break

        # Extract project ids (TechPort uses 'projectId')
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

        # Yield project ids from this page
        for it in projects:
            if isinstance(it, dict):
                pid = it.get("projectId") or it.get("id")
                if pid is not None:
                    try:
                        yield int(pid)
                    except Exception:
                        continue

        # Termination: use totalCount if provided, otherwise stop when a page is smaller than limit
        if total_count is not None:
            if offset + len(projects) >= total_count:
                break
        else:
            if len(projects) < limit:
                break
        offset += limit


def fetch_project_detail(api_key: str, project_id: int, session=None, timeout: int = 60, max_retries: int = 4) -> Dict[str, Any]:
    """Fetch project details with retry/backoff for transient errors.

    Uses `session` if provided (requests.Session recommended) for connection pooling.
    Raises RuntimeError on persistent failures or unexpected payloads.
    """
    session = session or requests

    for attempt in range(0, max_retries + 1):
        try:
            response = session.get(
                f"{API_BASE_URL}/projects/{project_id}",
                params={"api_key": api_key},
                timeout=timeout,
            )
        except RequestException as exc:
            logging.warning("Network error fetching %s: %s", project_id, exc)
            if attempt < max_retries:
                wait = (2 ** attempt) + random.random()
                time.sleep(wait)
                continue
            raise RuntimeError(f"Failed to fetch project {project_id}: network error {exc}") from exc

        # Successful
        if response.status_code == 200:
            data = response.json()
            project = data.get("project") or data.get("projects") or data
            if not isinstance(project, dict):
                raise RuntimeError(f"Unexpected project payload for {project_id}")
            return project

        # Transient server errors; retry
        if response.status_code in (502, 503, 504, 429):
            if attempt < max_retries:
                wait = (2 ** attempt) + random.random()
                logging.warning("Transient %s for %s — retrying in %.1fs", response.status_code, project_id, wait)
                time.sleep(wait)
                continue
            logging.error("Persistent %s for %s: %s", response.status_code, project_id, response.text)
            raise RuntimeError(f"Failed to fetch project {project_id}: {response.status_code} {response.text}")

        # Not found — skip
        if response.status_code == 404:
            raise RuntimeError(f"Project {project_id} not found (404)")

        # Other client errors — treat as fatal for this ID
        raise RuntimeError(f"Failed to fetch project {project_id}: {response.status_code} {response.text}")

    # If we fall out of the retry loop without returning, raise a generic error
    raise RuntimeError(f"Failed to fetch project {project_id}: unknown error after {max_retries} retries")


def upsert_projects(records: List[Dict[str, Any]]) -> None:
    if not records:
        return
    with engine.begin() as conn:
        conn.execute(UPSERT_SQL, records)


def _short_id(length: int = 5) -> str:
    """Generate a small hex-like id for display in progress UI."""
    alphabet = "0123456789abcdef"
    return "".join(random.choice(alphabet) for _ in range(length))


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
    parser.add_argument("--workers", type=int, default=5, help="Number of concurrent workers to fetch project details")
    parser.add_argument("--page-size", type=int, default=100, help="Process project IDs in page-sized chunks for batch DB checks")
    parser.add_argument("--timeout", type=int, default=60, help="HTTP timeout (seconds) for project detail fetches")
    parser.add_argument("--max-retries", type=int, default=4, help="Number of retries for transient HTTP errors")
    parser.add_argument("--progress-ui", action="store_true", help="Show a simulated Docker-style progress UI during fetching (requires 'rich')")

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
        # numbered option menu for easier interaction
        cfg = {
            "limit": 10,
            "batch_size": 10,
            "verbose": True,
            "start_index": 0,
            "skip_existing": True,
            "use_state_file": False,
        }

        def print_menu():
            print("\nIngest options — choose an option number and press Enter:")
            print(f" 1) Set limit ............ {cfg['limit']}")
            print(f" 2) Set batch size ....... {cfg['batch_size']}")
            print(f" 3) Toggle verbose ........ {cfg['verbose']}")
            print(f" 4) Set start index ...... {cfg['start_index']}")
            print(f" 5) Toggle skip-existing . {cfg['skip_existing']}")
            print(f" 6) Toggle use-state-file  {cfg['use_state_file']}")
            print(" 7) Run now")
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

            print("Unknown selection — choose a number from the menu")


    # If running interactively and no argv provided, show menu
    if argv is None and sys.stdin.isatty():
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

    api_key = get_required_env("NASA_TECHPORT_API_KEY")

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

    # If using state file and present, load saved index
    if args.use_state_file:
        saved = load_state()
        if saved:
            logging.info("Found saved state: last_index=%d", saved)
            # prefer explicit start-index if provided
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
    processed = 0
    failed_count = 0

    # Helper to chunk a list into page-sized chunks
    def chunk_list(lst: List[int], size: int):
        for i in range(0, len(lst), size):
            yield lst[i : i + size]

    session = requests.Session()

    # Process project ids in page-sized chunks and do a single DB check per page
    for page_index, page_ids in enumerate(chunk_list(project_ids, args.page_size)):
        page_start = page_index * args.page_size
        logging.info("Processing page %d (ids %d..%d)", page_index + 1, page_start + 1, page_start + len(page_ids))

        # Batch-check existing ids in DB
        existing_ids = set()
        if args.skip_existing:
            try:
                with engine.connect() as conn:
                    rows = conn.execute(text("SELECT id FROM projects WHERE id = ANY(:ids)"), {"ids": list(page_ids)}).all()
                    existing_ids = {r[0] for r in rows}
            except OperationalError as exc:
                logging.error("Database unavailable when checking existing ids: %s", exc)
                return 1

        # IDs we need to fetch details for
        to_fetch = [pid for pid in page_ids if pid not in existing_ids]
        logging.info("Page %d: %d total, %d existing, %d to fetch", page_index + 1, len(page_ids), len(existing_ids), len(to_fetch))

            # Concurrently fetch project details with a thread pool and robust retry
        if to_fetch:
            # If user requested a visual UI, create the Rich progress context
            if args.progress_ui:
                columns = [
                    SpinnerColumn(spinner_name="dots"),
                    TextColumn("[bold blue]{task.fields[id]}", justify="right"),
                    TextColumn("[progress.description]{task.description}"),
                    BarColumn(bar_width=40),
                    TaskProgressColumn(),
                    DownloadColumn(),
                    TransferSpeedColumn(),
                    TimeRemainingColumn(),
                ]

                with Progress(*columns, transient=True) as ui:
                    overall_id = _short_id(4)
                    overall = ui.add_task("Fetching", total=len(to_fetch), id=overall_id)

                    # Create a UI task per project (small total simulating bytes)
                    pid_to_task: Dict[int, int] = {}
                    for pid in to_fetch:
                        tid = _short_id()
                        # use small byte totals to make speeds meaningful in UI
                        pid_to_task[pid] = ui.add_task(description=str(pid), total=1000, id=tid)

                    with ThreadPoolExecutor(max_workers=args.workers) as executor:
                        future_to_id = {
                            executor.submit(fetch_project_detail, api_key, pid, session, args.timeout, args.max_retries): pid
                            for pid in to_fetch
                        }

                        # While there are pending futures, update UI and handle completions
                        pending = set(future_to_id.keys())
                        tick = 0.1
                        while pending:
                            done_now = set()
                            for fut in list(pending):
                                if fut.done():
                                    pid = future_to_id[fut]
                                    processed += 1
                                    try:
                                        project = fut.result()
                                        try:
                                            record = normalize_project(project)
                                        except (TypeError, ValueError) as exc:
                                            logging.error("Failed to normalize project %s: %s", pid, exc)
                                            failed_count += 1
                                            # mark UI task complete
                                            t = pid_to_task[pid]
                                            ui.update(cast(Any, t), completed=1000)
                                            ui.update(cast(Any, overall), advance=1)
                                            done_now.add(fut)
                                            continue
                                        batch.append(record)
                                        # mark UI task complete
                                        t = pid_to_task[pid]
                                        ui.update(cast(Any, t), completed=1000)
                                        ui.update(cast(Any, overall), advance=1)
                                    except Exception as exc:
                                        logging.error("Failed to fetch project %s: %s", pid, exc)
                                        failed_count += 1
                                        t = pid_to_task[pid]
                                        ui.update(cast(Any, t), completed=1000)
                                        ui.update(cast(Any, overall), advance=1)
                                    done_now.add(fut)

                            # Remove completed futures
                            pending -= done_now

                            # Make UI tasks progress (simulate varying transfer speeds)
                            for pid, t in pid_to_task.items():
                                # Locate the task object by id
                                task_obj = next((task for task in ui.tasks if task.id == t), None)
                                if task_obj is None or task_obj.finished:
                                    continue
                                # Random per-tick progress to simulate network variability
                                min_adv = 10
                                max_adv = 200
                                adv = random.randint(min_adv, max_adv)
                                ui.update(cast(Any, t), advance=adv)

                            # Flush batch if needed
                            if len(batch) >= args.batch_size:
                                try:
                                    upsert_projects(batch)
                                except (OperationalError, SQLAlchemyError) as exc:
                                    logging.error("Database write failed: %s", exc)
                                    return 1
                                upserted_count += len(batch)
                                logging.info("Upserted %d projects so far", upserted_count)
                                if args.use_state_file:
                                    save_state(processed + (args.start_index or 0))
                                batch = []

                            time.sleep(tick)

            else:
                # No UI: fall back to existing as_completed behavior
                with ThreadPoolExecutor(max_workers=args.workers) as executor:
                    future_to_id = {
                        executor.submit(fetch_project_detail, api_key, pid, session, args.timeout, args.max_retries): pid
                        for pid in to_fetch
                    }
                    for fut in as_completed(future_to_id):
                        pid = future_to_id[fut]
                        processed += 1
                        try:
                            project = fut.result()
                            try:
                                record = normalize_project(project)
                            except (TypeError, ValueError) as exc:
                                logging.error("Failed to normalize project %s: %s", pid, exc)
                                failed_count += 1
                                continue
                            batch.append(record)
                        except Exception as exc:
                            logging.error("Failed to fetch project %s: %s", pid, exc)
                            failed_count += 1
                            continue

                        # Flush batch if needed
                        if len(batch) >= args.batch_size:
                            try:
                                upsert_projects(batch)
                            except (OperationalError, SQLAlchemyError) as exc:
                                logging.error("Database write failed: %s", exc)
                                return 1
                            upserted_count += len(batch)
                            logging.info("Upserted %d projects so far", upserted_count)
                            if args.use_state_file:
                                save_state(processed + (args.start_index or 0))
                            batch = []

        # Optionally update state after each page
        if args.use_state_file:
            save_state(processed + (args.start_index or 0))

    # Final flush of remaining batch
    if batch:
        try:
            upsert_projects(batch)
        except (OperationalError, SQLAlchemyError) as exc:
            logging.error("Database write failed: %s", exc)
            return 1
        upserted_count += len(batch)
        logging.info("Upserted final %d projects", len(batch))
        if args.use_state_file:
            save_state(processed + (args.start_index or 0))

    elapsed = time.time() - start_time
    logging.info("Ingestion complete: %d upserted, %d failed in %.1fs (%.2f/s)", upserted_count, failed_count, elapsed, (upserted_count / elapsed) if elapsed else 0)
    return 0

# End of main()


if __name__ == "__main__":
    raise SystemExit(main())


if __name__ == "__main__":
    raise SystemExit(main())
