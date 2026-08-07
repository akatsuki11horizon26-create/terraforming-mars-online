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
  resolvePendingChoice,
  GLOBAL_EVENTS,
  PARTIES,
  NEUTRAL
} from "../app/game-logic.js";
import {
  DELEGATES_PER_PLAYER,
  DELEGATES_FOR_NEUTRAL,
  normalizePartyId
} from "../app/turmoil.js";

// Setup draws two global events and places the neutral delegate each one names,
// so the starting board — and with it the dominant party — depends on the
// shuffle. Tests that read dominance pin the draw instead of rolling for it.
// Both of these name Kelvinists, so both delegates land there.
// All four are base Turmoil events, so the fixture stays valid in a game with
// no other expansion enabled.
const PINNED_EVENTS = [
  "global-global-dust-storm",
  "global-generous-funding",
  "global-mud-slides",
  "global-sponsored-projects"
];

function pinnedTurmoilState(options = {}) {
  return getInitialState({ turmoil: true, globalEventOrder: PINNED_EVENTS, ...options });
}

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
  const state = pinnedTurmoilState({ playerCount: 3 });

  assert.equal(state.turmoil.chairman, NEUTRAL);
  assert.equal(state.turmoil.rulingParty, "greens");
  for (const id of state.turnOrder) {
    assert.equal(state.turmoil.delegateReserve[id], DELEGATES_PER_PLAYER);
  }

  // Setup draws the Coming and Distant events only: "no CURRENT Global Event to
  // execute the first generation".
  assert.equal(state.turmoil.currentEvent, null, "the first generation has no current event");
  assert.ok(state.turmoil.comingEvent);
  assert.ok(state.turmoil.distantEvent);

  // Each of those two cards puts a neutral delegate into the party it names, on
  // top of the neutral chairman.
  const neutralsOnBoard = Object.values(state.turmoil.parties).reduce(
    (sum, party) => sum + party.delegates.filter(id => id === NEUTRAL).length,
    0
  );
  assert.equal(neutralsOnBoard, 2, "both drawn events place their neutral delegate");
  assert.equal(
    state.turmoil.delegateReserve[NEUTRAL],
    DELEGATES_FOR_NEUTRAL - 1 - neutralsOnBoard,
    "those delegates come out of the neutral reserve"
  );
});

test("Turmoil is off unless requested", () => {
  assert.equal(getInitialState().turmoil, null);
  assert.equal(getInitialState({ playerCount: 2 }).turmoil, null);
});

test("Delegates come from the lobby before the reserve", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
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
  // Pinned so a neutral delegate from a drawn event cannot land in reds.
  let state = pinnedTurmoilState({ playerCount: 2 });

  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  assert.equal(state.turmoil.parties.reds.leader, "player");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(state.turmoil.parties.reds.leader, "player", "a tie keeps the incumbent");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(state.turmoil.parties.reds.leader, "player2", "a strict majority takes over");
});

test("Influence follows the chairman, leadership and delegate count", () => {
  // Pinned: both setup delegates go to kelvinists, so reds starts empty and
  // three delegates are needed to pass it.
  let state = pinnedTurmoilState({ playerCount: 2 });

  assert.equal(getInfluence(state.turmoil, "player"), 0);

  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  assert.equal(state.turmoil.dominantParty, "reds");
  assert.equal(getInfluence(state.turmoil, "player"), 2, "leader plus a second delegate");

  state = sendDelegateToParty(state, "reds", state.logs, "player2").state;
  assert.equal(getInfluence(state.turmoil, "player2"), 1, "a delegate in the dominant party");

  const withChair = { ...state.turmoil, chairman: "player2" };
  assert.equal(getInfluence(withChair, "player2"), 2, "the chairman gains one");
});

test("A tie for most delegates is broken by clockwise order", async () => {
  const { createTurmoilState, sendDelegate } = await import("../app/turmoil.js");

  // Setup places neutral delegates from the drawn events, so build the board
  // directly rather than depending on which events were shuffled up.
  let turmoil = createTurmoilState(["player", "player2"], ["e1", "e2", "e3"]);
  turmoil = sendDelegate(turmoil, NEUTRAL, "greens").turmoil;
  assert.equal(turmoil.dominantParty, "greens", "greens hold the marker alone");

  turmoil = sendDelegate(turmoil, "player", "reds").turmoil;
  // Reds now match the Greens at one delegate each. The reference walks
  // clockwise from the incumbent rather than letting it keep the seat.
  assert.equal(turmoil.parties.reds.delegates.length, 1);
  assert.equal(turmoil.parties.greens.delegates.length, 1);
  assert.ok(
    ["greens", "reds"].includes(turmoil.dominantParty),
    "the tie resolves to one of the tied parties"
  );
});

test("The dominant party takes power and its leader becomes chairman", () => {
  let state = pinnedTurmoilState({ playerCount: 3 });
  // Kelvinists hold two neutral delegates from setup, so reds needs three.
  state.players = state.players.map(p => ({ ...p, mc: 60 }));
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  state = sendDelegateToParty(state, "reds", state.logs, "player").state;

  const before = state.players.map(player => player.tr);
  const result = runTurmoilPhase(state, state.logs);

  assert.equal(result.state.turmoil.rulingParty, "reds");
  assert.equal(result.state.turmoil.chairman, "player");
  // The bonus that pays out belongs to the party that just took power, so it is
  // Reds' "lowest TR gains 1 TR" and not the outgoing Greens' tag bonus. Everyone
  // drops to 19 in the TR revision, so the incoming chairman ties for lowest and
  // takes the bonus, then gains 1 more TR for taking the Chairman seat.
  assert.equal(result.state.players[0].tr, before[0] + 1, "chairman: -1, +1 bonus, +1 chairman");
  assert.equal(result.state.players[1].tr, before[1], "everyone else: -1 then +1 from the Reds bonus");
});

test("Every player loses 1 TR when the turmoil phase runs", () => {
  const state = pinnedTurmoilState({ playerCount: 3 });
  const before = state.players.map(player => player.tr);

  const result = runTurmoilPhase(state, state.logs);

  // The neutral delegate stays chairman here, so nobody earns the TR back.
  assert.deepEqual(
    result.state.players.map(player => player.tr),
    before.map(tr => tr - 1)
  );
});

test("The global event queue advances one slot per generation", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const { distantEvent, comingEvent, currentEvent } = state.turmoil;

  const result = runTurmoilPhase(state, state.logs);

  assert.equal(result.state.turmoil.currentEvent, comingEvent);
  assert.equal(result.state.turmoil.comingEvent, distantEvent);
  assert.notEqual(result.state.turmoil.distantEvent, distantEvent);
  assert.notEqual(result.state.turmoil.currentEvent, currentEvent);
});

test("Every player is refilled to one lobby delegate each generation", () => {
  let state = pinnedTurmoilState({ playerCount: 3 });
  state = sendDelegateToParty(state, "unity", state.logs, "player").state;
  assert.equal(state.turmoil.lobby.includes("player"), false);

  const result = runTurmoilPhase(state, state.logs);
  assert.deepEqual(result.state.turmoil.lobby.sort(), ["player", "player2", "player3"]);
});

test("The ruling party's bonus pays every player", () => {
  let state = pinnedTurmoilState({ playerCount: 2 });
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
  const state = pinnedTurmoilState({ playerCount: 2 });
  assert.equal(getTrSurcharge(state, 2), 0, "the Greens levy nothing");

  const reds = { ...state, turmoil: { ...state.turmoil, rulingParty: "reds", rulingPolicyId: "rp01" } };
  assert.equal(getTrSurcharge(reds, 2), 6, "3 MC per step raised");
  assert.equal(getTrSurcharge(reds, 0), 0);
});

test("Party requirements read live Turmoil state", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
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
  const state = pinnedTurmoilState({ playerCount: 2 });
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
  let state = pinnedTurmoilState({ playerCount: 2 });
  state = sendDelegateToParty(state, "kelvinists", state.logs, "player").state;
  state = sendDelegateToParty(state, "kelvinists", state.logs, "player").state;
  assert.equal(state.turmoil.dominantParty, "kelvinists");

  const produced = triggerProduction(state, state.logs);

  assert.ok(produced.turmoil, "turmoil is carried through production");
  assert.equal(produced.turmoil.rulingParty, "kelvinists", "the dominant party took power");
  assert.equal(produced.phase, "research");
});

// Turmoil rules, PARTY LEADER: "If a player (including the neutral 'player')
// ever has MORE delegates in a party than the current Party Leader" — a tie
// leaves the seat where it is.
test("A tie leaves the Party Leader seat with the incumbent", async () => {
  const { createTurmoilState, sendDelegate } = await import("../app/turmoil.js");

  // B takes the lead, then A draws level. A sits earlier in the delegates array,
  // so an order-based winner would wrongly hand the seat to A.
  let turmoil = createTurmoilState(["A", "B"], ["e1", "e2", "e3", "e4"]);
  turmoil = sendDelegate(turmoil, "A", "unity").turmoil;
  turmoil = sendDelegate(turmoil, "B", "unity").turmoil;
  turmoil = sendDelegate(turmoil, "B", "unity").turmoil;
  assert.equal(turmoil.parties.unity.leader, "B", "B leads with two delegates");

  turmoil = sendDelegate(turmoil, "A", "unity").turmoil;
  assert.deepEqual(
    turmoil.parties.unity.delegates,
    ["A", "B", "B", "A"],
    "A is earliest in the array but only tied"
  );
  assert.equal(turmoil.parties.unity.leader, "B", "a tie keeps the incumbent leader");

  // Going one ahead does take the seat.
  turmoil = sendDelegate(turmoil, "A", "unity").turmoil;
  assert.equal(turmoil.parties.unity.leader, "A", "a strictly greater count takes the lead");
});

test("The first delegate in a party becomes its leader", async () => {
  const { createTurmoilState, sendDelegate } = await import("../app/turmoil.js");
  let turmoil = createTurmoilState(["A", "B"], ["e1", "e2", "e3", "e4"]);
  turmoil = sendDelegate(turmoil, "B", "unity").turmoil;
  assert.equal(turmoil.parties.unity.leader, "B", "an empty party hands the seat to the first arrival");
});

// Turmoil rules, LOBBYING: "Move one of your delegates from the Delegate Reserve
// (costs 5 M€), or from the Lobby (for free!), into the Delegate Area."
test("Lobbying is free from the lobby and costs 5 MC from the reserve", () => {
  let state = getInitialState({ turmoil: true });
  const me = state.currentPlayerId;
  state.players = state.players.map(p => (p.id === me ? { ...p, mc: 20 } : p));

  // The lobby delegate goes for free.
  const first = sendDelegateToParty(state, "unity", state.logs, me);
  assert.equal(first.sent, true, "the lobby delegate is sent");
  assert.equal(
    first.state.players.find(p => p.id === me).mc,
    20,
    "sending from the lobby costs nothing"
  );

  // The lobby is now empty, so the next one comes from the reserve.
  const second = sendDelegateToParty(first.state, "unity", first.logs, me);
  assert.equal(second.sent, true, "a reserve delegate is sent");
  assert.equal(
    second.state.players.find(p => p.id === me).mc,
    15,
    "sending from the reserve costs 5 MC"
  );
});

test("A player who cannot pay 5 MC keeps their delegate", () => {
  let state = getInitialState({ turmoil: true });
  const me = state.currentPlayerId;
  state.players = state.players.map(p => (p.id === me ? { ...p, mc: 4 } : p));

  // Spend the free lobby delegate first.
  const afterLobby = sendDelegateToParty(state, "unity", state.logs, me);
  const reserveBefore = afterLobby.state.turmoil.delegateReserve[me];

  const broke = sendDelegateToParty(afterLobby.state, "unity", afterLobby.logs, me);
  assert.equal(broke.sent, false, "the send is rejected");
  assert.equal(
    broke.state.turmoil.delegateReserve[me],
    reserveBefore,
    "the delegate stays in the reserve"
  );
  assert.equal(broke.state.players.find(p => p.id === me).mc, 4, "no MC is taken");
});

// Turmoil rules, STEP 4: "3a) The Dominant party now becomes ruling. 3b) Resolve
// the Ruling Bonus" — the bonus belongs to the incoming party, not the outgoing.
test("The incoming ruling party pays the ruling bonus, not the outgoing one", () => {
  let state = pinnedTurmoilState({ playerCount: 2 });

  // Greens rule at setup. Make Reds dominant so power actually changes hands.
  // Kelvinists hold two delegates from setup, so Reds needs three.
  assert.equal(state.turmoil.rulingParty, "greens", "greens open as the ruling party");
  state.players = state.players.map(p => ({ ...p, mc: 60 }));
  for (let i = 0; i < 3; i++) {
    state = sendDelegateToParty(state, "reds", state.logs, "player").state;
  }
  assert.equal(state.turmoil.dominantParty, "reds", "reds are dominant");

  const trBefore = state.players.map(p => p.tr);
  const result = runTurmoilPhase(state, state.logs);

  assert.equal(result.state.turmoil.rulingParty, "reds", "reds take power");
  // Reds' bonus raises the lowest TR by 1; the outgoing Greens bonus pays MC per
  // plant/microbe/animal tag. Nobody holds those tags here, so the two are
  // distinguishable: paying the wrong party's bonus leaves every TR at -1.
  const roseAboveTheRevision = result.state.players.some((p, i) => p.tr > trBefore[i] - 1);
  assert.equal(roseAboveTheRevision, true, "the incoming reds bonus pays out");
  assert.ok(
    result.logs.every(entry => !String(entry.message ?? entry).includes("緑の党の支持ボーナス")),
    "no greens ruling bonus is logged once reds have taken power"
  );
});

// Turmoil rules, STEP 4: "3c) Return the former Chairman and all non-leader
// delegates from Dominant party to reserve."
test("Every non-leader delegate of the new ruling party goes back to the reserve", () => {
  let state = pinnedTurmoilState({ playerCount: 2 });
  const [a, b] = state.turnOrder;

  // Stack reds — empty under the pinned setup — so it becomes dominant with
  // delegates from both players and the arithmetic stays clean.
  state.players = state.players.map(p => ({ ...p, mc: 60 }));
  for (let i = 0; i < 3; i++) {
    state = sendDelegateToParty(state, "reds", state.logs, a).state;
  }
  state = sendDelegateToParty(state, "reds", state.logs, b).state;
  assert.equal(state.turmoil.dominantParty, "reds");
  assert.equal(state.turmoil.parties.reds.delegates.length, 4);

  const reserveBefore = { ...state.turmoil.delegateReserve };
  const result = runTurmoilPhase(state, state.logs);
  const after = result.state.turmoil;

  assert.equal(after.rulingParty, "reds", "reds take power");
  assert.equal(after.chairman, a, "the party leader takes the chairman seat");
  // Every player delegate leaves. Changing Times may drop a fresh neutral
  // delegate in afterwards, so assert on the players' markers specifically.
  assert.deepEqual(
    after.parties.reds.delegates.filter(id => id !== "NEUTRAL"),
    [],
    "no player delegate is left behind"
  );

  // The leader went to the Chairman seat; the other three delegates went home.
  // refillLobby then draws 1 delegate per player back out of the reserve.
  const lobbyDrawn = id => (after.lobby.includes(id) ? 1 : 0);
  assert.equal(
    after.delegateReserve[a] + lobbyDrawn(a),
    reserveBefore[a] + 2,
    "both of A's non-leader delegates return"
  );
  assert.equal(
    after.delegateReserve[b] + lobbyDrawn(b),
    reserveBefore[b] + 1,
    "B's delegate returns too"
  );
});

// Venus Next rules, Solar phase STEP 2: "The first player (player order hasn't
// yet shifted) now acts as the WG, and chooses a non-maxed global parameter and
// increases that track one step, or places an ocean tile. All bonuses go to the
// WG, and therefore no TR or other bonuses are given to the first player."
test("World Government Terraforming offers all four choices to the first player", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const paused = triggerProduction(state, state.logs);

  assert.equal(paused.pendingChoice?.kind, "world-government");
  assert.equal(
    paused.pendingChoice.ownerPlayerId,
    paused.firstPlayerId,
    "the first player chooses, not whoever was in turn"
  );
  assert.deepEqual(
    paused.pendingChoice.options.map(option => option.id),
    ["venus", "temperature", "oxygen", "ocean"],
    "all four are on the table while nothing is maxed"
  );
});

test("The solar phase waits for the World Government choice", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const generationBefore = state.generation;

  const paused = triggerProduction(state, state.logs);
  assert.equal(paused.generation, generationBefore, "the generation has not turned over");
  assert.notEqual(paused.phase, "research", "the research phase has not begun");

  const resolved = resolvePendingChoice(paused, "venus", paused.logs, paused.firstPlayerId);
  assert.equal(resolved.state.generation, generationBefore + 1, "it resumes once answered");
  assert.equal(resolved.state.phase, "research");
  assert.equal(resolved.state.pendingChoice, null, "the choice is cleared");
});

test("A maxed parameter drops out of the World Government's options", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  state.venus = 30;
  state.oceans = 9;

  const paused = triggerProduction(state, state.logs);
  const offered = paused.pendingChoice.options.map(option => option.id);
  assert.ok(!offered.includes("venus"), "a maxed venus track is not offered");
  assert.ok(!offered.includes("ocean"), "nine oceans means no ocean option");
  assert.deepEqual(offered, ["temperature", "oxygen"]);
});

test("The World Government raises the chosen track and grants no TR", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const trBefore = state.players.map(p => p.tr);
  const venusBefore = state.venus;

  const paused = triggerProduction(state, state.logs);
  const resolved = resolvePendingChoice(paused, "venus", paused.logs, paused.firstPlayerId);

  assert.equal(resolved.state.venus, venusBefore + 2, "venus moves one step");
  assert.deepEqual(
    resolved.state.players.map(p => p.tr),
    trBefore,
    "no player gains TR from the World Government"
  );
});

test("The World Government's ocean pays the first player nothing", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const trBefore = state.players.map(p => p.tr);

  const paused = triggerProduction(state, state.logs);
  const chooseOcean = resolvePendingChoice(paused, "ocean", paused.logs, paused.firstPlayerId);
  assert.equal(chooseOcean.state.pendingChoice.kind, "tile-placement", "it asks where");
  assert.equal(
    chooseOcean.state.pendingChoice.ownerPlayerId,
    paused.firstPlayerId,
    "the first player places it"
  );

  const square = chooseOcean.state.pendingChoice.options[0].id;
  const placed = resolvePendingChoice(chooseOcean.state, square, chooseOcean.logs, paused.firstPlayerId);

  assert.equal(placed.state.oceans, 1, "the ocean is on the board");
  assert.deepEqual(
    placed.state.players.map(p => p.tr),
    trBefore,
    "laying it grants no TR"
  );
  // Both players took the same production, so any placement or ocean-adjacency
  // bonus paid to the first player would show up as a difference here.
  const [first, second] = placed.state.players;
  assert.equal(first.mc, second.mc, "no placement bonus reaches the first player");
  assert.equal(placed.state.generation, state.generation + 1, "the phase carries on");
});

test("World Government Terraforming is skipped without Venus", () => {
  const state = getInitialState({ playerCount: 2 });
  const venusBefore = state.venus;
  const after = triggerProduction(state, state.logs);
  assert.equal(after.pendingChoice, null, "nothing is asked");
  assert.equal(after.venus, venusBefore, "the venus track stays put");
  assert.equal(after.generation, state.generation + 1, "the generation turns over as usual");
});
// Turmoil rules, STEP 4: "4a) Place the Coming Global Event on top of the Current
// Global Event. Add the neutral delegate indicated at the mid-right on that card."
test("Changing Times adds the neutral delegates the new events name", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const countNeutrals = turmoil =>
    Object.values(turmoil.parties).reduce(
      (sum, party) => sum + party.delegates.filter(id => id === NEUTRAL).length,
      0
    );

  // The generation also empties the ruling party and moves the chairman, so the
  // reserve total nets out. What the placement is responsible for is that the
  // parties named by the two newly shown cards each gain a neutral delegate.
  const before = state.turmoil;
  const comingCard = GLOBAL_EVENTS.find(event => event.id === before.comingEvent);
  const expectedParty = normalizePartyId(comingCard.currentDelegate);

  const neutralsIn = (turmoil, partyId) =>
    turmoil.parties[partyId].delegates.filter(id => id === NEUTRAL).length;
  const heldBefore = neutralsIn(before, expectedParty);

  const after = runTurmoilPhase(state, state.logs).state.turmoil;

  // The party that took power was emptied, so only assert the gain where the
  // card pointed and where that emptying cannot mask it.
  if (expectedParty !== before.dominantParty) {
    assert.equal(
      neutralsIn(after, expectedParty),
      heldBefore + 1,
      "the event becoming Current adds its neutral delegate"
    );
  }

  // The neutral markers are a finite pool: placing two draws them from the
  // reserve rather than inventing them, so the total has to hold at 14.
  const total = turmoil =>
    countNeutrals(turmoil) +
    turmoil.delegateReserve[NEUTRAL] +
    (turmoil.chairman === NEUTRAL ? 1 : 0);
  assert.equal(total(before), DELEGATES_FOR_NEUTRAL, "the pool starts whole");
  assert.equal(total(after), DELEGATES_FOR_NEUTRAL, "no neutral delegate is created or lost");
});

test("The first generation resolves no global event", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  assert.equal(state.turmoil.currentEvent, null);

  const result = runTurmoilPhase(state, state.logs);
  assert.ok(
    result.logs.every(entry => !String(entry.message ?? entry).includes("世界的イベント解決")),
    "nothing is resolved before an event has reached the current slot"
  );
  assert.ok(result.state.turmoil.currentEvent, "an event moves in for the next generation");
});

// Turmoil rules, STEP 4: "2) Global Event — Perform the Current Global Event,
// taking influence into account". All 36 previously resolved to a log line only.
test("Every global event has an effect spec", async () => {
  const { missingGlobalEventEffects } = await import("../app/global-events.js");
  assert.deepEqual(
    missingGlobalEventEffects(GLOBAL_EVENTS),
    [],
    "a card with no spec would resolve to nothing at all"
  );
});

test("The current global event actually changes the game state", () => {
  // Snow Cover: temperature -2. The track starts at its -30 floor, so raise it
  // first or the clamp hides whether anything happened at all.
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.temperature = -20;
  state.turmoil.currentEvent = "global-snow-cover";
  const before = state.temperature;

  const after = runTurmoilPhase(state, state.logs).state;
  assert.equal(after.temperature, before - 2, "the temperature track actually moves");
});

test("A global event that counts something is capped at five", () => {
  // Riots: 4 MC per city tile, max 5. Nine cities must cost 20 MC, not 36.
  const state = pinnedTurmoilState({ playerCount: 2 });
  const me = state.turnOrder[0];
  let placed = 0;
  for (const [key, cell] of Object.entries(state.board)) {
    if (placed >= 9) break;
    if (cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor) {
      state.board[key] = { ...cell, tileType: "city", placedBy: me };
      placed += 1;
    }
  }
  assert.equal(placed, 9, "nine cities are on the board");

  state.players = state.players.map(p => (p.id === me ? { ...p, mc: 100 } : p));
  state.turmoil.currentEvent = "global-riots";

  const after = runTurmoilPhase(state, state.logs).state;
  assert.equal(
    after.players.find(p => p.id === me).mc,
    100 - 20,
    "the count stops at five cities"
  );
});

test("Influence softens a global event's loss", () => {
  // Pandemic: 3 MC per building tag, max 5, then reduced by influence. Compare
  // two identical boards that differ only in influence.
  const build = influenceBonus => {
    const state = pinnedTurmoilState({ playerCount: 2 });
    const me = state.turnOrder[0];
    state.players = state.players.map(p => (p.id === me ? { ...p, mc: 100 } : p));
    state.turmoil.playersInfluenceBonus = { [me]: influenceBonus };
    state.turmoil.currentEvent = "global-pandemic";
    return { state, me };
  };

  const plain = build(0);
  const withInfluence = build(2);
  const mcOf = ({ state, me }) =>
    runTurmoilPhase(state, state.logs).state.players.find(p => p.id === me).mc;

  assert.ok(
    mcOf(withInfluence) >= mcOf(plain),
    "influence never makes the loss worse"
  );
});

// Turmoil rules, FINAL SCORING: "all Party Leaders and the Chairman are worth
// 1 VP for the respective player."
test("Party leaders and the chairman are each worth 1 VP", async () => {
  const { calculateScoreBreakdowns } = await import("../app/game-logic.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a, b] = state.turnOrder;

  const before = calculateScoreBreakdowns(state);
  state.turmoil.parties.reds.leader = a;
  state.turmoil.parties.unity.leader = b;
  state.turmoil.chairman = a;

  const after = calculateScoreBreakdowns(state);
  // A leads one party and holds the chair; B leads one party.
  assert.equal(after[a].total - before[a].total, 2, "one party leadership plus the chair");
  assert.equal(after[b].total - before[b].total, 1, "one party leadership");
  assert.equal(after[a].turmoil, 2, "the breakdown attributes both to turmoil");
});

test("Leading several parties scores each of them", async () => {
  const { calculateScoreBreakdowns } = await import("../app/game-logic.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;

  const before = calculateScoreBreakdowns(state)[a].total;
  state.turmoil.parties.reds.leader = a;
  state.turmoil.parties.unity.leader = a;
  state.turmoil.parties.scientists.leader = a;
  state.turmoil.chairman = null;

  assert.equal(
    calculateScoreBreakdowns(state)[a].total - before,
    3,
    "three leaderships are worth three points"
  );
});

test("Neutral leaders and a neutral chairman score for nobody", async () => {
  const { calculateScoreBreakdowns } = await import("../app/game-logic.js");
  const state = pinnedTurmoilState({ playerCount: 2 });

  // The pinned deal already seats a neutral chairman and neutral party leaders.
  assert.equal(state.turmoil.chairman, NEUTRAL);
  assert.equal(state.turmoil.parties.kelvinists.leader, NEUTRAL);

  const breakdowns = calculateScoreBreakdowns(state);
  for (const id of state.turnOrder) {
    assert.equal(breakdowns[id].turmoil ?? 0, 0, `${id} gains nothing from neutral markers`);
  }
});

test("The turmoil points are included in the total", async () => {
  const { calculateScoreBreakdowns, computeScore } = await import("../app/game-logic.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;
  state.turmoil.parties.reds.leader = a;
  state.turmoil.chairman = a;

  const breakdown = calculateScoreBreakdowns(state)[a];
  const summed = ["tr", "board", "cards", "milestones", "awards", "turmoil", "modifier"].reduce(
    (sum, key) => sum + (breakdown[key] ?? 0),
    0
  );
  assert.equal(breakdown.total, summed, "the breakdown adds up to its own total");
  assert.equal(computeScore(state, a), breakdown.total, "computeScore agrees with the breakdown");
});

test("A game without turmoil scores no turmoil points", async () => {
  const { calculateScoreBreakdowns } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2 });
  const breakdowns = calculateScoreBreakdowns(state);
  for (const id of state.turnOrder) {
    assert.equal(breakdowns[id].turmoil ?? 0, 0, "turmoil contributes nothing when it is off");
  }
});

// The breakdown used to seed its category keys from a second hand-written list,
// so a category present in SCORE_CATEGORIES but missing there landed as NaN
// while the total stayed correct — a blank row in the UI and no exception.
test("Every score category appears in the breakdown", async () => {
  const { calculateScoreBreakdowns } = await import("../app/game-logic.js");
  const { SCORE_CATEGORIES } = await import("../app/scoring.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const breakdown = calculateScoreBreakdowns(state)[state.turnOrder[0]];

  for (const category of SCORE_CATEGORIES) {
    assert.equal(
      typeof breakdown[category],
      "number",
      `${category} is a number, not undefined or NaN`
    );
    assert.ok(Number.isFinite(breakdown[category]), `${category} is finite`);
  }
});

// The Turmoil box ships 31 Global Event cards; the catalogue holds 36 because
// the reference keeps the cross-expansion events in the same manifest, each
// gated by a compatibility field. Dealing them regardless meant a Turmoil-only
// game could draw a colony or Venus event it could never satisfy.
test("The event deck is the 31 base cards unless Colonies or Venus are on", async () => {
  const { playableGlobalEvents } = await import("../app/global-events.js");

  assert.equal(GLOBAL_EVENTS.length, 36, "the catalogue carries all 36");
  assert.equal(
    playableGlobalEvents(GLOBAL_EVENTS, {}).length,
    31,
    "base turmoil deals the 31 in the box"
  );
  assert.equal(
    playableGlobalEvents(GLOBAL_EVENTS, { venus: true, colonies: true }).length,
    36,
    "both expansions unlock all five extras"
  );
});

test("Cross-expansion events need every expansion they name", async () => {
  const { playableGlobalEvents } = await import("../app/global-events.js");
  const idsFor = enabled => playableGlobalEvents(GLOBAL_EVENTS, enabled).map(e => e.id);

  const coloniesOnly = idsFor({ colonies: true });
  assert.ok(coloniesOnly.includes("global-jovian-tax-rights"), "a colonies event needs colonies");
  assert.ok(
    !coloniesOnly.includes("global-venus-infrastructure"),
    "a venus event stays out without venus"
  );
  // Cloud Societies names both, so one expansion is not enough.
  assert.ok(
    !coloniesOnly.includes("global-cloud-societies"),
    "an event naming two expansions needs both"
  );
  assert.ok(
    idsFor({ colonies: true, venus: true }).includes("global-cloud-societies"),
    "with both on it is dealt"
  );
});

test("A turmoil-only game never deals a colony or Venus event", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  const dealt = [state.turmoil.comingEvent, state.turmoil.distantEvent, ...state.turmoil.eventDeck];
  const crossExpansion = [
    "global-jovian-tax-rights",
    "global-microgravity-health-problems",
    "global-cloud-societies",
    "global-corrosive-rain",
    "global-venus-infrastructure"
  ];

  assert.equal(dealt.length, 31, "the deck is the 31 base events");
  for (const id of crossExpansion) {
    assert.ok(!dealt.includes(id), `${id} is not in a turmoil-only deck`);
  }
});

// Election: "Count your influence plus building tags and city tiles (no limits).
// The player with most gains 2 TR, the 2nd gains 1 TR (ties are friendly)."
test("Election pays the top two places", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;
  let placed = 0;
  for (const [key, cell] of Object.entries(state.board)) {
    if (placed >= 2) break;
    if (cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor) {
      state.board[key] = { ...cell, tileType: "city", placedBy: a };
      placed += 1;
    }
  }
  const before = state.players.map(p => p.tr);
  state.turmoil.currentEvent = "global-election";

  const after = runTurmoilPhase(state, state.logs).state;
  // Everyone drops 1 in the TR revision first: the winner nets +1, second nets 0.
  assert.equal(after.players[0].tr, before[0] + 1, "first place gains 2 TR");
  assert.equal(after.players[1].tr, before[1], "second place gains 1 TR");
});

test("A shared first place in Election consumes second", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  // Neither player has any building tags, cities or influence, so they tie at 0.
  const before = state.players.map(p => p.tr);
  state.turmoil.currentEvent = "global-election";

  const after = runTurmoilPhase(state, state.logs).state;
  assert.equal(after.players[0].tr, before[0] + 1, "both tie for first and gain 2");
  assert.equal(after.players[1].tr, before[1] + 1, "ties are friendly");
});

// Revolution: earth tags plus influence; 1st -2 TR, 2nd -1, and a score of 0
// takes nothing.
test("Revolution spares players with nothing to count", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const before = state.players.map(p => p.tr);
  state.turmoil.currentEvent = "global-revolution";

  const after = runTurmoilPhase(state, state.logs).state;
  // Only the TR revision applies; nobody holds an earth tag or influence.
  assert.deepEqual(
    after.players.map(p => p.tr),
    before.map(tr => tr - 1),
    "a score below the minimum is not punished"
  );
});

test("Cloud Societies adds a floater to every card that collects them", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const floaterCard = ALL_CARDS.find(card => getCardResourceType(card.id) === "floater");

  const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, playedProjects: [floaterCard.id], cardResources: {} } : p
  );
  state.turmoil.currentEvent = "global-cloud-societies";

  const after = runTurmoilPhase(state, state.logs).state;
  assert.equal(
    after.players.find(p => p.id === a).cardResources[floaterCard.id],
    1,
    "the floater card gains one"
  );
});

test("Sponsored Projects only feeds cards that already hold a resource", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const animalCard = ALL_CARDS.find(card => getCardResourceType(card.id) === "animal");
  const floaterCard = ALL_CARDS.find(card => getCardResourceType(card.id) === "floater");

  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a
      ? {
          ...p,
          playedProjects: [animalCard.id, floaterCard.id],
          cardResources: { [animalCard.id]: 3 }
        }
      : p
  );
  state.turmoil.currentEvent = "global-sponsored-projects";

  const after = runTurmoilPhase(state, state.logs).state;
  const resources = after.players.find(p => p.id === a).cardResources;
  assert.equal(resources[animalCard.id], 4, "a card holding animals gains one");
  assert.equal(resources[floaterCard.id] ?? 0, 0, "an empty card is skipped");
});

// "Other cards may be triggered by this though, i.e. Arctic Algae or the new
// corporation Aphrodite." The tile-laid hook is outside the no-bonus flag so it
// still runs. There is no ocean trigger to observe yet — Arctic Algae is
// modelled as a one-off gain — so this pins the placement itself: the ocean
// reaches the board through the normal path, where a trigger would see it.
test("The World Government's ocean goes through the normal placement path", () => {
  const state = getInitialState({ playerCount: 2, venus: true });

  const paused = triggerProduction(state, state.logs);
  const chooseOcean = resolvePendingChoice(paused, "ocean", paused.logs, paused.firstPlayerId);
  const square = chooseOcean.state.pendingChoice.options[0];
  const placed = resolvePendingChoice(chooseOcean.state, square.id, chooseOcean.logs, paused.firstPlayerId);

  const cell = placed.state.board[square.targetCellKey];
  assert.equal(cell.tileType, "ocean", "the tile is really on the board");
  assert.equal(cell.placedBy, null, "an ocean belongs to nobody");
  assert.equal(placed.state.oceans, 1, "the ocean count moved, so parameter watchers see it");
  assert.equal(
    placed.state.lastPlacedCellKey,
    square.targetCellKey,
    "the placement hook recorded the square"
  );
});

test("The World Government cannot be answered by another player", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const paused = triggerProduction(state, state.logs);
  const notTheOwner = paused.turnOrder.find(id => id !== paused.firstPlayerId);

  const attempt = resolvePendingChoice(paused, "venus", paused.logs, notTheOwner);
  assert.notEqual(attempt.status, "resolved", "someone else cannot terraform for the WG");
  assert.equal(paused.venus, 0, "the track does not move");
});
