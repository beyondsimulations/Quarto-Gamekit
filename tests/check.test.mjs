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

console.log("check.test.mjs: all passed");
