"""Escenarios sintéticos locales. Asistencia de IA: docs/AI_DISCLOSURE.md."""

from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import AwareDatetime, BaseModel, Field, model_validator

router = APIRouter(prefix="/api/scenarios", tags=["Datos simulados"])
DATA_PATH = Path(__file__).resolve().parents[1] / "data/simulated/personal_panel.json"


class Measurement(BaseModel):
    id: str
    label: str
    value: float | None
    unit: str
    measured_at: AwareDatetime | None
    source: str

    @model_validator(mode="after")
    def consistent_absence(self):
        if (self.value is None) != (self.measured_at is None):
            raise ValueError("Una lectura ausente requiere valor y fecha null")
        return self


class DailyRecord(BaseModel):
    date: date
    recorded_at: AwareDatetime
    sleep_hours: float | None = Field(ge=0, le=24)
    fatigue_score: float | None = Field(ge=0, le=10)
    source: str


class Scenario(BaseModel):
    id: str
    name: str
    description: str
    measurements: list[Measurement]
    history: list[DailyRecord] = Field(min_length=7, max_length=7)


class Dataset(BaseModel):
    schema_version: str
    data_kind: Literal["simulated"]
    label: str
    provenance: dict
    astronaut: dict[str, str]
    mission: dict[str, str]
    demo_time: AwareDatetime
    availability_policy: dict
    fatigue_scale: str
    scenarios: list[Scenario]


class PanelMeasurement(Measurement):
    availability: Literal["available", "stale", "missing"]


class Panel(BaseModel):
    schema_version: str
    data_kind: Literal["simulated"]
    label: str
    provenance: dict
    astronaut: dict[str, str]
    mission: dict[str, str]
    demo_time: AwareDatetime
    availability_policy: dict
    fatigue_scale: str
    scenario: dict[str, str]
    measurements: list[PanelMeasurement]
    history: list[DailyRecord]


def read_dataset() -> Dataset:
    # Ruta relativa al módulo, independiente del directorio de ejecución.
    return Dataset.model_validate_json(DATA_PATH.read_text(encoding="utf-8"))


def availability(measurement: Measurement, reference: datetime, minutes: int):
    if measurement.value is None:
        return "missing"
    if reference - measurement.measured_at > timedelta(minutes=minutes):
        return "stale"
    return "available"


@router.get("")
def list_scenarios() -> list[dict[str, str]]:
    return [scenario.model_dump(include={"id", "name", "description"})
            for scenario in read_dataset().scenarios]


@router.get("/{scenario_id}", response_model=Panel)
def get_scenario(scenario_id: str):
    dataset = read_dataset()
    scenario = next((item for item in dataset.scenarios if item.id == scenario_id), None)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    shared = dataset.model_dump(exclude={"scenarios"})
    return {
        **shared,
        "scenario": scenario.model_dump(include={"id", "name", "description"}),
        "measurements": [
            {**item.model_dump(), "availability": availability(
                item, dataset.demo_time, dataset.availability_policy["stale_after_minutes"]
            )}
            for item in scenario.measurements
        ],
        "history": scenario.history,
    }
