import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  sendDelegateToParty,
  runTurmoilPhase,
  getInfluence,
  getTrSurcharge,
  getCardPlayableStatus,
  triggerProduction,
  PARTIES,
  NEUTRAL
} from "../app/game-logic.js";
import {
  DELEGATES_PER_PLAYER,
  DELEGATES_FOR_NEUTRAL,
  normalizePartyId
} from "../app/turmoil.js";

test("Turmoil offers the six official parties", () => {
  assert.deepEqual(
    PARTIES.map(party => party.id),
    ["mars", "scientists", "unity", "greens", "reds", "kelvinists"]
  );
  for (const party of PARTIES) {
    assert.equal(party.bonuses.length, 2, `${party.id} has two bonuses`);
    assert.equal(party.policies.length, 4, `${party.id} has four policies`);
  }
});

test("A new game seats a neutral chairman with the Greens ruling", () => {
  const state = getInitialState({ playerCount: 3, turmoil: true });

  assert.equal(state.turmoil.chairman, NEUTRAL);
  assert.equal(state.turmoil.rulingParty, "greens");
  assert.equal(state.turmoil.delegateReserve[NEUTRAL], DELEGATES_FOR_NEUTRAL - 1);
  for (const id of state.turnOrder) {
    assert.equal(state.turmoil.delegateReserve[id], DELEGATES_PER_PLAYER);
  }
  assert.ok(state.turmoil.currentEvent, "an event is in play from the start");
  assert.ok(state.turmoil.comingEvent);
  assert.ok(state.turmoil.distantEvent);
});

test("Turmoil is off unless requested", () => {
  assert.equal(getInitialState().turmoil, null);
  assert.equal(getInitialState({ playerCount: 2 }).turmoil, null);
});

test("Delegates come from the lobby before the reserve", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  assert.ok(state.turmoil.lobby.includes("player"));

  const first = sendDelegateToParty(state, "reds", state.logs, "player");
  assert.equal(first.sent, true);
  assert.equal(first.state.turmoil.lobby.includes("player"), false, "the lobby delegate is used first");
  assert.equal(
    first.state.turmoil.delegateReserve.player,
    DELEGATES_PER_PLAYER,
    "the reserve is untouched while a lobby delegate remains"
  );

  const second = sendDelegateToParty(first.state, "reds", first.logs, "player");
  assert.equal(second.state.turmoil.delegateReserve.player, DELEGATES_PER_PLAYER - 1);
});

test("The party leader is whoever holds the most delegates there", () => {
  let state = getInitialState({ playerCount: 2, turmoil: true });

  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  assert.equal(state.turmoil.parties.reds.leader, "player");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(state.turmoil.parties.reds.leader, "player", "a tie keeps the incumbent");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(state.turmoil.parties.reds.leader, "player2", "a strict majority takes over");
});

test("Influence follows the chairman, leadership and delegate count", () => {
  let state = getInitialState({ playerCount: 2, turmoil: true });

  assert.equal(getInfluence(state.turmoil, "player"), 0);

  // Two delegates clear the Greens' single neutral delegate outright.
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  assert.equal(state.turmoil.dominantParty, "reds");
  assert.equal(getInfluence(state.turmoil, "player"), 2, "leader plus a second delegate");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(getInfluence(state.turmoil, "player2"), 1, "a delegate in the dominant party");

  const withChair = { ...state.turmoil, chairman: "player2" };
  assert.equal(getInfluence(withChair, "player2"), 2, "the chairman gains one");
});

test("A tie for most delegates is broken by clockwise order", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  // Greens open with one neutral delegate and are dominant.
  assert.equal(state.turmoil.dominantParty, "greens");

  const tied = sendDelegateToParty(state, "reds", state.logs, "player").state;
  // Reds now match the Greens at one delegate each. The reference walks
  // clockwise from the incumbent rather than letting it keep the seat.
  assert.equal(tied.turmoil.parties.reds.delegates.length, 1);
  assert.equal(tied.turmoil.parties.greens.delegates.length, 1);
  assert.ok(
    ["greens", "reds"].includes(tied.turmoil.dominantParty),
    "the tie resolves to one of the tied parties"
  );
});

test("The dominant party takes power and its leader becomes chairman", () => {
  let state = getInitialState({ playerCount: 3, turmoil: true });
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;

  const before = state.players.map(player => player.tr);
  const result = runTurmoilPhase(state, state.logs);

  assert.equal(result.state.turmoil.rulingParty, "reds");
  assert.equal(result.state.turmoil.chairman, "player");
  // Everyone loses 1 TR in the turmoil phase; the incoming chairman gains it back.
  assert.equal(result.state.players[0].tr, before[0], "chairman: -1 then +1");
  assert.equal(result.state.players[1].tr, before[1] - 1, "everyone else just loses 1");
});

test("Every player loses 1 TR when the turmoil phase runs", () => {
  const state = getInitialState({ playerCount: 3, turmoil: true });
  const before = state.players.map(player => player.tr);

  const result = runTurmoilPhase(state, state.logs);

  // The neutral delegate stays chairman here, so nobody earns the TR back.
  assert.deepEqual(
    result.state.players.map(player => player.tr),
    before.map(tr => tr - 1)
  );
});

test("The global event queue advances one slot per generation", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  const { distantEvent, comingEvent, currentEvent } = state.turmoil;

  const result = runTurmoilPhase(state, state.logs);

  assert.equal(result.state.turmoil.currentEvent, comingEvent);
  assert.equal(result.state.turmoil.comingEvent, distantEvent);
  assert.notEqual(result.state.turmoil.distantEvent, distantEvent);
  assert.notEqual(result.state.turmoil.currentEvent, currentEvent);
});

test("Every player is refilled to one lobby delegate each generation", () => {
  let state = getInitialState({ playerCount: 3, turmoil: true });
  state = sendDelegateToParty(state, "unity", state.logs, "player").state;
  assert.equal(state.turmoil.lobby.includes("player"), false);

  const result = runTurmoilPhase(state, state.logs);
  assert.deepEqual(result.state.turmoil.lobby.sort(), ["player", "player2", "player3"]);
});

test("The ruling party's bonus pays every player", () => {
  let state = getInitialState({ playerCount: 2, turmoil: true });
  // Greens rule at the start: 1 MC per Plant, Microbe or Animal tag.
  state.turmoil.rulingParty = "greens";
  state.players[0].playedProjects = [];

  const before = state.players.map(player => player.mc);
  const result = runTurmoilPhase(state, state.logs);

  assert.equal(
    result.state.players.every((player, i) => player.mc >= before[i]),
    true,
    "nobody loses money to a payout bonus"
  );
});

test("The Reds surcharge only applies while they rule", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  assert.equal(getTrSurcharge(state, 2), 0, "the Greens levy nothing");

  const reds = { ...state, turmoil: { ...state.turmoil, rulingParty: "reds", rulingPolicyId: "rp01" } };
  assert.equal(getTrSurcharge(reds, 2), 6, "3 MC per step raised");
  assert.equal(getTrSurcharge(reds, 0), 0);
});

test("Party requirements read live Turmoil state", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  const card = {
    id: "test-party-card",
    name: "Test",
    cost: 5,
    tags: [],
    requirements: [{ party: "Reds" }]
  };

  const denied = getCardPlayableStatus(card, state);
  assert.equal(denied.playable, false, "the Greens rule, not the Reds");

  const reds = { ...state, turmoil: { ...state.turmoil, rulingParty: "reds" } };
  assert.equal(getCardPlayableStatus(card, reds).playable, true);
});

test("Chairman requirements check the acting player", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  const card = { id: "c", name: "T", cost: 1, tags: [], requirements: [{ chairman: true }] };

  assert.equal(getCardPlayableStatus(card, state).playable, false);

  const seated = { ...state, turmoil: { ...state.turmoil, chairman: "player" } };
  assert.equal(getCardPlayableStatus(card, seated).playable, true);
});

test("Party names from card requirements resolve to party ids", () => {
  assert.equal(normalizePartyId("Mars First"), "mars");
  assert.equal(normalizePartyId("Reds"), "reds");
  assert.equal(normalizePartyId("Kelvinists"), "kelvinists");
});

test("Turmoil state survives a generation of play", () => {
  let state = getInitialState({ playerCount: 2, turmoil: true });
  state = sendDelegateToParty(state, "kelvinists", state.logs, "player").state;
  state = sendDelegateToParty(state, "kelvinists", state.logs, "player").state;
  assert.equal(state.turmoil.dominantParty, "kelvinists");

  const produced = triggerProduction(state, state.logs);

  assert.ok(produced.turmoil, "turmoil is carried through production");
  assert.equal(produced.turmoil.rulingParty, "kelvinists", "the dominant party took power");
  assert.equal(produced.phase, "research");
});
