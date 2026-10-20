// Fixture: a valid game whose goal function returns neither "max" nor "min".
Gamekit.game("bad-goal", {
  title: "t", task: "t", goal: () => "maximize", board: { w: 10, h: 10 },
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
