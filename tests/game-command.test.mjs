import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  applyCorporation,
  completeSetupPurchase,
  cloneGameState,
  getPlayer,
  CORPORATIONS
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

  // Measure against the state each run started from: corporations are dealt at
  // random and several grant starting energy production or resources, so a
  // fixed expected value would be reading the shuffle rather than the project.
  // The corporation is cleared for the same reason: CrediCor is repaid 4 for a
  // city and Tharsis Republic is paid 3, so "a city costs 25" was really
  // asserting that neither had been dealt.
  ready.players = ready.players.map(player =>
    player.id === seat ? { ...player, corporationId: null } : player
  );
  const before = getPlayer(ready, seat);
  const cases = [
    ["power-plant", after => assert.equal(getPlayer(after, seat).energyProd, before.energyProd + 1, "power plant raises energy production")],
    ["asteroid", after => assert.equal(after.temperature, ready.temperature + 2, "asteroid warms two steps")],
    ["convert-heat", after => assert.equal(getPlayer(after, seat).heat, before.heat - 8, "eight heat are spent")],
    ["aquifer", after => assert.equal(after.oceans, ready.oceans + 1, "an ocean is placed")],
    ["greenery", after => assert.equal(after.oxygen, ready.oxygen + 1, "a greenery raises oxygen")],
    ["city", after => assert.equal(getPlayer(after, seat).mc, before.mc - 25, "a city costs 25")],
    ["convert-plants", after => assert.equal(getPlayer(after, seat).plants, before.plants - 8, "eight plants are spent")]
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

// A seat wearing a chosen corporation, with the resources its action needs.
function seated(corporationId, overrides = {}) {
  const { state, seat, other } = table();
  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === seat ? { ...player, corporationId, ...overrides } : player
  );
  return { state: next, seat, other };
}

test("Robinson Industries raises the lowest production and spends one action", () => {
  const { state, seat } = seated("corp-robinson", {
    mc: 40,
    mcProd: 3,
    steelProd: 2,
    titaniumProd: 2,
    plantsProd: 2,
    energyProd: 2,
    heatProd: 2
  });
  const before = getPlayer(state, seat);

  const result = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(result.ok, true);

  const after = getPlayer(result.state, seat);
  assert.equal(after.mc, before.mc - 4);
  // Steel is the first of the six at the lowest value, so it is the one raised.
  assert.equal(after.steelProd, before.steelProd + 1);
  assert.equal(after.mcProd, before.mcProd, "a production that was not lowest is untouched");
  assert.equal(after.actionsRemaining, before.actionsRemaining - 1);
});

test("a corporation action cannot be used twice in one generation", () => {
  const { state, seat } = seated("corp-robinson", { mc: 40 });
  const first = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(first.ok, true);

  const second = executeGameCommand(first.state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(second.ok, false);
  assert.equal(second.error.code, ERROR.ACTION_ALREADY_USED);
  assert.equal(
    getPlayer(second.state, seat).mc,
    getPlayer(first.state, seat).mc,
    "and the refusal charges nothing"
  );
});

test("UNMI may only buy a TR step in a generation where its TR already rose", () => {
  const { state, seat } = seated("corp-unmi", { mc: 40, tr: 20, generationStartTr: 20 });

  const tooEarly = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(tooEarly.ok, false, "TR has not risen this generation");
  assert.equal(tooEarly.error.code, ERROR.ACTION_REFUSED);

  const risen = cloneGameState(state);
  risen.players = risen.players.map(player =>
    player.id === seat ? { ...player, tr: 21 } : player
  );
  const before = getPlayer(risen, seat);
  const result = executeGameCommand(risen, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(result.ok, true);

  const after = getPlayer(result.state, seat);
  assert.equal(after.tr, before.tr + 1);
  assert.equal(after.mc, before.mc - 3);
  assert.equal(after.actionsRemaining, before.actionsRemaining - 1);
});

test("Ecoline pays plants, asks where, and spends the action on the answer", () => {
  const { state, seat } = seated("corp-ecoline", { plants: 9 });
  const before = getPlayer(state, seat);

  const asked = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(asked.ok, true);
  assert.ok(asked.state.pendingChoice, "the board has more than one legal space");
  assert.equal(
    getPlayer(asked.state, seat).plants,
    before.plants - 7,
    "the plants are paid when the action starts"
  );
  assert.equal(
    getPlayer(asked.state, seat).actionsRemaining,
    before.actionsRemaining,
    "and the action is not spent until the question is answered"
  );

  const forests = Object.values(asked.state.board).filter(cell => cell.tileType === "forest").length;
  const settled = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(settled.ok, true);

  assert.equal(
    Object.values(settled.state.board).filter(cell => cell.tileType === "forest").length,
    forests + 1
  );
  assert.equal(getPlayer(settled.state, seat).actionsRemaining, before.actionsRemaining - 1);
});

test("Ecoline without enough plants is refused for free", () => {
  const { state, seat } = seated("corp-ecoline", { plants: 6 });
  const before = getPlayer(state, seat);

  const result = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.ACTION_REFUSED);
  assert.equal(getPlayer(result.state, seat).plants, before.plants);
  assert.equal(getPlayer(result.state, seat).actionsRemaining, before.actionsRemaining);
});

test("a corporation with no action of its own is refused", () => {
  const { state, seat } = seated("corp-credicor", { mc: 40 });
  const result = executeGameCommand(state, {
    type: COMMAND.CORPORATION_ACTION,
    playerId: seat
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.NO_CORPORATION_ACTION);
});

test("answering the last question is what spends the action", () => {
  const { state, seat } = table();
  const rich = cloneGameState(state);
  rich.players = rich.players.map(player => ({ ...player, mc: 90 }));

  const asked = executeGameCommand(rich, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.equal(asked.ok, true);
  assert.ok(asked.state.pendingChoice, "the city asks where it goes");

  const before = getPlayer(asked.state, seat).actionsRemaining;
  const settled = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(settled.ok, true);

  // Resolving the choice by calling the engine directly, as the solo UI once
  // did, left this unchanged and made every such project a free action.
  assert.equal(getPlayer(settled.state, seat).actionsRemaining, before - 1);
});

test("a choice belonging to another seat cannot be answered", () => {
  const { state, seat, other } = table();
  const rich = cloneGameState(state);
  rich.players = rich.players.map(player => ({ ...player, mc: 90 }));

  const asked = executeGameCommand(rich, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  const stolen = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: other,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(stolen.ok, false);
  assert.equal(stolen.error.code, ERROR.NOT_YOUR_CHOICE);
});

test("a card that asks a question still fires its corporation trigger", () => {
  const { state, seat } = table();
  const saturn = CORPORATIONS.find(item => item.effects?.jovianProduction);
  const armed = cloneGameState(state);
  armed.players = armed.players.map(player =>
    player.id === seat
      ? {
          ...player,
          corporationId: saturn.id,
          mc: 200,
          titanium: 20,
          hand: ["card-base-ganymede-colony"]
        }
      : player
  );
  const before = getPlayer(armed, seat);

  // Ganymede Colony carries a Jovian tag and asks where its city goes. The
  // trigger used to be skipped entirely, so Saturn Systems earned nothing.
  const asked = executeGameCommand(armed, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "card-base-ganymede-colony"
  });
  assert.equal(asked.ok, true);
  assert.ok(asked.state.pendingChoice, "the colony asks where it goes");
  assert.equal(
    getPlayer(asked.state, seat).mcProd,
    before.mcProd,
    "the trigger waits for the answer"
  );

  const settled = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(settled.ok, true);

  const after = getPlayer(settled.state, seat);
  assert.equal(after.mcProd, before.mcProd + 1, "Saturn Systems is paid for the Jovian tag");
  assert.equal(after.actionsRemaining, before.actionsRemaining - 1, "and it cost exactly one action");
});

test("the city project raises MC production for whoever builds it", () => {
  const { state, seat } = table();
  const rich = cloneGameState(state);
  // Without clearing the corporation this reads the shuffle: Tharsis Republic
  // adds its own +1 on top of the project's, so the seat would gain 2.
  rich.players = rich.players.map(player =>
    player.id === seat ? { ...player, mc: 90, corporationId: null } : { ...player, mc: 90 }
  );
  const before = getPlayer(rich, seat);

  let settled = executeGameCommand(rich, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  }).state;
  while (settled.pendingChoice?.ownerPlayerId === seat) {
    settled = executeGameCommand(settled, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: seat,
      optionId: settled.pendingChoice.options[0].id
    }).state;
  }
  assert.equal(getPlayer(settled, seat).mcProd, before.mcProd + 1);
});

test("a project with nowhere to put its tile is refused before it is paid", () => {
  const { state, seat } = table();
  const full = cloneGameState(state);
  full.players = full.players.map(player => ({ ...player, mc: 90 }));
  for (const key of Object.keys(full.board)) {
    const cell = full.board[key];
    if (cell.tileType === "empty" && !cell.isOceanOnly) {
      full.board[key] = { ...cell, tileType: "city", placedBy: "neutral" };
    }
  }
  const before = getPlayer(full, seat);

  const result = executeGameCommand(full, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.NO_LEGAL_SPACE);
  // The refusal used to carry a state that had already been charged 25 MC.
  assert.equal(getPlayer(result.state, seat).mc, before.mc, "and nothing was paid");
  assert.equal(getPlayer(result.state, seat).mcProd, before.mcProd);
});

test("the same card cannot be sold twice in one sale", () => {
  const { state, seat } = table();
  const before = getPlayer(state, seat);

  const result = executeGameCommand(state, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "sell-patents",
    cardIds: ["card-base-acquired-company", "card-base-acquired-company"]
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.DUPLICATE_CARD);
  assert.equal(getPlayer(result.state, seat).mc, before.mc, "one card never pays twice");
});

test("CrediCor is repaid for a standard project costing 20 or more", () => {
  const credicor = CORPORATIONS.find(item => item.effects?.expensivePaymentBonus);
  const { state, seat } = table();
  const armed = cloneGameState(state);
  armed.players = armed.players.map(player =>
    player.id === seat ? { ...player, corporationId: credicor.id, mc: 120 } : player
  );
  const before = getPlayer(armed, seat);

  let settled = executeGameCommand(armed, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  }).state;
  while (settled.pendingChoice?.ownerPlayerId === seat) {
    settled = executeGameCommand(settled, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: seat,
      optionId: settled.pendingChoice.options[0].id
    }).state;
  }
  // 25 for the city, 4 back. Placement bonuses may add more, never less.
  const spent = before.mc - getPlayer(settled, seat).mc;
  assert.ok(spent <= 21, `CrediCor paid ${spent}, which is more than 25 less the 4 rebate`);
});

test("Tharsis Republic is paid for every city, and the 3 MC only for its own", () => {
  const tharsis = CORPORATIONS.find(item => item.effects?.cityProduction);
  const { state, seat, other } = table();
  const armed = cloneGameState(state);
  armed.players = armed.players.map(player =>
    player.id === other
      ? { ...player, corporationId: tharsis.id }
      : { ...player, mc: 90 }
  );
  const before = getPlayer(armed, other);

  let settled = executeGameCommand(armed, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  }).state;
  while (settled.pendingChoice?.ownerPlayerId === seat) {
    settled = executeGameCommand(settled, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: seat,
      optionId: settled.pendingChoice.options[0].id
    }).state;
  }
  const after = getPlayer(settled, other);
  assert.equal(after.mcProd, before.mcProd + 1, "every city counts, not only its own");
  assert.equal(after.mc, before.mc, "but the 3 MC is for its own city only");
});

test("a greenery that crosses 8% oxygen buys the temperature step", () => {
  const { state, seat } = table();
  const warm = cloneGameState(state);
  warm.oxygen = 7;
  warm.temperature = -30;
  warm.players = warm.players.map(player => ({ ...player, mc: 90 }));

  let settled = executeGameCommand(warm, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "greenery"
  }).state;
  while (settled.pendingChoice?.ownerPlayerId === seat) {
    settled = executeGameCommand(settled, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: seat,
      optionId: settled.pendingChoice.options[0].id
    }).state;
  }
  assert.equal(settled.oxygen, 8);
  assert.equal(settled.temperature, -28, "the 8% bonus raises temperature one step");
});

test("actions are refused outside the action phase", () => {
  const { state, seat } = table();

  for (const phase of ["research", "production", "setup"]) {
    const off = cloneGameState(state);
    off.phase = phase;
    const before = getPlayer(off, seat);

    const played = executeGameCommand(off, {
      type: COMMAND.PLAY_CARD,
      playerId: seat,
      cardId: "card-base-acquired-company"
    });
    assert.equal(played.ok, false, `a card was playable during ${phase}`);
    assert.equal(played.error.code, ERROR.WRONG_PHASE);
    assert.equal(getPlayer(played.state, seat).mc, before.mc, "and it cost nothing");

    // The standard projects were reachable the same way.
    const project = executeGameCommand(off, {
      type: COMMAND.STANDARD_PROJECT,
      playerId: seat,
      projectId: "power-plant"
    });
    assert.equal(project.ok, false, `a project ran during ${phase}`);
    assert.equal(project.error.code, ERROR.WRONG_PHASE);
  }

  // And the action phase itself is unaffected.
  const allowed = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "card-base-acquired-company"
  });
  assert.equal(allowed.ok, true);
});

test("buying research is still allowed in the research phase", () => {
  const { state, seat } = table();
  const buying = cloneGameState(state);
  buying.phase = "research";
  buying.players = buying.players.map(player =>
    player.id === seat ? { ...player, mc: 40, researchCards: ["card-base-acquired-company"] } : player
  );

  const result = executeGameCommand(buying, {
    type: COMMAND.BUY_RESEARCH,
    playerId: seat,
    cardIds: ["card-base-acquired-company"]
  });
  assert.equal(result.ok, true, "the phase gate must not block the phase's own command");
  assert.equal(getPlayer(result.state, seat).hand.includes("card-base-acquired-company"), true);
});
