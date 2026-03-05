from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analytics import router as analytics_router
from routers.feed import router as feed_router
from routers.global_launch_intelligence import router as global_launch_intelligence_router
from routers.health import router as health_router
from routers.iss import router as iss_router
from routers.projects import router as projects_router


def create_app() -> FastAPI:
    fastapi_app = FastAPI()
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    fastapi_app.include_router(health_router)
    fastapi_app.include_router(projects_router)
    fastapi_app.include_router(feed_router)
    fastapi_app.include_router(analytics_router)
    fastapi_app.include_router(global_launch_intelligence_router)
    fastapi_app.include_router(iss_router, prefix="/iss")
    return fastapi_app


api = create_app()
