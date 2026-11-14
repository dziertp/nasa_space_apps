"""Pruebas HTTP locales, sin dependencias de prueba adicionales."""

import json
import socket
import subprocess
import sys
import time
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from backend.panel import Measurement, availability


class PanelApiTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
