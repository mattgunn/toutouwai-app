import os
import uvicorn
from .db import init_db

# Load .env if present
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

init_db()

port = int(os.environ.get("HRIS_PORT", "8003"))
reload = os.environ.get("HRIS_DEV", "1") == "1"

uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=reload)
