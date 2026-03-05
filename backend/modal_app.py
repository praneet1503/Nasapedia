import sys
from pathlib import Path

import modal
import os

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.asgi import api as fastapi_app

APP_NAME = "nasa-techport-backend-v3"
SECRET_NAME = "NASA_WEB_KEYS"
MIN_CONTAINERS = int(os.environ.get("MODAL_MIN_CONTAINERS", "1"))
SCALEDOWN_WINDOW = int(os.environ.get("MODAL_SCALEDOWN_WINDOW", "3600"))

app = modal.App(APP_NAME)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi==0.110.0",
        "httpx==0.27.2",
        "pydantic==2.6.1",
        "SQLAlchemy==2.0.25",
        "psycopg2-binary==2.9.9",
        "starlette==0.36.3",
        "sentence-transformers==3.0.0",
        "pgvector==0.3.0",
    )
    .add_local_dir(ROOT_DIR / "app", remote_path="/root/app")
    .add_local_dir(ROOT_DIR / "routers", remote_path="/root/routers")
)

space_key = os.environ.get("SPACEDEVS_API_KEY")
if space_key:
    secrets = [modal.Secret.from_dict({"SPACEDEVS_API_KEY": space_key})]
else:
    secrets = [modal.Secret.from_name(SECRET_NAME)]


@app.function(
    image=image,
    secrets=secrets,
    timeout=86400,
    min_containers=MIN_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
)
@modal.asgi_app(label="backend-v3")
def backend():
    return fastapi_app


if __name__ == "__main__":
    with modal.enable_output():
        app.deploy()
