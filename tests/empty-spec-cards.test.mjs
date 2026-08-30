import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  getPlayer,
  getCardActionStatus,
  getCardPlayableStatus,
  getAdjacentCells,
  ALL_CARDS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { applyPreludes } from "../app/game-logic.js";
import { PRELUDES } from "../app/official-content.js";
import { getCardResourceType } from "../app/card-resource-types.js";

// Seven cards shipped with an empty effectSpec because their behaviour lives in
// a hand-written method upstream rather than a declarative block, so the
// generator that built our catalogue had nothing to copy. Each could be bought,
// played, and then never do anything again for the rest of the game.
//
// No audit noticed. They all ask whether the engine honours what our catalogue
// says, and our catalogue said the card does nothing -- which the engine
// honoured perfectly. Only reading the real cards found them.
const rig = (tableau = [], hand = []) => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.plants = 0;
  seat.actionsRemaining = 20;
  seat.playedProjects = [...tableau];
  seat.hand = [...hand];
  state.oxygen = 9;
  state.venus = 20;
  state.temperature = 0;
  state.oceans = 6;
  return state;
};

const settle = state => {
  let current = state;
  let asked = 0;
  while (current.pendingChoice && asked < 6) {
    const choice = current.pendingChoice;
    const option = choice.options?.[0];
    if (!option) break;
    const answered = executeGameCommand(current, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: choice.ownerPlayerId,
      optionId: option.id
    });
    if (!answered.ok || answered.state.pendingChoice === choice) break;
    current = answered.state;
    asked += 1;
  }
  return current;
};

const takeAction = (state, cardId, branchIndex) => {
  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION,
    playerId: "player",
    cardId,
    card: ALL_CARDS.find(item => item.id === cardId),
    branchIndex
  });
  assert.equal(used.ok, true, `${cardId} action was refused`);
  return settle(used.state);
};

test("Extreme-Cold Fungus gains a plant, or feeds another card two microbes", () => {
  const id = "card-base-extreme-cold-fungus";
  assert.equal(
    getCardActionStatus(rig([id]), ALL_CARDS.find(card => card.id === id)).playable,
    true
  );

  const plants = takeAction(rig([id]), id, 1);
  assert.equal(getPlayer(plants, "player").plants, 1, "the plant branch pays one plant");

  // What a card can hold is answered by the catalogue as well as the card, so
  // reading card.resourceType alone finds nothing and skips the assertion --
  // which is how this test first passed with the microbe count broken.
  const host = ALL_CARDS.find(card =>
    card.id !== id &&
    (card.resourceType ?? getCardResourceType(card.id)) === "microbe" &&
    (card.requirements ?? []).length === 0
  );
  assert.ok(host, "a card that can hold microbes");
  const fed = takeAction(rig([id, host.id]), id, 0);
  const seat = getPlayer(fed, "player");
  assert.equal(seat.cardResources?.[id] ?? 0, 0, "the microbes never land on itself");
  assert.equal(seat.cardResources?.[host.id] ?? 0, 2);
});

test("Sulphur-Eating Bacteria trades its microbes for triple their worth", () => {
  const id = "card-venus-sulphur-eating-bacteria";

  const grown = takeAction(rig([id]), id, 1);
  assert.equal(getPlayer(grown, "player").cardResources?.[id] ?? 0, 1);

  const stocked = rig([id]);
  getPlayer(stocked, "player").cardResources = { [id]: 3 };
  const sold = takeAction(stocked, id, 0);
  const seat = getPlayer(sold, "player");
  assert.equal(seat.mc - 100, 3, "a microbe is worth three");
  assert.equal(seat.cardResources?.[id] ?? 0, 2, "and one microbe paid for it");
});

test("Jupiter Floating Station pays a M€ per floater, and never more than four", () => {
  const id = "card-colonies-jupiter-floating-station";
  const gain = floaters => {
    const state = rig([id]);
    getPlayer(state, "player").cardResources = { [id]: floaters };
    return getPlayer(takeAction(state, id, 1), "player").mc - 100;
  };

  assert.equal(gain(0), 0);
  assert.equal(gain(3), 3);
  assert.equal(gain(4), 4);
  assert.equal(gain(6), 4, "the card caps its own payout at four");
});

test("Red Ships pays for cities and special tiles beside an ocean, not greeneries", () => {
  const id = "card-promo-red-ships";
  const gain = place => {
    const state = rig([id]);
    const free = Object.values(state.board).filter(
      cell => cell.tileType === "empty" && !cell.reservedFor
    );
    const ocean = free[0];
    state.board[`${ocean.q},${ocean.r}`] = { ...ocean, tileType: "ocean" };
    const beside = getAdjacentCells(ocean.q, ocean.r)
      .map(pos => state.board[`${pos.q},${pos.r}`])
      .filter(cell => cell && cell.tileType === "empty" && !cell.reservedFor);
    place(state, beside);
    return getPlayer(takeAction(state, id, undefined), "player").mc - 100;
  };

  assert.equal(gain(() => {}), 0, "an ocean alone pays nothing");
  assert.equal(
    gain((state, beside) => {
      const cell = beside[0];
      state.board[`${cell.q},${cell.r}`] = { ...cell, tileType: "city", placedBy: "player2" };
    }),
    1,
    "an opponent city beside it still pays"
  );
  assert.equal(
    gain((state, beside) => {
      const cell = beside[0];
      state.board[`${cell.q},${cell.r}`] = { ...cell, tileType: "forest", placedBy: "player" };
    }),
    0,
    "a greenery is neither a city nor a special tile"
  );
});

test("Martian Zoo collects an animal for every Earth tag played", () => {
  const id = "card-colonies-martian-zoo";
  const earth = ALL_CARDS.find(card =>
    (card.tags ?? []).includes("Earth") &&
    (card.requirements ?? []).length === 0 &&
    card.cost < 20
  );

  const play = tableau => {
    const state = rig(tableau, [earth.id]);
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: earth.id, card: earth
    });
    assert.equal(played.ok, true);
    return getPlayer(settle(played.state), "player").cardResources?.[id] ?? 0;
  };

  assert.equal(play([]), 0);
  assert.equal(play([id]), 1);
});

test("GMO Contract pays two M€ for every plant, animal or microbe tag played", () => {
  const id = "card-turmoil-gmo-contract";
  const plant = ALL_CARDS.find(card =>
    (card.tags ?? []).includes("Plant") &&
    (card.requirements ?? []).length === 0 &&
    card.cost < 20
  );

  const play = tableau => {
    const state = rig(tableau, [plant.id]);
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: plant.id, card: plant
    });
    assert.equal(played.ok, true);
    return getPlayer(settle(played.state), "player").mc;
  };

  assert.equal(play([id]) - play([]), 2);
});

test("Banned Delegate removes any delegate that is not a party leader", () => {
  const id = "card-turmoil-banned-delegate";
  const state = rig([], [id]);
  state.turmoil.chairman = "player";
  const partyId = Object.keys(state.turmoil.parties)[0];
  state.turmoil.parties[partyId].delegates = ["player2", "player2"];
  state.turmoil.parties[partyId].leader = "player2";

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: "player",
    cardId: id,
    card: ALL_CARDS.find(item => item.id === id)
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "turmoil-banned-delegate");

  const settled = settle(played.state);
  assert.equal(
    settled.turmoil.parties[partyId].delegates.length,
    1,
    "one delegate left the party"
  );

  // A party holding nothing but its leader offers nobody to ban.
  const leaderOnly = rig([], [id]);
  leaderOnly.turmoil.chairman = "player";
  for (const party of Object.values(leaderOnly.turmoil.parties)) {
    party.delegates = party.delegates.slice(0, 1);
    party.leader = party.delegates[0] ?? null;
  }
  const nobody = executeGameCommand(leaderOnly, {
    type: COMMAND.PLAY_CARD,
    playerId: "player",
    cardId: id,
    card: ALL_CARDS.find(item => item.id === id)
  });
  assert.equal(nobody.ok, true);
  assert.equal(nobody.state.pendingChoice?.kind, undefined, "and no question is asked");
});


// Six more of the same shape, found by the registry gate rather than by reading:
// each was assumed to be a rule the engine held by name, and no engine file
// named any of them.
test("Terraforming Ganymede raises TR once per Jovian tag, its own included", () => {
  const id = "card-base-terraforming-ganymede";
  const raise = jovian => {
    const state = rig(jovian, [id]);
    getPlayer(state, "player").mc = 400;
    const before = getPlayer(state, "player").tr;
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD,
      playerId: "player",
      cardId: id,
      card: ALL_CARDS.find(item => item.id === id)
    });
    assert.equal(played.ok, true);
    return getPlayer(settle(played.state), "player").tr - before;
  };

  assert.equal(raise([]), 1, "the card counts its own Jovian tag");
  const others = ALL_CARDS.filter(card =>
    (card.tags ?? []).includes("Jovian") && (card.requirements ?? []).length === 0
  ).slice(0, 2).map(card => card.id);
  assert.equal(raise(others), 1 + others.length);
});

test("Olympus Conference banks a science resource, or spends one for a card", () => {
  const id = "card-base-olympus-conference";
  const science = ALL_CARDS.find(card =>
    (card.tags ?? []).includes("Science") &&
    (card.requirements ?? []).length === 0 &&
    card.cost < 20
  );

  const playScience = (held, answer) => {
    const state = rig([id], [science.id]);
    getPlayer(state, "player").cardResources = { [id]: held };
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: science.id, card: science
    });
    assert.equal(played.ok, true);
    assert.equal(played.state.pendingChoice?.kind, "olympus-conference");
    const answered = executeGameCommand(played.state, {
      type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: answer
    });
    assert.equal(answered.ok, true);
    return getPlayer(answered.state, "player");
  };

  assert.equal(playScience(0, "add").cardResources?.[id] ?? 0, 1);

  // Spending is only on offer when there is something to spend.
  const empty = rig([id], [science.id]);
  const first = executeGameCommand(empty, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: science.id, card: science
  });
  assert.deepEqual(first.state.pendingChoice.options.map(option => option.id), ["add"]);

  const spent = playScience(2, "draw");
  assert.equal(spent.cardResources?.[id] ?? 0, 1, "one resource paid for the card");
  assert.equal(spent.hand.length, 1, "and a card was drawn");
});

test("Icy Impactors and Titan Shuttles trade their resources both ways", () => {
  const icy = "card-promo-icy-impactors";
  const stocked = rig([icy]);
  getPlayer(stocked, "player").cardResources = { [icy]: 2 };
  const oceanBefore = stocked.oceans;
  const placed = takeAction(stocked, icy, 0);
  assert.equal(getPlayer(placed, "player").cardResources?.[icy] ?? 0, 1);
  assert.equal(placed.oceans, oceanBefore + 1, "an asteroid bought an ocean");

  const titan = "card-colonies-titan-shuttles";
  const held = rig([titan]);
  getPlayer(held, "player").cardResources = { [titan]: 3 };
  const traded = takeAction(held, titan, 0);
  const seat = getPlayer(traded, "player");
  assert.equal(seat.cardResources?.[titan] ?? 0, 2);
  assert.equal(seat.titanium, 1, "a floater became a titanium");
});

test("Floating Trade Hub turns its floaters into standard resources", () => {
  const id = "card-prelude2-floating-trade-hub";
  const state = rig([id]);
  const seat = getPlayer(state, "player");
  seat.selectedPreludeIds = [id];
  seat.cardResources = { [id]: 2 };
  const before = seat.titanium;

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION,
    playerId: "player",
    cardId: id,
    card: PRELUDES.find(item => item.id === id),
    branchIndex: 0
  });
  assert.equal(used.ok, true);
  const after = getPlayer(settle(used.state), "player");
  assert.equal(after.cardResources?.[id] ?? 0, 1);
  assert.equal(after.titanium, before + 1);
});

test("Project Inspection frees a card action to be used a second time", () => {
  const id = "card-promo-project-inspection";
  const state = rig(["card-base-ants"], [id]);
  const seat = getPlayer(state, "player");
  seat.usedCardActions = ["card-base-ants"];

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: "player",
    cardId: id,
    card: ALL_CARDS.find(item => item.id === id)
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "project-inspection");

  const answered = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "card-base-ants"
  });
  assert.equal(answered.ok, true);
  assert.deepEqual(getPlayer(answered.state, "player").usedCardActions, []);
});

test("Double Down applies the other prelude a second time", () => {
  const id = "card-promo-double-down";
  const other = "prelude-allied-banks";
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, prelude: true, seed: 4
  });
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.setupStep = "prelude";
  seat.preludeOptions = [other, id];
  seat.mc = 50;
  seat.mcProd = 0;

  const resolved = applyPreludes(state, [other, id], "player");
  const once = resolved.state ?? resolved;
  const single = getPlayer(once, "player");
  assert.equal(single.mcProd, 4, "Allied Banks alone");
  assert.equal(once.pendingChoice?.kind, "double-down");
  // Double Down cannot name itself as the prelude to copy.
  assert.deepEqual(once.pendingChoice.options.map(option => option.id), [other]);

  const copied = executeGameCommand(once, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: other
  });
  assert.equal(copied.ok, true);
  const twice = getPlayer(copied.state, "player");
  assert.equal(twice.mcProd, 8, "and again after the copy");
  assert.equal(twice.mc, single.mc + 3);
});

// Five more cards whose action existed only in their text. The upstream action
// cases -- "can this card's action be used?" -- are what found them: each was
// playable, paid for, and then had no action at all for the rest of the game.
test("Jovian Lanterns trades a titanium for two floaters", () => {
  const id = "card-colonies-jovian-lanterns";
  const state = rig([id]);
  getPlayer(state, "player").titanium = 2;
  const used = takeAction(state, id, undefined);
  const seat = getPlayer(used, "player");
  assert.equal(seat.titanium, 1, "one titanium paid");
  assert.equal(seat.cardResources?.[id] ?? 0, 2, "two floaters arrived");
});

test("Red Spot Observatory banks a floater, or spends one for a card", () => {
  const id = "card-colonies-red-spot-observatory";

  const banked = takeAction(rig([id]), id, 1);
  assert.equal(getPlayer(banked, "player").cardResources?.[id] ?? 0, 1);

  const stocked = rig([id]);
  getPlayer(stocked, "player").cardResources = { [id]: 2 };
  const before = getPlayer(stocked, "player").hand.length;
  const drawn = takeAction(stocked, id, 0);
  const seat = getPlayer(drawn, "player");
  assert.equal(seat.cardResources?.[id] ?? 0, 1, "a floater paid for it");
  assert.equal(seat.hand.length, before + 1, "and a card was drawn");
});

test("Extractor Balloons trades two floaters for a step of Venus", () => {
  const id = "card-venus-extractor-balloons";

  const grown = takeAction(rig([id]), id, 1);
  assert.equal(getPlayer(grown, "player").cardResources?.[id] ?? 0, 1);

  const stocked = rig([id]);
  getPlayer(stocked, "player").cardResources = { [id]: 3 };
  const venusBefore = stocked.venus;
  const raised = takeAction(stocked, id, 0);
  assert.equal(getPlayer(raised, "player").cardResources?.[id] ?? 0, 1, "two floaters paid");
  assert.equal(raised.venus, venusBefore + 2, "and Venus rose a step");
});

test("Asteroid Deflection System keeps only what the deck reveals", () => {
  const id = "card-promo-asteroid-deflection-system";
  const reveal = topCard => {
    const state = rig([id]);
    state.deck = [topCard.id, ...state.deck.filter(entry => entry !== topCard.id)];
    getPlayer(state, "player").cardResources = {};
    return getPlayer(takeAction(state, id, undefined), "player").cardResources?.[id] ?? 0;
  };

  const space = ALL_CARDS.find(card => (card.tags ?? []).includes("Space") && card.id !== id);
  const other = ALL_CARDS.find(card => !(card.tags ?? []).includes("Space") && card.id !== id);
  assert.equal(reveal(space), 1, "a space tag pays an asteroid");
  assert.equal(reveal(other), 0, "anything else pays nothing");
});

test("An action that costs production needs production to spend", () => {
  // Equatorial Magnetizer trades an energy production step for a rating step,
  // and at zero there is nothing to trade. The play-time rule existed; the
  // action-time one did not, so the action was always offered.
  const id = "card-base-equatorial-magnetizer";
  const status = production => {
    const state = rig([id]);
    getPlayer(state, "player").energyProd = production;
    return getCardActionStatus(state, ALL_CARDS.find(card => card.id === id)).playable;
  };

  assert.equal(status(0), false);
  assert.equal(status(1), true);
});

test("A card that eats another card's resources needs one to eat", () => {
  // Predators removes an animal from any card. With none in play there is
  // nothing to remove, and the reference simply refuses the action.
  const id = "card-base-predators";
  const prey = ALL_CARDS.find(card =>
    card.id !== id && (card.resourceType ?? getCardResourceType(card.id)) === "animal"
  );
  const card = ALL_CARDS.find(entry => entry.id === id);

  const alone = rig([id]);
  assert.equal(getCardActionStatus(alone, card).playable, false);

  const fed = rig([id, prey.id]);
  getPlayer(fed, "player").cardResources = { [prey.id]: 1 };
  assert.equal(getCardActionStatus(fed, card).playable, true);
});

test("A full ocean track does not forbid an action that would place one", () => {
  // The reference marks this with a warning and lets the player go ahead:
  // paying for something that gives nothing is a bad move, not an illegal one.
  const id = "card-base-aquifer-pumping";
  const state = rig([id]);
  const seat = getPlayer(state, "player");
  seat.mc = 8;
  seat.steel = 0;
  state.oceans = 9;
  assert.equal(
    getCardActionStatus(state, ALL_CARDS.find(card => card.id === id)).playable,
    true
  );
});

// Three costs that were in the card text and missing from the generated spec,
// found by adjudicating the last differences against the reference's own cases.
test("Stratospheric Birds spends a floater from one of your cards", () => {
  const id = "card-venus-stratospheric-birds";
  const card = ALL_CARDS.find(entry => entry.id === id);

  const bare = rig([], [id]);
  bare.venus = 16;
  assert.equal(
    getCardPlayableStatus(card, bare).playable,
    false,
    "no floater anywhere means no way to pay"
  );

  const host = ALL_CARDS.find(entry =>
    entry.id !== id && (entry.resourceType ?? getCardResourceType(entry.id)) === "floater"
  );
  const stocked = rig([host.id], [id]);
  stocked.venus = 16;
  getPlayer(stocked, "player").cardResources = { [host.id]: 1 };
  assert.equal(getCardPlayableStatus(card, stocked).playable, true);
});

test("Noctis City needs the energy production it spends", () => {
  const id = "card-base-noctis-city";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const status = production => {
    const state = rig([], [id]);
    getPlayer(state, "player").energyProd = production;
    return getCardPlayableStatus(card, state).playable;
  };

  // The reserved Noctis space carries no energy bonus to cover the loss, so
  // the player has to be producing at least one step already.
  assert.equal(status(0), false);
  assert.equal(status(1), true);
});

test("Immigrant City sheds production rather than paying it", () => {
  // Upstream uses LoseProduction, which takes what it can and never blocks the
  // play: at -4 M€ production the card is still playable and simply floors at
  // -5. Written as a plain cost it would be a payment the player cannot make.
  const id = "card-base-immigrant-city";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const state = rig([], [id]);
  const seat = getPlayer(state, "player");
  seat.mcProd = -4;
  seat.energyProd = 1;

  assert.equal(getCardPlayableStatus(card, state).playable, true);

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: id, card
  });
  assert.equal(played.ok, true);
  const after = getPlayer(settle(played.state), "player");
  assert.equal(after.energyProd, 0, "the energy step was taken");
  // Down to the -5 floor, then the card's own city pays a step back.
  assert.equal(after.mcProd, -4);
});

// The seven cards the reference ships no test file for. Nothing upstream
// asserts their behaviour, so no oracle can reach them and these tests are the
// only thing standing between them and a silent regression. Two of the seven
// had a half missing when they were checked one at a time.
test("Hermetic Order of Mars pays a M€ per empty area beside your tiles", () => {
  const id = "card-promo-hermetic-order-of-mars";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const gain = tiles => {
    const state = rig([], [id]);
    state.oxygen = 0;
    const free = Object.values(state.board)
      .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
      .slice(0, tiles);
    for (const cell of free) {
      state.board[`${cell.q},${cell.r}`] = { ...cell, tileType: "city", placedBy: "player" };
    }
    const before = getPlayer(state, "player").mc;
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: id, card
    });
    assert.equal(played.ok, true);
    return getPlayer(settle(played.state), "player").mc - before + card.cost;
  };

  // With no tile of your own there is nothing to be adjacent to, so only the
  // production half happens. Each tile brings its own empty neighbours.
  assert.equal(gain(0), 0);
  assert.ok(gain(1) > 0, "one tile pays for the empty areas beside it");
  assert.ok(gain(2) > gain(1), "and a second tile pays more");
});

test("Tycho Magnetics spends energy to draw, and keeps one", async () => {
  const { applyCorporation } = await import("../app/game-logic.js");
  const id = "card-promo-tycho-magnetics";
  const state = rig();
  const seat = getPlayer(state, "player");
  seat.corporationOptions = [id];
  const seated = applyCorporation(state, id, "player");
  const started = getPlayer(seated, "player");
  assert.equal(started.mc, 42, "starts with 42 M€");
  assert.equal(started.energyProd, 1, "and a step of energy production");

  seated.phase = "action";
  seated.currentPlayerId = "player";
  const player = getPlayer(seated, "player");
  player.setupStep = "complete";
  player.energy = 3;
  player.actionsRemaining = 2;
  player.hand = [];

  const used = executeGameCommand(seated, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  assert.equal(used.ok, true);
  assert.equal(used.state.pendingChoice?.kind, "amount", "it asks how much energy");

  const option = used.state.pendingChoice.options.find(entry => /2/.test(entry.label));
  const answered = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: option.id
  });
  assert.equal(answered.ok, true);
  const after = getPlayer(answered.state, "player");
  assert.equal(after.energy, 1, "two energy spent");
  assert.equal(answered.state.pendingChoice?.kind, "discard-card", "and it asks which to keep");
});

test("The five remaining unspecced cards do what their text says", async () => {
  const { applyCorporation, applyPreludes } = await import("../app/game-logic.js");

  // Nirgal Enterprises: 30 M€ and a step each of energy, plant and steel.
  const nirgal = rig();
  getPlayer(nirgal, "player").corporationOptions = ["card-prelude2-nirgal-enterprises"];
  const seated = getPlayer(
    applyCorporation(nirgal, "card-prelude2-nirgal-enterprises", "player"),
    "player"
  );
  assert.equal(seated.mc, 30);
  assert.equal(seated.energyProd, 1);
  assert.equal(seated.plantsProd, 1);
  assert.equal(seated.steelProd, 1);

  // Applied Science: six science resources on itself.
  const applied = rig();
  applied.currentPlayerId = "player";
  const appliedSeat = getPlayer(applied, "player");
  appliedSeat.setupStep = "prelude";
  appliedSeat.preludeOptions = ["card-prelude2-applied-science", "prelude-allied-banks"];
  appliedSeat.mc = 50;
  const resolved = applyPreludes(
    applied, ["card-prelude2-applied-science", "prelude-allied-banks"], "player"
  );
  assert.equal(
    getPlayer(resolved.state ?? resolved, "player").cardResources?.["card-prelude2-applied-science"],
    6
  );

  // Atmospheric Enhancers: three ways to raise a parameter, so it asks which.
  const atmospheric = rig();
  atmospheric.currentPlayerId = "player";
  const atmoSeat = getPlayer(atmospheric, "player");
  atmoSeat.setupStep = "prelude";
  atmoSeat.preludeOptions = ["card-prelude2-atmospheric-enhancers", "prelude-allied-banks"];
  atmoSeat.mc = 50;
  const asked = applyPreludes(
    atmospheric, ["card-prelude2-atmospheric-enhancers", "prelude-allied-banks"], "player"
  );
  const atmoState = asked.state ?? asked;
  assert.equal(atmoState.pendingChoice?.kind, "effect-branch");
  assert.equal(atmoState.pendingChoice.options.length, 3);

  // Pioneer Settlement and Martian Lumber Corp are covered by their own tests
  // in strict-rules; what matters here is that all seven are accounted for.
  assert.ok(ALL_CARDS.find(card => card.id === "card-colonies-pioneer-settlement"));
  assert.ok(ALL_CARDS.find(card => card.id === "card-promo-martian-lumber-corp"));
});

test("Teslaract trades a step of energy production for a step of plants", () => {
  // Upstream builds this action by hand, so the generated spec carried only
  // the rating step and the action did not exist.
  const id = "card-promo-teslaract";
  const card = ALL_CARDS.find(entry => entry.id === id);

  const state = rig([id]);
  const seat = getPlayer(state, "player");
  seat.energyProd = 2;
  seat.plantsProd = 0;
  const used = takeAction(state, id, undefined);
  const after = getPlayer(used, "player");
  assert.equal(after.energyProd, 1);
  assert.equal(after.plantsProd, 1);

  // And the production it costs has to be there to spend.
  const broke = rig([id]);
  getPlayer(broke, "player").energyProd = 0;
  assert.equal(getCardActionStatus(broke, card).playable, false);
});
