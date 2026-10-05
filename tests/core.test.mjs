// Unit tests for core.js. Run: node tests/core.test.mjs
import assert from "node:assert/strict";
import "../_extensions/gamekit/core.js";

const C = globalThis.GamekitCore;
const colors = { plan: [0, 0, 0], text: [10, 10, 10], bad: [200, 0, 0] };
const toColors = { plan: [100, 0, 0], text: [10, 10, 10], bad: [200, 0, 0] };

// rng: deterministic per seed, values in [0, 1)
{
  const a = C.rng(42), b = C.rng(42), c = C.rng(43);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
  for (const x of xs) assert.ok(x >= 0 && x < 1);
}

// pair: stay / out / in, target order first, leftovers last
{
  const pairs = C.pair([{ key: "a" }, { key: "b" }], [{ key: "c" }, { key: "a" }, { key: "d" }]);
  assert.deepEqual(pairs.map((p) => p.key), ["c", "a", "d", "b"]);
  assert.equal(pairs[1].from.key, "a");
  assert.equal(pairs[3].to, null);
  assert.deepEqual(pairs.map((p) => p.enter), [0, -1, 1, -1]);
  assert.throws(() => C.pair([{ key: "x" }, { key: "x" }], []), /duplicate piece key "x"/);
}

// frame: tween numbers and colors, fade out, fade in, zero size tweens
{
  const pairs = C.pair(
    [{ key: "s", x: 0, w: 0 }, { key: "gone", x: 5 }],
    [{ key: "s", x: 10, w: 8 }, { key: "new", x: 7 }],
  );
  const start = C.frame(pairs, 0, colors, toColors);
  const end = C.frame(pairs, 1, colors, toColors);
  assert.equal(start.find((p) => p.key === "s").x, 0);
  assert.equal(end.find((p) => p.key === "s").x, 10);
  assert.equal(end.find((p) => p.key === "s").w, 8);
  assert.equal(end.find((p) => p.key === "s").paint, "rgb(100 0 0)");
  assert.equal(start.find((p) => p.key === "s").paint, "rgb(0 0 0)");
  assert.equal(start.find((p) => p.key === "gone").alpha, 1);
  assert.equal(end.find((p) => p.key === "gone"), undefined);
  assert.equal(start.find((p) => p.key === "new"), undefined);
  assert.equal(end.find((p) => p.key === "new").alpha, 1);
  const mid = C.frame(pairs, 0.5, colors, toColors).find((p) => p.key === "s");
  assert.equal(mid.x, 5);
}

// resolve: token → paint, default alpha
{
  const r = C.resolve({ key: "k", color: "bad" }, colors);
  assert.equal(r.paint, "rgb(200 0 0)");
  assert.equal(r.alpha, 1);
}

// parseColor: the two forms canvas fillStyle returns
assert.deepEqual(C.parseColor("#9e2b2b"), [158, 43, 43, 1]);
assert.deepEqual(C.parseColor("rgba(1, 2, 3, 0.5)"), [1, 2, 3, 0.5]);
assert.deepEqual(C.parseColor("rgb(1, 2, 3)"), [1, 2, 3, 1]);

// css: opaque and translucent colors; translucent tokens survive resolve()
assert.equal(C.css([1, 2, 3]), "rgb(1 2 3)");
assert.equal(C.css([1, 2, 3, 0.75]), "rgb(1 2 3 / 0.75)");
assert.equal(C.resolve({ key: "m", color: "muted" }, { muted: [33, 37, 41, 0.75] }).paint, "rgb(33 37 41 / 0.75)");
assert.equal(C.parseColor("nonsense"), null);

// gap: percent distance from the optimum, both directions
assert.equal(C.gap(262900, 225460), 17);
assert.equal(C.gap(51, 52), 2);
assert.equal(C.gap(5, 0), null);
assert.equal(C.gap(0, 0), 0);

// thinkLine: MIP, LP, small MIP
assert.equal(
  C.thinkLine({ binary: 422, integer: 0, continuous: 0, log10Combos: 422 * Math.log10(2) }, 180),
  "422 yes/no decisions → 10¹²⁷ combinations · HiGHS: 0.18 s",
);
assert.equal(
  C.thinkLine({ binary: 0, integer: 0, continuous: 6, log10Combos: 0 }, 1.6),
  "6 continuous decisions → infinitely many plans · HiGHS: 0.002 s",
);
assert.equal(
  C.thinkLine({ binary: 6, integer: 0, continuous: 0, log10Combos: 6 * Math.log10(2) }, 3),
  "6 yes/no decisions → 64 combinations · HiGHS: 0.003 s",
);

// pixelSize, codeSpans, formatScore
assert.deepEqual(C.pixelSize(500.4, 350.2, 2), { w: 1001, h: 700 });
assert.deepEqual(C.codeSpans("decides `x[i,j]` together"), [
  { code: false, text: "decides " },
  { code: true, text: "x[i,j]" },
  { code: false, text: " together" },
]);
assert.equal(C.formatScore(225460, "€"), "225,460 €");
assert.equal(C.formatScore(52), "52");
assert.equal(C.formatScore(-1e-9, "€"), "0 €");
assert.equal(
  C.thinkLine({ binary: 23, integer: 0, continuous: 0, log10Combos: 23 * Math.log10(2) }, 3),
  "23 yes/no decisions → 10⁷ combinations · HiGHS: 0.003 s",
);

// fillCentred: the digit height's middle sits on y
{
  const calls = [];
  const ctx = { measureText: () => ({ actualBoundingBoxAscent: 10 }), fillText: (...a) => calls.push(a) };
  C.fillCentred(ctx, "+10 sites", 50, 20);
  assert.deepEqual(calls, [["+10 sites", 50, 25]]);
  assert.equal(ctx.textAlign, "center");
  assert.equal(ctx.textBaseline, "alphabetic");
  C.fillCentred(ctx, "A loop", 0, 20, "start");
  assert.equal(ctx.textAlign, "start");
}

console.log("core.test.mjs: all passed");
