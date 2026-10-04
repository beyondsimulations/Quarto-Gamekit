// Fixture: a valid game whose check.optimum is wrong on purpose.
Gamekit.game("wrong-optimum", {
  title: "t", task: "t", goal: "max", board: { w: 10, h: 10 },
  class: { cap: 1 }, check: { optimum: 99 },
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
