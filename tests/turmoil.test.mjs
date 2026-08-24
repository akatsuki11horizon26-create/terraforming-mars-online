import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  sendDelegateToParty,
  runTurmoilPhase,
  getInfluence,
  getTrSurcharge,
  getCardPaymentCost,
  getCardPlayableStatus,
  triggerProduction,
  resolvePendingChoice,
  GLOBAL_EVENTS,
  ALL_CARDS,
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

// Aquifer Released by Public Council: the first player lays an ocean, and
// everyone gains plants and steel per influence.
test("Aquifer asks the first player for a square and pays nobody for it", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.turmoil.currentEvent = "global-aquifer-released-by-public-council";

  const resolved = runTurmoilPhase(state, state.logs);
  const choice = resolved.state.pendingChoice;
  assert.equal(choice?.kind, "tile-placement", "it asks where the ocean goes");
  assert.equal(choice.ownerPlayerId, resolved.state.firstPlayerId, "the first player picks");

  const trBefore = resolved.state.players.map(p => p.tr);
  const generationBefore = resolved.state.generation;
  const placed = resolvePendingChoice(
    resolved.state,
    choice.options[0].id,
    resolved.logs,
    choice.ownerPlayerId
  );

  assert.equal(placed.state.oceans, 1, "the ocean lands on the board");
  assert.deepEqual(placed.state.players.map(p => p.tr), trBefore, "laying it grants no TR");
  // The turmoil phase already ran; answering must not run a generation end again.
  assert.equal(placed.state.generation, generationBefore, "the generation does not advance twice");
  assert.equal(placed.state.pendingChoice, null);
});

// Every one of these now goes through the choice queue: the players answer for
// themselves, and the rest of the turmoil phase waits until the queue drains.
function drain(state, logs, pick) {
  let current = state;
  let currentLogs = logs;
  let guard = 0;
  while (current.pendingChoice && guard++ < 40) {
    const choice = current.pendingChoice;
    const optionId = pick(choice, current);
    const out = resolvePendingChoice(current, optionId, currentLogs, choice.ownerPlayerId);
    current = out.state;
    currentLogs = out.logs;
  }
  assert.ok(guard < 40, "the queue drains rather than looping");
  return { state: current, logs: currentLogs };
}

// Dry Deserts: the first player removes an ocean, then everyone takes one
// standard resource per influence, choosing which resource each time.
test("Dry Deserts removes an ocean and pays influence in chosen resources", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;
  let placed = 0;
  for (const [key, cell] of Object.entries(state.board)) {
    if (placed >= 2) break;
    if (cell.tileType === "empty" && !cell.reservedFor) {
      state.board[key] = { ...cell, tileType: "ocean", placedBy: null };
      placed += 1;
    }
  }
  state.oceans = 2;
  state.turmoil.playersInfluenceBonus = { [a]: 3 };
  state.turmoil.currentEvent = "global-dry-deserts";

  const started = runTurmoilPhase(state, state.logs);
  assert.equal(started.state.pendingChoice.kind, "ocean-removal", "the ocean comes first");
  assert.equal(
    started.state.turmoil.rulingParty,
    "greens",
    "the government has NOT formed while a question is open"
  );

  const kinds = [];
  const heatBefore = started.state.players.find(p => p.id === a).heat;
  const finished = drain(started.state, started.logs, choice => {
    kinds.push(choice.kind);
    if (choice.kind === "standard-resource-pick") {
      return choice.options.find(option => option.resource === "heat").id;
    }
    return choice.options[0].id;
  });

  assert.deepEqual(
    kinds,
    ["ocean-removal", "standard-resource-pick", "standard-resource-pick", "standard-resource-pick"],
    "one resource pick per point of influence"
  );
  assert.equal(finished.state.oceans, 1, "the ocean is gone");
  assert.equal(
    finished.state.players.find(p => p.id === a).heat,
    heatBefore + 3,
    "all three points were taken as heat, because that is what was chosen"
  );
  assert.ok(finished.state.turmoil.rulingParty, "the phase completed once the queue drained");
});

test("Dry Deserts asks nobody when there is no ocean and no influence", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.oceans = 0;
  state.turmoil.currentEvent = "global-dry-deserts";

  const after = runTurmoilPhase(state, state.logs);
  assert.equal(after.state.pendingChoice, null, "nothing is asked");
  assert.equal(after.state.pendingChoiceQueue.length, 0, "nothing is queued");
});

// Paradigm Breakdown: each player chooses their own two discards.
test("Paradigm Breakdown lets each player pick their own two discards", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B", "C"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  assert.equal(started.state.pendingChoiceQueue.length + 1, 4, "four questions in all");
  assert.equal(
    started.state.turmoil.rulingParty,
    "greens",
    "no new government while the queue is open"
  );

  const finished = drain(started.state, started.logs, (choice, current) => {
    const hand = current.players.find(p => p.id === choice.ownerPlayerId).hand;
    return choice.options.find(option => hand.includes(option.id)).id;
  });

  for (const player of finished.state.players) {
    assert.equal(player.hand.length, 1, "two cards left each hand");
  }
  assert.equal(finished.state.discardPile.length, 4, "all four reached the discard pile");
  assert.ok(finished.state.turmoil.rulingParty, "the phase finished");
});

test("Paradigm Breakdown asks only for the cards a player holds", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a, b] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, hand: ["only"] } : { ...p, hand: [] }
  );
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const questions = [started.state.pendingChoice, ...started.state.pendingChoiceQueue];
  assert.equal(questions.length, 1, "one card, one question");
  assert.equal(questions[0].ownerPlayerId, a, "the empty hand is not asked");

  const finished = drain(started.state, started.logs, choice => choice.options[0].id);
  assert.equal(finished.state.players.find(p => p.id === a).hand.length, 0);
  assert.equal(finished.state.players.find(p => p.id === b).hand.length, 0);
});

test("A player cannot answer another player's discard", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const owner = started.state.pendingChoice.ownerPlayerId;
  const other = started.state.turnOrder.find(id => id !== owner);

  const attempt = resolvePendingChoice(started.state, "A", started.logs, other);
  assert.equal(attempt.status, "pending", "the answer is refused");
  assert.equal(
    attempt.state.players.find(p => p.id === other).hand.length,
    2,
    "nobody's hand changed"
  );
});

test("Re-sending the same discard does not discard twice", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B", "C"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const owner = started.state.pendingChoice.ownerPlayerId;
  const first = resolvePendingChoice(started.state, "A", started.logs, owner);
  const repeat = resolvePendingChoice(first.state, "A", first.logs, owner);

  assert.equal(
    repeat.state.discardPile.filter(id => id === "A").length,
    1,
    "the card is discarded once, not twice"
  );
});

// Corrosive Rain: 2 floaters off a chosen card, or up to 10 MC.
test("Corrosive Rain offers both branches and every eligible card", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const floaters = ALL_CARDS.filter(card => getCardResourceType(card.id) === "floater").slice(0, 2);

  const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a
      ? {
          ...p,
          playedProjects: floaters.map(card => card.id),
          cardResources: { [floaters[0].id]: 3, [floaters[1].id]: 4 },
          mc: 50
        }
      : { ...p, mc: 50 }
  );
  state.turmoil.currentEvent = "global-corrosive-rain";

  const started = runTurmoilPhase(state, state.logs);
  assert.equal(
    started.state.players.find(p => p.id !== a).mc,
    40,
    "a player with no floater card pays without being asked"
  );

  const choice = started.state.pendingChoice;
  assert.equal(choice.kind, "corrosive-rain");
  assert.equal(choice.ownerPlayerId, a);
  assert.deepEqual(
    choice.options.map(option => option.id),
    ["__mc__", floaters[0].id, floaters[1].id],
    "the MC branch and both floater cards are offered"
  );

  const spent = resolvePendingChoice(started.state, floaters[1].id, started.logs, a);
  const holder = spent.state.players.find(p => p.id === a);
  assert.equal(holder.cardResources[floaters[1].id], 2, "two floaters come off the chosen card");
  assert.equal(holder.cardResources[floaters[0].id], 3, "the other card is untouched");
  assert.equal(holder.mc, 50, "no MC is taken");
});

test("Corrosive Rain can be paid in MC even while holding floaters", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const floaterCard = ALL_CARDS.find(card => getCardResourceType(card.id) === "floater");

  const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a
      ? { ...p, playedProjects: [floaterCard.id], cardResources: { [floaterCard.id]: 5 }, mc: 50 }
      : { ...p, mc: 50 }
  );
  state.turmoil.currentEvent = "global-corrosive-rain";

  const started = runTurmoilPhase(state, state.logs);
  const paid = resolvePendingChoice(started.state, "__mc__", started.logs, a);
  const holder = paid.state.players.find(p => p.id === a);
  assert.equal(holder.mc, 40, "the MC branch is available");
  assert.equal(holder.cardResources[floaterCard.id], 5, "the floaters are kept");
});

test("Corrosive Rain takes what MC a poor player has", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, mc: 4 }));
  state.turmoil.currentEvent = "global-corrosive-rain";

  const after = runTurmoilPhase(state, state.logs).state;
  for (const player of after.players) {
    assert.equal(player.mc, 0, "a player short of 10 MC pays what they hold");
  }
});

// Cloud Societies: a floater on every collecting card, then one more per
// influence on a card of the player's choosing.
test("Cloud Societies pays influence in floaters the player places", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const floaters = ALL_CARDS.filter(card => getCardResourceType(card.id) === "floater").slice(0, 2);

  const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, playedProjects: floaters.map(card => card.id), cardResources: {} } : p
  );
  state.turmoil.playersInfluenceBonus = { [a]: 2 };
  state.turmoil.currentEvent = "global-cloud-societies";

  const started = runTurmoilPhase(state, state.logs);
  const held = started.state.players.find(p => p.id === a).cardResources;
  assert.equal(held[floaters[0].id], 1, "every collecting card took one");
  assert.equal(held[floaters[1].id], 1);

  const finished = drain(started.state, started.logs, choice => choice.options[0].id);
  const after = finished.state.players.find(p => p.id === a).cardResources;
  assert.equal(after[floaters[0].id], 3, "both extras went where the player put them");
  assert.equal(after[floaters[1].id], 1, "the other card kept just its blanket floater");
});

// Turmoil rules, FINAL SCORING: "When the game ends, the Turmoil step is not
// performed." The Game End Check is step 1 of the Solar phase, so nothing after
// it runs — no TR revision, no change of government, and no World Government.
test("The last generation runs no turmoil step and no World Government", () => {
  const state = pinnedTurmoilState({ playerCount: 2, venus: true });
  state.temperature = 8;
  state.oxygen = 14;
  state.oceans = 9;

  const rulingBefore = state.turmoil.rulingParty;
  const trBefore = state.players.map(p => p.tr);
  const after = triggerProduction(state, state.logs);

  assert.equal(after.phase, "final_greenery", "the game is ending");
  assert.equal(after.turmoil.rulingParty, rulingBefore, "no new government is seated");
  assert.deepEqual(after.players.map(p => p.tr), trBefore, "nobody loses 1 TR to a turmoil step");
  assert.equal(after.pendingChoice, null, "the World Government is not asked either");
});

// Generous Funding: "2 MC per influence, and per 5 TR above 15 (max 5 sets)".
// Reference: Math.floor((TR - 15) / 5), with no +1 — TR 15 itself pays nothing.
// The turmoil phase drops 1 TR first, so each case sets TR one above the
// boundary it is probing.
test("Generous Funding counts whole 5 TR steps above 15", () => {
  const payout = tr => {
    const state = pinnedTurmoilState({ playerCount: 2 });
    state.players = state.players.map(p => ({ ...p, tr: tr + 1, mc: 100 }));
    state.turmoil.currentEvent = "global-generous-funding";
    const after = runTurmoilPhase(state, state.logs).state;
    return after.players[0].mc - 100;
  };

  assert.equal(payout(14), 0, "TR 14: nothing");
  assert.equal(payout(15), 0, "TR 15: the threshold itself pays nothing");
  assert.equal(payout(19), 0, "TR 19: still short of the first step");
  assert.equal(payout(20), 2, "TR 20: one set");
  assert.equal(payout(24), 2, "TR 24: still one set");
  assert.equal(payout(25), 4, "TR 25: two sets");
  assert.equal(payout(40), 10, "TR 40: the cap at five sets");
  assert.equal(payout(60), 10, "TR 60: still capped");
});

// Red Influence: lose 3 MC per 5 TR above 10, max 5 sets.
test("Red Influence counts whole 5 TR steps above 10", () => {
  const cost = tr => {
    const state = pinnedTurmoilState({ playerCount: 2 });
    state.players = state.players.map(p => ({ ...p, tr: tr + 1, mc: 100 }));
    state.turmoil.currentEvent = "global-red-influence";
    const after = runTurmoilPhase(state, state.logs).state;
    return after.players[0].mc - 100;
  };

  assert.equal(cost(10), 0, "TR 10: the threshold itself costs nothing");
  assert.equal(cost(14), 0, "TR 14: short of the first step");
  assert.equal(cost(15), -3, "TR 15: one set");
  assert.equal(cost(20), -6, "TR 20: two sets");
  assert.equal(cost(35), -15, "TR 35: the cap at five sets");
  assert.equal(cost(60), -15, "TR 60: still capped");
});

// Diversity: reference is distinctCount('globalEvent') + influence >= 9, so
// influence contributes its value. Treating it as "counts as one tag" made
// 6 tags + 3 influence fail when it should pay.
test("Diversity adds influence as a number, not as a single tag", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");

  // One card per distinct tag, so the count is exact.
  const seen = new Set();
  const picks = [];
  for (const card of ALL_CARDS) {
    if (card.type === "event") continue;
    const tags = (card.tags ?? []).filter(tag => String(tag).toLowerCase() !== "wild");
    if (tags.length === 1 && !seen.has(tags[0])) {
      seen.add(tags[0]);
      picks.push(card.id);
    }
    if (picks.length >= 8) break;
  }
  assert.equal(picks.length, 8, "eight single-tag cards are available");

  const payout = (tagCount, influence) => {
    const state = pinnedTurmoilState({ playerCount: 2 });
    const [a] = state.turnOrder;
    state.players = state.players.map(p =>
      p.id === a
        ? { ...p, playedProjects: picks.slice(0, tagCount), corporationId: null, mc: 100 }
        : { ...p, mc: 100 }
    );
    state.turmoil.playersInfluenceBonus = { [a]: influence };
    state.turmoil.currentEvent = "global-diversity";
    const after = runTurmoilPhase(state, state.logs).state;
    return after.players.find(p => p.id === a).mc - 100;
  };

  assert.equal(payout(7, 2), 10, "7 tags + 2 influence reaches 9");
  assert.equal(payout(6, 3), 10, "6 tags + 3 influence reaches 9");
  assert.equal(payout(8, 1), 10, "8 tags + 1 influence reaches 9");
  assert.equal(payout(8, 0), 0, "8 tags alone is short");
  assert.equal(payout(5, 3), 0, "5 tags + 3 influence is short");
});

test("Diversity counts corporation and prelude tags, but not events", async () => {
  const { ALL_CARDS, CORPORATIONS } = await import("../app/game-logic.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;

  const corporation = CORPORATIONS.find(c => (c.tags ?? []).length > 0);
  const eventCard = ALL_CARDS.find(c => c.type === "event" && (c.tags ?? []).length > 0);
  assert.ok(corporation && eventCard, "fixtures exist");

  const distinctFor = player => {
    const withCorp = pinnedTurmoilState({ playerCount: 2 });
    withCorp.players = withCorp.players.map(p => (p.id === a ? { ...p, ...player, mc: 100 } : p));
    withCorp.turmoil.playersInfluenceBonus = { [a]: 0 };
    withCorp.turmoil.currentEvent = "global-diversity";
    return withCorp;
  };

  // An event on the table must not raise the count: the reference skips events.
  const onlyEvent = distinctFor({ corporationId: null, playedProjects: [eventCard.id] });
  const after = runTurmoilPhase(onlyEvent, onlyEvent.logs).state;
  assert.equal(
    after.players.find(p => p.id === a).mc - 100,
    0,
    "an event card alone cannot pay out"
  );

  // The corporation's own tags do count.
  const withCorporation = distinctFor({ corporationId: corporation.id, playedProjects: [] });
  assert.ok(withCorporation, "a corporation tableau builds");
});

// The queue carries one question per player, so an unfiltered queue would hand
// every viewer the hand of everyone still waiting. viewForPlayer redacts the
// queue the same way it redacts the live choice.
test("The choice queue never shows one player another player's cards", async () => {
  const { viewForPlayer } = await import("../app/net-protocol.js");
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a, b] = state.turnOrder;
  // Distinct card ids so a leak is unambiguous.
  state.players = state.players.map(p =>
    p.id === a ? { ...p, hand: ["A1", "A2", "A3"] } : { ...p, hand: ["B1", "B2", "B3"] }
  );
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  assert.ok(started.state.pendingChoiceQueue.length > 0, "several questions are queued");

  for (const [viewer, foreign] of [
    [a, ["B1", "B2", "B3"]],
    [b, ["A1", "A2", "A3"]]
  ]) {
    const view = viewForPlayer(started.state, viewer);
    const serialised = JSON.stringify({
      live: view.pendingChoice,
      queued: view.pendingChoiceQueue
    });
    for (const cardId of foreign) {
      assert.ok(
        !serialised.includes(cardId),
        `${viewer} must not see ${cardId} in the live choice or the queue`
      );
    }
  }

  // The owner of the live question still gets a usable list.
  const ownerView = viewForPlayer(started.state, started.state.pendingChoice.ownerPlayerId);
  assert.equal(ownerView.pendingChoice.options.length, 3, "the owner sees their own hand");
});

test("A queued choice survives a save and reload", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B", "C"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const reloaded = JSON.parse(JSON.stringify(started.state));

  assert.equal(reloaded.pendingChoice.kind, "event-discard", "the live question survives");
  assert.equal(reloaded.pendingChoiceQueue.length, 3, "so does the queue behind it");
  assert.equal(
    reloaded.phaseContinuation.kind,
    "turmoil-after-event",
    "and the phase work waiting on them"
  );

  const finished = drain(reloaded, started.logs, (choice, current) => {
    const hand = current.players.find(p => p.id === choice.ownerPlayerId).hand;
    return choice.options.find(option => hand.includes(option.id)).id;
  });

  for (const player of finished.state.players) {
    assert.equal(player.hand.length, 1, "the discards completed after the reload");
  }
  assert.ok(finished.state.turmoil.rulingParty, "and the phase finished");
  assert.equal(finished.state.phaseContinuation, null, "the continuation is cleared");
});

// The thresholds printed on the track belong to the track, not to whoever moved
// it. They fired only for cards, so the World Government and every global event
// crossed 8% oxygen and 0°C without the board noticing.
test("World Government oxygen at 8% still pushes the temperature", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  state.oxygen = 7;
  state.temperature = -30;
  const trBefore = state.players.map(p => p.tr);

  const paused = triggerProduction(state, state.logs);
  const resolved = resolvePendingChoice(paused, "oxygen", paused.logs, paused.firstPlayerId);

  assert.equal(resolved.state.oxygen, 8, "oxygen reaches the mark");
  assert.equal(resolved.state.temperature, -28, "and the temperature follows it up a step");
  assert.deepEqual(
    resolved.state.players.map(p => p.tr),
    trBefore,
    "but nobody is paid for the World Government's terraforming"
  );
});

test("World Government temperature at 0C still owes an ocean", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  state.temperature = -2;
  const trBefore = state.players.map(p => p.tr);

  const paused = triggerProduction(state, state.logs);
  const resolved = resolvePendingChoice(paused, "temperature", paused.logs, paused.firstPlayerId);

  assert.equal(resolved.state.temperature, 0, "the mark is crossed");
  // Nobody is holding the mouse for the World Government, so the ocean it owes
  // is a real placement question rather than the legacy click-the-board path.
  assert.equal(resolved.state.pendingChoice.kind, "tile-placement", "it asks where");
  assert.ok(resolved.state.pendingChoice.options.length > 0, "with somewhere to put it");
  assert.equal(resolved.state.phaseContinuation.kind, "solar-phase", "the phase waits");
  assert.deepEqual(resolved.state.players.map(p => p.tr), trBefore, "no TR either");

  const placed = resolvePendingChoice(
    resolved.state,
    resolved.state.pendingChoice.options[0].id,
    resolved.logs,
    resolved.state.pendingChoice.ownerPlayerId
  );
  assert.equal(placed.state.oceans, 1, "the ocean lands");
  assert.deepEqual(placed.state.players.map(p => p.tr), trBefore, "and still pays no TR");
  assert.equal(
    placed.state.players[0].mc,
    placed.state.players[1].mc,
    "nor any placement bonus"
  );
  assert.equal(placed.state.generation, state.generation + 1, "the solar phase then finishes");
});

// Volcanic Eruptions raises the temperature two steps, so it can cross 0°C.
test("Volcanic Eruptions crossing 0C owes the same ocean a card would", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.temperature = -2;
  state.turmoil.currentEvent = "global-volcanic-eruptions";

  const started = runTurmoilPhase(state, state.logs);
  assert.equal(started.state.temperature, 0, "the track crossed the mark");
  // The ocean the track owes is asked for, not silently added to a counter the
  // UI has to notice.
  assert.equal(started.state.pendingChoice.kind, "tile-placement", "it asks where");
  assert.equal(
    started.state.turmoil.rulingParty,
    "greens",
    "and the government waits for the answer"
  );

  const trBefore = started.state.players.map(p => p.tr);
  const placed = resolvePendingChoice(
    started.state,
    started.state.pendingChoice.options[0].id,
    started.logs,
    started.state.pendingChoice.ownerPlayerId
  );
  assert.equal(placed.state.oceans, 1, "the ocean lands");
  assert.deepEqual(placed.state.players.map(p => p.tr), trBefore, "and pays nobody");
  assert.ok(placed.state.turmoil.rulingParty, "the phase then finishes");
});

test("A global event pays nobody the heat production the track marks give", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.temperature = -26;
  const heatBefore = state.players.map(p => p.heatProd);
  state.turmoil.currentEvent = "global-volcanic-eruptions";

  const after = runTurmoilPhase(state, state.logs).state;
  assert.equal(after.temperature, -24, "the -24 mark is reached");
  assert.deepEqual(
    after.players.map(p => p.heatProd),
    heatBefore,
    "the heat production is a reward, and an event rewards nobody"
  );
});

test("A maxed track is not raised past its limit by the World Government", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  state.venus = 30;
  state.oxygen = 14;
  state.oceans = 9;

  const paused = triggerProduction(state, state.logs);
  assert.deepEqual(
    paused.pendingChoice.options.map(o => o.id),
    ["temperature"],
    "only the one track that can still move is offered"
  );

  const resolved = resolvePendingChoice(paused, "temperature", paused.logs, paused.firstPlayerId);
  assert.ok(resolved.state.temperature <= 8, "the temperature never passes its own cap");
});

// "When anyone places an ocean tile, gain 2 plants." Arctic Algae carried only
// its one-off "gain 1 plant" and watched nothing, so the effect that makes the
// card worth playing did not exist.
test("Arctic Algae reacts to an ocean anyone places", async () => {
  const { placeTileAt, ARCTIC_ALGAE_ID } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2 });
  const [a, b] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, playedProjects: [ARCTIC_ALGAE_ID], plants: 0 } : { ...p, plants: 0 }
  );

  // The *other* player lays it.
  const cell = Object.values(state.board).find(c => c.tileType === "empty" && c.isOceanOnly);
  placeTileAt(state, cell, "ocean", b);

  assert.equal(state.players.find(p => p.id === a).plants, 2, "the owner gains 2 plants");
  assert.equal(state.players.find(p => p.id === b).plants, 0, "the placer gains nothing from it");
});

test("Arctic Algae reacts to the World Government's ocean too", async () => {
  const { ARCTIC_ALGAE_ID } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2, venus: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, playedProjects: [ARCTIC_ALGAE_ID], plants: 0 } : p
  );

  const paused = triggerProduction(state, state.logs);
  const chooseOcean = resolvePendingChoice(paused, "ocean", paused.logs, paused.firstPlayerId);
  const placed = resolvePendingChoice(
    chooseOcean.state,
    chooseOcean.state.pendingChoice.options[0].id,
    chooseOcean.logs,
    paused.firstPlayerId
  );

  assert.equal(
    placed.state.players.find(p => p.id === a).plants,
    2,
    "the WG grants no bonus to the first player, but the card still sees the ocean"
  );
});

test("Arctic Algae reacts to an ocean a global event lays", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, playedProjects: ["card-base-arctic-algae"], plants: 0 } : p
  );
  state.turmoil.currentEvent = "global-aquifer-released-by-public-council";

  const started = runTurmoilPhase(state, state.logs);
  const placed = resolvePendingChoice(
    started.state,
    started.state.pendingChoice.options[0].id,
    started.logs,
    started.state.pendingChoice.ownerPlayerId
  );

  assert.equal(
    placed.state.players.find(p => p.id === a).plants,
    2,
    "an event's ocean is still an ocean"
  );
});

// "Whenever Venus is terraformed 1 step, you gain 2 M€."
test("Aphrodite is paid for a Venus step whoever takes it", async () => {
  const { CORPORATIONS } = await import("../app/game-logic.js");
  const aphrodite = CORPORATIONS.find(c => c.id === "card-venus-aphrodite");
  assert.ok(aphrodite, "the corporation exists");

  const state = getInitialState({ playerCount: 2, venus: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, corporationId: aphrodite.id } : p
  );

  const paused = triggerProduction(state, state.logs);
  const before = paused.players.find(p => p.id === a).mc;
  const resolved = resolvePendingChoice(paused, "venus", paused.logs, paused.firstPlayerId);

  assert.equal(
    resolved.state.players.find(p => p.id === a).mc,
    before + 2,
    "two MC for the World Government's step"
  );
});

test("Aphrodite is not paid when the Venus track is already maxed", async () => {
  const { CORPORATIONS } = await import("../app/game-logic.js");
  const aphrodite = CORPORATIONS.find(c => c.id === "card-venus-aphrodite");

  const state = getInitialState({ playerCount: 2, venus: true });
  const [a] = state.turnOrder;
  state.venus = 30;
  state.players = state.players.map(p =>
    p.id === a ? { ...p, corporationId: aphrodite.id } : p
  );

  const paused = triggerProduction(state, state.logs);
  assert.ok(
    !paused.pendingChoice.options.some(option => option.id === "venus"),
    "a maxed track is not offered"
  );

  const before = paused.players.find(p => p.id === a).mc;
  const resolved = resolvePendingChoice(paused, "temperature", paused.logs, paused.firstPlayerId);
  assert.equal(
    resolved.state.players.find(p => p.id === a).mc,
    before,
    "and raising something else pays Aphrodite nothing"
  );
});

// The specs are data, so nothing stops a key being declared that no code reads.
// That is exactly how influenceStandardResource and influenceAddsToCards sat
// unimplemented on cards that read as finished.
test("No global event declares a key the resolver ignores", async () => {
  const { unhandledSpecKeys } = await import("../app/global-events.js");
  assert.deepEqual(
    unhandledSpecKeys(),
    [],
    "every declared key must be one the resolver reads"
  );
});

// And the list of supported keys must not drift from the code either: each one
// has to appear in the resolver source.
test("Every supported spec key is read somewhere in the resolver", async () => {
  const { readFileSync } = await import("node:fs");
  const { SUPPORTED_SPEC_KEYS } = await import("../app/global-events.js");
  const source = readFileSync(new URL("../app/game-logic.js", import.meta.url), "utf8");

  for (const key of SUPPORTED_SPEC_KEYS) {
    assert.ok(
      source.includes(`spec.${key}`) || source.includes(`spec.contest.${key}`),
      `${key} is listed as supported but never read as spec.${key}`
    );
  }
});

test("Every global event in the catalogue has a spec", async () => {
  const { missingGlobalEventEffects } = await import("../app/global-events.js");
  assert.deepEqual(missingGlobalEventEffects(GLOBAL_EVENTS), []);
});

// Resolving each of the 36 in turn: none may throw, and none may leave a
// question with nothing to answer — the failure the playtest caught for the
// threshold ocean, which every unit test had missed.
test("All 36 global events resolve without stalling", () => {
  for (const event of GLOBAL_EVENTS) {
    const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
    // Give the players something for each card to bite on.
    state.players = state.players.map(p => ({
      ...p,
      mc: 60,
      steel: 5,
      titanium: 5,
      plants: 5,
      energy: 5,
      heat: 5,
      hand: ["A", "B", "C"]
    }));
    state.temperature = -10;
    state.oxygen = 5;
    state.venus = 10;
    state.turmoil.currentEvent = event.id;

    let current = state;
    let logs = state.logs;
    let guard = 0;
    while (current.pendingChoice && guard++ < 40) {
      const choice = current.pendingChoice;
      assert.ok(
        choice.options.length > 0,
        `${event.id} asked "${choice.kind}" with no options to pick`
      );
      const out = resolvePendingChoice(current, choice.options[0].id, logs, choice.ownerPlayerId);
      current = out.state;
      logs = out.logs;
    }
    assert.ok(guard < 40, `${event.id} never stopped asking`);
    assert.equal(current.pendingChoice, null, `${event.id} left a question open`);
    assert.equal(
      current.phaseContinuation,
      null,
      `${event.id} left the phase suspended`
    );
    assert.ok(current.turmoil.rulingParty, `${event.id} never seated a government`);

    // Nothing may go negative or non-numeric along the way.
    for (const player of current.players) {
      for (const field of ["mc", "steel", "titanium", "plants", "energy", "heat", "tr"]) {
        assert.ok(
          Number.isFinite(player[field]),
          `${event.id} left ${field} as ${player[field]}`
        );
        assert.ok(player[field] >= 0, `${event.id} drove ${field} negative (${player[field]})`);
      }
    }
  }
});

test("All 36 global events resolve in a solo game too", () => {
  for (const event of GLOBAL_EVENTS) {
    const state = getInitialState({ turmoil: true, venus: true, colonies: true });
    state.players = state.players.map(p => ({ ...p, mc: 60, hand: ["A", "B"] }));
    state.turmoil.currentEvent = event.id;

    let current = state;
    let logs = state.logs;
    let guard = 0;
    while (current.pendingChoice && guard++ < 40) {
      const choice = current.pendingChoice;
      assert.ok(choice.options.length > 0, `${event.id} (solo) asked with no options`);
      const out = resolvePendingChoice(current, choice.options[0].id, logs, choice.ownerPlayerId);
      current = out.state;
      logs = out.logs;
    }
    assert.ok(guard < 40, `${event.id} (solo) never stopped asking`);
    assert.equal(current.pendingChoice, null, `${event.id} (solo) left a question open`);
  }
});

// The client sends an option id and nothing else; the engine answers from the
// option list it built itself. A forged id, a stale one, or one belonging to
// another player's question is refused rather than trusted.
test("A forged option id is refused", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B", "C"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const owner = started.state.pendingChoice.ownerPlayerId;
  const attempt = resolvePendingChoice(started.state, "NOT-IN-HAND", started.logs, owner);

  assert.equal(attempt.status, "pending", "the answer is refused");
  assert.equal(
    attempt.state.players.find(p => p.id === owner).hand.length,
    3,
    "and nothing is discarded"
  );
});

test("The World Government cannot be sent a maxed parameter", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  state.venus = 30;

  const paused = triggerProduction(state, state.logs);
  const attempt = resolvePendingChoice(paused, "venus", paused.logs, paused.firstPlayerId);

  assert.notEqual(attempt.status, "resolved", "a track that is not on offer is refused");
  assert.equal(attempt.state.venus, 30, "and the track does not move");
});

test("The World Government cannot be sent an illegal square", () => {
  const state = getInitialState({ playerCount: 2, venus: true });
  const paused = triggerProduction(state, state.logs);
  const chooseOcean = resolvePendingChoice(paused, "ocean", paused.logs, paused.firstPlayerId);

  // A land square is a real cell, and not one an ocean may go on.
  const land = Object.values(chooseOcean.state.board).find(
    cell => cell.tileType === "empty" && !cell.isOceanOnly
  );
  const attempt = resolvePendingChoice(
    chooseOcean.state,
    `${land.q},${land.r}`,
    chooseOcean.logs,
    paused.firstPlayerId
  );

  assert.equal(attempt.status, "pending", "the square is refused");
  assert.equal(attempt.state.oceans, 0, "and no ocean is laid");
});

test("An answer to someone else's question is refused", () => {
  const state = pinnedTurmoilState({ playerCount: 2 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const owner = started.state.pendingChoice.ownerPlayerId;
  const other = started.state.turnOrder.find(id => id !== owner);

  const attempt = resolvePendingChoice(started.state, "A", started.logs, other);
  assert.equal(attempt.status, "pending", "refused");
  assert.deepEqual(
    attempt.state.players.map(p => p.hand.length),
    [2, 2],
    "neither hand changed"
  );
});

test("A card that no longer holds enough floaters falls back to the MC branch", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");
  const floaterCard = ALL_CARDS.find(card => getCardResourceType(card.id) === "floater");

  const state = pinnedTurmoilState({ playerCount: 2, venus: true, colonies: true });
  const [a] = state.turnOrder;
  state.players = state.players.map(p =>
    p.id === a
      ? { ...p, playedProjects: [floaterCard.id], cardResources: { [floaterCard.id]: 2 }, mc: 50 }
      : { ...p, mc: 50 }
  );
  state.turmoil.currentEvent = "global-corrosive-rain";

  const started = runTurmoilPhase(state, state.logs);
  // Something else spends the floaters before the answer arrives.
  const drained = cloneForTest(started.state, a, floaterCard.id);
  const attempt = resolvePendingChoice(drained, floaterCard.id, started.logs, a);

  const holder = attempt.state.players.find(p => p.id === a);
  assert.equal(holder.mc, 40, "the MC is taken instead of an impossible floater payment");
  assert.equal(holder.cardResources[floaterCard.id], 0, "and no negative resource is left");
});

function cloneForTest(state, playerId, cardId) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.players = copy.players.map(p =>
    p.id === playerId ? { ...p, cardResources: { ...p.cardResources, [cardId]: 0 } } : p
  );
  return copy;
}

// On one shared screen the seat has to follow the question. page.tsx derives
// currentPlayerId from pendingChoice.ownerPlayerId when the game is not online;
// without that, player 2's discard was rendered to player 1, whose answers the
// engine refused, and the queue never drained. The engine-side invariant that
// makes the fix possible is that a queued question always names an owner who
// can actually answer it.
test("Every queued question names an owner who can answer it", () => {
  const state = pinnedTurmoilState({ playerCount: 3 });
  state.players = state.players.map(p => ({ ...p, hand: ["A", "B", "C"] }));
  state.turmoil.currentEvent = "global-paradigm-breakdown";

  const started = runTurmoilPhase(state, state.logs);
  const questions = [started.state.pendingChoice, ...started.state.pendingChoiceQueue];
  assert.equal(questions.length, 6, "two discards each for three players");

  for (const question of questions) {
    assert.ok(
      started.state.turnOrder.includes(question.ownerPlayerId),
      "the owner is a seated player"
    );
    assert.ok(question.options.length > 0, "and has something to pick");
  }

  // Answering each in the order they come up drains the queue completely, with
  // every answer given by whoever the question belongs to.
  let current = started.state;
  let logs = started.logs;
  let guard = 0;
  const answeredBy = [];
  while (current.pendingChoice && guard++ < 20) {
    const choice = current.pendingChoice;
    answeredBy.push(choice.ownerPlayerId);
    const hand = current.players.find(p => p.id === choice.ownerPlayerId).hand;
    const option = choice.options.find(o => hand.includes(o.id));
    const out = resolvePendingChoice(current, option.id, logs, choice.ownerPlayerId);
    current = out.state;
    logs = out.logs;
  }

  assert.equal(new Set(answeredBy).size, 3, "all three players were asked");
  assert.equal(current.pendingChoice, null, "the queue drained");
  for (const player of current.players) {
    assert.equal(player.hand.length, 1, "each discarded two of their own cards");
  }
});

// Reds' TR surcharge was the only ruling policy anything read. Unity's is the
// other one a game can actually reach — a party takes power on its first
// policy, and only Reds and Unity have a passive there.
test("Unity in power makes titanium worth one more", () => {
  const state = getInitialState({ board: "tharsis", mode: "solo", turmoil: true });
  state.players = state.players.map(player => ({ ...player, titanium: 8, mc: 80 }));
  const space = ALL_CARDS.find(card => card.tags.includes("Space") && card.cost >= 20);

  const before = getCardPaymentCost(space, state, 0, 1);
  const unity = { ...state, turmoil: { ...state.turmoil, rulingParty: "unity", rulingPolicyId: "up01" } };
  assert.equal(getCardPaymentCost(space, unity, 0, 1), before - 1,
    "Unity's ruling policy raises the value of titanium");
});

// "Requires that <party> is ruling, OR that you have 2 delegates there." Only
// the ruling half was checked, which made the alternative unreachable and shut
// off every party-gated card whenever that party was out of government.
test("A party requirement is met by two delegates, not only by ruling", async () => {
  const { normalizePartyId, sendDelegate } = await import("../app/turmoil.js");
  const { ALL_CARDS, getPlayer } = await import("../app/game-logic.js");

  let state = getInitialState({ playerCount: 2, turmoil: true });
  state.phase = "action";
  state.currentPlayerId = "player";

  const card = ALL_CARDS.find(
    entry => (entry.requirements ?? []).some(item => item.party) && (entry.cost ?? 99) < 20
  );
  const wanted = normalizePartyId(card.requirements.find(item => item.party).party);
  assert.notEqual(state.turmoil.rulingParty, wanted, "the party under test is not in government");

  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.hand = [card.id];

  assert.equal(getCardPlayableStatus(card, state).playable, false, "no delegates, no play");

  state.turmoil = sendDelegate(state.turmoil, "player", wanted, { fromLobby: true }).turmoil;
  assert.equal(getCardPlayableStatus(card, state).playable, false, "one delegate is not enough");

  state.turmoil = sendDelegate(state.turmoil, "player", wanted, {}).turmoil;
  assert.equal(getCardPlayableStatus(card, state).playable, true, "two delegates satisfy it");
});

// Only Unity's titanium price was ever wired up, so five of the six policies a
// game can reach did nothing -- and with them most of the reason to care who
// governs. Mars First pays on any tile, Greens only on a greenery.
test("The ruling party's tile policy pays out when a tile is laid", async () => {
  const { placeTileAt, legalCellsFor, getPlayer } = await import("../app/game-logic.js");

  const lay = (party, tileType, field) => {
    const state = getInitialState({ playerCount: 1, turmoil: true });
    state.turmoil.rulingParty = party;
    state.turmoil.rulingPolicyId = null;
    state.currentPlayerId = "player";
    // Strip the spaces' own bonuses so only the policy is measured.
    for (const cell of Object.values(state.board)) {
      cell.bonusType = "none";
      cell.bonusAmount = 0;
      cell.bonus = null;
    }
    const before = getPlayer(state, "player")[field] ?? 0;
    placeTileAt(state, legalCellsFor(state, tileType, "player")[0], tileType, "player");
    return getPlayer(state, "player")[field] - before;
  };

  assert.equal(lay("mars", "forest", "steel"), 1, "Mars First pays on any tile");
  assert.equal(lay("mars", "city", "steel"), 1);
  assert.equal(lay("greens", "forest", "mc"), 4, "Greens pay for a greenery");
  assert.equal(lay("greens", "city", "mc"), 0, "and only for a greenery");
  assert.equal(lay("unity", "forest", "steel"), 0, "a party without a tile policy pays nothing");
});

// "Requires ... AND THAT NO OTHER PLAYER HAS PASSED. Increase M€ production 2
// steps. This counts as passing. You get no other turns this generation."
// Only the production step was implemented, so the card was a free +2.
test("Red Appeasement needs an unpassed table and ends your generation", async () => {
  const { getCardPlayableStatus, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { sendDelegate } = await import("../app/turmoil.js");
  const ID = "card-prelude2-red-appeasement";
  const card = ALL_CARDS.find(entry => entry.id === ID);

  const table = otherPassed => {
    const state = getInitialState({ playerCount: 2, turmoil: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.hand = [ID];
    seat.actionsRemaining = 2;
    // Two delegates satisfy the Reds requirement without them governing.
    state.turmoil = sendDelegate(state.turmoil, "player", "reds", { fromLobby: true }).turmoil;
    state.turmoil = sendDelegate(state.turmoil, "player", "reds", {}).turmoil;
    getPlayer(state, "player2").passed = otherPassed;
    return state;
  };

  assert.equal(getCardPlayableStatus(card, table(false)).playable, true);
  assert.equal(
    getCardPlayableStatus(card, table(true)).playable,
    false,
    "somebody has already passed, so the cost is not a real one"
  );

  const state = table(false);
  const before = getPlayer(state, "player").mcProd;
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: "player", cardId: ID });
  assert.equal(played.ok, true);
  assert.equal(getPlayer(played.state, "player").mcProd, before + 2);
  assert.equal(getPlayer(played.state, "player").passed, true, "playing it is passing");
  assert.equal(played.state.currentPlayerId, "player2", "and the seat moves on");
});

// placeTileAt writes its own log lines -- the ruling policy payout among them --
// onto state.logs. The tile-placement resolver carried on from a snapshot taken
// before that call, so every line written during placement was dropped: the
// money moved but the screen never said why.
test("Logs written while a tile is placed survive the pending choice", async () => {
  const { applyCardEffect, resolvePendingChoice, ALL_CARDS, getPlayer } =
    await import("../app/game-logic.js");

  const state = getInitialState({ playerCount: 1, turmoil: true });
  state.turmoil.rulingParty = "greens";
  state.turmoil.rulingPolicyId = null;
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.playedProjects = ["p-search-for-life", "p-mars-university"];

  const played = applyCardEffect(state, ALL_CARDS.find(c => c.id === "p-plantation"), state.logs);
  assert.equal(played.state.pendingChoice?.kind, "tile-placement");

  const mcBefore = getPlayer(played.state, "player").mc;
  const settled = resolvePendingChoice(
    played.state, played.state.pendingChoice.options[0].id, played.state.logs, "player"
  ).state;

  assert.equal(getPlayer(settled, "player").mc, mcBefore + 4, "Greens pay for the greenery");
  assert.ok(
    settled.logs.some(entry => /政策/.test(entry.text)),
    "and the log says so"
  );
});
