import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  getPlayer,
  getCardActionStatus,
  getAdjacentCells,
  ALL_CARDS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
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

const useAction = (state, cardId, branchIndex) => {
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

  const plants = useAction(rig([id]), id, 1);
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
  const fed = useAction(rig([id, host.id]), id, 0);
  const seat = getPlayer(fed, "player");
  assert.equal(seat.cardResources?.[id] ?? 0, 0, "the microbes never land on itself");
  assert.equal(seat.cardResources?.[host.id] ?? 0, 2);
});

test("Sulphur-Eating Bacteria trades its microbes for triple their worth", () => {
  const id = "card-venus-sulphur-eating-bacteria";

  const grown = useAction(rig([id]), id, 1);
  assert.equal(getPlayer(grown, "player").cardResources?.[id] ?? 0, 1);

  const stocked = rig([id]);
  getPlayer(stocked, "player").cardResources = { [id]: 3 };
  const sold = useAction(stocked, id, 0);
  const seat = getPlayer(sold, "player");
  assert.equal(seat.mc - 100, 3, "a microbe is worth three");
  assert.equal(seat.cardResources?.[id] ?? 0, 2, "and one microbe paid for it");
});

test("Jupiter Floating Station pays a M€ per floater, and never more than four", () => {
  const id = "card-colonies-jupiter-floating-station";
  const gain = floaters => {
    const state = rig([id]);
    getPlayer(state, "player").cardResources = { [id]: floaters };
    return getPlayer(useAction(state, id, 1), "player").mc - 100;
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
    return getPlayer(useAction(state, id, undefined), "player").mc - 100;
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
