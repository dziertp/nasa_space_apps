"""API local del prototipo de salud de astronautas."""

from fastapi import FastAPI

app = FastAPI(title="Salud de astronautas | NASA Space Apps 2026")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
