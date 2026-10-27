# Quarto Gamekit

Short canvas learning games for Quarto lectures. Students play an optimization
problem by hand, press **Optimize**, and [HiGHS](https://highs.dev) solves the
same model live in their browser (WebAssembly, in a Web Worker). Gamekit then
morphs the student's plan into the optimal one and explains the difference.

- **One div per game**: `::: {.game name="transport"}` in any page or revealjs deck.
- **Shared reveal**: Lock → Think (real solver numbers) → Morph → Toggle *Yours ⇄ Optimal* → **Why?** (closes with the × in its corner or a tap on the card)
- **Class puzzle + New puzzle**: everyone plays the lecture's own data; random puzzles for practice.
- **Branded automatically**: colors come from `--gk-*` CSS tokens that fall back to the site's Bootstrap or reveal variables.
- **Every format**: playable in html and revealjs (with a QR code to a phone page); a one-line link in typst, hugo-md and others.
- **English and German**: buttons, scores, status and the Think card follow the document's `lang` (`de` for German, English otherwise); a game's own texts are the game's.
- **Anonymous telemetry**: if the page loads [umami](https://umami.is), `game-start`, `game-optimize` and `game-why` events fire automatically (same rules as Quizkit).
- **Checked in Node**: `check.js` solves every game's class puzzle and compares it with the optimum from your JuMP model.

## Installation

```bash
quarto add beyondsimulations/Quarto-Gamekit
```

Add the filter in `_quarto.yml`. If your project lists files under
`project.render`, add `games/*.qmd` to that list so the phone pages are built
(a website without a `render:` list renders them anyway; don't add one just
for this, or every page not listed stops building):

```yaml
filters:
  - gamekit
gamekit:
  url: https://example.org/my-course   # absolute base URL, used for the PDF link
```

and create `games/_metadata.yml` so phone pages render as html only:

```yaml
format: html
format-links: false
```

## Adding a game

1. Write `games/<name>.js` (see the contract below and `games/knapsack.js`).
2. Write the phone page `games/<name>.qmd`:

   ```markdown
   ---
   title: "Pack the Bag"
   ---

   ::: {.game name="knapsack"}
   :::
   ```

3. Put the same div on a lecture slide or page.
4. Run `node _extensions/gamekit/check.js games/*.js`.

## The game contract

```js
Gamekit.game("knapsack", {
  title, task, goal: "max" | "min", unit,     // texts; unit is appended to scores ("€", or ["crate", "crates"]);
                                              // goal may be puzzle => "max" | "min" when the direction differs
  digits,                                     // optional: decimal places of scores (default 0), for optima like 112.5
  board: { w, h, stretch },                   // drawing units; Gamekit scales to pixels
  compactBoard: { w, h },                     // optional: board for phones (screens < 600 px); h may be (em, puzzle) => units
  class: { … },                               // the class puzzle (the lecture's own data)
  check: { optimum, plans },                  // class optimum from your JuMP model; plans(puzzle): optional
                                              // extra plans check.js also solves from (e.g. larger sizes)
  puzzle(rng),                                // → random puzzle; rng() returns [0, 1)
  start(puzzle),                              // → empty plan
  pointer(puzzle, plan, ui, e, view),         // e = { type, x, y, from, moved } in board units → new plan or undefined
  pieces(puzzle, plan, ui, view),             // → [{ key, color, alpha, …numbers }]
  drawBoard(ctx, puzzle, view),               // static background
  drawPiece(ctx, piece, view),                // one piece; use piece.paint, alpha is preset
  feasible(puzzle, plan),                     // → true or a short reason
  note(puzzle, plan, ui),                     // optional: → a warning about the plan or the piece being dragged, or null; shown in the status line on phones
  score(puzzle, plan),
  model(puzzle, plan), decode(puzzle, values, plan), // LP text for HiGHS, and values → plan
  // or: optimal(puzzle, plan) and think(puzzle, result) for games solved in JS
  think(puzzle, { plan, ms, counts }),         // optional with model too: the Think card's line
  insight(puzzle, yours, optimal),            // → { diff, mechanism, model }; `code` in backticks
  describe(puzzle, plan),                     // one line for screen readers
});
```

- `board.stretch: true` lets the board grow wider than `w` on slides to fill the stage, so its edges line up with the task text; lay out with `view.w`.
- `ui` is a plain object for transient state (e.g. a selection); Gamekit clears it on Optimize, Reset and New.
- `model`, `decode` and `optimal` also receive the player's plan at Optimize, for games where the player shapes the problem (e.g. adds items); most games ignore it. `check.js` solves from `start(puzzle)`.
- `color` is a token: `plan` (neutral while playing, accent for the optimum), `accent`, `neutral`, `text`, `muted`, `bg`, `good`, `bad`.
- During the reveal, pieces are matched by `key` (unique per plan). Numbers interpolate, colors blend, pieces only in one plan fade. Emit zero-size pieces instead of omitting them when they should grow.
- `view` = `{ w, h, px, css, font, em, compact, locked }` (`locked`: the board is locked during and after the reveal; hide play-only hints then); `view.css[token]` is a CSS color string for the seven fixed tokens. `plan` has no entry there: a piece gets its resolved color as `piece.paint`.
- **Text in boxes:** `GamekitCore.fillCentred(ctx, text, x, y, align)` centres digits and capitals exactly on `y` (canvas's `middle` baseline sits a little off).
- **Solver time in a `think` line:** `GamekitCore.seconds(ms)` formats it like the built-in line (`0.02 s`).
- **Text over several lines:** `GamekitCore.wrapText(ctx, text, w)` breaks it into lines no wider than `w`.
- **Fonts within a line:** `GamekitCore.fillRuns(ctx, [[text, font, dy?], …], x, y, align)` draws a bold label with its value, or a symbol with a subscript; centring and `align` work as in `fillCentred` (default `"center"`).
- **Lists and indices in texts:** `GamekitCore.joinList(["a", "b", "c"])` gives `a, b and c` in the page's language (`a, b und c`); `GamekitCore.subscript(12)` gives `₁₂`.
- **The goal of a puzzle:** `GamekitCore.goalOf(def, puzzle)` gives `"max"` or `"min"`, also when `goal` is a function.
- **Drag:** `e.type` is `"down"`, `"move"` (while pressed), `"up"` or `"cancel"` (the browser took the touch: drop the drag, don't apply it). After a press, `e.from` is where it started and `e.moved` is true once it travelled more than a few screen pixels, so a game tells a tap from a drag without its own threshold. Wherever a game moves things, let them be dragged: act on a tap at release (a press may become a drag), keep the drag in `ui`, draw the result while it hovers (a see-through piece, red with the reason where it can't go), and apply it on release. The canvas captures the pointer, so a drag that leaves the board still ends.
- **One text size:** draw all canvas text at `view.em` (the game's HTML text size in board units), so board labels match the task, scores, status and buttons exactly, on slides and phones. Emphasis only through color and weight.
- **Phones:** on screens narrower than 600 px `view.compact` is true and the board is `compactBoard` if given (its `h` can be a function of the text size `em` and the puzzle, so a layout spaced in em fits every phone and every puzzle without gaps; New lays the board out again); lay out finger-sized targets (≥ 44 px) there. A warning the game draws on the board (e.g. what makes a plan infeasible) belongs in `note` on phones instead: the status line shows it in `bad`, and the panel keeps it in view while the player drags. Scores, status and buttons then form a panel at the bottom of the screen with the buttons in equal columns; on the game's own page (`games/<name>.html`) it is fixed to the bottom edge and the page title is hidden (the site's top bar shows it).
- **Floating buttons:** while a game's panel lies in the bottom right corner of the screen (on phones it sticks there), `<html>` has the class `gamekit-at-bottom`. A site hides its own floating button with it, e.g. `html.gamekit-at-bottom .cw-fab { visibility: hidden; }` for a chat button.
- **Slides:** a wide left column with the task above the board, a thin divider, and a narrow right column with the QR code, the game's state and the buttons at the bottom. The game fills the height the slide has left below its heading, on any stage size; put the div directly on the slide, not inside columns or another block. The QR code links to `<gamekit.url>/games/<name>.html` when `gamekit.url` is set (so exported or locally served slides still work for phones), otherwise to the page's own address.
- LP variable names: letters, digits and `_` only.

## Language

Gamekit's own texts (the buttons, the score labels, the status line, the
Think card and the link line of non-html formats) follow the document's
`lang`: German for `lang: de`, English for everything else. Numbers follow
it too: `GamekitCore.formatScore` and `GamekitCore.seconds` write `225.460 €`
and `0,02 s` on a German page. The German texts use neither du nor Sie. A
game's texts (`title`, `task`, `insight`, canvas labels) are written in the
game file in the course's language. Another language is one more table in
`TEXTS` in `core.js`.

## Theme tokens

`--gk-accent`, `--gk-neutral`, `--gk-text`, `--gk-muted`, `--gk-bg`, `--gk-good`, `--gk-bad`.
Override them on `.gamekit` in your stylesheet; set at least `--gk-accent` and
`--gk-neutral` if pages and slides must match exactly. An override on `.gamekit`
pins the token in light and dark mode alike; scope a fixed colour to one mode
with `body.quarto-light .gamekit` or `body.quarto-dark .gamekit`.

Dark mode (0.6.0): with a Quarto `theme: {light: …, dark: …}` pair, `--gk-muted` is
mixed from the text and background tokens, `--gk-good` and `--gk-bad` switch to
variants that are readable on a dark page (under `body.quarto-dark`), and a running
game repaints when the reader flips the color-scheme toggle.

Since 0.6.1 `--gk-good` and `--gk-bad` are fixed colours, the same as Quizkit's:
`#2e7d32` / `#b3261e` on a light page, `#7fcf86` / `#f08a8a` on a dark one. They
no longer follow the theme's success and danger colours, which a brand may set
too light for text (a danger of `#DB6B6B` is 3.3:1 on a white page).

The fill tokens (`accent`, `neutral`, `good`, `bad`) are kept at 4.5:1 against the background (moved toward black or white if needed), so text drawn in the page color on a fill stays readable in every theme and mode.

## Telemetry

| `gamekit.telemetry` | Behaviour |
|---|---|
| absent (default) | fire when `window.umami` is on the page |
| `false` | never fire |
| `{umami-src, umami-website-id}` | inject umami, then fire |

Events carry `page`, `game`, `puzzle` (`class`/`random`); `game-optimize` adds
`score`, `optimum` and `gap` (% from the optimum; `null` when the optimum is 0 but the score is not). No plan contents, no
identifiers. Each event is also dispatched on `document` as a `CustomEvent`.

## Development

```bash
for t in tests/*.test.mjs; do node "$t" || exit 1; done
python3 tests/version.test.py
node _extensions/gamekit/check.js games/*.js

# browser test (once: uv run --with playwright playwright install chromium)
quarto render
(cd _site && python3 -m http.server 8765 >/dev/null 2>&1 &)
sleep 1 && uv run tests/e2e.py
pkill -f "http.server 8765"
```

## Third-party code

- `highs.module.js`, `highs.wasm`: [highs-js](https://github.com/lovasoa/highs-js) 1.15.3 (MIT), compiling [HiGHS](https://github.com/ERGO-Code/HiGHS) (MIT).
- `qr.js`: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4 (MIT).

## License

MIT
