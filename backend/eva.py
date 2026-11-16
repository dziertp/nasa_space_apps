"""Preparación de EVA: catálogo sintético y fórmulas de planificación propias.

Asistido por Claude Code (Anthropic); véase docs/AI_DISCLOSURE.md. Datos y fórmulas:
data/simulated/eva_planning.json. Las estimaciones son de planificación ficticia, no clínicas.
"""

from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

router = APIRouter(prefix="/api/eva", tags=["Preparación de EVA simulada"])
DATA_PATH = Path(__file__).resolve().parents[1] / "data/simulated/eva_planning.json"


class Provenance(BaseModel):
    author: str = Field(min_length=1)
    generated_on: date
    method: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    nasa_measurements_used: Literal[False]
    clinical_validation: Literal[False]
    ai_disclosure: str


class Limits(BaseModel):
    battery_capacity_wh: float = Field(gt=0)
    battery_reserve_pct: float = Field(ge=0, lt=100)
    max_load_kg: float = Field(gt=0)
    max_duration_min: float = Field(gt=0)


class Formula(BaseModel):
    base_speed_kmh: float = Field(gt=0)
    ascent_minutes_per_100_m: float = Field(ge=0)
    free_load_kg: float = Field(ge=0)
    speed_loss_per_kg: float = Field(ge=0, lt=1)
    min_speed_factor: float = Field(gt=0, le=1)
    suit_base_power_w: float = Field(ge=0)
    description: list[str] = Field(min_length=1)


class Objective(BaseModel):
    id: str
    label: str = Field(min_length=1)
    minutes: float = Field(gt=0)


class ReturnPoint(BaseModel):
    label: str = Field(min_length=1)
    distance_km: float = Field(gt=0)
    note: str = Field(min_length=1)


class Route(BaseModel):
    id: str
    name: str = Field(min_length=1)
    distance_km: float = Field(gt=0)
    ascent_m: float = Field(ge=0)
    objectives: list[Objective] = Field(min_length=1)
    return_point: ReturnPoint

    @model_validator(mode="after")
    def return_point_on_route(self):
        # La distancia es de ida y vuelta: el punto de retorno no puede quedar más allá de la mitad.
        if self.return_point.distance_km > self.distance_km / 2:
            raise ValueError("El punto de retorno debe estar dentro de la mitad del recorrido")
        return self


class Equipment(BaseModel):
    id: str
    label: str = Field(min_length=1)
    mass_kg: float = Field(gt=0)
    power_w: float = Field(ge=0)


class EvaCatalog(BaseModel):
    schema_version: str
    data_kind: Literal["simulated"]
    label: str
    provenance: Provenance
    planning_policy: str = Field(min_length=1)
    limits: Limits
    formula: Formula
    routes: list[Route] = Field(min_length=3, max_length=3)
    equipment: list[Equipment] = Field(min_length=6, max_length=8)

    @model_validator(mode="after")
    def unique_ids(self):
        for name, items in (("recorridos", self.routes), ("equipamiento", self.equipment)):
            ids = [item.id for item in items]
            if len(ids) != len(set(ids)):
                raise ValueError(f"Identificadores repetidos en {name}")
        return self


class PlanSelection(BaseModel):
    route_id: str
    equipment_ids: list[str] = Field(default_factory=list, max_length=8)


@lru_cache(maxsize=1)
def read_catalog() -> EvaCatalog:
    return EvaCatalog.model_validate_json(DATA_PATH.read_text(encoding="utf-8"))


def _es(value: float) -> str:
    """Número con coma decimal para los textos de aviso."""
    return f"{value:g}".replace(".", ",")


def estimate(selection: PlanSelection, catalog: EvaCatalog | None = None) -> dict:
    """Aplica las fórmulas documentadas en el catálogo. Sin estado: no lee ni escribe la misión."""
    catalog = catalog or read_catalog()
    route = next((item for item in catalog.routes if item.id == selection.route_id), None)
    if route is None:
        raise HTTPException(404, "Recorrido no encontrado")
    if len(selection.equipment_ids) != len(set(selection.equipment_ids)):
        raise HTTPException(422, "Equipamiento repetido")
    by_id = {item.id: item for item in catalog.equipment}
    unknown = [item for item in selection.equipment_ids if item not in by_id]
    if unknown:
        raise HTTPException(404, f"Equipamiento no encontrado: {', '.join(unknown)}")
    equipment = [by_id[item] for item in selection.equipment_ids]
    formula, limits = catalog.formula, catalog.limits

    load_kg = sum(item.mass_kg for item in equipment)
    speed_factor = max(formula.min_speed_factor,
                       1 - formula.speed_loss_per_kg * max(0.0, load_kg - formula.free_load_kg))
    travel_min = (route.distance_km / (formula.base_speed_kmh * speed_factor) * 60
                  + route.ascent_m / 100 * formula.ascent_minutes_per_100_m)
    task_min = sum(item.minutes for item in route.objectives)
    duration_min = round(travel_min + task_min)
    power_w = formula.suit_base_power_w + sum(item.power_w for item in equipment)
    energy_wh = power_w * duration_min / 60
    battery_return_pct = max(0.0, 100 * (limits.battery_capacity_wh - energy_wh) / limits.battery_capacity_wh)

    result = {
        "route_id": route.id,
        "equipment_ids": [item.id for item in equipment],
        "duration_min": duration_min,
        "travel_min": round(travel_min),
        "task_min": round(task_min),
        "load_kg": round(load_kg, 1),
        "speed_factor": round(speed_factor, 3),
        "power_w": round(power_w, 1),
        "energy_wh": round(energy_wh),
        "battery_return_pct": round(battery_return_pct, 1),
        "limits": limits.model_dump(),
        "warnings": [],
    }
    warnings = result["warnings"]
    if load_kg > limits.max_load_kg:
        warnings.append({"id": "carga", "message": (
            f"La carga de {_es(result['load_kg'])} kg supera la carga máxima ficticia de {_es(limits.max_load_kg)} kg. "
            "Además, cada kg por encima de la carga libre reduce la velocidad estimada.")})
    if duration_min > limits.max_duration_min:
        warnings.append({"id": "duracion", "message": (
            f"La duración estimada de {duration_min} min supera el máximo ficticio de {_es(limits.max_duration_min)} min "
            f"({round(travel_min)} min de desplazamiento y {round(task_min)} min de objetivos).")})
    if energy_wh >= limits.battery_capacity_wh:
        warnings.append({"id": "bateria", "message": (
            f"La energía estimada ({round(energy_wh)} Wh, a {_es(round(power_w, 1))} W) alcanza o supera la capacidad ficticia "
            f"de {_es(limits.battery_capacity_wh)} Wh: la batería se agotaría antes de volver.")})
    elif battery_return_pct < limits.battery_reserve_pct:
        warnings.append({"id": "bateria", "message": (
            f"La batería al volver ({_es(result['battery_return_pct'])} %) queda por debajo de la reserva de planificación "
            f"de {_es(limits.battery_reserve_pct)} %. Consumo estimado: {_es(round(power_w, 1))} W durante {duration_min} min.")})
    return result


@router.get("/catalog")
def catalog():
    return read_catalog().model_dump(mode="json")


@router.post("/estimate")
def estimate_plan(body: PlanSelection):
    return estimate(body)
