"""Motor local en memoria. Reglas, procedencia y fuentes: data/simulated/mission.json.

Asistido por OpenAI Codex. Un único proceso Uvicorn, sin workers múltiples.
Cada escritura verifica instancia/revisión y se aplica atómicamente bajo un lock.
"""

import json
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path
from threading import RLock
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from backend.panel import Panel, get_scenario, read_dataset

CONFIG_PATH = Path(__file__).resolve().parents[1] / "data/simulated/mission.json"
router = APIRouter(prefix="/api/mission", tags=["Misión simulada compartida"])


class Context(BaseModel):
    instance_id: str
    revision: int = Field(ge=0)


class PanelSelection(Context):
    scenario_id: str


class ActivitySelection(Context):
    activity: Literal["interior", "EVA"]


class ClockAdvance(Context):
    minutes: int = Field(ge=1, le=1440)


class LinkConfiguration(Context):
    delay_minutes: int = Field(ge=0, le=30)


class Reset(Context):
    confirm: Literal[True]


def timestamp(value):
    return datetime.fromisoformat(value)


class MissionEngine:
    def __init__(self):
        self.config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        self.scenarios = {item["id"]: item for item in self.config["scenarios"]}
        self.baselines = {item["id"]: item["value"] for item in self.config["measurements"]}
        self.lock = RLock()
        self.state = self._initial()

    def _initial(self):
        dataset = read_dataset()
        state = {
            "instance_id": str(uuid4()), "revision": 0,
            "mission": dataset.mission, "selected_crew": dataset.astronaut,
            "activity": "interior", "clock": self.config["clock_start"],
            "gravity": deepcopy(self.config["gravity"]),
            "earth_link": {"connected": True, "delay_minutes": self.config["earth_delay_minutes"]},
            "panel_scenario_id": "estables", "panel": {},
            "measurements": {}, "programmed_radiation_rate": self.baselines["radiation_rate"],
            "events": [], "reports": [], "log": [],
        }
        for reading in self.config["measurements"]:
            state["measurements"][reading["id"]] = {
                **reading, "measured_at": state["clock"] if reading["value"] is not None else None,
            }
        self._select_panel(state, "estables")
        return state

    def _select_panel(self, state, scenario_id):
        # Reutiliza los tres escenarios originales; no escribe sus archivos.
        panel = Panel.model_validate(get_scenario(scenario_id)).model_dump(mode="json")
        delta = timestamp(state["clock"]) - timestamp(panel["demo_time"])
        for reading in panel["measurements"]:
            if reading["measured_at"] is not None:
                reading["measured_at"] = (timestamp(reading["measured_at"]) + delta).isoformat()
        for record in panel["history"]:
            record["recorded_at"] = (timestamp(record["recorded_at"]) + delta).isoformat()
            record["date"] = (datetime.fromisoformat(record["date"]) + delta).date().isoformat()
        state["panel"] = panel
        state["panel_scenario_id"] = scenario_id

    def _set_reading(self, state, name, value):
        reading = state["measurements"][name]
        reading.update(value=value, measured_at=state["clock"] if value is not None else None)

    def _quality(self, reading, clock):
        reading = deepcopy(reading)
        if reading["value"] is None:
            reading["availability"] = "missing"
        elif timestamp(clock) - timestamp(reading["measured_at"]) > timedelta(minutes=self.config["stale_after_minutes"]):
            reading["availability"] = "stale"
        else:
            reading["availability"] = "available"
        return reading

    def _snapshot(self, state):
        """Resumen sin log recursivo; registra contexto y consecuencias de la acción."""
        return deepcopy({key: state[key] for key in (
            "instance_id", "clock", "activity", "panel_scenario_id", "earth_link", "measurements",
        )} | {
            "events": [{key: event[key] for key in ("id", "hazard", "state", "acknowledged", "resolved")} for event in state["events"]],
            "reports": [{key: report[key] for key in ("id", "status", "due_at")} for report in state["reports"]],
        })

    def _record(self, state, action, before, hazard="mission", system="mission", event_id=None):
        state["log"].append({
            "id": f"{state['instance_id']}:LOG-{len(state['log']) + 1:04d}",
            "at": state["clock"], "hazard": hazard, "system": system,
            "action": action, "event_id": event_id,
            "before": before, "after": self._snapshot(state),
        })

    def _advance(self, state, minutes):
        # Es un modelo sintético programado, no extrapolación de un sensor obsoleto.
        state["clock"] = (timestamp(state["clock"]) + timedelta(minutes=minutes)).isoformat()
        dose = state["measurements"]["radiation_dose"]["value"]
        self._set_reading(state, "radiation_dose", round(dose + state["programmed_radiation_rate"] * minutes / 60, 6))

    def _deliver(self, state):
        for report in state["reports"]:
            if report["status"] != "en_transito" or not state["earth_link"]["connected"]:
                continue
            if timestamp(state["clock"]) < timestamp(report["due_at"]):
                continue
            before = self._snapshot(state)
            report.update(status="entregado", delivered_at=state["clock"])
            event = self._event(state, report["event_id"])
            event.update(state="entregado", resolved=True, resolved_at=state["clock"])
            self._record(state, "entrega_simulada", before, "distancia", "comunicaciones", event["id"])

    def _event(self, state, event_id):
        event = next((item for item in state["events"] if item["id"] == event_id), None)
        if event is None:
            raise HTTPException(404, "Evento no encontrado")
        return event

    def view(self):
        with self.lock:
            state = deepcopy(self.state)
        state["data_kind"] = "simulated"
        state["notice"] = self.config["notice"]
        state["provenance"] = self.config["provenance"]
        state["stale_after_minutes"] = self.config["stale_after_minutes"]
        state["priorities"] = self.config["priorities"]
        state["hazards"] = list(self.scenarios.values())
        state["panel"]["demo_time"] = state["clock"]
        state["panel"]["measurements"] = [self._quality(item, state["clock"]) for item in state["panel"]["measurements"]]
        state["measurements"] = [self._quality(item, state["clock"]) for item in state["measurements"].values()]
        for event in state["events"]:
            definition = self.scenarios[event["hazard"]]["states"][event["state"]]
            event.update(label=definition["label"], next_step=definition["next"], actions=definition["actions"])
        return state

    def command(self, context, operation, value=None, event_id=None):
        with self.lock:
            current = self.state
            if context.instance_id != current["instance_id"] or context.revision != current["revision"]:
                raise HTTPException(409, "La misión cambió en otro cliente. Actualiza antes de actuar.")
            state = deepcopy(current)
            before = self._snapshot(state)
            hazard, system = "mission", "mission"
            if operation == "reset":
                state = self._initial()
            elif operation == "panel":
                if any(e["hazard"] == "aislamiento" and not e["resolved"] for e in state["events"]):
                    raise HTTPException(409, "La tendencia está en seguimiento. Resuelve el guion o reinicia explícitamente.")
                self._select_panel(state, value)
            elif operation == "activity":
                if any(e["hazard"] in {"entorno", "radiacion"} and not e["resolved"] for e in state["events"]):
                    raise HTTPException(409, "Termina el procedimiento activo antes de cambiar interior/EVA.")
                state["activity"] = value
                self._set_reading(state, "suit_pressure", self.config["suit_active_pressure_kpa"] if value == "EVA" else None)
            elif operation == "link":
                state["earth_link"]["delay_minutes"] = value
                # Los informes en tránsito conservan el retardo fijado al enviarse.
            elif operation == "clock":
                self._advance(state, value)
            elif operation == "activate":
                hazard = value
                scenario = self.scenarios.get(hazard)
                if scenario is None:
                    raise HTTPException(404, "Hazard no encontrado")
                if any(e["hazard"] == hazard and not e["resolved"] for e in state["events"]):
                    raise HTTPException(409, "Este hazard ya tiene un evento activo")
                system = scenario["system"]
                evidence = {}
                if hazard in {"radiacion", "gravedad"}:
                    trigger = scenario["trigger"]
                    self._set_reading(state, trigger["measurement"], trigger["value"])
                    if trigger["value"] < trigger["threshold"]:
                        raise HTTPException(409, "El guion no cumple su regla configurada")
                    if hazard == "radiacion":
                        state["programmed_radiation_rate"] = trigger["value"]
                elif hazard == "aislamiento":
                    trigger = scenario["trigger"]
                    self._select_panel(state, trigger["panel_scenario"])
                    last = state["panel"]["history"][-1]
                    if not (last["sleep_hours"] < trigger["sleep_below"] and last["fatigue_score"] >= trigger["fatigue_at_least"]):
                        raise HTTPException(409, "El historial no cumple la regla del guion")
                    evidence["observed_history"] = deepcopy(state["panel"]["history"])
                elif hazard == "distancia":
                    state["earth_link"]["connected"] = False
                elif hazard == "entorno":
                    trigger = scenario["trigger"][state["activity"]]
                    self._set_reading(state, trigger["measurement"], trigger["value"])
                    system = "traje" if state["activity"] == "EVA" else "habitat"
                    if trigger["value"] >= trigger["threshold"]:
                        raise HTTPException(409, "El guion no cumple la regla de presión")
                    evidence["measurement_id"] = trigger["measurement"]
                event_id = f"{state['instance_id']}:EV-{len(state['events']) + 1:03d}"
                state["events"].append({
                    "id": event_id, "at": state["clock"], "hazard": hazard, "system": system,
                    "crew_id": state["selected_crew"]["id"], "activity": state["activity"],
                    "priority": scenario["priority"], "state": scenario["initial"],
                    "acknowledged": False, "acknowledged_at": None,
                    "resolved": False, "resolved_at": None, "evidence": evidence,
                })
            elif operation in {"acknowledge", "action"}:
                event = self._event(state, event_id)
                hazard, system = event["hazard"], event["system"]
                if operation == "acknowledge":
                    if event["acknowledged"]:
                        raise HTTPException(409, "Aviso ya reconocido")
                    event.update(acknowledged=True, acknowledged_at=state["clock"])
                else:
                    definition = self.scenarios[hazard]["states"][event["state"]]
                    action = next((a for a in definition["actions"] if a["id"] == value), None)
                    if action is None:
                        raise HTTPException(409, "Acción no disponible en este estado")
                    self._effect(state, event, action.get("effect"))
                    event["state"] = action["to"]
                    terminal = self.scenarios[hazard]["states"][event["state"]].get("terminal", False)
                    event["resolved"] = terminal
                    if terminal:
                        event["resolved_at"] = state["clock"]
            else:
                raise HTTPException(400, "Comando desconocido")
            state["revision"] += 1
            self._record(state, operation + (":" + str(value) if value is not None else ""), before, hazard, system, event_id)
            self._deliver(state)
            self.state = state
            return self.view()

    def _effect(self, state, event, effect):
        if effect == "shelter":
            if any(e["hazard"] == "entorno" and not e["resolved"] for e in state["events"]):
                raise HTTPException(409, "Completa el guion ambiental activo antes de cambiar al refugio interior.")
            state["activity"] = "interior"
            state["programmed_radiation_rate"] = self.config["shelter_rate_msv_per_hour"]
            self._set_reading(state, "radiation_rate", state["programmed_radiation_rate"])
            self._set_reading(state, "suit_pressure", None)
        elif effect == "radiation_end":
            state["programmed_radiation_rate"] = self.baselines["radiation_rate"]
            self._set_reading(state, "radiation_rate", state["programmed_radiation_rate"])
        elif effect == "motion_end":
            self._set_reading(state, "motion_peak", self.baselines["motion_peak"])
        elif effect == "environment_end":
            self._set_reading(state, event["evidence"]["measurement_id"], self.config["suit_active_pressure_kpa"] if event["system"] == "traje" else self.baselines["habitat_pressure"])
        elif effect == "recovery":
            self._advance(state, self.config["recovery_minutes"])
            self._select_panel(state, "estables")
        elif effect == "queue_report":
            state["reports"].append({
                "id": f"{state['instance_id']}:REP-{len(state['reports']) + 1:03d}",
                "event_id": event["id"], "created_at": state["clock"],
                "status": "pendiente", "sent_at": None, "due_at": None, "delivered_at": None,
                "data_kind": "simulated", "payload": self._snapshot(state),
            })
        elif effect == "restore_link":
            state["earth_link"]["connected"] = True
            for report in state["reports"]:
                if report["status"] == "pendiente":
                    report.update(status="en_transito", sent_at=state["clock"], due_at=(
                        timestamp(state["clock"]) + timedelta(minutes=state["earth_link"]["delay_minutes"])
                    ).isoformat())


# Una instancia por proceso. GET no crea ni reinicia misiones.
engine = MissionEngine()


@router.get("")
def mission_state():
    return engine.view()


@router.post("/panel")
def select_panel(body: PanelSelection):
    return engine.command(body, "panel", body.scenario_id)


@router.post("/activity")
def select_activity(body: ActivitySelection):
    return engine.command(body, "activity", body.activity)


@router.post("/clock")
def advance_clock(body: ClockAdvance):
    return engine.command(body, "clock", body.minutes)


@router.post("/link")
def configure_link(body: LinkConfiguration):
    return engine.command(body, "link", body.delay_minutes)


@router.post("/scenarios/{hazard}/activate")
def activate(hazard: str, body: Context):
    return engine.command(body, "activate", hazard)


@router.post("/events/{event_id}/acknowledge")
def acknowledge(event_id: str, body: Context):
    return engine.command(body, "acknowledge", event_id=event_id)


@router.post("/events/{event_id}/actions/{action_id}")
def perform_action(event_id: str, action_id: str, body: Context):
    return engine.command(body, "action", action_id, event_id)


@router.post("/reset")
def reset(body: Reset):
    return engine.command(body, "reset")
