"""API local del prototipo de salud de astronautas."""

from fastapi import FastAPI

from backend.panel import router as panel_router
from backend.suit import router as suit_router

app = FastAPI(title="Salud de astronautas | NASA Space Apps 2026")
app.include_router(panel_router)
app.include_router(suit_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
