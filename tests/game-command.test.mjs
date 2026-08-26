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
import { executeGameCommand, getLegalCommands, getStandardProjectCost, COMMAND, ERROR } from "../app/game-command.js";

// Titan, Enceladus and Miranda stay off the track until a card that can hold
// their resource is played, so a test that just wants "a colony" has to ask for
// one that is usable -- the tiles in play are shuffled.
function activeTile(colonies) {
  const id = colonies.tilesInPlay.find(tile => colonies.tiles[tile]?.active !== false);
  if (!id) throw new Error("no active colony tile in play");
  return id;
}


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

function preludeSetup(hand, mc = 80, secondPrelude = "prelude-power-generation") {
  let state = getInitialState({ playerCount: 2, prelude: true });
  // Corporation options are shuffled and four of them grant energy production,
  // so taking whichever landed first made the energyProd assertions below read
  // 3 instead of 2 on roughly a third of runs. CrediCor changes no production.
  const neutral = CORPORATIONS.find(item => item.id === "corp-credicor");
  for (const player of state.players) {
    state = applyCorporation(state, neutral, player.id);
  }
  const seat = state.currentPlayerId;
  state = cloneGameState(state);
  state.phase = "setup";
  state.currentPlayerId = seat;
  state.players = state.players.map(player =>
    player.id === seat
      ? {
          ...player,
          setupStep: "prelude",
          mc,
          hand,
          preludeOptions: ["prelude-eccentric-sponsor", secondPrelude]
        }
      : player
  );
  return { state, seat };
}

test("Eccentric Sponsor asks which of multiple eligible projects to play", () => {
  const { state, seat } = preludeSetup([
    "card-base-acquired-company",
    "card-base-lunar-beam"
  ]);
  const selected = executeGameCommand(state, {
    type: COMMAND.SELECT_PRELUDES,
    playerId: seat,
    preludeIds: ["prelude-eccentric-sponsor", "prelude-power-generation"]
  });
  assert.equal(selected.ok, true);
  assert.deepEqual(
    selected.state.pendingChoice.options.map(option => option.cardId),
    ["card-base-acquired-company", "card-base-lunar-beam"]
  );

  const played = executeGameCommand(selected.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: "card-base-lunar-beam"
  });
  const actor = getPlayer(played.state, seat);
  assert.equal(played.ok, true);
  assert.deepEqual(actor.hand, ["card-base-acquired-company"]);
  assert.ok(actor.playedProjects.includes("card-base-lunar-beam"));
  assert.equal(actor.actionsRemaining, 2, "setup play does not spend an action");
});

test("Eccentric Sponsor charges the remainder above its 25 MC discount", () => {
  const { state, seat } = preludeSetup(["card-base-asteroid-mining"], 10);
  const selected = executeGameCommand(state, {
    type: COMMAND.SELECT_PRELUDES,
    playerId: seat,
    preludeIds: ["prelude-eccentric-sponsor", "prelude-power-generation"]
  });
  const played = executeGameCommand(selected.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: "card-base-asteroid-mining"
  });
  assert.equal(played.ok, true);
  assert.equal(getPlayer(played.state, seat).mc, 5);
  assert.ok(getPlayer(played.state, seat).playedProjects.includes("card-base-asteroid-mining"));
});

test("Eccentric Sponsor can play an event and files it as an event", () => {
  const { state, seat } = preludeSetup(["card-base-bribed-committee"]);
  const selected = executeGameCommand(state, {
    type: COMMAND.SELECT_PRELUDES,
    playerId: seat,
    preludeIds: ["prelude-eccentric-sponsor", "prelude-power-generation"]
  });
  assert.equal(selected.state.pendingChoice.options[0].cardId, "card-base-bribed-committee");

  const played = executeGameCommand(selected.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: "card-base-bribed-committee"
  });
  const actor = getPlayer(played.state, seat);
  assert.deepEqual(actor.playedEvents, ["card-base-bribed-committee"]);
  assert.equal(actor.playedProjects.includes("card-base-bribed-committee"), false);
});

test("Eccentric Sponsor resumes Prelude setup after a project's nested choice", () => {
  const { state, seat } = preludeSetup(["card-base-commercial-district"]);
  const selected = executeGameCommand(state, {
    type: COMMAND.SELECT_PRELUDES,
    playerId: seat,
    preludeIds: ["prelude-power-generation", "prelude-eccentric-sponsor"]
  });
  const project = executeGameCommand(selected.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: "card-base-commercial-district"
  });
  assert.equal(project.state.pendingChoice?.kind, "tile-placement");

  const placed = executeGameCommand(project.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: project.state.pendingChoice.options[0].id
  });
  const actor = getPlayer(placed.state, seat);
  assert.equal(placed.ok, true);
  assert.equal(placed.state.pendingChoice, null);
  assert.ok(actor.playedProjects.includes("card-base-commercial-district"));
  assert.equal(actor.energyProd, 2);
  assert.equal(actor.actionsRemaining, 2);
});

test("Eccentric Sponsor fizzles without a target and leaves no discount", () => {
  const { state, seat } = preludeSetup([], 0);
  const result = executeGameCommand(state, {
    type: COMMAND.SELECT_PRELUDES,
    playerId: seat,
    preludeIds: ["prelude-eccentric-sponsor", "prelude-power-generation"]
  });
  const actor = getPlayer(result.state, seat);
  assert.equal(result.ok, true);
  assert.equal(result.state.pendingChoice, null);
  assert.equal(actor.oneShotCardDiscount ?? 0, 0);
  assert.equal(result.state.oneShotCardDiscount ?? 0, 0);
});

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
  const tile = activeTile(state.colonies);

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

  // A card that also attacks parks a choice, and the threshold bonus is then
  // paid when that choice resolves. This test is about the bonus, so it takes a
  // card that finishes in one step.
  const warming = ALL_CARDS.find(
    card =>
      getCardEffect(card).temperatureSteps === 1 &&
      !getCardEffect(card).tile &&
      !getCardEffect(card).removePlants &&
      !card.effectSpec?.behavior?.decreaseAnyProduction
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

// Ecoline's printed effect is a standing discount on the plant conversion, not
// a once-per-generation corporation action. Modelled as an action it produced
// one greenery a generation, and the 8-plant conversion sat beside it, so the
// corporation had two different ways to make a forest and neither was the
// card's.
test("Ecoline converts plants at 7 instead of 8", async () => {
  const { getStandardProjectCost } = await import("../app/game-command.js");
  const plain = seated("corp-credicor", { plants: 7 });
  const eco = seated("corp-ecoline", { plants: 7 });

  assert.equal(getStandardProjectCost(plain.state, plain.seat, "convert-plants"), 8);
  assert.equal(getStandardProjectCost(eco.state, eco.seat, "convert-plants"), 7);

  assert.equal(
    executeGameCommand(plain.state, {
      type: COMMAND.STANDARD_PROJECT, playerId: plain.seat, projectId: "convert-plants"
    }).ok,
    false,
    "seven plants is not enough at the normal price"
  );
  assert.equal(
    executeGameCommand(eco.state, {
      type: COMMAND.STANDARD_PROJECT, playerId: eco.seat, projectId: "convert-plants"
    }).ok,
    true,
    "but it is for Ecoline"
  );
});

test("Ecoline has no corporation action of its own", () => {
  const { state, seat } = seated("corp-ecoline", { plants: 21 });
  const result = executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: seat });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, ERROR.NO_CORPORATION_ACTION, "the discount is not an action");
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
          // The launch pad puts its floaters on a Jovian card already in play,
          // so there has to be one for it to ask about.
          playedProjects: ["card-colonies-jovian-lanterns"],
          hand: ["card-colonies-titan-floating-launch-pad"]
        }
      : player
  );
  const before = getPlayer(armed, seat);

  // Titan Floating Launch-Pad carries a Jovian tag and asks which card its
  // floater goes on. The trigger used to be skipped entirely for any card that
  // asked something, so Saturn Systems earned nothing.
  const asked = executeGameCommand(armed, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "card-colonies-titan-floating-launch-pad"
  });
  assert.equal(asked.ok, true);
  assert.ok(asked.state.pendingChoice, "the card asks where its floater goes");
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

test("the action phase starts with everyone holding two actions again", () => {
  const { state, seat, other } = table();
  const buying = cloneGameState(state);
  buying.phase = "research";
  // Whatever was left at the end of the last generation.
  buying.players = buying.players.map(player => ({
    ...player,
    mc: 40,
    actionsRemaining: 0,
    researchCards: []
  }));

  const result = executeGameCommand(buying, {
    type: COMMAND.BUY_RESEARCH,
    playerId: seat,
    cardIds: []
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.phase, "action", "everyone has bought, so play begins");
  // Only page.tsx replenished these, so a game driven through commands entered
  // the generation unable to act.
  assert.equal(getPlayer(result.state, seat).actionsRemaining, 2);
  assert.equal(getPlayer(result.state, other).actionsRemaining, 2);
});

test("Beginner Corporation's opening hand is free, and later ones are not", () => {
  const { state, seat } = table();
  const beginner = CORPORATIONS.find(item => item.effects?.freeStartingCards);

  const opening = cloneGameState(state);
  opening.phase = "setup";
  opening.players = opening.players.map(player =>
    player.id === seat
      ? {
          ...player,
          corporationId: beginner.id,
          mc: 42,
          setupStep: "projects",
          researchCards: ["card-base-acquired-company", "p-capital"]
        }
      : player
  );
  const before = getPlayer(opening, seat).mc;

  const bought = executeGameCommand(opening, {
    type: COMMAND.BUY_RESEARCH,
    playerId: seat,
    cardIds: ["card-base-acquired-company", "p-capital"]
  });
  assert.equal(bought.ok, true);
  assert.equal(getPlayer(bought.state, seat).mc, before, "「初期10枚を無料で保持する」");

  // The same corporation pays the usual 3 each once the game is running.
  const later = cloneGameState(state);
  later.phase = "research";
  later.players = later.players.map(player =>
    player.id === seat
      ? { ...player, corporationId: beginner.id, mc: 42, researchCards: ["p-capital"] }
      : { ...player, researchCards: [] }
  );
  const paid = executeGameCommand(later, {
    type: COMMAND.BUY_RESEARCH,
    playerId: seat,
    cardIds: ["p-capital"]
  });
  assert.equal(paid.ok, true);
  assert.equal(getPlayer(paid.state, seat).mc, 39, "the free hand is the opening one only");
});

test("a project that asks where it goes still reports what was built", () => {
  const { state, seat } = table();
  const rich = cloneGameState(state);
  rich.players = rich.players.map(player => ({ ...player, mc: 90 }));

  const asked = executeGameCommand(rich, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.ok(asked.state.pendingChoice);

  const settled = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(settled.ok, true);

  // Only the coordinates were logged, so the log never said which project it was.
  const said = settled.state.logs.some(entry =>
    String(entry.message ?? entry.text ?? "").includes("都市の建設")
  );
  assert.equal(said, true, "the completed project must name itself in the log");
});

test("the 0°C ocean bonus creates a resolvable board choice", () => {
  const { state, seat } = table();
  const warm = cloneGameState(state);
  warm.temperature = -2;
  warm.players = warm.players.map(player => ({
    ...player,
    mc: 90,
    actionsRemaining: 2
  }));

  const raised = executeGameCommand(warm, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "asteroid"
  });

  assert.equal(raised.ok, true);
  assert.equal(raised.state.temperature, 0);
  assert.equal(raised.state.pendingChoice?.ownerPlayerId, seat);
  assert.ok(raised.state.pendingChoice?.options.length > 0);

  const resolved = executeGameCommand(raised.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: raised.state.pendingChoice.options[0].id
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.state.pendingChoice, null);
  assert.equal(resolved.state.oceans, warm.oceans + 1);
  assert.equal(getPlayer(resolved.state, seat).actionsRemaining, 1);
});

test("final greenery resolves in turn order through commands", () => {
  const { state, seat, other } = table();
  const ending = cloneGameState(state);
  ending.phase = "final_greenery";
  ending.currentPlayerId = seat;
  ending.oxygen = 7;
  ending.players = ending.players.map(player => ({
    ...player,
    plants: player.id === seat ? 10 : 0,
    passed: false
  }));

  const before = getPlayer(ending, seat);
  const asked = executeGameCommand(ending, {
    type: COMMAND.CONVERT_FINAL_GREENERY,
    playerId: seat
  });

  assert.equal(asked.ok, true);
  assert.ok(asked.state.pendingChoice?.options.length > 0);
  const option = asked.state.pendingChoice.options.find(item => {
    const cell = asked.state.board[item.targetCellKey];
    return cell?.bonusType === "steel" && (cell.bonusAmount ?? 0) > 0;
  }) ?? asked.state.pendingChoice.options[0];
  const cell = asked.state.board[option.targetCellKey];

  const placed = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: option.id
  });

  assert.equal(placed.ok, true);
  assert.equal(placed.state.board[option.targetCellKey].tileType, "forest");
  // table() deals a random corporation, and Ecoline converts at 7 rather than
  // 8, so the price is asked for rather than assumed.
  const finalGreeneryCost = getStandardProjectCost(ending, seat, "convert-plants") ?? 8;
  assert.equal(getPlayer(placed.state, seat).plants, before.plants - finalGreeneryCost);
  assert.equal(placed.state.oxygen, ending.oxygen);
  assert.equal(getPlayer(placed.state, seat).tr, before.tr);
  if (cell.bonusType === "steel") {
    assert.equal(getPlayer(placed.state, seat).steel, before.steel + cell.bonusAmount);
  }

  const firstDone = executeGameCommand(placed.state, {
    type: COMMAND.FINISH_FINAL_GREENERY,
    playerId: seat
  });
  assert.equal(firstDone.ok, true);
  assert.equal(firstDone.state.phase, "final_greenery");
  assert.equal(firstDone.state.currentPlayerId, other);

  const wrongSeat = executeGameCommand(firstDone.state, {
    type: COMMAND.FINISH_FINAL_GREENERY,
    playerId: seat
  });
  assert.equal(wrongSeat.ok, false);
  assert.equal(wrongSeat.error.code, ERROR.NOT_YOUR_TURN);

  const finished = executeGameCommand(firstDone.state, {
    type: COMMAND.FINISH_FINAL_GREENERY,
    playerId: other
  });
  assert.equal(finished.ok, true);
  assert.equal(finished.state.phase, "game_over");
  assert.equal(finished.state.isGameOver, true);
});

// A game with opponents is won on points, not on the three tracks. Reading the
// tracks reported a win to a player who had been outscored 68 to 20, because
// nothing compared the two — the planet being terraformed is the clock here,
// not the victory condition.
function endedTable(scores) {
  const { state } = table();
  let next = cloneGameState(state);
  next.temperature = 8;
  next.oxygen = 14;
  next.oceans = 9;
  next.phase = "final_greenery";
  next.players = next.players.map((player, index) => ({
    ...player,
    plants: 0,
    passed: false,
    tr: scores[index].tr,
    mc: scores[index].mc
  }));
  next.currentPlayerId = next.players[0].id;
  for (let i = 0; i < next.players.length; i++) {
    const result = executeGameCommand(next, {
      type: COMMAND.FINISH_FINAL_GREENERY,
      playerId: next.currentPlayerId
    });
    assert.equal(result.ok, true);
    next = result.state;
  }
  assert.equal(next.phase, "game_over");
  return next;
}

test("a game with opponents is decided on points, not on the three tracks", () => {
  const beaten = endedTable([{ tr: 20, mc: 488 }, { tr: 68, mc: 98 }]);
  assert.deepEqual(beaten.winnerPlayerIds, ["player2"], "the higher score wins");
  assert.equal(beaten.gameResult, "loss", "maxed tracks do not save an outscored player");
  assert.deepEqual(
    beaten.standings.map(entry => [entry.playerId, entry.score]),
    [["player2", 68], ["player", 20]],
    "standings are ordered best first"
  );

  const won = endedTable([{ tr: 70, mc: 10 }, { tr: 20, mc: 10 }]);
  assert.deepEqual(won.winnerPlayerIds, ["player"]);
  assert.equal(won.gameResult, "win");
});

test("a tie on points is broken by MC, and a tie on both is shared", () => {
  const broken = endedTable([{ tr: 40, mc: 90 }, { tr: 40, mc: 10 }]);
  assert.deepEqual(broken.winnerPlayerIds, ["player"], "MC breaks an equal score");

  const shared = endedTable([{ tr: 40, mc: 50 }, { tr: 40, mc: 50 }]);
  assert.deepEqual(
    shared.winnerPlayerIds.slice().sort(),
    ["player", "player2"],
    "equal on both is a shared victory, not an arbitrary pick"
  );
});

test("solo is still decided by the planet, not by a ranking", () => {
  const build = params => {
    let next = cloneGameState(getInitialState({ playerCount: 1 }));
    next.temperature = params[0];
    next.oxygen = params[1];
    next.oceans = params[2];
    next.phase = "final_greenery";
    next.players = next.players.map(player => ({ ...player, plants: 0, passed: false }));
    next.currentPlayerId = next.players[0].id;
    const result = executeGameCommand(next, {
      type: COMMAND.FINISH_FINAL_GREENERY,
      playerId: next.currentPlayerId
    });
    assert.equal(result.ok, true);
    return result.state;
  };

  const maxed = build([8, 14, 9]);
  assert.equal(maxed.gameResult, "win");
  assert.equal(maxed.standings, null, "there is nobody to rank against");

  const short = build([0, 0, 0]);
  assert.equal(short.gameResult, "loss");
});

test("final greenery commands and research purchases are phase gated", () => {
  const { state, seat } = table();

  for (const type of [COMMAND.CONVERT_FINAL_GREENERY, COMMAND.FINISH_FINAL_GREENERY]) {
    const result = executeGameCommand(state, { type, playerId: seat });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, ERROR.WRONG_PHASE);
  }

  for (const phase of ["final_greenery", "game_over"]) {
    const off = cloneGameState(state);
    off.phase = phase;
    off.players = off.players.map(player =>
      player.id === seat
        ? { ...player, researchCards: ["card-base-acquired-company"] }
        : player
    );
    const result = executeGameCommand(off, {
      type: COMMAND.BUY_RESEARCH,
      playerId: seat,
      cardIds: ["card-base-acquired-company"]
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, ERROR.WRONG_PHASE);
  }
});

test("an open choice must be answered before the seat does anything else", () => {
  const { state, seat, other } = table();
  const rich = cloneGameState(state);
  rich.players = rich.players.map(player => ({ ...player, mc: 90 }));

  const asked = executeGameCommand(rich, {
    type: COMMAND.STANDARD_PROJECT,
    playerId: seat,
    projectId: "city"
  });
  assert.ok(asked.state.pendingChoice, "the city is waiting on a space");

  // Acting now would resolve the choice against a state it was never built from.
  const jumped = executeGameCommand(asked.state, {
    type: COMMAND.PLAY_CARD,
    playerId: seat,
    cardId: "card-base-acquired-company"
  });
  assert.equal(jumped.ok, false);
  assert.equal(jumped.error.code, ERROR.ACTION_REFUSED);

  // Only the seat that owes the answer is held up.
  const bystander = executeGameCommand(asked.state, {
    type: COMMAND.PLAY_CARD,
    playerId: other,
    cardId: "card-base-acquired-company"
  });
  assert.equal(bystander.error.code, ERROR.NOT_YOUR_TURN, "not blocked by the choice");

  // Answering it lets play continue.
  const settled = executeGameCommand(asked.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: seat,
    optionId: asked.state.pendingChoice.options[0].id
  });
  assert.equal(settled.ok, true);
});

// The screen diffs the numbers to show what a move did, but a diff cannot say
// which card moved them or whose turn it was. On a robot's turn that left the
// player watching values change with no stated cause.
test("playing a card records who played what", () => {
  const { state, seat } = table();
  const before = state.lastAction?.seq ?? 0;
  const result = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: seat, cardId: "card-base-acquired-company"
  });

  assert.equal(result.ok, true);
  const action = result.state.lastAction;
  assert.equal(action.playerId, seat);
  assert.equal(action.kind, "card");
  assert.equal(action.cardId, "card-base-acquired-company");
  assert.ok(action.cardName, "the card is named so the panel can print it");
  assert.ok(action.seq > before, "the counter moves so the same play is not reported twice");
});

// Special Design relaxes the global requirements of the NEXT card only, while
// Adaptation Technology is permanent. Both wrote to one running total that was
// never cleared, so a single Special Design loosened every requirement for the
// rest of the game.
test("Special Design relaxes only the next card played", () => {
  const { state, seat } = table();
  const armed = cloneGameState(state);
  armed.players = armed.players.map(player =>
    player.id === seat ? { ...player, hand: ["card-base-special-design"] } : player
  );

  const played = executeGameCommand(armed, {
    type: COMMAND.PLAY_CARD, playerId: seat, cardId: "card-base-special-design"
  });
  assert.equal(played.ok, true);
  assert.equal(
    getPlayer(played.state, seat).oneShotRequirementBuffer, 2,
    "the relaxation is armed for the next card"
  );
  assert.equal(
    getPlayer(played.state, seat).globalRequirementBuffer ?? 0, 0,
    "and is not folded into the permanent buffer"
  );

  // The next card spends it, whatever that card is.
  const next = cloneGameState(played.state);
  next.players = next.players.map(player =>
    player.id === seat
      ? { ...player, hand: ["card-base-acquired-company"], actionsRemaining: 2 }
      : player
  );
  const after = executeGameCommand(next, {
    type: COMMAND.PLAY_CARD, playerId: seat, cardId: "card-base-acquired-company"
  });
  assert.equal(after.ok, true);
  assert.equal(
    getPlayer(after.state, seat).oneShotRequirementBuffer, 0,
    "the relaxation is spent and does not persist"
  );
});

// Helion may spend heat as money, and HOW MUCH is the player's decision --
// burning heat to keep megacredits is a real line of play. The engine used to
// decide for them, using heat only to cover a shortfall.
test("Helion chooses how much heat to spend as money", async () => {
  const { getPlayer } = await import("../app/game-logic.js");

  const buy = (corporationId, payment) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.corporationId = corporationId;
    seat.mc = 50;
    seat.heat = 20;
    seat.actionsRemaining = 2;
    const before = { mc: seat.mc, heat: seat.heat };
    const result = executeGameCommand(state, {
      type: COMMAND.STANDARD_PROJECT,
      playerId: "player",
      projectId: "power-plant",
      ...(payment ? { payment } : {})
    });
    assert.equal(result.ok, true);
    const after = getPlayer(result.state, "player");
    return { mc: before.mc - after.mc, heat: before.heat - after.heat };
  };

  assert.deepEqual(buy("corp-helion", undefined), { mc: 11, heat: 0 }, "unasked, heat covers only a shortfall");
  assert.deepEqual(buy("corp-helion", { heat: 11 }), { mc: 0, heat: 11 }, "or the whole price");
  assert.deepEqual(buy("corp-helion", { heat: 5 }), { mc: 6, heat: 5 }, "or part of it");
  assert.deepEqual(
    buy("corp-credicor", { heat: 11 }), { mc: 11, heat: 0 },
    "a corporation without the ability cannot spend heat whatever it asks for"
  );
});

test("Io Sulphur Research draws according to the player's active Venus tags", () => {
  const { state, seat } = table();
  const research = "card-venus-io-sulphur-research";
  const venusCards = [
    "card-venus-aerial-mappers",
    "card-venus-atalanta-planitia-lab",
    "card-venus-ishtar-mining"
  ];
  const base = cloneGameState(state);
  base.deck = ["card-base-acquired-company", "card-base-birds", "card-base-mining-expedition"];
  base.discardPile = [];
  base.players = base.players.map(player => player.id === seat
    ? { ...player, corporationId: null, mc: 80, hand: [research], playedProjects: venusCards.slice(0, 2), selectedPreludeIds: [] }
    : player);

  const low = executeGameCommand(base, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: research });
  assert.equal(low.ok, true);
  assert.equal(getPlayer(low.state, seat).hand.length, 1);
  assert.equal(getPlayer(low.state, seat).mc, 63);
  assert.equal(getPlayer(low.state, seat).actionsRemaining, 1);

  const highState = cloneGameState(state);
  highState.deck = ["card-base-acquired-company", "card-base-birds", "card-base-mining-expedition"];
  highState.discardPile = [];
  highState.players = highState.players.map(player => player.id === seat
    ? { ...player, corporationId: null, mc: 80, hand: [research], playedProjects: venusCards, selectedPreludeIds: [] }
    : player);
  const high = executeGameCommand(highState, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: research });
  assert.equal(high.ok, true);
  assert.equal(getPlayer(high.state, seat).hand.length, 3);
  assert.equal(getPlayer(high.state, seat).mc, 63);
  assert.equal(getPlayer(high.state, seat).actionsRemaining, 1);
});
