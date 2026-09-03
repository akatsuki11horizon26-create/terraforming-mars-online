import { WebSocket } from "ws";
import { normalizeRoomCode } from "../app/net-protocol.js";

// Reconnect is implemented on both ends -- use-room.ts reopens the socket with
// capped backoff, and the server's onJoin treats a returning playerId as the
// same seat -- and until now nothing exercised it. A dropped player who cannot
// get their seat back is a game nobody can finish, and it would not show up in
// any engine test, because the engine never sees a socket.
//
// The drop is aimed at the seat whose turn it is. That way a failure cannot be
// papered over by the other player carrying on: if the seat is lost, the state
// is not resent, or the returning client is refused, the game simply stops.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const pick = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
const CODE = process.argv[2] || pick();
const BASE = process.env.TM_WS ?? "ws://localhost:3000";

// A code the server rewrites is a different room, and the Durable Object would
// hand back whatever that room already held.
if (normalizeRoomCode(CODE) !== CODE) {
  console.error(`room code ${CODE} normalises to ${normalizeRoomCode(CODE)} -- pick one the server keeps verbatim`);
  process.exit(1);
}

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const seats = [
  { id: "recA", name: "再接続A", done: {} },
  { id: "recB", name: "再接続B", done: {} }
];

function open(seat, { onView } = {}) {
  return new Promise(resolve => {
    const ws = new WebSocket(`${BASE}/api/room/${CODE}/ws?playerId=${seat.id}&name=${encodeURIComponent(seat.name)}`);
    seat.ws = ws;
    ws.on("open", () => { ws.send(JSON.stringify({ type: "join" })); resolve(); });
    ws.on("message", raw => {
      let m;
      try { m = JSON.parse(String(raw)); } catch { return; }
      if (m.type === "error") { seat.lastError = m.reason; return; }
      if (m.type === "room") seat.room = m.room ?? m;
      if (m.type === "view" && m.view) {
        seat.view = m.view;
        onView?.(seat, m.view);
      }
    });
    ws.on("error", () => {});
  });
}

const act = (seat, action, payload = {}) => seat.ws.send(JSON.stringify({ type: "action", action, payload }));

// Only enough play to reach an action turn: setup is simultaneous, so both
// seats answer it regardless of whose turn it is.
function advance(seat, v) {
  const me = (v.players ?? []).find(p => p.isSelf);
  if (!me || v.isGameOver) return;
  if (me.setupStep === "corporation") {
    if (!seat.done.corp && (me.corporationOptions ?? []).length) {
      seat.done.corp = true;
      act(seat, "chooseCorporation", { corporationId: me.corporationOptions[0], cardIds: [] });
    }
    return;
  }
  if ((me.researchCards ?? []).length > 0) {
    const key = `research-${v.generation}`;
    if (!seat.done[key]) { seat.done[key] = true; act(seat, "buyResearch", { cardIds: [] }); }
    return;
  }
  // Someone has to move for the turn to travel; without this the holder never
  // changes and the drop can only ever land on the first seat.
  if (v.phase === "action" && v.turnHolderId === me.id && seat.play) {
    if ((me.mc ?? 0) >= 14 && (v.temperature ?? -30) < 8) act(seat, "standardProject", { projectId: "asteroid" });
    else act(seat, "pass", {});
  }
}

const waitFor = async (predicate, label, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(100);
  }
  failures.push(`timed out waiting for ${label}`);
  return false;
};

const run = async () => {
  seats[0].play = true;   // A drives the turn around; B is the one we drop
  await open(seats[0], { onView: advance });
  await sleep(300);
  await open(seats[1], { onView: advance });
  await sleep(400);
  seats[0].ws.send(JSON.stringify({ type: "start", options: { board: "tharsis" } }));

  // Play until B holds the turn in the action phase, so the drop lands on the
  // seat the game is actually waiting for.
  const bHasTurn = () => {
    const v = seats[1].view;
    const me = (v?.players ?? []).find(p => p.isSelf);
    return v?.phase === "action" && me && v.turnHolderId === me.id;
  };
  if (!(await waitFor(bHasTurn, "B to hold an action turn", 15000))) return report();

  const before = seats[1].view;
  const beforeMe = before.players.find(p => p.isSelf);
  const snapshot = {
    seatId: beforeMe.id,
    generation: before.generation,
    phase: before.phase,
    turnHolderId: before.turnHolderId,
    seq: before.lastAction?.seq ?? 0,
    mc: beforeMe.mc,
    handCount: (beforeMe.hand ?? []).length
  };

  // terminate, not close: a clean close is a goodbye, and the point is to
  // survive the ungraceful drop a real network gives you.
  seats[1].ws.terminate();
  seats[1].view = null;

  const hostSeesDrop = () => (seats[0].room?.members ?? []).some(m => m.playerId === "recB" && m.connected === false);
  await waitFor(hostSeesDrop, "the host to see B disconnected");
  check((seats[0].room?.members ?? []).length === 2, "the room dropped a member instead of marking it disconnected");

  // Same playerId: this is a returning player, not a new one.
  seats[1].done = { ...seats[1].done };
  await open(seats[1], { onView: advance });

  if (!(await waitFor(() => Boolean(seats[1].view), "B's state to be resent on reconnect"))) return report();

  const after = seats[1].view;
  const afterMe = after.players.find(p => p.isSelf);

  check(!seats[1].lastError, `the server refused the returning player: ${seats[1].lastError}`);
  check(afterMe?.id === snapshot.seatId, `seat changed on reconnect: ${snapshot.seatId} -> ${afterMe?.id}`);
  check(after.generation === snapshot.generation, `generation changed across reconnect: ${snapshot.generation} -> ${after.generation}`);
  check(after.phase === snapshot.phase, `phase changed across reconnect: ${snapshot.phase} -> ${after.phase}`);
  check(after.turnHolderId === snapshot.turnHolderId, `turn moved across reconnect: ${snapshot.turnHolderId} -> ${after.turnHolderId}`);
  check((after.lastAction?.seq ?? 0) === snapshot.seq, `an action was replayed or lost across reconnect`);
  check(afterMe?.mc === snapshot.mc, `private state changed across reconnect: mc ${snapshot.mc} -> ${afterMe?.mc}`);
  check((afterMe?.hand ?? []).length === snapshot.handCount, `hand changed across reconnect`);

  const membersBack = (seats[0].room?.members ?? []).find(m => m.playerId === "recB");
  await waitFor(() => (seats[0].room?.members ?? []).some(m => m.playerId === "recB" && m.connected), "the host to see B reconnected");
  check(Boolean(membersBack), "the host lost B from the member list");

  // Reading the state back is not proof the seat still works; it has to be able
  // to act. This is the assertion that a silently read-only seat fails.
  act(seats[1], "standardProject", { projectId: "asteroid" });
  const acted = await waitFor(
    () => (seats[1].view?.lastAction?.seq ?? 0) > snapshot.seq,
    "B's move after reconnect to be accepted"
  );
  if (acted) {
    check(
      seats[1].view.lastAction.playerId === snapshot.seatId,
      `the move was credited to ${seats[1].view.lastAction.playerId}, not ${snapshot.seatId}`
    );
  }

  report();
};

function report() {
  console.log("=== ONLINE RECONNECT CHECK ===");
  console.log("room    :", CODE);
  if (failures.length === 0) {
    console.log("result  : the dropped seat came back, kept its state, and could act");
    process.exit(0);
  }
  console.log("result  : FAILED");
  for (const f of failures) console.log("  -", f);
  process.exit(1);
}

run();
