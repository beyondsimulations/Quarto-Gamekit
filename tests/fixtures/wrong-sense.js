// Fixture: a valid game whose goal says "min" while its model maximizes.
Gamekit.game("wrong-sense", {
  title: "t", task: "t", goal: "min", board: { w: 10, h: 10 },
  class: { cap: 1 }, check: { optimum: 1 },
  puzzle() { return { cap: 1 }; },
  start() { return [0]; },
  pointer() { return undefined; },
  pieces(p, plan) { return [{ key: "x", v: plan[0] }]; },
  drawBoard() {},
  drawPiece() {},
  feasible() { return true; },
  score(p, plan) { return plan[0]; },
  model(p) { return `Maximize\n obj: x\nSubject To\n c: x <= ${p.cap}\nEnd\n`; },
  decode(p, values) { return [values.x]; },
  insight() { return { diff: "", mechanism: "", model: "" }; },
  describe() { return ""; },
});
