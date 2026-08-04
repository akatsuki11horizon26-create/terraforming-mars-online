import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getInitialState, getCardPlayableStatus, ALL_CARDS, cloneGameState } from "../app/game-logic.js";

// The room server is a Durable Object and cannot be imported under node:test,
// so these assert on its source. Each check below exists because a client can
// send any payload it likes over the socket.
const room = await readFile(new URL("../worker/room.ts", import.meta.url), "utf8");

function actionCase(name) {
  const start = room.indexOf(`case "${name}":`);
  assert.ok(start > 0, `the server must handle ${name}`);
  const end = room.indexOf("case \"", start + 10);
  return room.slice(start, end > 0 ? end : start + 2000);
}

test("the engine alone does not prove a card is in hand", () => {
  // This is why the server has to check: with an empty hand most of the catalog
  // still reports as playable, because playability is about cost and
  // requirements, not possession.
  let state = getInitialState({ playerCount: 2 });
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 200, hand: [] }));

  const playable = ALL_CARDS.filter(card => getCardPlayableStatus(card, state, 0, 0).playable);
  assert.ok(playable.length > 100, "most cards pass the engine check with no hand at all");
});

test("playCard refuses a card the sender does not hold", () => {
  const body = actionCase("playCard");
  assert.match(body, /hand\.includes\(card\.id\)/, "the hand must be checked before paying");
  // And the check must come before the card is moved to the table.
  assert.ok(
    body.indexOf("hand.includes(card.id)") < body.indexOf("playedProjects:"),
    "the check must precede the state change"
  );
});

test("cardAction refuses a card the sender has not played", () => {
  const body = actionCase("cardAction");
  assert.match(body, /playedProjects\.includes\(card\.id\)/, "ownership must be checked");
  assert.match(body, /card\.type !== "active"/, "and only blue cards carry actions");
});

test("buyResearch refuses duplicate ids", () => {
  const body = actionCase("buyResearch");
  // includes() accepts ["A","A","A"] against a single offered A, which
  // duplicated the card into the hand.
  assert.match(body, /new Set\(ids\)\.size !== ids\.length/, "duplicates must be rejected");
});

test("a Helion payment spends heat instead of driving MC negative", () => {
  const body = actionCase("playCard");
  assert.match(body, /heatAsMoney/, "the corporation's heat-as-money effect must be honoured");
  assert.match(body, /heat: \(p\.heat as number\) - heatPaid/, "and the heat actually deducted");
});

test("every action the server handles is reachable from the UI", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  const handled = new Set(
    [...room.matchAll(/case "([a-zA-Z]+)":/g)].map(match => match[1])
  );
  const sent = new Set(
    [...page.matchAll(/sendAction\("([a-zA-Z]+)"/g)].map(match => match[1])
  );

  // The UI used to send seven of the fourteen actions the server accepts, so
  // playing a card online changed nothing on the server and rolled back on the
  // next update. These are the ones a player must be able to reach.
  for (const action of [
    "playCard",
    "cardAction",
    "chooseCorporation",
    "choosePreludes",
    "buyResearch",
    "claimMilestone",
    "fundAward",
    "sendDelegate",
    "buildColony",
    "trade",
    "resolveChoice",
    "pass"
  ]) {
    assert.ok(handled.has(action), `the server must handle ${action}`);
    assert.ok(sent.has(action), `the UI must send ${action} online`);
  }
});
