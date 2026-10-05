// knapsack.js — Gamekit's demo game: pack the most valuable bag.
(function () {
  const NAMES = ["Tent", "Stove", "Camera", "Book", "Drone", "Guitar"];

  // Three columns on wide boards, two on phones (compactBoard, taller boxes).
  const itemBox = (k, compact) => compact
    ? { x: 4 + (k % 2) * 48, y: 4 + Math.floor(k / 2) * 22, w: 44, h: 19 }
    : { x: 10 + (k % 3) * 30, y: 6 + Math.floor(k / 3) * 20, w: 26, h: 16 };
  const barBox = (compact) => compact ? { x: 4, y: 76, w: 92, h: 5 } : { x: 10, y: 53, w: 86, h: 4 };
  const weight = (p, plan) => plan.reduce((s, on, k) => s + (on ? p.items[k].w : 0), 0);
  const value = (p, plan) => plan.reduce((s, on, k) => s + (on ? p.items[k].v : 0), 0);
  const names = (plan) => NAMES.filter((_, k) => plan[k]).join(", ") || "nothing";

  Gamekit.game("knapsack", {
    title: "Pack the Bag",
    task: "Pick the most valuable items without going over the weight limit. Tap an item to pack it.",
    goal: "max",
    unit: "points",
    board: { w: 100, h: 62 },
    compactBoard: { w: 100, h: 84 },
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

    pointer(p, plan, ui, e, view) {
      if (e.type !== "down") return undefined;
      for (let k = 0; k < p.items.length; k++) {
        const b = itemBox(k, view && view.compact);
        if (e.x >= b.x && e.x <= b.x + b.w && e.y >= b.y && e.y <= b.y + b.h) {
          const next = plan.slice();
          next[k] = !next[k];
          return next;
        }
      }
      return undefined;
    },

    pieces(p, plan, ui, view) {
      const compact = !!(view && view.compact);
      const out = p.items.map((it, k) => Object.assign(itemBox(k, compact), {
        key: `item-${k}`, kind: "item", name: NAMES[k], v: it.v, wt: it.w,
        packed: plan[k] ? 1 : 0, color: plan[k] ? "plan" : "muted",
      }));
      const used = weight(p, plan);
      out.push(Object.assign(barBox(compact), { key: "bar", kind: "bar", used, cap: p.cap, color: used > p.cap ? "bad" : "plan" }));
      return out;
    },

    drawBoard() {},

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
        // all canvas text uses view.em, the same size as the HTML text around the board
        ctx.fillStyle = piece.packed > 0.5 ? view.css.bg : view.css.text;
        ctx.font = `${view.em}px ${view.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.name, piece.x + piece.w / 2, piece.y + piece.h * 0.33);
        ctx.fillText(`${piece.v} points · ${piece.wt} kg`, piece.x + piece.w / 2, piece.y + piece.h * 0.7);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      } else if (piece.kind === "bar") {
        ctx.strokeStyle = view.css.muted;
        ctx.lineWidth = 0.3;
        ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
        ctx.fillStyle = piece.paint;
        ctx.fillRect(piece.x, piece.y, piece.w * Math.min(1, piece.used / piece.cap), piece.h);
        ctx.font = `${view.em}px ${view.font}`;
        ctx.fillStyle = view.css.muted;
        ctx.fillText(`Weight limit: ${piece.cap} kg`, piece.x, piece.y - 1.2);
        ctx.fillStyle = view.css.text;
        ctx.textAlign = "end";
        ctx.fillText(`${Math.round(piece.used)} / ${piece.cap} kg`, piece.x + piece.w, piece.y - 1.2);
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
