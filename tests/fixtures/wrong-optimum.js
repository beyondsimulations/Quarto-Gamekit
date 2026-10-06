// Fixture: a valid game whose check.optimum, think() and compactBoard.h are wrong on purpose.
Gamekit.game("wrong-optimum", {
  title: "t", task: "t", goal: "max", board: { w: 10, h: 10 }, compactBoard: { w: 10, h: () => NaN },
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
  think() { return undefined; },
  insight() { return { diff: "", mechanism: "", model: "" }; },
  describe() { return ""; },
});
