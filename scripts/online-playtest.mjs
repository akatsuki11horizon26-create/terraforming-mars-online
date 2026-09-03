import { WebSocket } from "ws";
import { createOnlineRun } from "./online-harness.mjs";

// Drives a full 2-seat online game over the real WebSocket protocol, the same
// path the browser uses, so the server stays the authority throughout.
//
// The room code and the socket URL both come from the harness. A hand-rolled
// code normalises down to five characters, so a batch of "unique" codes all
// land in one room and the Durable Object replays the game already there --
// which is how eight games that were secretly one room got reported as an RNG
// bug. tests/online-harness.test.mjs keeps every driver on this path.
const onlineRun = createOnlineRun({ code: process.argv[2] });
const { code: CODE } = onlineRun;
const BUDGET_MS = Number(process.env.TM_BUDGET ?? 180000);
const started = Date.now();

const errors = [];
const anomalies = [];
let finished = false;
let lastView = null;
const genSeen = new Set();
let prev = null;

const seats = [
  { id: "drvA", name: "ドライバA", done: {} },
  { id: "drvB", name: "ドライバB", done: {} }
];

function connect(seat) {
  return new Promise(resolve => {
    const url = onlineRun.webSocketUrl(seat.id, seat.name);
    const ws = new WebSocket(url);
    seat.ws = ws;
    ws.on("open", () => { ws.send(JSON.stringify({ type: "join" })); resolve(); });
    ws.on("message", raw => {
      let m;
      try { m = JSON.parse(String(raw)); } catch { return; }
      if (m.type === "error") {
        errors.push({ seat: seat.id, reason: m.reason, lastSent: seat.lastSent });
        return;
      }
      if (m.type === "view" && m.view) {
        seat.view = m.view;
        lastView = m.view;
        watch(m.view);
        decide(seat);
      }
    });
    ws.on("error", e => errors.push({ seat: seat.id, reason: `ws: ${e.message}` }));
  });
}

function act(seat, action, payload = {}) {
  seat.lastSent = { action, payload };
  seat.ws.send(JSON.stringify({ type: "action", action, payload }));
}

// Global tracks only ever rise. Catching a fall here is the point of driving a
// real game rather than asserting on a unit of it.
function watch(v) {
  if (v.generation) genSeen.add(v.generation);
  if (prev) {
    for (const k of ["temperature", "oxygen", "oceans"]) {
      if (typeof v[k] === "number" && typeof prev[k] === "number" && v[k] < prev[k]) {
        anomalies.push(`${k} fell ${prev[k]} -> ${v[k]} (gen ${v.generation})`);
      }
    }
    if (v.generation < prev.generation) {
      anomalies.push(`generation went backwards ${prev.generation} -> ${v.generation}`);
    }
  }
  prev = { temperature: v.temperature, oxygen: v.oxygen, oceans: v.oceans, generation: v.generation };
}

function decide(seat) {
  const v = seat.view;
  if (!v || finished) return;

  if (v.isGameOver || v.phase === "game_over") {
    if (!finished) { finished = true; report(v); }
    return;
  }

  const me = (v.players ?? []).find(p => p.isSelf);
  if (!me) return;

  // Setup is answered per seat and is exempt from turn order.
  if (me.setupStep === "corporation") {
    if (!seat.done.corp && (me.corporationOptions ?? []).length) {
      seat.done.corp = true;
      act(seat, "chooseCorporation", { corporationId: me.corporationOptions[0], cardIds: [] });
    }
    return;
  }
  if (me.setupStep === "prelude") {
    if (!seat.done.prelude && (me.preludeOptions ?? []).length >= 2) {
      seat.done.prelude = true;
      act(seat, "choosePreludes", { cardIds: me.preludeOptions.slice(0, 2) });
    }
    return;
  }
  // Buying research is simultaneous too: every seat with cards on offer answers.
  if ((me.researchCards ?? []).length > 0) {
    const key = `research-${v.generation}-${me.setupStep}`;
    if (!seat.done[key]) {
      seat.done[key] = true;
      act(seat, "buyResearch", { cardIds: [] });
    }
    return;
  }

  // Everything below needs the turn. turnHolderId is the real holder --
  // currentPlayerId in a view is rewritten to the viewer.
  if (v.turnHolderId && v.turnHolderId !== me.id) return;

  if (v.pendingChoice && (v.pendingChoice.options ?? []).length) {
    return act(seat, "resolveChoice", { optionId: v.pendingChoice.options[0].id });
  }

  if (v.phase === "action") {
    if (me.passed) return;
    const mc = me.mc ?? 0;
    // Cheapest path to the three tracks; skip any that is already maxed, since
    // the server rejects a maxed project as blocked.
    if ((v.temperature ?? -30) < 8 && mc >= 14) return act(seat, "standardProject", { projectId: "asteroid" });
    if ((v.oceans ?? 0) < 9 && mc >= 18) return act(seat, "standardProject", { projectId: "aquifer" });
    if ((v.oxygen ?? 0) < 14 && mc >= 23) return act(seat, "standardProject", { projectId: "greenery" });
    return act(seat, "pass", {});
  }

  if (v.phase === "final_greenery") {
    const key = `fg-${me.id}`;
    if (!seat.done[key]) { seat.done[key] = true; act(seat, "finishFinalGreenery", {}); }
  }
}

function report(v) {
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const s = v.standings ?? [];
  const top = s.length ? Math.max(...s.map(e => e.score)) : null;
  const winnersAreTop = (v.winnerPlayerIds ?? []).every(id => {
    const row = s.find(e => e.playerId === id);
    return row && row.score === top;
  });
  console.log("=== ONLINE TEST PLAY ===");
  console.log("room             :", CODE);
  console.log("reached game over:", true);
  console.log("generation       :", v.generation, "| generations seen:", genSeen.size);
  console.log("temp/oxygen/ocean:", v.temperature, v.oxygen, v.oceans);
  console.log("standings        :", JSON.stringify(s));
  console.log("winnerPlayerIds  :", JSON.stringify(v.winnerPlayerIds));
  console.log("winner is top score:", winnersAreTop);
  console.log("errors           :", errors.length === 0 ? "none" : JSON.stringify(errors, null, 1));
  console.log("anomalies        :", anomalies.length === 0 ? "none" : JSON.stringify(anomalies, null, 1));
  console.log("elapsed_s        :", secs);
  process.exit(0);
}

const run = async () => {
  await connect(seats[0]);                       // first in is the host
  await new Promise(r => setTimeout(r, 300));
  await connect(seats[1]);
  await new Promise(r => setTimeout(r, 400));
  seats[0].ws.send(JSON.stringify({ type: "start", options: { board: "tharsis" } }));

  setTimeout(() => {
    const v = lastView ?? {};
    const me = (v.players ?? []).find(p => p.isSelf) ?? {};
    console.log("=== ONLINE TEST PLAY (STALLED, NOT FINISHED) ===");
    console.log("room       :", CODE);
    console.log("generation :", v.generation, "| phase:", v.phase, "| generations seen:", genSeen.size);
    console.log("turnHolderId:", v.turnHolderId, "| my setupStep:", me.setupStep, "| passed:", me.passed);
    console.log("temp/oxy/ocean:", v.temperature, v.oxygen, v.oceans);
    console.log("pendingChoice :", v.pendingChoice ? v.pendingChoice.kind : "none");
    console.log("errors     :", errors.length === 0 ? "none" : JSON.stringify(errors.slice(0, 15), null, 1));
    console.log("anomalies  :", anomalies.length === 0 ? "none" : JSON.stringify(anomalies, null, 1));
    console.log("elapsed_s  :", ((Date.now() - started) / 1000).toFixed(1));
    process.exit(2);
  }, BUDGET_MS);
};

run();
