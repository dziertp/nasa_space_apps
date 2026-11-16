"""Pruebas HTTP locales, sin dependencias de prueba adicionales."""

import json
import socket
import subprocess
import sys
import time
import unittest
from datetime import datetime, timedelta
from http.client import HTTPConnection
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from backend.panel import Measurement, availability


class LocalApiTestCase(unittest.TestCase):
    """Cada clase de pruebas usa su propio proceso y puerto temporal."""

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

    def post(self, path, current, **fields):
        request = Request(
            self.base + path,
            data=json.dumps({
                "instance_id": current["instance_id"],
                "revision": current["revision"],
                **fields,
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=2) as response:
            self.assertEqual(response.status, 200)
            return json.load(response)


class PanelApiTests(LocalApiTestCase):
    def test_health_and_catalog(self):
        self.assertEqual(self.get("/api/health"), {"status": "ok"})
        catalog = self.get("/api/scenarios")
        self.assertEqual({item["id"] for item in catalog}, {"estables", "descanso-reducido", "sensor-sin-senal"})

    def test_three_scenarios_provenance_and_seven_days(self):
        for scenario in self.get("/api/scenarios"):
            with self.subTest(scenario=scenario["id"]):
                panel = self.get("/api/scenarios/" + scenario["id"])
                self.assertEqual(panel["data_kind"], "simulated")
                self.assertEqual(panel["astronaut"]["id"], "SIM-001")
                self.assertFalse(panel["provenance"]["nasa_measurements_used"])
                self.assertFalse(panel["provenance"]["clinical_validation"])
                self.assertTrue(panel["provenance"]["method"])
                self.assertEqual({m["unit"] for m in panel["measurements"]}, {"lpm", "%", "°C"})
                self.assertEqual(len(panel["history"]), 7)
                dates = [datetime.fromisoformat(item["date"]) for item in panel["history"]]
                self.assertTrue(all(b - a == timedelta(days=1) for a, b in zip(dates, dates[1:])))
                for item in panel["history"] + panel["measurements"]:
                    self.assertTrue(item["source"])

    def test_stable_measurements_available(self):
        panel = self.get("/api/scenarios/estables")
        self.assertTrue(all(item["availability"] == "available" and item["value"] is not None for item in panel["measurements"]))

    def test_sleep_declines_and_fatigue_rises(self):
        records = self.get("/api/scenarios/descanso-reducido")["history"]
        for first, second in zip(records, records[1:]):
            self.assertGreater(first["sleep_hours"], second["sleep_hours"])
            self.assertLess(first["fatigue_score"], second["fatigue_score"])

    def test_signal_loss_keeps_null_and_stale_separate_from_health(self):
        metrics = {item["id"]: item for item in self.get("/api/scenarios/sensor-sin-senal")["measurements"]}
        self.assertEqual(metrics["heart_rate"]["availability"], "stale")
        self.assertIsNotNone(metrics["heart_rate"]["value"])
        for metric in ("spo2", "temperature"):
            self.assertEqual(metrics[metric]["availability"], "missing")
            self.assertIsNone(metrics[metric]["value"])
            self.assertIsNone(metrics[metric]["measured_at"])
        self.assertEqual(self.get("/api/health"), {"status": "ok"})

    def test_unknown_scenario_is_404(self):
        with self.assertRaises(HTTPError) as error:
            self.get("/api/scenarios/no-existe")
        self.assertEqual(error.exception.code, 404)

    def test_availability_boundary_and_zero_not_missing(self):
        reference = datetime.fromisoformat("2026-11-14T12:00:00-03:00")
        reading = Measurement(id="test", label="Prueba", value=0, unit="test", source="Simulado", measured_at=reference - timedelta(minutes=15))
        self.assertEqual(availability(reading, reference, 15), "available")
        self.assertEqual(availability(reading, reference + timedelta(seconds=1), 15), "stale")

    def test_mission_initial_state_is_interpretable_over_http(self):
        with urlopen(self.base + "/api/mission", timeout=2) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers.get_content_type(), "application/json")
            state = json.load(response)

        config_path = Path(__file__).resolve().parents[1] / "data/simulated/mission.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertTrue(state["instance_id"])
        self.assertEqual(state["revision"], 0)
        self.assertEqual(state["clock"], config["clock_start"])
        self.assertIsNotNone(datetime.fromisoformat(state["clock"]).utcoffset())
        self.assertEqual(state["data_kind"], "simulated")
        self.assertTrue(state["notice"])
        self.assertFalse(state["provenance"]["clinical_validation"])
        self.assertTrue(state["mission"]["id"])
        self.assertTrue(state["mission"]["name"])
        self.assertEqual(state["selected_crew"]["id"], "SIM-001")
        self.assertEqual(state["activity"], "interior")
        self.assertIs(state["earth_link"]["connected"], True)
        self.assertEqual(state["earth_link"]["delay_minutes"], config["earth_delay_minutes"])
        self.assertTrue(state["gravity"]["unit"])
        self.assertEqual(state["stale_after_minutes"], config["stale_after_minutes"])
        self.assertEqual({item["id"] for item in state["hazards"]},
                         {"radiacion", "aislamiento", "distancia", "gravedad", "entorno"})

        panel = state["panel"]
        self.assertEqual(panel["mission"]["id"], state["mission"]["id"])
        self.assertEqual(panel["astronaut"]["id"], state["selected_crew"]["id"])
        self.assertEqual(panel["demo_time"], state["clock"])
        self.assertEqual(state["panel_scenario_id"], "estables")
        self.assertEqual(panel["scenario"]["id"], state["panel_scenario_id"])
        self.assertEqual(len(panel["history"]), 7)
        self.assertTrue(state["measurements"])
        self.assertTrue(panel["measurements"])
        for reading in state["measurements"] + panel["measurements"]:
            with self.subTest(measurement=reading["id"]):
                self.assertTrue(reading["unit"])
                self.assertTrue(reading["source"])
                if reading["value"] is None:
                    self.assertIsNone(reading["measured_at"])
                    self.assertEqual(reading["availability"], "missing")
                else:
                    measured_at = datetime.fromisoformat(reading["measured_at"])
                    self.assertIsNotNone(measured_at.utcoffset())
                    self.assertLessEqual(measured_at, datetime.fromisoformat(state["clock"]))
                    self.assertIn(reading["availability"], {"available", "stale"})

    def test_mission_reads_from_distinct_clients_have_no_side_effects(self):
        # Dos conexiones HTTP independientes al mismo proceso, sin ejecutar POST.
        address = self.base.removeprefix("http://")
        first_client = HTTPConnection(address, timeout=2)
        second_client = HTTPConnection(address, timeout=2)

        def read(client):
            client.request("GET", "/api/mission")
            response = client.getresponse()
            self.assertEqual(response.status, 200)
            return json.loads(response.read())

        try:
            first = read(first_client)
            second = read(second_client)
            third = read(first_client)
        finally:
            first_client.close()
            second_client.close()

        self.assertEqual(first["revision"], 0)
        for field in ("events", "reports", "log"):
            self.assertEqual(first[field], [])
        for observed in (second, third):
            for field in ("instance_id", "mission", "selected_crew", "clock", "revision",
                          "events", "reports", "log", "measurements"):
                with self.subTest(field=field):
                    self.assertEqual(observed[field], first[field])


class EnvironmentalNoticeApiTests(LocalApiTestCase):
    def test_acknowledging_environment_notice_preserves_anomaly(self):
        # Este recorrido tiene un servidor propio; no activa ni reinicia el de PanelApiTests.
        initial = self.get("/api/mission")
        self.assertEqual(initial["activity"], "interior")
        self.assertEqual(initial["events"], [])
        scenario = next(item for item in initial["hazards"] if item["id"] == "entorno")
        trigger = scenario["trigger"]["interior"]
        measurement_id = trigger["measurement"]
        initial_reading = next(item for item in initial["measurements"] if item["id"] == measurement_id)
        self.assertNotEqual(initial_reading["value"], trigger["value"])

        def post(path, current):
            request = Request(
                self.base + path,
                data=json.dumps({
                    "instance_id": current["instance_id"],
                    "revision": current["revision"],
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=2) as response:
                self.assertEqual(response.status, 200)
                return json.load(response)

        activated = post("/api/mission/scenarios/entorno/activate", initial)
        self.assertEqual(activated["instance_id"], initial["instance_id"])
        self.assertEqual(len(activated["events"]), 1)
        event = activated["events"][0]
        self.assertTrue(event["id"])
        self.assertEqual(event["hazard"], "entorno")
        self.assertEqual(event["system"], "habitat")
        self.assertEqual(event["state"], "anomalia")
        self.assertEqual(event["priority"], "critica")
        self.assertFalse(event["acknowledged"])
        self.assertIsNone(event["acknowledged_at"])
        self.assertFalse(event["resolved"])
        self.assertEqual(event["evidence"]["measurement_id"], measurement_id)
        affected_reading = next(item for item in activated["measurements"] if item["id"] == measurement_id)
        self.assertEqual(affected_reading["value"], trigger["value"])
        self.assertLess(affected_reading["value"], trigger["threshold"])
        self.assertEqual(affected_reading["unit"], "kPa")

        acknowledged = post(
            f"/api/mission/events/{quote(event['id'], safe='')}/acknowledge", activated,
        )
        queried_again = self.get("/api/mission")
        for observed in (acknowledged, queried_again):
            self.assertEqual(observed["instance_id"], initial["instance_id"])
            self.assertEqual(len(observed["events"]), 1)
            notice = observed["events"][0]
            self.assertEqual(notice["id"], event["id"])
            self.assertTrue(notice["acknowledged"])
            self.assertEqual(notice["acknowledged_at"], acknowledged["clock"])
            self.assertEqual(notice["state"], event["state"])
            self.assertEqual(notice["priority"], event["priority"])
            self.assertEqual(notice["system"], event["system"])
            self.assertFalse(notice["resolved"])
            self.assertIsNone(notice["resolved_at"])
            reading = next(item for item in observed["measurements"] if item["id"] == measurement_id)
            self.assertEqual(reading, affected_reading)


class EnvironmentalRecoveryApiTests(LocalApiTestCase):
    def test_environment_recovery_resolves_and_keeps_notice(self):
        initial = self.get("/api/mission")
        self.assertEqual(initial["activity"], "interior")
        config_path = Path(__file__).resolve().parents[1] / "data/simulated/mission.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        baseline = next(item["value"] for item in config["measurements"] if item["id"] == "habitat_pressure")
        initial_pressure = next(item for item in initial["measurements"] if item["id"] == "habitat_pressure")
        self.assertEqual(initial_pressure["value"], baseline)

        current = self.post("/api/mission/scenarios/entorno/activate", initial)
        event_id = current["events"][0]["id"]
        event_path = f"/api/mission/events/{quote(event_id, safe='')}"
        current = self.post(event_path + "/acknowledge", current)
        affected_pressure = next(item["value"] for item in current["measurements"] if item["id"] == "habitat_pressure")
        self.assertNotEqual(affected_pressure, baseline)
        self.assertEqual(current["events"][0]["system"], "habitat")
        self.assertTrue(current["events"][0]["acknowledged"])
        self.assertFalse(current["events"][0]["resolved"])

        for action, expected_state in (
            ("iniciar_comprobacion", "comprobando"),
            ("simular_contencion", "contenido"),
            ("simular_restauracion", "restaurado"),
        ):
            current = self.post(event_path + "/actions/" + action, current)
            notice = current["events"][0]
            self.assertEqual(notice["state"], expected_state)
            if expected_state != "restaurado":
                self.assertFalse(notice["resolved"])
                self.assertEqual(next(item["value"] for item in current["measurements"] if item["id"] == "habitat_pressure"), affected_pressure)

        self.assertEqual(current["revision"], initial["revision"] + 5)
        self.assertEqual(current["log"][-1]["action"], "action:simular_restauracion")
        self.assertEqual(current["log"][-1]["event_id"], event_id)
        self.assertFalse(current["log"][-1]["before"]["events"][0]["resolved"])
        self.assertTrue(current["log"][-1]["after"]["events"][0]["resolved"])
        for observed in (current, self.get("/api/mission")):
            self.assertEqual(observed["instance_id"], initial["instance_id"])
            self.assertEqual(observed["revision"], current["revision"])
            self.assertEqual(observed["clock"], initial["clock"])
            pressure = next(item for item in observed["measurements"] if item["id"] == "habitat_pressure")
            self.assertEqual(pressure["value"], baseline)
            self.assertEqual(pressure["unit"], initial_pressure["unit"])
            self.assertEqual(len(observed["events"]), 1)
            notice = observed["events"][0]
            self.assertEqual(notice["id"], event_id)
            self.assertEqual(notice["state"], "restaurado")
            self.assertEqual(notice["priority"], "critica")
            self.assertTrue(notice["acknowledged"])
            self.assertTrue(notice["resolved"])
            self.assertEqual(notice["resolved_at"], current["clock"])
            self.assertFalse(any(not item["resolved"] for item in observed["events"]))


class EnvironmentalResetApiTests(LocalApiTestCase):
    def test_environment_reset_restores_initial_conditions_and_allows_activation(self):
        initial = self.get("/api/mission")
        self.assertEqual(initial["activity"], "interior")
        altered = self.post("/api/mission/scenarios/entorno/activate", initial)
        event_id = altered["events"][0]["id"]
        altered = self.post(f"/api/mission/events/{quote(event_id, safe='')}/acknowledge", altered)
        self.assertFalse(altered["events"][0]["resolved"])
        self.assertTrue(altered["events"][0]["acknowledged"])
        self.assertTrue(altered["log"])
        self.assertNotEqual(altered["measurements"], initial["measurements"])

        reset = self.post("/api/mission/reset", altered, confirm=True)
        self.assertNotEqual(reset["instance_id"], altered["instance_id"])
        # El contrato actual inicia una instancia en revisión 0 y registra reset: revisión 1.
        self.assertEqual(reset["revision"], 1)
        self.assertEqual(reset["clock"], initial["clock"])
        self.assertEqual(reset["activity"], "interior")
        self.assertEqual(reset["mission"], initial["mission"])
        self.assertEqual(reset["selected_crew"], initial["selected_crew"])
        self.assertEqual(reset["measurements"], initial["measurements"])
        self.assertEqual(reset["earth_link"], initial["earth_link"])
        self.assertEqual(reset["panel_scenario_id"], initial["panel_scenario_id"])
        self.assertEqual(reset["panel"]["history"], initial["panel"]["history"])
        self.assertEqual(reset["events"], [])
        self.assertEqual(reset["reports"], [])
        self.assertEqual(len(reset["log"]), 1)
        entry = reset["log"][0]
        self.assertEqual(entry["action"], "reset")
        self.assertEqual(entry["at"], reset["clock"])
        self.assertEqual(entry["before"]["instance_id"], altered["instance_id"])
        self.assertEqual(entry["before"]["events"][0]["id"], event_id)
        self.assertEqual(entry["after"]["instance_id"], reset["instance_id"])
        self.assertEqual(entry["after"]["events"], [])
        self.assertNotIn(entry["id"], {item["id"] for item in altered["log"]})
        observed = self.get("/api/mission")
        for field in ("instance_id", "revision", "clock", "events", "measurements", "log"):
            self.assertEqual(observed[field], reset[field])

        activated_again = self.post("/api/mission/scenarios/entorno/activate", observed)
        self.assertEqual(activated_again["instance_id"], reset["instance_id"])
        self.assertEqual(activated_again["revision"], reset["revision"] + 1)
        self.assertEqual(len(activated_again["events"]), 1)
        notice = activated_again["events"][0]
        self.assertNotEqual(notice["id"], event_id)
        self.assertEqual(notice["hazard"], "entorno")
        self.assertEqual(notice["system"], "habitat")
        self.assertEqual(notice["state"], "anomalia")
        self.assertFalse(notice["resolved"])
        self.assertFalse(notice["acknowledged"])
        pressure = next(item for item in activated_again["measurements"] if item["id"] == "habitat_pressure")
        self.assertEqual(pressure["value"], 80)


class RadiationNoticeApiTests(LocalApiTestCase):
    def test_acknowledging_radiation_notice_preserves_active_condition(self):
        # Servidor propio: no altera el estado de las pruebas ambientales o iniciales.
        initial = self.get("/api/mission")
        self.assertEqual(initial["activity"], "interior")
        self.assertEqual(initial["events"], [])
        scenario = next(item for item in initial["hazards"] if item["id"] == "radiacion")
        trigger = scenario["trigger"]
        self.assertEqual(scenario["system"], "dosimetro")
        self.assertEqual(trigger["measurement"], "radiation_rate")

        radiological_ids = {"radiation_dose", "radiation_rate"}
        original_readings = {
            item["id"]: item for item in initial["measurements"] if item["id"] in radiological_ids
        }
        self.assertEqual(original_readings["radiation_dose"]["value"], 0.2)
        self.assertEqual(original_readings["radiation_dose"]["unit"], "mSv")
        self.assertEqual(original_readings["radiation_rate"]["value"], 0.001)
        self.assertEqual(original_readings["radiation_rate"]["unit"], "mSv/h")

        activated = self.post("/api/mission/scenarios/radiacion/activate", initial)
        self.assertEqual(activated["instance_id"], initial["instance_id"])
        self.assertEqual(activated["revision"], initial["revision"] + 1)
        self.assertEqual(activated["activity"], "interior")
        self.assertEqual(activated["clock"], initial["clock"])
        affected_readings = {
            item["id"]: item for item in activated["measurements"] if item["id"] in radiological_ids
        }
        self.assertEqual(affected_readings["radiation_rate"]["value"], trigger["value"])
        self.assertEqual(affected_readings["radiation_rate"]["value"], 0.08)
        self.assertGreaterEqual(affected_readings["radiation_rate"]["value"], trigger["threshold"])
        self.assertEqual(affected_readings["radiation_dose"]["value"], original_readings["radiation_dose"]["value"])
        for measurement_id, reading in affected_readings.items():
            with self.subTest(measurement=measurement_id):
                self.assertEqual(reading["unit"], original_readings[measurement_id]["unit"])
                self.assertEqual(reading["system"], "dosimetro")
                self.assertTrue(reading["source"])
                self.assertEqual(reading["measured_at"], activated["clock"])
                self.assertEqual(reading["availability"], "available")

        self.assertEqual(len(activated["events"]), 1)
        event = activated["events"][0]
        self.assertTrue(event["id"])
        self.assertEqual(event["hazard"], "radiacion")
        self.assertEqual(event["system"], "dosimetro")
        self.assertEqual(event["activity"], "interior")
        self.assertEqual(event["state"], "aviso")
        self.assertEqual(event["priority"], "critica")
        self.assertFalse(event["acknowledged"])
        self.assertIsNone(event["acknowledged_at"])
        self.assertFalse(event["resolved"])

        acknowledged = self.post(
            f"/api/mission/events/{quote(event['id'], safe='')}/acknowledge", activated,
        )
        for observed in (acknowledged, self.get("/api/mission")):
            self.assertEqual(observed["instance_id"], initial["instance_id"])
            self.assertEqual(observed["revision"], activated["revision"] + 1)
            self.assertEqual(observed["clock"], initial["clock"])
            radiological_readings = {
                item["id"]: item for item in observed["measurements"] if item["id"] in radiological_ids
            }
            self.assertEqual(radiological_readings, affected_readings)
            self.assertEqual(len(observed["events"]), 1)
            notice = observed["events"][0]
            self.assertEqual(notice["id"], event["id"])
            self.assertEqual(notice["hazard"], event["hazard"])
            self.assertEqual(notice["system"], event["system"])
            self.assertEqual(notice["activity"], event["activity"])
            self.assertEqual(notice["state"], event["state"])
            self.assertEqual(notice["priority"], event["priority"])
            self.assertTrue(notice["acknowledged"])
            self.assertEqual(notice["acknowledged_at"], acknowledged["clock"])
            self.assertFalse(notice["resolved"])
            self.assertIsNone(notice["resolved_at"])


class RadiationShelterApiTests(LocalApiTestCase):
    def test_shelter_and_mitigation_preserve_accumulated_dose_without_time_advance(self):
        initial = self.get("/api/mission")
        self.assertEqual(initial["activity"], "interior")
        self.assertEqual(initial["events"], [])
        config_path = Path(__file__).resolve().parents[1] / "data/simulated/mission.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        scenario = next(item for item in initial["hazards"] if item["id"] == "radiacion")
        baseline_rate = next(item["value"] for item in config["measurements"] if item["id"] == "radiation_rate")
        initial_dose = next(item for item in initial["measurements"] if item["id"] == "radiation_dose")
        self.assertEqual(initial_dose["value"], 0.2)

        current = self.post("/api/mission/scenarios/radiacion/activate", initial)
        event_id = current["events"][0]["id"]
        event_path = f"/api/mission/events/{quote(event_id, safe='')}"
        current = self.post(event_path + "/acknowledge", current)
        acknowledged_at = current["events"][0]["acknowledged_at"]
        self.assertEqual(acknowledged_at, current["clock"])

        def assert_radiation_state(observed, phase, rate, resolved):
            self.assertEqual(observed["instance_id"], initial["instance_id"])
            self.assertEqual(observed["clock"], initial["clock"])
            self.assertEqual(observed["activity"], "interior")
            readings = {item["id"]: item for item in observed["measurements"]}
            self.assertEqual(readings["radiation_dose"]["value"], 0.2)
            self.assertEqual(readings["radiation_dose"]["unit"], "mSv")
            self.assertEqual(readings["radiation_dose"], initial_dose)
            self.assertEqual(readings["radiation_rate"]["value"], rate)
            self.assertEqual(readings["radiation_rate"]["unit"], "mSv/h")
            self.assertEqual(readings["radiation_rate"]["system"], "dosimetro")
            self.assertEqual(readings["radiation_rate"]["measured_at"], initial["clock"])
            self.assertEqual(observed["programmed_radiation_rate"], rate)
            self.assertEqual(len(observed["events"]), 1)
            notice = observed["events"][0]
            self.assertEqual(notice["id"], event_id)
            self.assertEqual(notice["hazard"], "radiacion")
            self.assertEqual(notice["system"], "dosimetro")
            self.assertEqual(notice["state"], phase)
            self.assertEqual(notice["priority"], "critica")
            self.assertTrue(notice["acknowledged"])
            self.assertEqual(notice["acknowledged_at"], acknowledged_at)
            self.assertIs(notice["resolved"], resolved)
            if resolved:
                self.assertEqual(notice["resolved_at"], observed["clock"])
            else:
                self.assertIsNone(notice["resolved_at"])

        assert_radiation_state(current, "aviso", scenario["trigger"]["value"], False)
        for action, phase, rate, resolved in (
            ("iniciar_refugio", "traslado", scenario["trigger"]["value"], False),
            ("confirmar_refugio", "protegido", config["shelter_rate_msv_per_hour"], False),
            ("simular_fin_evento", "finalizado", baseline_rate, True),
        ):
            with self.subTest(action=action):
                self.assertIn(action, {item["id"] for item in current["events"][0]["actions"]})
                revision_before = current["revision"]
                current = self.post(event_path + "/actions/" + action, current)
                self.assertEqual(current["revision"], revision_before + 1)
                assert_radiation_state(current, phase, rate, resolved)

        self.assertEqual(current["revision"], initial["revision"] + 5)
        self.assertEqual(current["events"][0]["actions"], [])
        queried_again = self.get("/api/mission")
        assert_radiation_state(queried_again, "finalizado", baseline_rate, True)
        self.assertEqual(queried_again["revision"], current["revision"])


class MissionRouteTestCase(LocalApiTestCase):
    """Recorridos completos por HTTP: misma API y control de instancia/revisión que usa la interfaz."""

    def post_conflict(self, path, current, **fields):
        with self.assertRaises(HTTPError) as error:
            self.post(path, current, **fields)
        self.assertEqual(error.exception.code, 409)

    @staticmethod
    def reading(state, measurement_id):
        return next(item for item in state["measurements"] if item["id"] == measurement_id)

    @staticmethod
    def event(state, event_id):
        return next(item for item in state["events"] if item["id"] == event_id)

    def act(self, current, event_id, action, phase, resolved):
        event = self.event(current, event_id)
        self.assertIn(action, {item["id"] for item in event["actions"]})
        revision = current["revision"]
        current = self.post(f"/api/mission/events/{quote(event_id, safe='')}/actions/{action}", current)
        self.assertEqual(current["revision"], revision + 1)
        event = self.event(current, event_id)
        self.assertEqual(event["state"], phase)
        self.assertIs(event["resolved"], resolved)
        self.assertEqual(event["resolved_at"], current["clock"] if resolved else None)
        self.assertTrue(event["label"] and event["next_step"])
        return current

    def activate_and_acknowledge(self, current, hazard):
        current = self.post(f"/api/mission/scenarios/{hazard}/activate", current)
        event_id = current["events"][-1]["id"]
        self.assertEqual(current["events"][-1]["hazard"], hazard)
        self.post_conflict(f"/api/mission/scenarios/{hazard}/activate", current)
        current = self.get("/api/mission")
        current = self.post(f"/api/mission/events/{quote(event_id, safe='')}/acknowledge", current)
        self.assertTrue(self.event(current, event_id)["acknowledged"])
        self.assertFalse(self.event(current, event_id)["resolved"])
        return current, event_id


class IsolationRouteApiTests(MissionRouteTestCase):
    def test_isolation_route_keeps_observations_and_recovers_with_new_records(self):
        initial = self.get("/api/mission")
        self.assertEqual(initial["panel_scenario_id"], "estables")
        current, event_id = self.activate_and_acknowledge(initial, "aislamiento")
        event = self.event(current, event_id)
        self.assertEqual((event["state"], event["priority"], event["system"]), ("aviso", "atencion", "bienestar"))
        self.assertEqual(current["panel_scenario_id"], "descanso-reducido")
        observed = event["evidence"]["observed_history"]
        self.assertEqual(len(observed), 7)
        self.assertLess(observed[-1]["sleep_hours"], 6)
        self.assertGreaterEqual(observed[-1]["fatigue_score"], 6)
        # Mientras la tendencia está en seguimiento, el historial de la misión no se cambia por otra vía.
        self.post_conflict("/api/mission/panel", current, scenario_id="estables")
        current = self.get("/api/mission")

        current = self.act(current, event_id, "registrar_contacto", "contacto", False)
        current = self.act(current, event_id, "programar_seguimiento", "seguimiento", False)
        self.assertEqual(current["clock"], initial["clock"])
        current = self.act(current, event_id, "simular_recuperacion", "recuperado", True)

        event = self.event(current, event_id)
        self.assertEqual(event["actions"], [])
        self.assertTrue(event["acknowledged"])
        self.assertEqual(event["evidence"]["observed_history"], observed)
        self.assertEqual(current["panel_scenario_id"], "estables")
        elapsed = datetime.fromisoformat(current["clock"]) - datetime.fromisoformat(initial["clock"])
        self.assertEqual(elapsed, timedelta(days=7))
        self.assertEqual(self.get("/api/mission")["revision"], current["revision"])


class DistanceRouteApiTests(MissionRouteTestCase):
    def test_distance_route_queues_sends_and_delivers_after_delay(self):
        initial = self.get("/api/mission")
        self.assertTrue(initial["earth_link"]["connected"])
        delay = initial["earth_link"]["delay_minutes"]
        current, event_id = self.activate_and_acknowledge(initial, "distancia")
        self.assertEqual(self.event(current, event_id)["state"], "sin_enlace")
        self.assertFalse(current["earth_link"]["connected"])

        current = self.act(current, event_id, "crear_informe", "pendiente", False)
        self.assertEqual([(r["event_id"], r["status"]) for r in current["reports"]], [(event_id, "pendiente")])
        self.assertFalse(current["earth_link"]["connected"])

        current = self.act(current, event_id, "recuperar_enlace", "en_transito", False)
        self.assertTrue(current["earth_link"]["connected"])
        report = current["reports"][0]
        self.assertEqual(report["status"], "en_transito")
        self.assertEqual(report["sent_at"], current["clock"])
        due = datetime.fromisoformat(report["due_at"])
        self.assertEqual(due - datetime.fromisoformat(current["clock"]), timedelta(minutes=delay))
        # En tránsito no hay acción manual: solo el reloj simulado entrega el informe.
        self.assertEqual(self.event(current, event_id)["actions"], [])

        current = self.post("/api/mission/clock", current, minutes=delay - 1)
        self.assertEqual(current["reports"][0]["status"], "en_transito")
        self.assertFalse(self.event(current, event_id)["resolved"])
        current = self.post("/api/mission/clock", current, minutes=1)
        event = self.event(current, event_id)
        self.assertEqual((event["state"], event["resolved"]), ("entregado", True))
        self.assertEqual(current["reports"][0]["status"], "entregado")
        self.assertEqual(current["reports"][0]["delivered_at"], current["clock"])
        self.assertEqual(current["clock"], report["due_at"])


class GravityRouteApiTests(MissionRouteTestCase):
    def test_gravity_discard_and_confirm_routes_restore_motion_without_injury_inference(self):
        initial = self.get("/api/mission")
        baseline = self.reading(initial, "motion_peak")["value"]

        current, first = self.activate_and_acknowledge(initial, "gravedad")
        self.assertEqual(self.event(current, first)["state"], "posible_caida")
        self.assertEqual(self.reading(current, "motion_peak")["value"], 4)
        self.assertEqual({a["id"] for a in self.event(current, first)["actions"]}, {"confirmar_evento", "descartar_evento"})
        current = self.act(current, first, "descartar_evento", "descartado", True)
        self.assertEqual(self.reading(current, "motion_peak")["value"], baseline)

        current, second = self.activate_and_acknowledge(current, "gravedad")
        self.assertNotEqual(first, second)
        current = self.act(current, second, "confirmar_evento", "confirmado", False)
        self.assertEqual(self.reading(current, "motion_peak")["value"], 4)
        current = self.act(current, second, "cerrar_comprobacion", "revisado", True)
        self.assertEqual(self.reading(current, "motion_peak")["value"], baseline)
        self.assertEqual(self.event(current, first)["state"], "descartado")
        self.assertEqual(current["clock"], initial["clock"])


class SuitPressureEvaApiTests(MissionRouteTestCase):
    def test_eva_environment_anomaly_targets_suit_and_restores_its_pressure(self):
        initial = self.get("/api/mission")
        self.assertIsNone(self.reading(initial, "suit_pressure")["value"])
        current = self.post("/api/mission/activity", initial, activity="EVA")
        self.assertEqual(current["activity"], "EVA")
        self.assertEqual(self.reading(current, "suit_pressure")["value"], 29.6)

        current, event_id = self.activate_and_acknowledge(current, "entorno")
        event = self.event(current, event_id)
        self.assertEqual((event["system"], event["activity"], event["priority"]), ("traje", "EVA", "critica"))
        self.assertEqual(event["evidence"]["measurement_id"], "suit_pressure")
        self.assertEqual(self.reading(current, "suit_pressure")["value"], 22)
        self.assertEqual(self.reading(current, "habitat_pressure")["value"], 101.3)
        # No se cambia interior/EVA con el procedimiento ambiental activo.
        self.post_conflict("/api/mission/activity", current, activity="interior")
        current = self.get("/api/mission")

        current = self.act(current, event_id, "iniciar_comprobacion", "comprobando", False)
        current = self.act(current, event_id, "simular_contencion", "contenido", False)
        self.assertEqual(self.reading(current, "suit_pressure")["value"], 22)
        current = self.act(current, event_id, "simular_restauracion", "restaurado", True)
        self.assertEqual(self.reading(current, "suit_pressure")["value"], 29.6)
        current = self.post("/api/mission/activity", current, activity="interior")
        self.assertIsNone(self.reading(current, "suit_pressure")["value"])


if __name__ == "__main__":
    unittest.main()
