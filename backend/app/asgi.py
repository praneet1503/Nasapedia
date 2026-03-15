import asyncio
import os
from typing import Awaitable, Callable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.db import close_all_db_engines
from app.http_utils import close_shared_async_clients, log_timing, timing_ms, timing_start
from routers.analytics import router as analytics_router
from routers.aurora import router as aurora_router
from routers.feed import router as feed_router
from routers.global_launch_intelligence import router as global_launch_intelligence_router
from routers.health import router as health_router
from routers.iss import router as iss_router
from routers.projects import router as projects_router
from routers.space import router as space_router


def create_app() -> FastAPI:
    warmup_enabled = (os.environ.get("WARMUP_ENABLED", "true").lower() != "false")
    warmup_concurrency = max(1, int(os.environ.get("WARMUP_CONCURRENCY", "3")))
    warmup_task_timeout = float(os.environ.get("WARMUP_TASK_TIMEOUT", "8"))

    fastapi_app = FastAPI()
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @fastapi_app.middleware("http")
    async def _request_timing_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        started = timing_start()
        response = await call_next(request)
        elapsed_ms = timing_ms(started)
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.1f}"
        log_timing(
            "http.request",
            started,
            f"method={request.method} path={request.url.path} status={response.status_code}",
        )
        return response

    fastapi_app.include_router(health_router)
    fastapi_app.include_router(projects_router)
    fastapi_app.include_router(feed_router)
    fastapi_app.include_router(analytics_router)
    fastapi_app.include_router(aurora_router)
    fastapi_app.include_router(global_launch_intelligence_router)
    fastapi_app.include_router(iss_router, prefix="/iss")
    fastapi_app.include_router(space_router)

    @fastapi_app.on_event("startup")
    async def _warm_launch_intelligence_caches() -> None:
        """Warm critical caches in background with bounded concurrency."""
        if not warmup_enabled:
            return

        async def _run_warmups() -> None:
            started = timing_start()
            semaphore = asyncio.Semaphore(warmup_concurrency)

            async def _bounded(name: str, coro: Awaitable[object]) -> None:
                task_started = timing_start()
                async with semaphore:
                    try:
                        await asyncio.wait_for(coro, timeout=warmup_task_timeout)
                        log_timing("startup.warmup_task", task_started, f"task={name} status=ok")
                    except Exception as exc:
                        log_timing("startup.warmup_task", task_started, f"task={name} status=error err={exc}")

            try:
                # Import lazily to avoid module import overhead at startup path.
                from app.services import launch_intelligence
                from app.services import aurora
                from app.services.spaceflight_news import get_space_articles, get_space_blogs

                await asyncio.gather(
                    _bounded("launch_all", launch_intelligence.fetch_all_launch_data()),
                    _bounded("launch_astronauts", launch_intelligence.fetch_astronauts(limit=100)),
                    _bounded("launch_stations", launch_intelligence.fetch_space_stations()),
                    _bounded("space_articles", get_space_articles(limit=12, offset=0)),
                    _bounded("space_blogs", get_space_blogs(limit=12, offset=0)),
                    _bounded("aurora_oval", aurora.fetch_aurora_oval()),
                    _bounded("aurora_kp", aurora.fetch_planetary_kp()),
                    return_exceptions=True,
                )
            finally:
                log_timing("startup.warmup_total", started, f"concurrency={warmup_concurrency}")

        fastapi_app.state._warmup_task = asyncio.create_task(_run_warmups())

    @fastapi_app.on_event("shutdown")
    async def _shutdown_cleanup() -> None:
        warmup_task = getattr(fastapi_app.state, "_warmup_task", None)
        if warmup_task is not None and not warmup_task.done():
            warmup_task.cancel()
            try:
                await warmup_task
            except Exception:
                pass
        await close_shared_async_clients()
        close_all_db_engines()

    return fastapi_app


api = create_app()
