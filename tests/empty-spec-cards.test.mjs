import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  getPlayer,
  getCardActionStatus,
  getCardPlayableStatus,
  countActiveTags,
  applyPreludes,
  getAdjacentCells,
  increaseTerraformRating,
  applyCorporationTriggers,
  applyCorporation,
  applyCardEffect,
  triggerProduction,
  applyCorporationInitialAction,
  resolvePendingChoice,
  DECLINE_CHOICE,
  placeTileAt,
  armPreservationProgram,
  ALL_CARDS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { getCardResourceType } from "../app/card-resource-types.js";
import { PRELUDES, OFFICIAL_PROJECTS, CORPORATIONS } from "../app/official-content.js";
import { JAPANESE_TEXT } from "../app/japanese-text.js";

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

// Three corporation actions the bespoke inventory could not see, because it
// asked getCardActionStatus -- which a corporation's action never reaches.
test("Septem Tribus pays two M€ per party holding a delegate of yours", async () => {
  const state = rig();
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-turmoil-septem-tribus";
  seat.mc = 10;
  seat.actionsRemaining = 2;

  const parties = Object.keys(state.turmoil.parties);
  state.turmoil.parties[parties[0]].delegates = ["player"];
  state.turmoil.parties[parties[1]].delegates = ["player", "player2"];
  state.turmoil.parties[parties[2]].delegates = ["player2"];

  const used = executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  assert.equal(used.ok, true);
  // Two parties hold one of the player's delegates; the third holds only an
  // opponent's and pays nothing.
  assert.equal(getPlayer(used.state, "player").mc, 14);
});

test("Viron frees a used card action, the way Project Inspection does", () => {
  const state = rig(["card-base-ants"]);
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-venus-viron";
  seat.usedCardActions = ["card-base-ants"];
  seat.actionsRemaining = 2;

  const used = executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  assert.equal(used.ok, true);
  assert.equal(used.state.pendingChoice?.kind, "project-inspection");

  const answered = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "card-base-ants"
  });
  assert.equal(answered.ok, true);
  // Ants is free to act again. The corporation's own action is spent, which is
  // why the list is not empty.
  const freed = getPlayer(answered.state, "player").usedCardActions;
  assert.equal(freed.includes("card-base-ants"), false);
});

test("Factorum offers only the half the board allows", () => {
  const offer = (energy, mc) => {
    const state = rig();
    const seat = getPlayer(state, "player");
    seat.corporationId = "card-promo-factorum";
    seat.energy = energy;
    seat.mc = mc;
    seat.energyProd = 0;
    seat.actionsRemaining = 2;
    const used = executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
    if (!used.ok) return null;
    return used.state.pendingChoice.options.map(option => option.id);
  };

  // "Increase energy production IF YOU HAVE NO ENERGY RESOURCES, or spend 3 M€
  // to draw a building card." Each half stands on its own condition.
  assert.deepEqual(offer(0, 0), ["energy"]);
  assert.deepEqual(offer(5, 10), ["draw"]);
  assert.deepEqual(offer(0, 10), ["energy", "draw"]);
  assert.equal(offer(5, 0), null, "neither half applies");

  const state = rig();
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-promo-factorum";
  seat.energy = 0;
  seat.mc = 0;
  seat.energyProd = 0;
  seat.actionsRemaining = 2;
  const used = executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  const answered = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "energy"
  });
  assert.equal(getPlayer(answered.state, "player").energyProd, 1);
});

// The two cards the skip ledger found with no owner at all: no upstream oracle
// mentions them, and no contract audit measures what they do.
test("Research Coordination is a Wild tag and nothing else", () => {
  // Its whole rule is the tag it carries, which the tag counter already
  // honours -- so the thing to check is that the tag is there and counts.
  // Its id says prelude, but it is played as a project.
  const id = "card-prelude-research-coordination";
  const card = ALL_CARDS.find(entry => entry.id === id);
  assert.deepEqual(card.tags, ["Wild"]);

  const state = rig([id]);
  getPlayer(state, "player").selectedPreludeIds = [];

  const counted = countActiveTags(state, "player", "Wild");
  assert.equal(counted, 1, "the wild tag is counted while the prelude is in play");
});

test("Preservation Program raises the terraform rating five steps", () => {
  const id = "card-prelude2-preservation-program";
  const state = rig();
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.setupStep = "prelude";
  seat.preludeOptions = [id, "prelude-allied-banks"];
  seat.mc = 50;
  const before = seat.tr;

  const resolved = applyPreludes(state, [id, "prelude-allied-banks"], "player");
  const after = getPlayer(resolved.state ?? resolved, "player");
  assert.equal(after.tr - before, 5, "five steps, and Allied Banks brings none");
});

test("Palladin Shipping trades two titanium for a step of temperature", () => {
  // Found by comparing our declared behaviour with upstream's: its action was
  // declared there and nowhere here, so the corporation had none.
  const attempt = (titanium, temperature) => {
    const state = rig();
    state.temperature = temperature;
    const seat = getPlayer(state, "player");
    seat.corporationId = "card-prelude2-palladin-shipping";
    seat.titanium = titanium;
    seat.actionsRemaining = 2;
    return executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  };

  assert.equal(attempt(1, 0).ok, false, "two titanium or nothing");
  assert.equal(attempt(2, 8).ok, false, "and somewhere for the temperature to go");

  const used = attempt(2, 0);
  assert.equal(used.ok, true);
  assert.equal(getPlayer(used.state, "player").titanium, 0);
  assert.equal(used.state.temperature, 2, "a step is two degrees");
});

// Three of the eleven cards the bespoke inventory had registered as needing
// machinery we do not have. Each turned out to be expressible with keys the
// engine already had.
test("Saturn Surfing counts the floater it spends", () => {
  const id = "card-promo-saturn-surfing";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const gain = floaters => {
    const state = rig([id]);
    const seat = getPlayer(state, "player");
    seat.mc = 0;
    seat.cardResources = { [id]: floaters };
    if (!getCardActionStatus(state, card).playable) return null;
    const used = takeAction(state, id, undefined);
    const after = getPlayer(used, "player");
    return { mc: after.mc, left: after.cardResources?.[id] ?? 0 };
  };

  assert.equal(gain(0), null, "nothing to spend");
  // "Gain 1 M€ from each floater here, INCLUDING THE PAID FLOATER" -- upstream
  // writes Math.min(5, resourceCount--), so the pile is counted before the
  // spend. One floater pays one and leaves none.
  assert.deepEqual(gain(1), { mc: 1, left: 0 });
  assert.deepEqual(gain(3), { mc: 3, left: 2 });
  assert.deepEqual(gain(7), { mc: 5, left: 6 }, "and never more than five");
});

test("Mohole Lake feeds a microbe or an animal, never itself", () => {
  const id = "card-promo-mohole-lake";
  const host = ALL_CARDS.find(entry =>
    entry.id !== id &&
    (entry.resourceType ?? getCardResourceType(entry.id)) === "microbe" &&
    (entry.requirements ?? []).length === 0
  );

  const state = rig([id, host.id]);
  getPlayer(state, "player").cardResources = {};
  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION,
    playerId: "player",
    cardId: id,
    card: ALL_CARDS.find(entry => entry.id === id),
    branchIndex: 0
  });
  assert.equal(used.ok, true);
  // The card it feeds is a choice, and this card must not be among the options:
  // upstream builds the list from cards that hold microbes or animals, and
  // Mohole Lake holds neither.
  if (used.state.pendingChoice) {
    const offered = used.state.pendingChoice.options.map(option => option.cardId ?? option.id);
    assert.equal(offered.includes(id), false, "another card, not this one");
  }
  const after = getPlayer(settle(used.state), "player");
  assert.equal(after.cardResources?.[host.id] ?? 0, 1);
  assert.equal(after.cardResources?.[id] ?? 0, 0);
});

test("Ceres Tech Market pays two M€ for each card discarded", () => {
  const id = "card-prelude2-ceres-tech-market";
  const card = ALL_CARDS.find(entry => entry.id === id);

  const empty = rig([id]);
  getPlayer(empty, "player").hand = [];
  assert.equal(getCardActionStatus(empty, card).playable, false, "nothing to discard");

  const state = rig([id]);
  const seat = getPlayer(state, "player");
  seat.mc = 0;
  seat.hand = state.deck.slice(0, 3);

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  assert.equal(used.ok, true);
  // How many goes first -- a full hand asked one card at a time is forty
  // questions -- and then which cards, since the payout is fixed by the number
  // but the choice of cards is the player's.
  assert.equal(used.state.pendingChoice?.kind, "amount");

  const two = used.state.pendingChoice.options.find(option => /^2/.test(option.label));
  let settled = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: two.id
  }).state;

  let rounds = 0;
  while (settled.pendingChoice && rounds < 6) {
    const choice = settled.pendingChoice;
    const answered = executeGameCommand(settled, {
      type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: choice.options[0].id
    });
    if (!answered.ok || answered.state.pendingChoice === choice) break;
    settled = answered.state;
    rounds += 1;
  }
  assert.equal(rounds, 2, "two cards picked");
  const after = getPlayer(settled, "player");
  assert.equal(after.mc, 4, "two cards, two M€ each");
  assert.equal(after.hand.length, 1);
});

test("Asteroid Rights spends a M€ to place, or an asteroid to collect", () => {
  const id = "card-promo-asteroid-rights";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const run = branch => {
    const state = rig([id]);
    const seat = getPlayer(state, "player");
    seat.mc = 10;
    seat.titanium = 0;
    seat.mcProd = 0;
    seat.cardResources = { [id]: 3 };
    const used = takeAction(state, id, branch);
    const after = getPlayer(used, "player");
    return {
      mc: after.mc,
      mcProd: after.mcProd,
      titanium: after.titanium,
      asteroids: after.cardResources?.[id] ?? 0
    };
  };

  // "Spend 1 asteroid here to increase M€ production 1 step, OR to gain 2
  // titanium, OR spend 1 M€ to add an asteroid to ANY card."
  assert.deepEqual(run(0), { mc: 10, mcProd: 1, titanium: 0, asteroids: 2 });
  assert.deepEqual(run(1), { mc: 10, mcProd: 0, titanium: 2, asteroids: 2 });
  const placed = run(2);
  assert.equal(placed.mc, 9, "the third branch pays a M€");
  assert.ok(placed.asteroids > 3, "and puts an asteroid somewhere");
});

test("A branch that puts resources on another card asks which one", async () => {
  // Written for Local Heat Trapping alone by card id, so every other action
  // branch saying the same thing took its payment and placed nothing at all.
  // Thirteen cards declare it, and the reference asks in all of them.
  const { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } = await import("../app/official-content.js");
  const everything = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
  const affected = everything.filter(card =>
    (card.effectSpec?.action?.or?.behaviors ?? []).some(branch => branch.addResourcesToAnyCard)
  );
  assert.ok(affected.length >= 13, "the cards that place through a branch");

  for (const card of affected) {
    const branches = card.effectSpec.action.or.behaviors;
    const index = branches.findIndex(branch => branch.addResourcesToAnyCard);
    const placing = branches[index].addResourcesToAnyCard;
    // A branch that names no resource type and demands an eligible card --
    // Applied Science's does both -- has nothing to place when none is in play,
    // and placing nothing is then the right answer.
    if (!placing.type && placing.mustHaveCard) continue;

    const state = rig();
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.titanium = 20;
    seat.heat = 20;
    const host = ALL_CARDS.find(entry =>
      entry.id !== card.id &&
      (entry.resourceType ?? getCardResourceType(entry.id)) === String(placing.type).toLowerCase()
    );
    seat.playedProjects = [card.id, ...(host ? [host.id] : [])];
    seat.selectedPreludeIds = [card.id];
    seat.cardResources = { [card.id]: 5 };

    const used = executeGameCommand(state, {
      type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: card.id, card
    });
    if (!used.ok) continue;

    let settled = used.state;
    if (settled.pendingChoice?.kind === "effect-branch") {
      const option = settled.pendingChoice.options.find(entry => Number(entry.id) === index);
      if (!option) continue;
      settled = executeGameCommand(settled, {
        type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: option.id
      }).state;
    }

    // Either it asks where the resources go, or there was exactly one legal card
    // and they went there. What must not happen is neither. The total across
    // every card is what says they landed: a branch that spends from this card
    // to place elsewhere moves resources rather than adding them.
    const asked = settled.pendingChoice?.kind === "any-card-resource";
    const after = getPlayer(settled, "player").cardResources ?? {};
    const landed = Object.entries(after).some(
      ([cardId, count]) => cardId !== card.id && count > 0
    );
    assert.ok(
      asked || landed,
      `${card.id}: paid for the branch and placed nothing`
    );
  }
});

test("A prelude's action is offered, not just a project's", async () => {
  // The engine knew these actions and nothing listed them: the UI walked
  // playedProjects, and the bot required type "active", which a prelude never
  // is. Four prelude actions were unreachable through either.
  const { getLegalCommands } = await import("../app/game-command.js");
  const withActions = PRELUDES.filter(prelude => prelude.effectSpec?.action);
  assert.ok(withActions.length >= 4, "preludes that carry an action");

  const id = "card-prelude2-floating-trade-hub";
  const state = rig();
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.setupStep = "complete";
  seat.corporationId = null;
  seat.mc = 50;
  seat.actionsRemaining = 2;
  seat.selectedPreludeIds = [id];
  seat.playedProjects = [];
  seat.cardResources = { [id]: 3 };
  seat.hand = [];

  const offered = getLegalCommands(state, "player")
    .filter(command => command.type === COMMAND.USE_CARD_ACTION)
    .map(command => command.cardId);
  assert.ok(offered.includes(id), "the prelude's action is on the list");
});

test("Arcadian Communities places its first community anywhere", async () => {
  const { applyCorporation, applyCorporationInitialAction, resolvePendingChoice } =
    await import("../app/game-logic.js");
  const id = "card-promo-arcadian-communities";

  const state = rig();
  state.currentPlayerId = "player";
  getPlayer(state, "player").corporationOptions = [id];
  const seated = applyCorporation(state, id, "player");
  const started = getPlayer(seated, "player");
  assert.equal(started.mc, 40);
  assert.equal(started.steel, 10);

  seated.currentPlayerId = "player";
  const opened = applyCorporationInitialAction(seated, seated.logs);
  assert.equal(opened.state.pendingChoice?.kind, "land-claim");
  // The first community has nothing to be adjacent to, so every free square is
  // on offer.
  assert.ok(opened.state.pendingChoice.options.length > 40);

  const placed = resolvePendingChoice(
    opened.state, opened.state.pendingChoice.options[0].id, opened.state.logs, "player"
  );
  const marker = (placed.state.boardMarkers ?? []).find(entry => entry.sourceCardId === id);
  assert.ok(marker, "a community is on the board");
});

test("Its later communities go beside a tile or marker of its own", () => {
  const id = "card-promo-arcadian-communities";
  const attempt = withTile => {
    const state = rig();
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = id;
    seat.mc = 50;
    seat.actionsRemaining = 2;
    seat.playedProjects = [];
    if (withTile) {
      const free = Object.values(state.board).find(
        cell => cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor
      );
      state.board[`${free.q},${free.r}`] = { ...free, tileType: "city", placedBy: "player" };
    }
    return executeGameCommand(state, { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  };

  assert.equal(attempt(false).ok, false, "nothing of its own to build beside");
  const used = attempt(true);
  assert.equal(used.ok, true);
  assert.equal(used.state.pendingChoice?.kind, "land-claim");
  // Only the squares touching its city, not the whole board.
  assert.ok(used.state.pendingChoice.options.length <= 6);
});

test("Building on your own community pays three M€", async () => {
  const { placeTileAt } = await import("../app/game-logic.js");
  const id = "card-promo-arcadian-communities";
  const build = sourceCardId => {
    const state = rig();
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.corporationId = id;
    seat.mc = 0;
    const free = Object.values(state.board).find(
      cell => cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor
    );
    state.boardMarkers = [{
      id: "marker",
      kind: "land-claim",
      cellKey: `${free.q},${free.r}`,
      sourceCardId,
      sourcePlayerId: "player"
    }];
    placeTileAt(state, free, "city", "player");
    return getPlayer(state, "player").mc;
  };

  // Only a community pays. A Land Claim marker reserves the space and nothing
  // more, and the two are the same kind of marker.
  assert.ok(build(id) >= 3, "the community pays three");
  assert.equal(build(id) - build("card-base-land-claim"), 3);
});

test("Astrodrill offers three things, and the third only when it can pay", () => {
  const id = "card-promo-astrodrill";
  const other = ALL_CARDS.find(card => card.resourceType === "asteroid");
  const start = held => {
    const state = rig([other.id]);
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = id;
    seat.mc = 50;
    seat.titanium = 0;
    seat.actionsRemaining = 2;
    seat.cardResources = { [id]: held, [other.id]: 0 };
    return state;
  };

  const empty = executeGameCommand(start(0), { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  assert.deepEqual(empty.state.pendingChoice.options.map(o => o.id), ["add", "standard"]);

  const stocked = executeGameCommand(start(2), { type: COMMAND.CORPORATION_ACTION, playerId: "player" });
  assert.deepEqual(stocked.state.pendingChoice.options.map(o => o.id), ["add", "standard", "titanium"]);

  // "Remove an asteroid resource from this card to gain 3 titanium."
  const sold = executeGameCommand(stocked.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "titanium"
  });
  const after = getPlayer(sold.state, "player");
  assert.equal(after.cardResources[id], 1);
  assert.equal(after.titanium, 3);

  // "Add an asteroid resource to ANY card."
  const placing = executeGameCommand(
    executeGameCommand(start(2), { type: COMMAND.CORPORATION_ACTION, playerId: "player" }).state,
    { type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "add" }
  );
  const placed = getPlayer(settle(placing.state), "player").cardResources ?? {};
  assert.ok(
    (placed[other.id] ?? 0) > 0 || (placed[id] ?? 0) > 2,
    "the asteroid landed on some card"
  );
});

test("Focused Organization trades a card and a resource for one of each", () => {
  // "Discard 1 card and spend 1 standard resource to draw 1 card and gain 1
  // standard resource." Four questions in a row: what to spend, what to
  // discard, and -- after the draw -- what to gain.
  const id = "card-prelude2-focused-organization";
  const card = PRELUDES.find(entry => entry.id === id);
  const start = (steel, handSize) => {
    const state = rig();
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = null;
    seat.mc = 0;
    seat.steel = steel;
    seat.titanium = 0;
    seat.plants = 0;
    seat.energy = 0;
    seat.heat = 0;
    seat.actionsRemaining = 2;
    seat.selectedPreludeIds = [id];
    seat.playedProjects = [];
    seat.hand = state.deck.slice(0, handSize);
    return state;
  };

  assert.equal(getCardActionStatus(start(0, 2), card).playable, false, "nothing to spend");
  assert.equal(getCardActionStatus(start(3, 0), card).playable, false, "nothing to discard");

  const state = start(3, 2);
  let step = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  assert.equal(step.state.pendingChoice?.kind, "focused-organization");
  // Only what the player actually holds is on offer.
  assert.deepEqual(step.state.pendingChoice.options.map(o => o.id), ["steel"]);

  let settled = executeGameCommand(step.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "steel"
  }).state;
  assert.equal(settled.pendingChoice?.kind, "discard-card");

  settled = executeGameCommand(settled, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: settled.pendingChoice.options[0].id
  }).state;
  assert.equal(settled.pendingChoice?.kind, "standard-resource");

  const done = executeGameCommand(settled, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "heat"
  });
  const after = getPlayer(done.state, "player");
  assert.equal(after.steel, 2, "one steel paid");
  assert.equal(after.heat, 1, "one heat gained");
  assert.equal(after.hand.length, 2, "one discarded and one drawn");
});

test("Venus Shuttles costs a M€ less for each Venus tag you hold", () => {
  // "Spend 12 M€ to raise Venus 1 step. This cost is REDUCED BY 1 FOR EACH
  // VENUS TAG you have." The card carries a Venus tag itself, so it never
  // actually costs twelve.
  const id = "card-prelude2-venus-shuttles";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const play = (extraTags, mc) => {
    const state = rig([id]);
    state.phase = "action";
    state.currentPlayerId = "player";
    state.venus = 0;
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = null;
    seat.mc = mc;
    seat.actionsRemaining = 2;
    const carriers = ALL_CARDS.filter(entry =>
      entry.id !== id && (entry.tags ?? []).filter(tag => tag === "Venus").length === 1
    ).slice(0, extraTags);
    seat.playedProjects = [id, ...carriers.map(entry => entry.id)];
    const status = getCardActionStatus(state, card);
    if (!status.playable) return null;
    const before = getPlayer(state, "player").mc;
    const used = executeGameCommand(state, {
      type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
    });
    return {
      paid: before - getPlayer(used.state, "player").mc,
      venus: used.state.venus,
      tr: getPlayer(used.state, "player").tr
    };
  };

  const alone = play(0, 20);
  assert.equal(alone.paid, 11, "its own Venus tag takes one off");
  assert.equal(alone.venus, 2, "a step is two percent");
  assert.equal(play(3, 20).paid, 8, "three more tags take three more off");
  assert.equal(play(0, 5), null, "and it cannot be used without the money");
});

test("Titan Floating Launch-Pad buys a trade with a floater", () => {
  // "Add 1 floater to a Jovian card, or remove 1 floater here to trade for
  // free." The colony pays what it owes and nothing is taken from the player.
  const id = "card-colonies-titan-floating-launch-pad";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const start = held => {
    const state = rig([id]);
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = null;
    seat.mc = 0;
    seat.heat = 0;
    seat.hand = [];
    seat.actionsRemaining = 2;
    seat.cardResources = { [id]: held };
    for (const tile of state.colonies.tilesInPlay) {
      state.colonies.tiles[tile].trackPosition = 3;
    }
    return state;
  };

  // Without a floater there is nothing to spend, so only the other half stands.
  const broke = executeGameCommand(start(0), {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  assert.deepEqual(broke.state.pendingChoice.options.map(o => o.id), ["add"]);

  const used = executeGameCommand(start(2), {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  assert.deepEqual(used.state.pendingChoice.options.map(o => o.id), ["add", "trade"]);

  const picking = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "trade"
  }).state;
  assert.equal(picking.pendingChoice?.kind, "colony-placement");

  const traded = executeGameCommand(picking, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: picking.pendingChoice.options[0].id
  });
  const after = getPlayer(traded.state, "player");
  assert.equal(after.cardResources[id], 1, "one floater bought the trade");
  assert.equal(after.mc, 0, "and nothing else was taken");
  // Whatever the colony pays, it paid something.
  const gained = ["mc", "steel", "titanium", "plants", "energy", "heat"]
    .reduce((sum, field) => sum + (after[field] ?? 0), 0) + after.hand.length;
  assert.ok(gained > 0, "the colony paid what it owed");
});

test("A card action does not replay the card's play effect", () => {
  // The follow-up after a resolved choice read the card's PLAY behaviour, so
  // every action that raised a question handed out the card's own play effect
  // again. Titan Floating Launch-Pad gave two more floaters each time.
  const id = "card-colonies-titan-floating-launch-pad";
  const card = ALL_CARDS.find(entry => entry.id === id);
  const state = rig([id]);
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.setupStep = "complete";
  seat.corporationId = null;
  seat.mc = 0;
  seat.hand = [];
  seat.actionsRemaining = 2;
  seat.cardResources = { [id]: 2 };
  for (const tile of state.colonies.tilesInPlay) {
    state.colonies.tiles[tile].trackPosition = 3;
  }

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  const picking = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "trade"
  }).state;
  const done = executeGameCommand(picking, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: picking.pendingChoice.options[0].id
  });
  // Two floaters, one spent: one left. Not three.
  assert.equal(getPlayer(done.state, "player").cardResources[id], 1);
});

test("Board of Directors draws a prelude, to discard or to pay for", () => {
  // "Draw 1 prelude card: either discard it, or pay 12 M€ and remove 1 director
  // resource here to play it." The last of the cards whose action lived only in
  // its text.
  const id = "card-prelude2-board-of-directors";
  const card = PRELUDES.find(entry => entry.id === id);
  const start = (mc, directors) => {
    const state = rig();
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.corporationId = null;
    seat.mc = mc;
    seat.mcProd = 0;
    seat.actionsRemaining = 2;
    seat.selectedPreludeIds = [id];
    seat.playedProjects = [];
    seat.cardResources = { [id]: directors };
    // A prelude whose effect is easy to read on top of the deck.
    state.preludeDeck = [
      "prelude-allied-banks",
      ...state.preludeDeck.filter(entry => entry !== "prelude-allied-banks")
    ];
    return state;
  };

  assert.equal(getCardActionStatus(start(50, 0), card).playable, false, "no director to spend");

  const state = start(50, 4);
  const deckBefore = state.preludeDeck.length;
  const drawn = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: id, card
  });
  assert.equal(drawn.state.pendingChoice?.kind, "board-of-directors");
  assert.equal(drawn.state.preludeDeck.length, deckBefore - 1, "the prelude left the deck");

  // Discarding costs nothing but the action.
  const thrown = executeGameCommand(drawn.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "discard"
  });
  assert.equal(getPlayer(thrown.state, "player").mc, 50);
  assert.equal(getPlayer(thrown.state, "player").cardResources[id], 4);

  // Playing it costs 12 M€ and a director, and the prelude happens.
  const played = executeGameCommand(drawn.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "play"
  });
  const after = getPlayer(played.state, "player");
  assert.equal(after.cardResources[id], 3, "one director spent");
  assert.equal(after.mcProd, 4, "Allied Banks raised M€ production four steps");
  assert.equal(after.mc, 50 - 12 + 3, "twelve paid, and its three gained");
});

test("Preservation Program eats the first TR of each generation's action phase", () => {
  const id = "card-prelude2-preservation-program";

  const start = () => {
    const state = getInitialState({ playerCount: 2, prelude: true, seed: 4 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.setupStep = "complete";
    seat.selectedPreludeIds = [id];
    armPreservationProgram(state);
    return state;
  };

  const state = start();
  const base = getPlayer(state, "player").tr;

  increaseTerraformRating(state, "player", 1, "card");
  assert.equal(getPlayer(state, "player").tr, base, "the first rating is cancelled");

  increaseTerraformRating(state, "player", 1, "card");
  assert.equal(getPlayer(state, "player").tr, base + 1, "the second one lands");

  // Only one step of a multi-step raise is eaten, not the whole raise.
  armPreservationProgram(state);
  increaseTerraformRating(state, "player", 3, "card");
  assert.equal(getPlayer(state, "player").tr, base + 3, "three steps became two");

  // Upstream gates on the action phase, so production neither spends the block
  // nor is stopped by it.
  armPreservationProgram(state);
  state.phase = "production";
  const held = getPlayer(state, "player").tr;
  increaseTerraformRating(state, "player", 1, "card");
  assert.equal(getPlayer(state, "player").tr, held + 1, "production is not blocked");
  assert.equal(getPlayer(state, "player").preservationProgram, true, "and did not spend it");

  // A player without the prelude is untouched.
  const other = getInitialState({ playerCount: 2, prelude: true, seed: 4 });
  other.phase = "action";
  armPreservationProgram(other);
  const plain = getPlayer(other, "player").tr;
  increaseTerraformRating(other, "player", 1, "card");
  assert.equal(getPlayer(other, "player").tr, plain + 1);
});

test("Arctic Algae gains 2 plants for an ocean laid by anyone", () => {
  const id = "card-base-arctic-algae";
  const state = getInitialState({ playerCount: 2, seed: 4 });
  state.phase = "action";
  const me = state.players[0].id;
  const foe = state.players[1].id;
  getPlayer(state, me).playedProjects = [id];
  getPlayer(state, me).plants = 0;

  const free = Object.values(state.board).filter(c => c.isOceanOnly && c.tileType === "empty");

  placeTileAt(state, free[0], "ocean", foe);
  assert.equal(getPlayer(state, me).plants, 2, "an opponent's ocean pays");

  placeTileAt(state, free[1], "ocean", me);
  assert.equal(getPlayer(state, me).plants, 4, "and so does your own");

  // The World Government keeps the placement's own bonuses, but the rules name
  // Arctic Algae as a card its tile still triggers.
  placeTileAt(state, free[2], "ocean", null, null, { worldGovernment: true });
  assert.equal(getPlayer(state, me).plants, 6, "the World Government's ocean triggers it too");

  // A greenery is not an ocean.
  const land = Object.values(state.board).find(c => !c.isOceanOnly && c.tileType === "empty");
  placeTileAt(state, land, "greenery", foe);
  assert.equal(getPlayer(state, me).plants, 6, "only oceans");
});

test("every card a player can be dealt says what it does", () => {
  // Nineteen cards rendered a blank rules box: the generator emitted names for
  // ids outside full-card-catalog.js but not their effect text, so a player was
  // dealt a card with nothing written on it.
  const blank = ALL_CARDS.filter(card => !(JAPANESE_TEXT[card.id]?.effectText ?? "").trim());
  assert.deepEqual(blank.map(card => card.id), [], "these cards render an empty rules box");
});

// Six corporations shipped with nothing but their starting money: their
// effects object was empty, so the engine had nothing to read and the ability
// printed on the card simply never happened. The card could be chosen, and then
// did nothing for the rest of the game.

test("Lakefront Resorts pays for every ocean and raises the adjacency bonus", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true, seed: 4 });
  state.phase = "action";
  const me = state.players[0].id;
  const foe = state.players[1].id;
  getPlayer(state, me).corporationId = "card-turmoil-lakefront-resorts";

  const oceans = Object.values(state.board).filter(c => c.isOceanOnly && c.tileType === "empty");
  placeTileAt(state, oceans[0], "ocean", foe);
  assert.equal(getPlayer(state, me).mcProd, 1, "an opponent's ocean pays too");
  placeTileAt(state, oceans[1], "ocean", me);
  assert.equal(getPlayer(state, me).mcProd, 2, "and so does your own");

  const spot = Object.values(state.board).find(cell =>
    !cell.isOceanOnly &&
    cell.tileType === "empty" &&
    getAdjacentCells(cell.q, cell.r)
      .filter(pos => state.board[`${pos.q},${pos.r}`]?.tileType === "ocean").length === 1
  );
  const before = getPlayer(state, me).mc;
  placeTileAt(state, spot, "city", me);
  assert.equal(getPlayer(state, me).mc - before, 3, "one adjacent ocean is worth 3 M€, not 2");
});

test("Aridor pays for each new tag type, not for repeats", () => {
  const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-colonies-aridor";
  seat.mcProd = 0;
  seat.seenTagTypes = [];

  const single = tag => ALL_CARDS.find(c => (c.tags ?? []).length === 1 && c.tags[0] === tag && c.type !== "event");
  const building = single("Building");
  const otherBuilding = ALL_CARDS.find(c => c !== building && (c.tags ?? []).length === 1 && c.tags[0] === "Building" && c.type !== "event");
  const science = single("Science");
  const event = ALL_CARDS.find(c => c.type === "event" && (c.tags ?? []).length > 0);
  const wild = ALL_CARDS.find(c => (c.tags ?? []).includes("Wild"));

  let view = { ...state, ...seat };
  view = applyCorporationTriggers(view, building, []).state;
  assert.equal(view.mcProd, 1, "a first Building pays");
  view = applyCorporationTriggers(view, otherBuilding, []).state;
  assert.equal(view.mcProd, 1, "a second Building does not");
  view = applyCorporationTriggers(view, science, []).state;
  assert.equal(view.mcProd, 2, "a new type does");

  // "Event cards do not count", and a wild tag is not a type of its own.
  const beforeEvent = view.mcProd;
  view = applyCorporationTriggers(view, event, []).state;
  assert.equal(view.mcProd, beforeEvent, "an event never pays");
  if (wild) {
    view = applyCorporationTriggers(view, wild, []).state;
    assert.ok(!view.seenTagTypes.includes("Wild"), "a wild tag is not a tag type");
  }
});

test("Spire collects a science resource from cards with two tags", () => {
  const state = getInitialState({ playerCount: 2, prelude: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-prelude2-spire";
  seat.cardResources = {};

  const oneTag = ALL_CARDS.find(c => (c.tags ?? []).length === 1 && c.type !== "event");
  const twoTags = ALL_CARDS.find(c => (c.tags ?? []).length === 2 && c.type !== "event");
  const oneTagEvent = ALL_CARDS.find(c => c.type === "event" && (c.tags ?? []).length === 1);

  let view = { ...state, ...seat };
  view = applyCorporationTriggers(view, oneTag, []).state;
  assert.equal(view.cardResources["card-prelude2-spire"] ?? 0, 0, "one tag is not enough");
  view = applyCorporationTriggers(view, twoTags, []).state;
  assert.equal(view.cardResources["card-prelude2-spire"], 1, "two tags pay");
  // An event counts as one tag more than it prints.
  view = applyCorporationTriggers(view, oneTagEvent, []).state;
  assert.equal(view.cardResources["card-prelude2-spire"], 2, "a one-tag event counts as two");
});

test("Philares pays for a new adjacency whoever placed the tile", () => {
  const rig = () => {
    const state = getInitialState({ playerCount: 2, promo: true, seed: 4 });
    state.phase = "action";
    getPlayer(state, state.players[0].id).corporationId = "card-promo-philares";
    let first = null;
    let neighbourKey = null;
    for (const cell of Object.values(state.board)) {
      if (cell.isOceanOnly || cell.tileType !== "empty") continue;
      for (const pos of getAdjacentCells(cell.q, cell.r)) {
        const key = `${pos.q},${pos.r}`;
        const neighbour = state.board[key];
        if (neighbour && neighbour.tileType === "empty" && !neighbour.isOceanOnly) {
          first = cell;
          neighbourKey = key;
          break;
        }
      }
      if (first) break;
    }
    return { state, first, neighbourKey };
  };

  const me = "player";
  const foe = "player2";

  // The owner places next to an opponent's tile.
  const a = rig();
  placeTileAt(a.state, a.first, "city", foe);
  assert.equal(a.state.pendingChoice, null, "one tile alone is not an adjacency");
  placeTileAt(a.state, a.state.board[a.neighbourKey], "city", me);
  assert.equal(a.state.pendingChoice?.kind, "standard-resource");
  assert.equal(a.state.pendingChoice.ownerPlayerId, me);

  // The opponent places next to the owner's tile: same payout, and it goes to
  // the owner rather than to whoever placed.
  const b = rig();
  placeTileAt(b.state, b.first, "city", me);
  placeTileAt(b.state, b.state.board[b.neighbourKey], "city", foe);
  assert.equal(b.state.pendingChoice?.ownerPlayerId, me, "the owner is asked, not the placer");
  // The seat still belongs to the opponent who placed. They may not answer a
  // question that is not theirs, and when the owner does, the resource follows
  // the owner rather than whoever's turn it happens to be.
  b.state.currentPlayerId = foe;
  const before = getPlayer(b.state, me).steel;
  const foeBefore = getPlayer(b.state, foe).steel;
  const refused = resolvePendingChoice(b.state, "steel", [], foe);
  assert.equal(refused.status, "pending", "the placer cannot answer the owner's question");
  const resolved = resolvePendingChoice(b.state, "steel", [], me);
  assert.equal(getPlayer(resolved.state, me).steel, before + 1, "the owner gains it");
  assert.equal(getPlayer(resolved.state, foe).steel, foeBefore, "the placer does not");
});

test("Neptunian Power Consultants offers its ocean deal only when affordable", () => {
  const id = "card-promo-neptunian-power-consultants";
  const rig = (mc, steel) => {
    const state = getInitialState({ playerCount: 2, promo: true, seed: 4 });
    state.phase = "action";
    const seat = getPlayer(state, state.players[0].id);
    seat.playedProjects = [id];
    seat.mc = mc;
    seat.steel = steel;
    seat.energyProd = 0;
    seat.cardResources = {};
    const ocean = Object.values(state.board).find(c => c.isOceanOnly && c.tileType === "empty");
    placeTileAt(state, ocean, "ocean", state.players[1].id);
    return state;
  };

  assert.equal(rig(2, 0).pendingChoice, null, "no offer when it cannot be paid");

  const paying = rig(10, 0);
  assert.equal(paying.pendingChoice?.optional, true, "the offer may be declined");
  const paid = resolvePendingChoice(paying, "pay", [], "player");
  const after = getPlayer(paid.state, "player");
  assert.equal(after.mc, 5);
  assert.equal(after.energyProd, 1);
  assert.equal(after.cardResources[id], 1);

  // Steel covers what cash cannot, and no change is given.
  const mixed = resolvePendingChoice(rig(3, 5), "pay", [], "player");
  const spent = getPlayer(mixed.state, "player");
  assert.equal(spent.mc, 0, "cash goes first");
  assert.equal(spent.steel, 4, "one steel covers the remaining 2 M€");

  const declined = resolvePendingChoice(rig(20, 0), DECLINE_CHOICE, [], "player");
  assert.equal(getPlayer(declined.state, "player").mc, 20, "declining costs nothing");
  assert.equal(getPlayer(declined.state, "player").energyProd, 0);
});

test("Luxury Foods needs all three of its tags", () => {
  const card = ALL_CARDS.find(entry => entry.id === "card-venus-luxury-foods");
  const only = tag => ALL_CARDS.find(c => (c.tags ?? []).length === 1 && c.tags[0] === tag && c.type !== "event");
  const venus = only("Venus");
  const earth = only("Earth");
  const jovian = only("Jovian");

  const rig = played => {
    const state = getInitialState({ playerCount: 2, venus: true, seed: 4 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.playedProjects = played;
    return state;
  };

  assert.equal(getCardPlayableStatus(card, rig([])).playable, false);
  assert.equal(getCardPlayableStatus(card, rig([venus.id])).playable, false);
  assert.equal(getCardPlayableStatus(card, rig([venus.id, earth.id])).playable, false, "two of three is not enough");
  assert.equal(getCardPlayableStatus(card, rig([venus.id, earth.id, jovian.id])).playable, true);
  assert.equal(card.victoryPoints, 2);
});

test("a corporation first action that asks a question does not hang setup", () => {
  // Only two stages knew how to unpark setup after their own question, so any
  // new one -- Aridor's colony tile, Spire's discard -- left the game parked on
  // a setupContinuation that nothing would ever clear.
  const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  getPlayer(state, "player").corporationId = "card-colonies-aridor";

  const asked = applyCorporationInitialAction(state, []).state;
  assert.equal(asked.pendingChoice?.continuation?.stage, "aridor-add-colony");
  asked.setupContinuation = { stage: "prelude-setup", seatBefore: "player" };

  const answered = resolvePendingChoice(asked, asked.pendingChoice.options[0].id, [], "player");
  assert.equal(answered.state.setupContinuation, null, "setup is unparked");
  assert.equal(answered.state.pendingChoice, null);
});

test("Aridor adds a colony tile from the ones nobody is using", () => {
  const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  getPlayer(state, "player").corporationId = "card-colonies-aridor";

  const spareBefore = state.colonies.unusedTileIds.length;
  const inPlayBefore = state.colonies.tilesInPlay.length;
  assert.ok(spareBefore > 0, "the tiles that did not make the cut are kept");

  const asked = applyCorporationInitialAction(state, []).state;
  const added = resolvePendingChoice(asked, asked.pendingChoice.options[0].id, [], "player").state;
  assert.equal(added.colonies.tilesInPlay.length, inPlayBefore + 1);
  assert.equal(added.colonies.unusedTileIds.length, spareBefore - 1);
});

test("Spire draws four and discards three as its first action", () => {
  const state = getInitialState({ playerCount: 2, prelude: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-prelude2-spire";
  seat.hand = [];

  let current = applyCorporationInitialAction(state, []).state;
  assert.equal(getPlayer(current, "player").hand.length, 4, "four drawn");
  for (let i = 0; i < 3; i++) {
    assert.ok(current.pendingChoice, `still asking at discard ${i + 1}`);
    current = resolvePendingChoice(current, current.pendingChoice.options[0].id, [], "player").state;
  }
  assert.equal(getPlayer(current, "player").hand.length, 1, "three discarded");
  assert.equal(current.pendingChoice, null);
});

test("Philares places a greenery as its first action", () => {
  const state = getInitialState({ playerCount: 2, promo: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  getPlayer(state, "player").corporationId = "card-promo-philares";

  const done = applyCorporationInitialAction(state, []).state;
  assert.equal(Object.values(done.board).filter(c => c.tileType === "forest").length, 1);
  assert.equal(done.oxygen, 1, "the greenery raises oxygen");
});

test("a tile is not laid on a space something else already took", () => {
  // A question asked earlier can be answered after the space is gone. Laying a
  // city over an ocean lost that ocean while the counter kept counting it.
  const state = getInitialState({ playerCount: 2, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const ocean = Object.values(state.board).find(c => c.isOceanOnly && c.tileType === "empty");
  placeTileAt(state, ocean, "ocean", "player");

  const key = `${ocean.q},${ocean.r}`;
  const counterBefore = state.oceans;
  const stale = {
    id: "stale-tile-choice",
    kind: "tile-placement",
    ownerPlayerId: "player",
    prompt: "",
    optional: false,
    options: [{ id: key, targetCellKey: key, label: "" }],
    continuation: { sourceKind: "card", sourceId: null, stage: "tile", consumedAction: false, paid: true }
  };
  state.pendingChoice = stale;
  const after = resolvePendingChoice(state, key, [], "player").state;

  assert.equal(after.board[key].tileType, "ocean", "the ocean stays");
  assert.equal(after.oceans, counterBefore, "and the counter still matches the board");
  assert.equal(
    Object.values(after.board).filter(c => c.tileType === "ocean").length,
    after.oceans
  );
});

test("Aridor does not pay for tags that were already on the tableau", () => {
  // Upstream's bespokePlay seeds the seen-tag set from whatever is in play when
  // the corporation is chosen, so a tag that was there first is not a discovery.
  const donor = ALL_CARDS.find(c => (c.tags ?? []).length === 1 && c.type !== "event");
  const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationOptions = ["card-colonies-aridor"];
  seat.playedProjects = [donor.id];

  const chosen = applyCorporation(state, "card-colonies-aridor");
  assert.deepEqual(getPlayer(chosen, "player").seenTagTypes, donor.tags, "the tableau seeds the set");

  const after = getPlayer(chosen, "player");
  const view = { ...chosen, ...after, mcProd: 0 };
  const again = applyCorporationTriggers(view, donor, []).state;
  assert.equal(again.mcProd, 0, "a tag that was already in play pays nothing");
});

test("Lakefront Resorts' ocean bonus follows the corporation in and out of play", () => {
  // Upstream stores oceanBonus on the player in bespokePlay and puts it back to
  // 2 in onDiscard. Reading it from the corporation means both happen at once:
  // a seat without the corporation is back to the printed 2 M€.
  const rig = corporationId => {
    const state = getInitialState({ playerCount: 2, turmoil: true, seed: 4 });
    state.phase = "action";
    const me = state.players[0].id;
    // Through applyCorporation rather than by planting the id: that is the path
    // upstream's bespokePlay runs on, and staging the state skips it.
    let current = state;
    if (corporationId) {
      getPlayer(current, me).corporationOptions = [corporationId];
      current.currentPlayerId = me;
      current = applyCorporation(current, corporationId);
      current.phase = "action";
    }
    Object.assign(state, current);
    const oceans = Object.values(state.board).filter(c => c.isOceanOnly && c.tileType === "empty");
    placeTileAt(state, oceans[0], "ocean", me);
    const spot = Object.values(state.board).find(cell =>
      !cell.isOceanOnly &&
      cell.tileType === "empty" &&
      getAdjacentCells(cell.q, cell.r)
        .filter(pos => state.board[`${pos.q},${pos.r}`]?.tileType === "ocean").length === 1
    );
    const before = getPlayer(state, me).mc;
    placeTileAt(state, spot, "city", me);
    return getPlayer(state, me).mc - before;
  };

  assert.equal(rig("card-turmoil-lakefront-resorts"), 3, "3 M€ while the corporation is in play");
  assert.equal(rig(null), 2, "the printed 2 M€ without it");
});

test("a card that has an action or a discount says so", () => {
  // 57 cards carried an action or a card discount the engine ran and the text
  // never mentioned: Caretaker Contract read "requires 0°C or warmer" and said
  // nothing about spending 8 heat for a TR, Restricted Area showed a tile and
  // hid its action. They all worked. The player had no way to know.
  const silent = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS].filter(card => {
    const text = JAPANESE_TEXT[card.id]?.effectText ?? "";
    const action = Boolean(card.effectSpec?.action);
    const discount = Boolean(card.effectSpec?.cardDiscount);
    return (action && !/アクション|効果:/.test(text)) ||
           (discount && !/コスト|割引|軽減/.test(text));
  });
  assert.deepEqual(silent.map(card => card.id), [], "these cards never mention what they do");
});

test("Community Services counts itself once, not twice", () => {
  // Upstream reads "per card with no tags, INCLUDING THIS" as count + 1,
  // because its count runs before the card enters play. Ours counts after, so
  // the card is already in the tally -- carrying the +1 across as well paid for
  // it twice. Played through the real command, which is where the timing shows.
  const untagged = ALL_CARDS.filter(
    entry => (entry.tags ?? []).length === 0 &&
      entry.type !== "event" &&
      entry.id !== "card-colonies-community-services"
  );

  for (const others of [0, 2]) {
    const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.actionsRemaining = 20;
    seat.mcProd = 0;
    seat.playedProjects = untagged.slice(0, others).map(entry => entry.id);
    seat.hand = ["card-colonies-community-services"];

    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-colonies-community-services"
    });
    assert.equal(played.ok, true);
    assert.equal(
      getPlayer(played.state, "player").mcProd,
      others + 1,
      `${others} others in play, plus this card, should pay ${others + 1}`
    );
  }
});

test("Interplanetary Trade does not count its own Space tag", () => {
  // Upstream counts distinct tags with Tag.SPACE excluded: the card carries a
  // Space tag itself, and "including this" would otherwise pay for it twice.
  const card = ALL_CARDS.find(entry => entry.id === "card-promo-interplanetary-trade");
  const only = tag => ALL_CARDS.find(c => (c.tags ?? []).length === 1 && c.tags[0] === tag && c.type !== "event");

  const run = tags => {
    const state = getInitialState({ playerCount: 2, promo: true, seed: 4 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.playedProjects = tags.map(tag => only(tag)?.id).filter(Boolean);
    seat.mcProd = 0;
    return getPlayer(applyCardEffect(state, card, []).state, "player").mcProd;
  };

  assert.equal(run(["Earth", "Science"]), 2);
  assert.equal(run(["Earth", "Science", "Space"]), 2, "the Space tag adds nothing");
  assert.equal(run(["Space"]), 0);
});

test("Head Start pays for the project cards in hand", () => {
  // Upstream declares only the steel; the 2 M€ per project card comes from a
  // hand-written method, so ours handed out the steel and nothing else however
  // full the hand was. Preludes and corporations in hand are not project cards.
  for (const held of [0, 2, 4]) {
    const state = getInitialState({ playerCount: 2, prelude: true, promo: true, seed: 4 });
    for (const player of state.players) { player.setupStep = "complete"; player.researchCards = []; }
    const seat = state.players[0];
    seat.setupStep = "prelude";
    state.currentPlayerId = seat.id;
    seat.preludeOptions = ["card-promo-head-start", "prelude-biolab"];
    seat.hand = (state.deck ?? []).slice(0, held);
    seat.mc = 0;
    seat.steel = 0;

    const after = getPlayer(applyPreludes(state, ["card-promo-head-start", "prelude-biolab"], seat.id), seat.id);
    assert.equal(after.mc, held * 2, `${held} cards in hand should pay ${held * 2} M€`);
    assert.equal(after.steel, 2, "and the printed steel either way");
  }
});

test("Project Eden played from a prelude places all three tiles and finishes setup", () => {
  // Eccentric Sponsor plays a card at a discount, and that card can ask
  // questions of its own. Every builder rebuilds the continuation from its own
  // context, dropping the resume the prelude parked there, so the last answer
  // finished nothing: the player had taken both preludes and never their
  // corporation's first action, and no branch of advanceSetupTurn could move
  // setup on. Project Eden is the worst case -- it asks six times.
  const state = getInitialState({ playerCount: 2, prelude: true, colonies: true, seed: 4 });
  for (const player of state.players) { player.setupStep = "complete"; player.researchCards = []; }
  const seat = state.players[0];
  seat.setupStep = "prelude";
  state.currentPlayerId = seat.id;
  seat.preludeOptions = ["card-prelude2-project-eden", "prelude-biolab"];
  seat.hand = (state.deck ?? []).slice(0, 5);

  let current = applyPreludes(state, ["card-prelude2-project-eden", "prelude-biolab"], seat.id);
  for (let i = 0; i < 20 && current.pendingChoice; i++) {
    const choice = current.pendingChoice;
    const answered = resolvePendingChoice(current, choice.options[0].id, [], choice.ownerPlayerId);
    assert.notEqual(answered.state, current, `stalled on ${choice.continuation?.stage}`);
    current = answered.state;
  }

  const tiles = Object.values(current.board)
    .filter(cell => ["ocean", "city", "forest"].includes(cell.tileType)).length;
  assert.equal(tiles, 3, "an ocean, a city and a greenery");
  assert.equal(current.pendingChoice, null, "and nothing left unanswered");
});

test("a prelude that asks once still resumes immediately", () => {
  // The card's own steps are offered first only for the card that has them.
  // Doing it for every card left Strategic Base Planning's colony placement
  // hanging and parked setup again.
  const state = getInitialState({ playerCount: 2, prelude: true, colonies: true, seed: 4 });
  for (const player of state.players) { player.setupStep = "complete"; player.researchCards = []; }
  const seat = state.players[0];
  seat.setupStep = "prelude";
  state.currentPlayerId = seat.id;
  seat.preludeOptions = ["card-promo-strategic-base-planning", "prelude-biolab"];
  seat.mc = 50;

  let current = applyPreludes(state, ["card-promo-strategic-base-planning", "prelude-biolab"], seat.id);
  for (let i = 0; i < 20 && current.pendingChoice; i++) {
    const choice = current.pendingChoice;
    const answered = resolvePendingChoice(current, choice.options[0].id, [], choice.ownerPlayerId);
    assert.notEqual(answered.state, current, `stalled on ${choice.continuation?.stage}`);
    current = answered.state;
  }
  assert.equal(current.pendingChoice, null, "the prelude finished");
});

test("Arklight collects an animal per animal or plant tag", () => {
  const state = getInitialState({ playerCount: 2, colonies: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-colonies-arklight";
  seat.cardResources = {};

  const animalOnly = ALL_CARDS.find(c => (c.tags ?? []).includes("Animal") && !(c.tags ?? []).includes("Plant") && c.type !== "event");
  const both = ALL_CARDS.find(c => (c.tags ?? []).includes("Animal") && (c.tags ?? []).includes("Plant"));
  const neither = ALL_CARDS.find(c => !(c.tags ?? []).some(tag => tag === "Animal" || tag === "Plant") && c.type !== "event");

  let view = { ...state, ...seat };
  view = applyCorporationTriggers(view, animalOnly, []).state;
  assert.equal(view.cardResources["card-colonies-arklight"], 1);
  // A card carrying both tags pays for both.
  view = applyCorporationTriggers(view, both, []).state;
  assert.equal(view.cardResources["card-colonies-arklight"], 3);
  view = applyCorporationTriggers(view, neither, []).state;
  assert.equal(view.cardResources["card-colonies-arklight"], 3, "and nothing for other tags");
});

test("Recyclon offers the trade once two microbes are on it", () => {
  const state = getInitialState({ playerCount: 2, promo: true, seed: 4 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.corporationId = "card-promo-recyclon";
  seat.cardResources = {};
  const building = ALL_CARDS.find(c => (c.tags ?? []).includes("Building") && c.type !== "event");

  let view = { ...state, ...seat };
  for (const expected of [1, 2]) {
    view = applyCorporationTriggers(view, building, []).state;
    assert.equal(view.cardResources["card-promo-recyclon"], expected);
    assert.equal(view.pendingChoice, null, "no question below two microbes");
  }

  view = applyCorporationTriggers(view, building, []).state;
  assert.equal(view.pendingChoice?.continuation?.stage, "recyclon-microbe");

  const spent = resolvePendingChoice(view, "spend", [], "player");
  const after = getPlayer(spent.state, "player");
  assert.equal(after.cardResources["card-promo-recyclon"], 0, "both microbes go");
  assert.equal(after.plantsProd, 1, "for a plant production step");
});

test("Pristar pays only in a generation its owner did not terraform", () => {
  const run = raised => {
    const state = getInitialState({ playerCount: 2, turmoil: true, seed: 4 });
    state.phase = "action";
    const seat = getPlayer(state, "player");
    seat.corporationId = "card-turmoil-pristar";
    seat.mc = 0;
    seat.tr = 0;
    seat.mcProd = 0;
    seat.cardResources = {};
    if (raised) increaseTerraformRating(state, "player", 1, "card");
    const produced = triggerProduction(state, []);
    return getPlayer(produced.state ?? produced, "player");
  };

  const calm = run(false);
  assert.equal(calm.mc, 6, "6 M€ for a generation without terraforming");
  assert.equal(calm.cardResources["card-turmoil-pristar"], 1);

  const busy = run(true);
  assert.equal(busy.cardResources["card-turmoil-pristar"] ?? 0, 0, "nothing after raising TR");
});
