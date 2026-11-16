"""Pruebas de la preparación de EVA: catálogo, fórmulas y plan guardado en el motor de misión."""

import copy
import json
import unittest
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from pydantic import ValidationError

from backend.eva import DATA_PATH, EvaCatalog, PlanSelection, estimate, read_catalog
from backend.test_panel import LocalApiTestCase

LIGHT = {"route_id": "crater-alfa", "equipment_ids": ["kit-geologico", "contenedores", "camara"]}
HEAVY = {"route_id": "llanura-gamma", "equipment_ids": [
    "kit-geologico", "contenedores", "camara", "lampara", "taladro", "baliza", "sismometro"]}
LOW_BATTERY = {"route_id": "cresta-beta", "equipment_ids": ["kit-geologico", "camara", "baliza", "taladro"]}


class EvaFormulaTests(unittest.TestCase):
    """Fórmulas sin servidor: valores calculados a mano con las constantes del catálogo."""

    def test_light_plan_matches_hand_calculation(self):
        # Carga 11 kg → factor 0,98; desplazamiento 2,4/(3·0,98)·60 + 40/100·12 = 53,8 min; objetivos 45 min.
        result = estimate(PlanSelection(**LIGHT))
        self.assertEqual(result["load_kg"], 11.0)
        self.assertEqual(result["speed_factor"], 0.98)
        self.assertEqual((result["travel_min"], result["task_min"], result["duration_min"]), (54, 45, 99))
        # 90 W durante 99 min = 148,5 Wh de 800 Wh → 81,4 %.
        self.assertEqual(result["power_w"], 90)
        self.assertEqual(result["battery_return_pct"], 81.4)
        self.assertEqual(result["warnings"], [])

    def test_heavy_plan_exceeds_every_fictitious_limit_with_reasons(self):
        result = estimate(PlanSelection(**HEAVY))
        self.assertEqual(result["load_kg"], 31.8)
        self.assertEqual(result["speed_factor"], 0.564)
        self.assertEqual(result["duration_min"], 446)
        self.assertEqual(result["battery_return_pct"], 0)
        self.assertEqual([item["id"] for item in result["warnings"]], ["carga", "duracion", "bateria"])
        for warning in result["warnings"]:
            self.assertIn("ficticia" if warning["id"] != "duracion" else "ficticio", warning["message"])
        self.assertIn("agotaría", result["warnings"][2]["message"])

    def test_battery_below_reserve_is_explained(self):
        result = estimate(PlanSelection(**LOW_BATTERY))
        self.assertEqual((result["load_kg"], result["duration_min"], result["power_w"]), (20.5, 238, 175))
        self.assertEqual(result["battery_return_pct"], 13.2)
        self.assertEqual([item["id"] for item in result["warnings"]], ["bateria"])
        self.assertIn("reserva de planificación de 25 %", result["warnings"][0]["message"])

    def test_speed_factor_has_a_floor_and_no_equipment_is_valid(self):
        catalog = read_catalog().model_copy(deep=True)
        catalog.formula.speed_loss_per_kg = 0.5
        floored = estimate(PlanSelection(**HEAVY), catalog)
        self.assertEqual(floored["speed_factor"], catalog.formula.min_speed_factor)
        empty = estimate(PlanSelection(route_id="crater-alfa"))
        self.assertEqual((empty["load_kg"], empty["power_w"], empty["equipment_ids"]), (0, 80, []))

    def test_catalog_rejects_incomplete_or_unmarked_data(self):
        data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        EvaCatalog.model_validate(data)
        cases = {
            "validación clínica": lambda d: d["provenance"].update(clinical_validation=True),
            "mediciones NASA": lambda d: d["provenance"].update(nasa_measurements_used=True),
            "solo dos recorridos": lambda d: d["routes"].pop(),
            "pocos elementos": lambda d: d.update(equipment=d["equipment"][:5]),
            "equipamiento repetido": lambda d: d["equipment"].append(copy.deepcopy(d["equipment"][0])),
            "punto de retorno fuera del recorrido": lambda d: d["routes"][0]["return_point"].update(distance_km=5),
            "masa nula": lambda d: d["equipment"][0].update(mass_kg=0),
            "sin objetivos": lambda d: d["routes"][0].update(objectives=[]),
        }
        for name, mutate in cases.items():
            with self.subTest(case=name):
                broken = copy.deepcopy(data)
                mutate(broken)
                with self.assertRaises(ValidationError):
                    EvaCatalog.model_validate(broken)


class EvaApiTests(LocalApiTestCase):
    def _post(self, path, body):
        request = Request(self.base + path, data=json.dumps(body).encode("utf-8"),
                          headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=2) as response:
            return json.load(response)

    def expect_error(self, code, call):
        with self.assertRaises(HTTPError) as error:
            call()
        self.assertEqual(error.exception.code, code)

    def test_catalog_over_http_has_provenance_and_formula(self):
        catalog = self.get("/api/eva/catalog")
        self.assertEqual(catalog["data_kind"], "simulated")
        self.assertFalse(catalog["provenance"]["clinical_validation"])
        self.assertFalse(catalog["provenance"]["nasa_measurements_used"])
        self.assertEqual(len(catalog["routes"]), 3)
        self.assertTrue(6 <= len(catalog["equipment"]) <= 8)
        for route in catalog["routes"]:
            self.assertTrue(route["objectives"] and route["return_point"]["label"])
        for item in catalog["equipment"]:
            self.assertGreater(item["mass_kg"], 0)
            self.assertGreaterEqual(item["power_w"], 0)
        self.assertTrue(catalog["formula"]["description"])
        self.assertTrue(catalog["planning_policy"])
        self.assertEqual(set(catalog["limits"]), {"battery_capacity_wh", "battery_reserve_pct", "max_load_kg", "max_duration_min"})

    def test_estimate_over_http_matches_formula_and_has_no_side_effects(self):
        before = self.get("/api/mission")
        self.assertEqual(self._post("/api/eva/estimate", LIGHT), estimate(PlanSelection(**LIGHT)))
        self.assertEqual(self.get("/api/mission")["revision"], before["revision"])
        self.expect_error(404, lambda: self._post("/api/eva/estimate", {"route_id": "no-existe"}))
        self.expect_error(404, lambda: self._post("/api/eva/estimate", {"route_id": "crater-alfa", "equipment_ids": ["no-existe"]}))
        self.expect_error(422, lambda: self._post("/api/eva/estimate", {"route_id": "crater-alfa", "equipment_ids": ["camara", "camara"]}))


class EvaPlanTestCase(LocalApiTestCase):
    """Cada clase arranca su propio servidor: la misión empieza vacía en cada recorrido."""

    @staticmethod
    def suit_pressure(state):
        return next(item for item in state["measurements"] if item["id"] == "suit_pressure")["value"]

    def conflict(self, path, current, **fields):
        with self.assertRaises(HTTPError) as error:
            self.post(path, current, **fields)
        self.assertEqual(error.exception.code, 409)
        return json.loads(error.exception.read())["detail"]


class EvaPlanSaveApiTests(EvaPlanTestCase):
    def test_plan_is_saved_in_mission_and_kept_after_ending(self):
        initial = self.get("/api/mission")
        self.assertIsNone(initial["eva_plan"])
        # Revisión vencida: no se aplica y el estado no cambia.
        stale = {"instance_id": initial["instance_id"], "revision": initial["revision"] + 5}
        self.conflict("/api/mission/eva/start", stale, **LIGHT)
        self.assertEqual(self.get("/api/mission"), initial)

        current = self.post("/api/mission/eva/start", initial, **LIGHT)
        self.assertEqual(current["revision"], initial["revision"] + 1)
        self.assertEqual(current["activity"], "EVA")
        self.assertEqual(self.suit_pressure(current), 29.6)
        plan = current["eva_plan"]
        self.assertEqual((plan["status"], plan["route_id"], plan["started_at"]), ("activo", "crater-alfa", current["clock"]))
        self.assertEqual(plan["estimate"], estimate(PlanSelection(**LIGHT)))
        self.assertEqual([item["id"] for item in plan["equipment"]], LIGHT["equipment_ids"])
        self.assertEqual(plan["route"]["return_point"]["label"], "Borde norte del cráter Alfa")
        self.assertIn("eva_start:crater-alfa", current["log"][-1]["action"])

        # Con una EVA en curso no se inicia otra.
        self.assertIn("ya es EVA", self.conflict("/api/mission/eva/start", current, **HEAVY))
        current = self.post("/api/mission/eva/end", current)
        self.assertEqual(current["activity"], "interior")
        self.assertIsNone(self.suit_pressure(current))
        self.assertEqual((current["eva_plan"]["status"], current["eva_plan"]["ended_by"]), ("terminado", "terminar_eva"))
        self.assertEqual(current["eva_plan"]["estimate"], plan["estimate"])
        self.assertIn("No hay una EVA", self.conflict("/api/mission/eva/end", current))

        # El selector de actividad de Hazards también termina el plan, y el reinicio lo borra.
        current = self.post("/api/mission/eva/start", current, **LOW_BATTERY)
        current = self.post("/api/mission/activity", current, activity="interior")
        self.assertEqual((current["eva_plan"]["status"], current["eva_plan"]["ended_by"]), ("terminado", "selector_actividad"))
        current = self.post("/api/mission/reset", current, confirm=True)
        self.assertIsNone(current["eva_plan"])


class EvaPlanBlockedApiTests(EvaPlanTestCase):
    def test_open_radiation_or_environment_script_blocks_start(self):
        current = self.get("/api/mission")
        for hazard in ("radiacion", "entorno"):
            with self.subTest(hazard=hazard):
                current = self.post(f"/api/mission/scenarios/{hazard}/activate", current)
                self.assertIn("procedimiento activo", self.conflict("/api/mission/eva/start", current, **LIGHT))
                current = self.get("/api/mission")
                self.assertEqual((current["activity"], current["eva_plan"]), ("interior", None))
                event_id = current["events"][-1]["id"]
                # Cierra el guion recorriendo sus acciones para dejar libre el cambio de actividad.
                while not current["events"][-1]["resolved"]:
                    action = current["events"][-1]["actions"][0]["id"]
                    current = self.post(f"/api/mission/events/{quote(event_id, safe='')}/actions/{action}", current)
        current = self.post("/api/mission/eva/start", current, **LIGHT)
        self.assertEqual(current["eva_plan"]["status"], "activo")


class EvaPlanUnknownRouteApiTests(EvaPlanTestCase):
    def test_unknown_route_does_not_change_activity(self):
        current = self.get("/api/mission")
        with self.assertRaises(HTTPError) as error:
            self.post("/api/mission/eva/start", current, route_id="no-existe", equipment_ids=[])
        self.assertEqual(error.exception.code, 404)
        after = self.get("/api/mission")
        self.assertEqual((after["activity"], after["revision"], after["eva_plan"]), ("interior", current["revision"], None))


if __name__ == "__main__":
    unittest.main()
