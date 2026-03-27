from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .routers import auth, dashboard, employees, departments, positions, leave, time_entries, recruitment, performance, settings, integrations

app = FastAPI(title="HRIS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5183", "http://localhost:5173", "http://localhost:3000"],
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
