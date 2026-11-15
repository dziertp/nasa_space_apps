"""Estado sintético del traje por escenario. Asistencia de IA: docs/AI_DISCLOSURE.md."""

from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import AwareDatetime, BaseModel, Field, model_validator

router = APIRouter(prefix="/api/scenarios", tags=["Datos simulados"])
DATA_PATH = Path(__file__).resolve().parents[1] / "data/simulated/suit_status.json"

SuitState = Literal["ok", "precaucion", "critico"]


class Provenance(BaseModel):
    author: str = Field(min_length=1)
    generated_on: date
    method: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    nasa_measurements_used: Literal[False]
    clinical_validation: Literal[False]
    ai_disclosure: str


class PartDefinition(BaseModel):
    id: str
    label: str
    measure: str | None
    unit: str | None
    source: str = Field(min_length=1)
    criterion: str = Field(min_length=1)

    @model_validator(mode="after")
    def measure_needs_unit(self):
        if (self.measure is None) != (self.unit is None):
            raise ValueError("Una magnitud requiere unidad; una parte sin magnitud no lleva unidad")
        return self


class PartState(BaseModel):
    part: str
    status: SuitState
    value: float | None
    observation: str = Field(min_length=1)
    risk: str = Field(min_length=1)
    indication: str = Field(min_length=1)
    # Ninguna indicación tiene todavía un protocolo con fuente revisada.
    indication_review: Literal["Protocolo pendiente de fuente y revisión"]


class SuitScenario(BaseModel):
    id: str
    description: str = Field(min_length=1)
    parts: list[PartState]


class SuitDataset(BaseModel):
    schema_version: str
    data_kind: Literal["simulated"]
    label: str
    provenance: Provenance
    suit: dict[str, str]
    demo_time: AwareDatetime
    criteria_policy: str = Field(min_length=1)
    parts: list[PartDefinition] = Field(min_length=1)
    scenarios: list[SuitScenario] = Field(min_length=1)

    @model_validator(mode="after")
    def complete_scenarios(self):
        catalog = {part.id: part for part in self.parts}
        if len(catalog) != len(self.parts):
            raise ValueError("IDs de parte duplicados")
        if len({scenario.id for scenario in self.scenarios}) != len(self.scenarios):
            raise ValueError("IDs de escenario duplicados")
        for scenario in self.scenarios:
            if sorted(state.part for state in scenario.parts) != sorted(catalog):
                raise ValueError(f"{scenario.id}: cada parte del traje debe aparecer una sola vez")
            for state in scenario.parts:
                # null en una parte con unidad significa «Sin datos»; sin unidad no hay valor.
                if catalog[state.part].unit is None and state.value is not None:
                    raise ValueError(f"{scenario.id}/{state.part}: una parte sin magnitud no lleva valor")
        return self


class SuitPart(PartDefinition):
    status: SuitState
    value: float | None
    observation: str
    risk: str
    indication: str
    indication_review: str


class SuitPanel(BaseModel):
    schema_version: str
    data_kind: Literal["simulated"]
    label: str
    provenance: Provenance
    suit: dict[str, str]
    demo_time: AwareDatetime
    criteria_policy: str
    scenario: dict[str, str]
    parts: list[SuitPart]


def read_dataset() -> SuitDataset:
    # Ruta relativa al módulo, independiente del directorio de ejecución.
    return SuitDataset.model_validate_json(DATA_PATH.read_text(encoding="utf-8"))


@router.get("/{scenario_id}/suit", response_model=SuitPanel)
def get_suit(scenario_id: str):
    dataset = read_dataset()
    scenario = next((item for item in dataset.scenarios if item.id == scenario_id), None)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    states = {state.part: state for state in scenario.parts}
    return {
        **dataset.model_dump(exclude={"parts", "scenarios"}),
        "scenario": scenario.model_dump(include={"id", "description"}),
        # Orden fijo del catálogo: las partes no cambian de lugar entre escenarios.
        "parts": [
            {**part.model_dump(), **states[part.id].model_dump(exclude={"part"})}
            for part in dataset.parts
        ],
    }
