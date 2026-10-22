"""Optional true-browser regression. Requires `pip install playwright` plus a Chromium browser.

Run from project root: python tests/browser_regression.py
This is independent of node:test and not assumed available in Codex automatically.
"""
import json
import subprocess
import shutil
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = json.loads((ROOT / "tests/fixtures/verified-paths.v0.2.json").read_text(encoding="utf-8"))
BASE_URL = "http://127.0.0.1:5173/"


def wait_server(timeout=10):
    for _ in range(timeout * 10):
        try:
            urllib.request.urlopen(BASE_URL, timeout=0.5).read(1)
            return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("No server at " + BASE_URL)


def main():
    server = subprocess.Popen(["node", "scripts/serve.mjs"], cwd=ROOT, stdout=subprocess.DEVNULL)
    try:
        wait_server()
        with sync_playwright() as pw:
            try:
                browser = pw.chromium.launch(headless=True)
            except PlaywrightError:
                # Fallback for Linux systems with Chromium preinstalled, but no Playwright cache.
                system_chromium = shutil.which("chromium") or shutil.which("chromium-browser")
                if not system_chromium:
                    raise
                browser = pw.chromium.launch(headless=True, executable_path=system_chromium, args=["--no-sandbox", "--disable-dev-shm-usage"])
            try:
                for width, height in [(1100, 800), (390, 844), (320, 720)]:
                    page = browser.new_page(viewport={"width": width, "height": height})
                    errors = []
                    page.on("pageerror", lambda exc: errors.append(str(exc)))
                    page.goto(BASE_URL, wait_until="load")
                    page.wait_for_selector("#board .cell")
                    assert page.evaluate("document.documentElement.scrollWidth") <= width + 2
                    # Reference paths exercise the actual browser game, not an independent simulator.
                    for fixture in FIXTURES:
                        i = fixture["level"]
                        page.evaluate("i => window.echoTest.goToLevel(i)", i)
                        for direction in fixture["directions"]:
                            page.evaluate("d => window.echoTest.move(d)", direction)
                        state = page.evaluate("window.echoTest.getState()")
                        assert state["won"], (width, i, state)
                        assert state["steps"] == fixture["expectedSteps"], (width, i, state)
                        page.locator("#undoBtn").click()
                        assert not page.evaluate("window.echoTest.getState().won"), (width, i)
                    page.locator("#resetBtn").click()
                    assert page.evaluate("window.echoTest.getState().steps") == 0
                    assert not errors, (width, errors)
                    print("PASS viewport", width, "all 9 routes, undo/reset, no JS errors")
                    page.close()
            finally:
                browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
