// Runs check.js as a CLI against the demo game and a broken fixture.
// Run: node tests/check.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const run = (file) => spawnSync(process.execPath, ["_extensions/gamekit/check.js", file], { encoding: "utf8" });

const good = run("games/knapsack.js");
assert.equal(good.status, 0, good.stderr);
assert.match(good.stdout, /ok knapsack: class optimum 125/);

const bad = run("tests/fixtures/wrong-optimum.js");
assert.equal(bad.status, 1);
assert.match(bad.stderr, /FAIL wrong-optimum \(class\): optimum 1, expected check.optimum 99/);
assert.match(bad.stderr, /FAIL wrong-optimum \(class\): think\(\) does not return a string/);
assert.match(bad.stderr, /FAIL wrong-optimum \(class\): compactBoard.h\(em, puzzle\) must return a positive number/);

const goal = run("tests/fixtures/bad-goal.js");
assert.equal(goal.status, 1);
assert.match(goal.stderr, /FAIL bad-goal \(class\): goal must be "max" or "min", not "maximize"/);
assert.equal(goal.stderr.match(/goal must be/g).length, 1, "a failure common to all puzzles is reported once");

const sense = run("tests/fixtures/wrong-sense.js");
assert.equal(sense.status, 1);
assert.match(sense.stderr, /FAIL wrong-sense \(class\): goal is "min", but the model does not open with Minimize/);

const commented = run("tests/fixtures/commented-lp.js");
assert.equal(commented.status, 0, commented.stderr);

console.log("check.test.mjs: all passed");
