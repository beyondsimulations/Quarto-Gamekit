// Tests solve.js in Node. Run: node tests/solve.test.mjs
import assert from "node:assert/strict";
import { solve } from "../_extensions/gamekit/solve.js";

// LP: lecture 01 solar panel transport (optimum 225,460 €)
{
  const r = await solve(`Minimize
 cost: 5010 x_0_0 + 4640 x_0_1 + 1980 x_0_2 + 7120 x_1_0 + 1710 x_1_1 + 6430 x_1_2
Subject To
 s0: x_0_0 + x_0_1 + x_0_2 <= 34
 s1: x_1_0 + x_1_1 + x_1_2 <= 41
 d0: x_0_0 + x_1_0 = 21
 d1: x_0_1 + x_1_1 = 17
 d2: x_0_2 + x_1_2 = 29
End
`);
  assert.equal(r.status, "Optimal");
  assert.equal(r.objective, 225460);
  assert.equal(r.values.x_1_0, 16);
  assert.deepEqual(r.counts, { binary: 0, integer: 0, continuous: 6, log10Combos: 0 });
  assert.ok(r.ms >= 0);
}

// MIP: binaries and a general integer are counted separately
{
  const r = await solve(`Maximize
 obj: 3 a + 2 b + 4 c
Subject To
 cap: 2 a + 1 b + 3 c <= 4
Bounds
 0 <= c <= 2
Binary
 a b
General
 c
End
`);
  assert.equal(r.status, "Optimal");
  assert.equal(r.objective, 6);
  assert.equal(r.counts.binary, 2);
  assert.equal(r.counts.integer, 1);
  assert.ok(Math.abs(r.counts.log10Combos - Math.log10(2 * 2 * 3)) < 1e-12);
}

// Infeasible models report their status instead of throwing
{
  const r = await solve("Minimize\n obj: x\nSubject To\n c1: x >= 2\n c2: x <= 1\nEnd\n");
  assert.equal(r.status, "Infeasible");
}

// Unparseable LP text is an error, not an "Empty" model with objective 0
await assert.rejects(solve("garbage ###"), /HiGHS read no model/);

console.log("solve.test.mjs: all passed");
