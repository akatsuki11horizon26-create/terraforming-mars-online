import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  applyCorporation,
  completeSetupPurchase,
  cloneGameState,
  getPlayer
} from "../app/game-logic.js";
import { executeGameCommand, getLegalCommands, COMMAND, ERROR } from "../app/game-command.js";

// A seated two-player game with the turn holder holding one cheap card.
function table(options = {}) {
  let state = getInitialState({ playerCount: 2, ...options });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  const seat = state.currentPlayerId;
  state.players = state.players.map(player => ({
    ...player,
    mc: 80,
    energy: 0,
    titanium: 0,
    hand: player.id === seat ? ["card-base-acquired-company"] : []
  }));
  return { state, seat, other: state.players.find(p => p.id !== seat).id };
}

test("a command from the wrong seat is refused", () => {
  const { state, other } = table();
  const result = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: other,
    cardId: "card-base-acquired-company"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.NOT_YOUR_TURN);
  assert.equal(result.state, state, "a refused command leaves the state alone");
});

test("a card the seat does not hold is refused", () => {
  const { state, seat } = table();
  // Playability is about cost and requirements; possession is checked here.
  const result = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "p-capital"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.CARD_NOT_IN_HAND);
});

test("playing a card applies its effect and spends one action", () => {
  const { state, seat } = table();
  const before = getPlayer(state, seat);
  const result = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "card-base-acquired-company"
  });

  assert.equal(result.ok, true);
  const after = getPlayer(result.state, seat);
  assert.equal(after.mcProd, before.mcProd + 3, "the card's effect is applied");
  assert.equal(after.actionsRemaining, before.actionsRemaining - 1, "and one action is spent");
  assert.equal(after.hand.includes("card-base-acquired-company"), false, "the card leaves the hand");
  assert.equal(after.playedProjects.includes("card-base-acquired-company"), true);
});

test("an action only costs a turn when it succeeds", () => {
  const { state, seat } = table({ colonies: true });
  const tile = Object.keys(state.colonies.tiles)[0];

  const traded = executeGameCommand(state, { type: COMMAND.TRADE, playerId: seat, tileId: tile });
  assert.equal(traded.ok, true);
  assert.equal(
    getPlayer(traded.state, seat).actionsRemaining,
    getPlayer(state, seat).actionsRemaining - 1
  );

  // Trading costs 9 M€ / 3 energy / 3 titanium; with none of them the attempt
  // is refused, and a refused attempt must not cost the turn.
  const broke = cloneGameState(state);
  broke.players = broke.players.map(player => ({ ...player, mc: 1, energy: 0, titanium: 0 }));
  const refused = executeGameCommand(broke, { type: COMMAND.TRADE, playerId: seat, tileId: tile });
  assert.equal(refused.ok, false);
  assert.equal(
    getPlayer(refused.state, seat).actionsRemaining,
    getPlayer(broke, seat).actionsRemaining,
    "a refused action is free"
  );
});

test("only the owner of a pending choice may answer it", () => {
  const { state, seat, other } = table();
  const pending = cloneGameState(state);
  pending.pendingChoice = {
    id: "test-choice",
    kind: "effect-branch",
    ownerPlayerId: seat,
    prompt: "テスト",
    optional: false,
    options: [{ id: "0", label: "A" }],
    continuation: { stage: "effect-branch", sourceKind: "card", sourceId: "x" }
  };

  const stolen = executeGameCommand(pending, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: other,
    optionId: "0"
  });
  assert.equal(stolen.ok, false);
  assert.equal(stolen.error.code, ERROR.NOT_YOUR_CHOICE);
});

test("an unknown command is refused rather than ignored", () => {
  const { state, seat } = table();
  const result = executeGameCommand(state, { type: "NOT_A_COMMAND", playerId: seat });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.UNKNOWN_COMMAND);
});

test("legal commands are only those the seat can actually issue", () => {
  const { state, seat, other } = table();

  const mine = getLegalCommands(state, seat);
  assert.ok(mine.some(command => command.type === COMMAND.PLAY_CARD), "the held card is playable");
  assert.ok(mine.some(command => command.type === COMMAND.PASS));

  // The other seat is not on turn, so it has nothing to offer.
  assert.deepEqual(getLegalCommands(state, other), []);

  // And every listed command must actually be accepted.
  for (const command of mine) {
    const result = executeGameCommand(state, command);
    assert.equal(result.ok, true, `${command.type} was listed but refused`);
  }
});

test("a card that asks for a target still costs exactly one action", async () => {
  const { ALL_CARDS, getCardEffect } = await import("../app/game-logic.js");
  const { state, seat } = table();

  const placing = ALL_CARDS.find(card => getCardEffect(card).tile === "forest");
  const ready = cloneGameState(state);
  ready.temperature = 8;
  ready.oxygen = 14;
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 80, plants: 20, hand: [placing.id] } : player
  );

  const played = executeGameCommand(ready, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: placing.id
  });
  assert.equal(played.ok, true);
  assert.ok(played.state.pendingChoice, "placing a tile asks where");
  // Charging before the answer would double up on a card that asks twice.
  assert.equal(getPlayer(played.state, seat).actionsRemaining, 2, "not charged yet");

  const resolved = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: played.state.pendingChoice.options[0].id
  });
  assert.equal(
    getPlayer(resolved.state, seat).actionsRemaining,
    1,
    "charged once the last question is answered"
  );
});

test("playing a card fires threshold bonuses and corporation triggers", async () => {
  const { ALL_CARDS, getCardEffect } = await import("../app/game-logic.js");
  const { state, seat } = table();

  const warming = ALL_CARDS.find(
    card => getCardEffect(card).temperatureSteps === 1 && !getCardEffect(card).tile
  );
  const ready = cloneGameState(state);
  // -26 to -24 crosses the printed heat production bonus.
  ready.temperature = -26;
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 80, hand: [warming.id] } : player
  );

  const result = executeGameCommand(ready, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: warming.id
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.temperature, -24);
  assert.equal(
    getPlayer(result.state, seat).heatProd,
    getPlayer(ready, seat).heatProd + 1,
    "the -24C bonus is paid whichever mode played the card"
  );
});

test("a client cannot spend resources it does not hold", async () => {
  const { ALL_CARDS, getCardPlayableStatus } = await import("../app/game-logic.js");
  const { state, seat } = table();

  const building = ALL_CARDS.find(
    card => card.tags.includes("Building") && card.cost >= 10 && getCardPlayableStatus(card, state, 0, 0).playable
  );
  const ready = cloneGameState(state);
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 50, steel: 5, hand: [building.id] } : player
  );

  // Steel is worth 2 M€ each against a building card.
  const paid = executeGameCommand(ready, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: building.id,
    payment: { steel: 3 }
  });
  assert.equal(paid.ok, true);
  assert.equal(getPlayer(paid.state, seat).steel, 2, "three steel are spent");
  assert.equal(getPlayer(paid.state, seat).mc, 50 - (building.cost - 6), "and discount the cost");

  // The payment comes from the client, so asking for more than is held must be
  // clamped rather than driving the stock negative.
  for (const cheat of [999, -5, 2.7, Number.NaN]) {
    const result = executeGameCommand(ready, {
      type: COMMAND.PLAY_CARD,
      playerId: seat,
      cardId: building.id,
      payment: { steel: cheat }
    });
    if (!result.ok) continue;
    const steel = getPlayer(result.state, seat).steel;
    assert.ok(steel >= 0, `steel went negative for payment ${cheat}`);
    assert.ok(Number.isInteger(steel), `steel became fractional for payment ${cheat}`);
  }
});

test("every standard project runs through the command layer", () => {
  const { state, seat } = table();
  const ready = cloneGameState(state);
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, mc: 100, plants: 20, heat: 20 } : player
  );

  const cases = [
    ["power-plant", after => assert.equal(getPlayer(after, seat).energyProd, 1, "power plant raises energy production")],
    ["asteroid", after => assert.equal(after.temperature, ready.temperature + 2, "asteroid warms two steps")],
    ["convert-heat", after => assert.equal(getPlayer(after, seat).heat, 12, "eight heat are spent")],
    ["aquifer", after => assert.equal(after.oceans, 1, "an ocean is placed")],
    ["greenery", after => assert.equal(after.oxygen, 1, "a greenery raises oxygen")],
    ["city", after => assert.equal(getPlayer(after, seat).mc, 75, "a city costs 25")],
    ["convert-plants", after => assert.equal(getPlayer(after, seat).plants, 12, "eight plants are spent")]
  ];

  for (const [projectId, check] of cases) {
    const played = executeGameCommand(cloneGameState(ready), {
      type: COMMAND.STANDARD_PROJECT,
      playerId: seat,
      projectId
    });
    assert.equal(played.ok, true, `${projectId} was refused`);

    // Projects that place a tile ask where first; the action is spent after.
    const settled = played.state.pendingChoice
      ? executeGameCommand(played.state, {
          type: COMMAND.RESOLVE_PENDING,
          playerId: seat,
          optionId: played.state.pendingChoice.options[0].id
        }).state
      : played.state;

    check(settled);
    assert.equal(
      getPlayer(settled, seat).actionsRemaining,
      1,
      `${projectId} must cost exactly one action`
    );
  }
});

test("a standard project nobody can pay for is refused for free", () => {
  const { state, seat } = table();
  const broke = cloneGameState(state);
  broke.players = broke.players.map(player => ({ ...player, mc: 0, plants: 0, heat: 0 }));

  const result = executeGameCommand(broke, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.CANNOT_AFFORD);
  assert.equal(
    getPlayer(result.state, seat).actionsRemaining,
    getPlayer(broke, seat).actionsRemaining,
    "and costs no action"
  );
});
