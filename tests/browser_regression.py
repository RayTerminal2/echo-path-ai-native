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
from playwright.sync_api import sync_playwright, Error as PlaywrightError, expect

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
                    page = browser.new_page(viewport={"width": width, "height": height}, has_touch=width < 800)
                    errors = []
                    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
                    page.on("pageerror", lambda exc: errors.append(str(exc)))
                    page.goto(BASE_URL, wait_until="load")
                    page.wait_for_selector("#board .cell")
                    assert page.evaluate("window.echoTest.getState().level") == 4
                    # Real UI inputs, switching, invalid statistics, and session preservation.
                    page.locator('#levelGrid button[data-level="0"]').click()
                    page.keyboard.press("ArrowUp")
                    assert page.evaluate("window.echoTest.getState().counts['1'].invalid") == 1
                    page.keyboard.press("d")
                    assert page.evaluate("window.echoTest.getState().steps") == 1
                    page.keyboard.press("Backspace")
                    cell = page.locator('#board .cell[data-dir="1"]')
                    if width < 800:
                        cell.tap()
                    else:
                        cell.click()
                    assert page.evaluate("window.echoTest.getState().steps") == 1
                    page.keyboard.press("Control+z")
                    page.locator('.dpad button[data-dir="2"]').click()
                    assert page.evaluate("window.echoTest.getState().steps") == 1
                    page.locator("#resetBtn").click()
                    reset = page.evaluate("window.echoTest.getState()")
                    assert reset["steps"] == 0 and reset["got"] == [] and reset["arrows"] == {}
                    assert reset["historyLength"] == 0 and not reset["won"]
                    assert reset["counts"]["1"]["undos"] == 2
                    assert reset["counts"]["1"]["restarts"] == 1
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
                        assert page.evaluate("document.documentElement.scrollWidth") <= width + 2
                        assert state["counts"][str(i)]["lastSteps"] == fixture["expectedSteps"]
                        if i < 9:
                            page.locator("#nextBtn").click()
                            assert page.evaluate("window.echoTest.getState().level") == i + 1
                            page.evaluate("i => window.echoTest.goToLevel(i)", i)
                            for direction in fixture["directions"]:
                                page.evaluate("d => window.echoTest.move(d)", direction)
                        page.locator("#undoBtn").click()
                        assert not page.evaluate("window.echoTest.getState().won"), (width, i)
                    page.locator("#resetBtn").click()
                    assert page.evaluate("window.echoTest.getState().steps") == 0
                    # Capture clipboard payload, then exercise legacy copy and download fallbacks.
                    page.evaluate("""() => {
                        window.copiedSummary = null;
                        Object.defineProperty(navigator, 'clipboard', {configurable:true,
                          value:{writeText: async text => {window.copiedSummary = text}}});
                    }""")
                    page.locator("#copyBtn").click()
                    expect(page.locator("#copyBtn")).to_contain_text("已复制")
                    summary = page.evaluate("window.copiedSummary")
                    assert "试玩记录" in summary
                    payload = json.loads(summary.split("事件明细(JSON)：\n")[1])
                    assert payload["levels"]["1"]["invalid"] == 1
                    assert payload["levels"]["9"]["lastSteps"] == 23
                    assert all(key in payload["levels"]["4"] for key in
                               ["undos", "restarts", "invalid", "best", "lastSteps", "secondsToFirstClear"])
                    page.evaluate("""() => {
                        Object.defineProperty(navigator, 'clipboard', {value:undefined});
                        document.execCommand = command => {window.legacyCopy = command; return true};
                    }""")
                    page.locator("#copyBtn").click()
                    assert page.evaluate("window.legacyCopy") == "copy"
                    page.evaluate("document.execCommand = () => false")
                    with page.expect_download() as download_info:
                        page.locator("#copyBtn").click()
                    downloaded = Path(download_info.value.path()).read_text(encoding="utf-8")
                    assert "事件明细(JSON)：" in downloaded
                    assert not errors, (width, errors)
                    print("PASS viewport", width, "all 9 routes, undo/reset/stats, keyboard/click/touch, next/switch, export, no overflow/JS errors")
                    page.close()
            finally:
                browser.close()
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
