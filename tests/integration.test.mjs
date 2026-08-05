import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  cloneGameState,
  getPlayer,
  triggerProduction,
  ALL_CARDS,
  getCardPlayableStatus
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { viewForPlayer } from "../app/net-protocol.js";

// Drives a two-player game the way the modes actually do: every change goes
// through a command, and nothing writes to the state directly.
function setUpTable(options = {}) {
  let state = getInitialState({ playerCount: 2, ...options });

  for (const player of state.players) {
    const seat = getPlayer(state, player.id);
    const chosen = executeGameCommand(state, {
      type: COMMAND.SELECT_CORPORATION,
      playerId: player.id,
      corporationId: seat.corporationOptions[0]
    });
    assert.equal(chosen.ok, true, `${player.id} could not choose a corporation`);
    state = chosen.state;
  }

  for (const player of state.players) {
    const bought = executeGameCommand(state, {
      type: COMMAND.BUY_RESEARCH,
      playerId: player.id,
      cardIds: []
    });
    assert.equal(bought.ok, true, `${player.id} could not finish buying`);
    state = bought.state;
  }

  return state;
}

test("a game reaches the action phase entirely through commands", () => {
  const state = setUpTable();

  assert.equal(state.phase, "action", "setup ends once every seat has bought");
  for (const player of state.players) {
    assert.equal(player.corporationId !== null, true, `${player.id} has a corporation`);
    assert.equal(player.researchCards.length, 0, "the research offer is cleared");
  }
});

test("the research phase ends only when every seat has bought", () => {
  let state = setUpTable();

  // Run a generation so both players are offered research again.
  state = triggerProduction(state, state.logs);
  assert.equal(state.phase, "research");
  assert.equal(
    state.players.every(player => player.researchCards.length > 0),
    true,
    "every seat is offered cards"
  );

  const [first, second] = state.players.map(player => player.id);

  const afterFirst = executeGameCommand(state, {
    type: COMMAND.BUY_RESEARCH,
    playerId: first,
    cardIds: []
  });
  assert.equal(afterFirst.ok, true);
  assert.equal(afterFirst.state.phase, "research", "one seat buying does not start play");

  const afterSecond = executeGameCommand(afterFirst.state, {
    type: COMMAND.BUY_RESEARCH,
    playerId: second,
    cardIds: []
  });
  assert.equal(afterSecond.state.phase, "action", "the last seat starts the action phase");
  assert.equal(
    afterSecond.state.currentPlayerId,
    afterSecond.state.firstPlayerId,
    "and the turn passes to the first player"
  );
});

test("buying research costs three megacredits a card and takes them into hand", () => {
  let state = getInitialState({ playerCount: 2 });
  for (const player of state.players) {
    state = executeGameCommand(state, {
      type: COMMAND.SELECT_CORPORATION,
      playerId: player.id,
      corporationId: getPlayer(state, player.id).corporationOptions[0]
    }).state;
  }

  const buyer = state.players[0].id;
  const before = getPlayer(state, buyer);
  const wanted = before.researchCards.slice(0, 3);

  const bought = executeGameCommand(state, {
    type: COMMAND.BUY_RESEARCH,
    playerId: buyer,
    cardIds: wanted
  });

  const after = getPlayer(bought.state, buyer);
  assert.equal(after.mc, before.mc - 9, "three cards cost nine");
  assert.equal(after.hand.length, before.hand.length + 3);
  assert.equal(after.researchCards.length, 0, "the rest are discarded");
});

test("a tile placed through a command shows up in the opponent's view", () => {
  const state = setUpTable();
  const seat = state.currentPlayerId;
  const other = state.players.find(player => player.id !== seat).id;

  const ready = cloneGameState(state);
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 100 } : player
  );

  const played = executeGameCommand(ready, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.equal(played.ok, true);

  const placed = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: played.state.pendingChoice.options[0].id
  });

  // The opponent's view is what their client renders; a tile missing from it
  // is a tile they never see.
  const view = viewForPlayer(placed.state, other);
  const cities = Object.values(view.board).filter(cell => cell.tileType === "city");
  assert.equal(cities.length, 1, "the city is in the opponent's view");
  assert.equal(cities[0].placedBy, seat, "credited to the player who placed it");
});

test("a card needing a target costs one action across the whole exchange", () => {
  const state = setUpTable();
  const seat = state.currentPlayerId;

  const ready = cloneGameState(state);
  ready.temperature = 8;
  ready.oxygen = 14;
  const placing = ALL_CARDS.find(
    card =>
      card.effectSpec?.behavior?.tile === "greenery" &&
      getCardPlayableStatus(card, ready, 0, 0).playable
  );
  if (!placing) return; // no such card is playable in this deal

  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 100, hand: [placing.id] } : player
  );

  const played = executeGameCommand(ready, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: placing.id
  });
  assert.equal(played.ok, true);

  const settled = played.state.pendingChoice
    ? executeGameCommand(played.state, {
        type: COMMAND.RESOLVE_PENDING,
        playerId: seat,
        optionId: played.state.pendingChoice.options[0].id
      }).state
    : played.state;

  assert.equal(
    getPlayer(settled, seat).actionsRemaining,
    getPlayer(ready, seat).actionsRemaining - 1,
    "one action for the whole card, however many questions it asked"
  );
});
