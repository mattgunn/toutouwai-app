import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .routers import (
    auth, dashboard, employees, departments, positions, leave, time_entries,
    recruitment, performance, settings, integrations,
    compensation, benefits, succession, onboarding, documents, self_service,
    reports, audit, workflows, surveys, seed,
)

app = FastAPI(title="HRIS API", version="0.1.0")

cors_origins = os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else [
    "http://localhost:5183", "http://localhost:5173", "http://localhost:3000"
]
# filter empty strings
cors_origins = [o.strip() for o in cors_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(employees.router, prefix="/api", tags=["employees"])
app.include_router(departments.router, prefix="/api", tags=["departments"])
app.include_router(positions.router, prefix="/api", tags=["positions"])
app.include_router(leave.router, prefix="/api", tags=["leave"])
app.include_router(time_entries.router, prefix="/api", tags=["time"])
app.include_router(recruitment.router, prefix="/api", tags=["recruitment"])
app.include_router(performance.router, prefix="/api", tags=["performance"])
app.include_router(settings.router, prefix="/api", tags=["settings"])
app.include_router(integrations.router, prefix="/api", tags=["integrations"])
app.include_router(compensation.router, prefix="/api", tags=["compensation"])
app.include_router(benefits.router, prefix="/api", tags=["benefits"])
app.include_router(succession.router, prefix="/api", tags=["succession"])
app.include_router(onboarding.router, prefix="/api", tags=["onboarding"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(self_service.router, prefix="/api", tags=["self_service"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(audit.router, prefix="/api", tags=["audit"])
app.include_router(workflows.router, prefix="/api", tags=["workflows"])
app.include_router(surveys.router, prefix="/api", tags=["surveys"])
app.include_router(seed.router, prefix="/api", tags=["seed"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


# SPA fallback: serve ui/dist if it exists
DIST = Path(__file__).resolve().parent.parent / "ui" / "dist"
if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        file = DIST / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(DIST / "index.html"))
