// knapsack.js — Gamekit's demo game: pack the most valuable bag.
(function () {
  const NAMES = ["Tent", "Stove", "Camera", "Book", "Drone", "Guitar"];
  const COLS = 3, W = 26, H = 16, X0 = 10, Y0 = 6, GAP = 4;

  const itemBox = (k) => ({
    x: X0 + (k % COLS) * (W + GAP),
    y: Y0 + Math.floor(k / COLS) * (H + GAP),
    w: W,
    h: H,
  });
  const weight = (p, plan) => plan.reduce((s, on, k) => s + (on ? p.items[k].w : 0), 0);
  const value = (p, plan) => plan.reduce((s, on, k) => s + (on ? p.items[k].v : 0), 0);
  const names = (plan) => NAMES.filter((_, k) => plan[k]).join(", ") || "nothing";

  Gamekit.game("knapsack", {
    title: "Pack the Bag",
    task: "Pick the most valuable items without going over the weight limit. Tap an item to pack it.",
    goal: "max",
    unit: "points",
    board: { w: 100, h: 62 },
    class: {
      cap: 13,
      items: [
        { v: 10, w: 5 }, { v: 40, w: 4 }, { v: 30, w: 6 },
        { v: 50, w: 3 }, { v: 35, w: 5 }, { v: 25, w: 4 },
      ],
    },
    check: { optimum: 125 },

    puzzle(rng) {
      const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
      const items = NAMES.map(() => ({ v: int(10, 60), w: int(2, 8) }));
      const cap = Math.round(0.45 * items.reduce((s, it) => s + it.w, 0));
      return { cap, items };
    },
    start(p) { return p.items.map(() => false); },

    pointer(p, plan, ui, e) {
      if (e.type !== "down") return undefined;
      for (let k = 0; k < p.items.length; k++) {
        const b = itemBox(k);
        if (e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h) {
          const next = plan.slice();
          next[k] = !next[k];
          return next;
        }
      }
      return undefined;
    },

    pieces(p, plan) {
      const out = p.items.map((it, k) => Object.assign(itemBox(k), {
        key: `item-${k}`, kind: "item", name: NAMES[k], v: it.v, wt: it.w,
        packed: plan[k] ? 1 : 0, color: plan[k] ? "plan" : "muted",
      }));
      const used = weight(p, plan);
      out.push({ key: "bar", kind: "bar", used, cap: p.cap, color: used > p.cap ? "bad" : "plan" });
      return out;
    },

    drawBoard(ctx, p, view) {
      ctx.fillStyle = view.css.muted;
      ctx.font = `2.8px ${view.font}`;
      ctx.fillText(`Weight limit: ${p.cap} kg`, X0, 50);
    },

    drawPiece(ctx, piece, view) {
      if (piece.kind === "item") {
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = piece.paint;
        ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
        const alpha = ctx.globalAlpha; // preset by Gamekit from piece.alpha
        ctx.globalAlpha = alpha * piece.packed;
        ctx.fillStyle = piece.paint;
        ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = piece.packed > 0.5 ? view.css.bg : view.css.text;
        ctx.font = `3.2px ${view.font}`;
        ctx.textAlign = "center";
        ctx.fillText(piece.name, piece.x + piece.w / 2, piece.y + 6.5);
        ctx.font = `2.6px ${view.font}`;
        ctx.fillText(`${piece.v} points · ${piece.wt} kg`, piece.x + piece.w / 2, piece.y + 11.5);
        ctx.textAlign = "start";
      } else if (piece.kind === "bar") {
        const x = X0, y = 53, w = 3 * W + 2 * GAP, h = 4;
        ctx.strokeStyle = view.css.muted;
        ctx.lineWidth = 0.3;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = piece.paint;
        ctx.fillRect(x, y, w * Math.min(1, piece.used / piece.cap), h);
        ctx.fillStyle = view.css.text;
        ctx.font = `2.8px ${view.font}`;
        ctx.textAlign = "end";
        ctx.fillText(`${Math.round(piece.used)} / ${piece.cap} kg`, x + w, 50);
        ctx.textAlign = "start";
      }
    },

    feasible(p, plan) {
      const w = weight(p, plan);
      return w <= p.cap ? true : `Too heavy: ${w} of ${p.cap} kg`;
    },
    score(p, plan) { return value(p, plan); },

    model(p) {
      const x = (k) => `x_${k}`;
      return [
        "Maximize",
        " value: " + p.items.map((it, k) => `${it.v} ${x(k)}`).join(" + "),
        "Subject To",
        " weight: " + p.items.map((it, k) => `${it.w} ${x(k)}`).join(" + ") + ` <= ${p.cap}`,
        "Binary",
        " " + p.items.map((_, k) => x(k)).join(" "),
        "End",
        "",
      ].join("\n");
    },
    decode(p, values) { return p.items.map((_, k) => Math.round(values[`x_${k}`] || 0) === 1); },

    insight(p, yours, optimal) {
      return {
        diff: `Your bag: ${names(yours)} (${value(p, yours)} points, ${weight(p, yours)} kg). ` +
          `Optimal: ${names(optimal)} (${value(p, optimal)} points, ${weight(p, optimal)} kg).`,
        mechanism: "The most valuable items are not always the best choice: what counts is how much value an item brings for the weight it takes, and how the items fit together.",
        model: "That's why the model has one yes/no variable per item, `x[k]`, and a single weight constraint.",
      };
    },
    describe(p, plan) {
      return `Bag: ${names(plan)}. ${weight(p, plan)} of ${p.cap} kg, ${value(p, plan)} points.`;
    },
  });
})();
