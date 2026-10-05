# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright"]
# ///
"""Browser test of the rendered demo site (knapsack game).

    quarto render && (cd _site && python3 -m http.server 8765) &
    uv run tests/e2e.py                      # needs: uv run --with playwright playwright install chromium

Checks: no console errors; play → Optimize → morph → toggle → Why? on the html
page; telemetry DOM events; instant reveal on a reduced-motion touch phone;
crisp canvas and no slide change when tapping the game on revealjs slides.
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"
CANVAS = ".gamekit canvas"
PACK = (1, 3, 4)  # Stove, Book, Drone: weight 12 of 13, 125 points (the optimum)


def board_point(rect, bw, bh, bx, by):
    """Board units → CSS pixels on the canvas; the board is drawn letterboxed (uniform scale, centred)."""
    s = min(rect["width"] / bw, rect["height"] / bh)
    return {"x": (rect["width"] - bw * s) / 2 + bx * s, "y": (rect["height"] - bh * s) / 2 + by * s}


def item_point(k, rect):
    """Centre of item k (board 100 × 62)."""
    return board_point(rect, 100, 62, 10 + (k % 3) * 30 + 13, 6 + (k // 3) * 20 + 8)


def rect_of(page, sel):
    return page.eval_on_selector(sel, "c => { const r = c.getBoundingClientRect(); return {width: r.width, height: r.height}; }")


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # 1. html page, desktop, normal motion
        page = browser.new_page(viewport={"width": 1100, "height": 900}, device_scale_factor=2)
        page.on("pageerror", lambda e: errors.append(f"page: {e}"))
        page.on("console", lambda m: m.type == "error" and errors.append(f"console: {m.text}"))
        page.goto(BASE + "/index.html")
        page.evaluate("window.__ev = []; for (const n of ['game-start','game-optimize','game-why']) document.addEventListener(n, e => window.__ev.push(n))")
        page.click(CANVAS, position=item_point(0, rect_of(page, CANVAS)))  # Tent: 10 points
        page.click(CANVAS, position=item_point(2, rect_of(page, CANVAS)))  # Camera: 30 points
        assert page.inner_text(".gk-you .gk-value") == "40 points", page.inner_text(".gk-you")
        assert not page.is_disabled("button.gk-primary")
        size = page.eval_on_selector(CANVAS, "c => [c.width, Math.round(c.getBoundingClientRect().width * devicePixelRatio)]")
        assert size[0] == size[1], f"canvas buffer {size}"
        page.click("button.gk-primary")
        page.wait_for_selector(".gamekit-card:has-text('yes/no decisions')", timeout=8000)
        page.wait_for_selector("text=Show yours", timeout=8000)
        assert page.inner_text(".gk-opt .gk-value") == "125 points", page.inner_text(".gk-opt")
        page.click("text=Show yours")
        page.wait_for_selector("text=Show optimal")
        page.click("text=Why?")
        assert "Your bag: Tent, Camera" in page.inner_text(".gamekit-card")
        assert page.evaluate("window.__ev") == ["game-start", "game-optimize", "game-why"], page.evaluate("window.__ev")
        page.click("text=New puzzle")
        assert page.inner_text(".gk-you .gk-value") == "0 points"

        # 2. phone page, touch, reduced motion: reveal is instant
        phone = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=3,
                                 reduced_motion="reduce", has_touch=True)
        phone.on("pageerror", lambda e: errors.append(f"phone: {e}"))
        phone.goto(BASE + "/games/knapsack.html")
        for k in PACK:
            phone.tap(CANVAS, position=item_point(k, rect_of(phone, CANVAS)))
        assert phone.inner_text(".gk-you .gk-value") == "125 points"
        phone.click("button.gk-primary")
        phone.wait_for_selector("text=Show yours", timeout=3000)
        assert phone.inner_text(".gk-opt .gk-value") == "125 points"

        # 3. slides at projector size: crisp canvas, QR code, taps don't change slides
        slides = browser.new_page(viewport={"width": 1920, "height": 1080})
        slides.on("pageerror", lambda e: errors.append(f"slides: {e}"))
        slides.goto(BASE + "/slides.html#/pack-the-bag")
        slides.wait_for_timeout(1000)
        canvas = ".present .gamekit canvas"
        size = slides.eval_on_selector(canvas, "c => [c.width, Math.round(c.getBoundingClientRect().width * devicePixelRatio)]")
        assert size[0] == size[1], f"slide canvas buffer {size}"
        assert slides.query_selector(".present .gamekit-side .gamekit-qr svg"), "QR code missing from the side panel"
        stage = slides.eval_on_selector(".present .gamekit-stage", "e => e.getBoundingClientRect().right")
        side = slides.eval_on_selector(".present .gamekit-side", "e => e.getBoundingClientRect().left")
        assert side >= stage, f"side panel ({side}) is not right of the board ({stage})"
        before = slides.evaluate("Reveal.getIndices().h")
        slides.click(canvas, position=item_point(1, rect_of(slides, canvas)))
        assert slides.evaluate("Reveal.getIndices().h") == before, "tapping the game changed the slide"
        assert slides.inner_text(".present .gk-you .gk-value") == "40 points"

        browser.close()
    assert not errors, errors
    print("e2e.py: all passed")


if __name__ == "__main__":
    main()
