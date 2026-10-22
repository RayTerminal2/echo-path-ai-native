"""Frozen V0.2 browser baseline replay; needs Python Playwright and Chromium.

Uses page.set_content on the archived single-file baseline to avoid local HTTP.
This does NOT exercise any refactored JS modules; use browser_regression.py for that.
"""
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = json.loads((ROOT / 'tests/fixtures/verified-paths.v0.2.json').read_text(encoding='utf8'))
HTML = (ROOT / 'legacy/echo-v0.2-original.html').read_text(encoding='utf8')


def main():
    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=True)
        except PlaywrightError:
            executable = shutil.which('chromium') or shutil.which('chromium-browser')
            if not executable:
                raise
            browser = pw.chromium.launch(headless=True, executable_path=executable, args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            for width,height in [(1100,800),(390,844),(320,720)]:
                page=browser.new_page(viewport={'width':width,'height':height})
                errors=[]
                page.on('pageerror',lambda err:errors.append(str(err)))
                page.set_content(HTML, wait_until='load')
                page.wait_for_selector('#board .cell')
                assert page.evaluate('document.documentElement.scrollWidth') <= width+2
                for fixture in FIXTURES:
                    i=fixture['level']
                    page.evaluate('i => window.echoTest.goToLevel(i)',i)
                    for direction in fixture['directions']:
                        page.evaluate('d => window.echoTest.move(d)',direction)
                    state=page.evaluate('window.echoTest.getState()')
                    assert state['won'] is True,(width,i,state)
                    assert state['steps'] == fixture['expectedSteps'],(width,i,state)
                    page.locator('#undoBtn').click()
                    assert not page.evaluate('window.echoTest.getState().won'),(width,i)
                page.locator('#resetBtn').click()
                assert page.evaluate('window.echoTest.getState().steps') == 0
                assert not errors,(width,errors)
                page.close()
                print('PASS frozen baseline',width,'9/9 reference paths, undo, reset, no JS errors')
        finally:
            browser.close()

if __name__ == '__main__': main()
