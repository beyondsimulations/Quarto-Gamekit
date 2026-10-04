# Quarto Gamekit

Short canvas learning games for Quarto lectures. Students play an optimization
problem by hand, press **Optimize**, and [HiGHS](https://highs.dev) solves the
same model live in their browser (WebAssembly, in a Web Worker). Gamekit then
morphs the student's plan into the optimal one and explains the difference.

- **One div per game**: `::: {.game name="transport"}` in any page or revealjs deck.
- **Shared reveal**: Lock → Think (real solver numbers) → Morph → Toggle *Yours ⇄ Optimal* → **Why?**
- **Class puzzle + New puzzle**: everyone plays the lecture's own data; random puzzles for practice.
- **Branded automatically**: colors come from `--gk-*` CSS tokens that fall back to the site's Bootstrap or reveal variables.
- **Every format**: playable in html and revealjs (with a QR code to a phone page); a one-line link in typst, hugo-md and others.
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
  title, task, goal: "max" | "min", unit,     // texts; unit is appended to scores
  board: { w, h },                            // drawing units; Gamekit scales to pixels
  class: { … },                               // the class puzzle (the lecture's own data)
  check: { optimum },                         // class optimum from your JuMP model
  puzzle(rng),                                // → random puzzle; rng() returns [0, 1)
  start(puzzle),                              // → empty plan
  pointer(puzzle, plan, ui, e),               // e = { type, x, y } in board units → new plan or undefined
  pieces(puzzle, plan, ui),                   // → [{ key, color, alpha, …numbers }]
  drawBoard(ctx, puzzle, view),               // static background
  drawPiece(ctx, piece, view),                // one piece; use piece.paint, alpha is preset
  feasible(puzzle, plan),                     // → true or a short reason
  score(puzzle, plan),
  model(puzzle), decode(puzzle, values),      // LP text for HiGHS, and values → plan
  // or: optimal(puzzle) and think(puzzle, result) for games solved in JS
  insight(puzzle, yours, optimal),            // → { diff, mechanism, model }; `code` in backticks
  describe(puzzle, plan),                     // one line for screen readers
});
```

- `ui` is a plain object for transient state (e.g. a selection); Gamekit clears it on Optimize, Reset and New puzzle.
- `color` is a token: `plan` (neutral while playing, accent for the optimum), `accent`, `neutral`, `text`, `muted`, `bg`, `good`, `bad`.
- During the reveal, pieces are matched by `key` (unique per plan). Numbers interpolate, colors blend, pieces only in one plan fade. Emit zero-size pieces instead of omitting them when they should grow.
- `view` = `{ w, h, px, css, font }`; `view.css[token]` is a CSS color string for the seven fixed tokens. `plan` has no entry there: a piece gets its resolved color as `piece.paint`.
- LP variable names: letters, digits and `_` only.

## Theme tokens

`--gk-accent`, `--gk-neutral`, `--gk-text`, `--gk-muted`, `--gk-bg`, `--gk-good`, `--gk-bad`.
Override them on `.gamekit` in your stylesheet; set at least `--gk-accent` and
`--gk-neutral` if pages and slides must match exactly.

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
