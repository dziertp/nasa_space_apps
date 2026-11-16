"""API local del prototipo de salud de astronautas."""

from fastapi import FastAPI

from backend.eva import router as eva_router
from backend.mission import router as mission_router
from backend.panel import router as panel_router
from backend.suit import router as suit_router

app = FastAPI(title="Salud de astronautas | NASA Space Apps 2026")
app.include_router(panel_router)
app.include_router(suit_router)
app.include_router(mission_router)
app.include_router(eva_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
