"""Pruebas HTTP locales del estado del traje, con el mismo arranque que test_panel.py."""

import copy
import json
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from pydantic import ValidationError

from backend.suit import DATA_PATH, SuitDataset, read_dataset

PARTS = ["casco", "guantes", "soporte_vital", "bateria", "presion", "comunicaciones"]
PENDING = "Protocolo pendiente de fuente y revisión"


class SuitApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        cls.base = f"http://127.0.0.1:{port}"
        cls.process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", str(port)],
            cwd=Path(__file__).resolve().parents[1],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        cls.addClassCleanup(cls.stop_server)
        for _ in range(100):
            if cls.process.poll() is not None:
                raise RuntimeError("Uvicorn no pudo iniciarse para las pruebas")
            try:
                cls.get("/api/health")
                return
            except (URLError, TimeoutError):
                time.sleep(0.05)
        raise RuntimeError("La API de prueba no respondió")

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        try:
            cls.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.process.kill()
            cls.process.wait()

    @classmethod
    def get(cls, path):
        with urlopen(cls.base + path, timeout=2) as response:
            return json.load(response)

    def parts(self, scenario_id):
        return {part["id"]: part for part in self.get(f"/api/scenarios/{scenario_id}/suit")["parts"]}

    def counts(self, scenario_id):
        states = [part["status"] for part in self.parts(scenario_id).values()]
        return {state: states.count(state) for state in ("ok", "precaucion", "critico")}

    def test_every_panel_scenario_has_suit_with_provenance(self):
        catalog = self.get("/api/scenarios")
        # Ningún escenario del panel queda sin traje y el traje no define escenarios ajenos.
        self.assertEqual({item["id"] for item in catalog}, {item.id for item in read_dataset().scenarios})
        for scenario in catalog:
            with self.subTest(scenario=scenario["id"]):
                suit = self.get(f"/api/scenarios/{scenario['id']}/suit")
                self.assertEqual(suit["data_kind"], "simulated")
                self.assertEqual(suit["scenario"]["id"], scenario["id"])
                self.assertTrue(suit["scenario"]["description"])
                self.assertFalse(suit["provenance"]["nasa_measurements_used"])
                self.assertFalse(suit["provenance"]["clinical_validation"])
                for key in ("author", "generated_on", "method"):
                    self.assertTrue(suit["provenance"][key])
                self.assertTrue(suit["criteria_policy"])
                # Orden fijo: cada parte conserva su lugar en la cuadrícula.
                self.assertEqual([part["id"] for part in suit["parts"]], PARTS)

    def test_parts_have_state_risk_criterion_and_pending_indication(self):
        for scenario in self.get("/api/scenarios"):
            for part in self.parts(scenario["id"]).values():
                with self.subTest(scenario=scenario["id"], part=part["id"]):
                    self.assertIn(part["status"], {"ok", "precaucion", "critico"})
                    for key in ("label", "source", "criterion", "observation", "risk", "indication"):
                        self.assertTrue(part[key])
                    self.assertEqual(part["indication_review"], PENDING)

    def test_values_and_units(self):
        for scenario in self.get("/api/scenarios"):
            parts = self.parts(scenario["id"])
            with self.subTest(scenario=scenario["id"]):
                self.assertEqual({key: part["unit"] for key, part in parts.items()}, {
                    "casco": None, "guantes": None, "soporte_vital": "%", "bateria": "%",
                    "presion": "kPa", "comunicaciones": "%",
                })
                for part in parts.values():
                    if part["unit"] is None:
                        self.assertIsNone(part["value"])
                        self.assertIsNone(part["measure"])
                    else:
                        self.assertTrue(part["measure"])
                        self.assertIsNotNone(part["value"])

    def test_stable_suit_all_ok(self):
        self.assertEqual(self.counts("estables"), {"ok": 6, "precaucion": 0, "critico": 0})

    def test_reduced_rest_shows_caution_and_critical(self):
        parts = self.parts("descanso-reducido")
        self.assertEqual(parts["bateria"]["status"], "critico")
        self.assertEqual(parts["guantes"]["status"], "precaucion")
        self.assertEqual(self.counts("descanso-reducido"), {"ok": 4, "precaucion": 1, "critico": 1})

    def test_signal_loss_keeps_comms_in_caution(self):
        self.assertEqual(self.parts("sensor-sin-senal")["comunicaciones"]["status"], "precaucion")
        self.assertEqual(self.counts("sensor-sin-senal"), {"ok": 5, "precaucion": 1, "critico": 0})

    def test_suit_does_not_alter_health_panel(self):
        before = self.get("/api/scenarios/sensor-sin-senal")
        self.get("/api/scenarios/sensor-sin-senal/suit")
        self.assertEqual(self.get("/api/scenarios/sensor-sin-senal"), before)

    def test_unknown_scenario_suit_is_404(self):
        with self.assertRaises(HTTPError) as error:
            self.get("/api/scenarios/no-existe/suit")
        self.assertEqual(error.exception.code, 404)

    def test_dataset_rejects_incomplete_or_unmarked_data(self):
        data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        SuitDataset.model_validate(data)

        def casco(dataset):
            return next(item for item in dataset["scenarios"][0]["parts"] if item["part"] == "casco")

        cases = {
            "parte ausente": lambda d: d["scenarios"][0]["parts"].pop(),
            "parte repetida": lambda d: d["scenarios"][0]["parts"].append(copy.deepcopy(casco(d))),
            "indicación sin marca de revisión": lambda d: casco(d).update(indication_review="Revisado"),
            "estado desconocido": lambda d: casco(d).update(status="verde"),
            "valor en parte sin magnitud": lambda d: casco(d).update(value=1),
            "riesgo vacío": lambda d: casco(d).update(risk=""),
            "mediciones NASA": lambda d: d["provenance"].update(nasa_measurements_used=True),
            "validación clínica": lambda d: d["provenance"].update(clinical_validation=True),
        }
        for name, mutate in cases.items():
            with self.subTest(case=name):
                broken = copy.deepcopy(data)
                mutate(broken)
                with self.assertRaises(ValidationError):
                    SuitDataset.model_validate(broken)


if __name__ == "__main__":
    unittest.main()
