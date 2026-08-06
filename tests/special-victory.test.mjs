import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  cloneGameState,
  computeScore,
  calculateScoreBreakdowns,
  countOwnedCities,
  formatSignedVp,
  ALL_CARDS
} from "../app/game-logic.js";

function table() {
  const state = cloneGameState(getInitialState({ playerCount: 2 }));
  state.players = state.players.map(player => ({ ...player, corporationId: null }));
  return state;
}

function placeCities(state, playerId, count) {
  const land = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, count);
  for (const cell of land) {
    const key = `${cell.q},${cell.r}`;
    state.board[key] = { ...state.board[key], tileType: "city", placedBy: playerId };
  }
  return state;
}

function withCard(state, playerId, cardId, resources) {
  state.players = state.players.map(player =>
    player.id === playerId
      ? {
          ...player,
          playedProjects: [...player.playedProjects, cardId],
          cardResources: { ...player.cardResources, [cardId]: resources ?? 0 }
        }
      : player
  );
  return state;
}

test("the three special cards are tagged, and nothing else is", () => {
  const tagged = ALL_CARDS.filter(card => card.specialVictoryKind);
  assert.deepEqual(
    tagged.map(card => card.id).sort(),
    [
      "card-promo-law-suit",
      "card-promo-st-joseph-of-cupertino-mission",
      "card-promo-vermin"
    ]
  );
});

test("a breakdown sums to the same number the single-player entry point returns", () => {
  const state = placeCities(table(), "player", 2);
  const breakdowns = calculateScoreBreakdowns(state);
  for (const player of state.players) {
    assert.equal(breakdowns[player.id].total, computeScore(state, player.id));
  }
});

test("scoring does not mutate the state it reads", () => {
  const state = placeCities(table(), "player", 3);
  const before = JSON.stringify(state);
  computeScore(state, "player");
  calculateScoreBreakdowns(state);
  assert.equal(JSON.stringify(state), before);
});

test("a total below zero is reported as it stands", () => {
  const state = table();
  state.players = state.players.map(player =>
    player.id === "player" ? { ...player, tr: 0 } : player
  );
  state.scoreModifiers = Array.from({ length: 5 }, (_, index) => ({
    id: `penalty-${index}`,
    kind: "card-vp",
    sourceCardId: "card-promo-law-suit",
    sourcePlayerId: "player2",
    targetPlayerId: "player",
    points: -1,
    label: "Law Suit"
  }));

  assert.equal(computeScore(state, "player"), -5, "never clamped up to zero");
  assert.equal(formatSignedVp(-5), "-5");
  assert.equal(formatSignedVp(3), "+3");
});

test("Law Suit charges the player it names, not the one who played it", () => {
  const state = table();
  state.scoreModifiers = [
    {
      id: "law-suit:choice-1",
      kind: "card-vp",
      sourceCardId: "card-promo-law-suit",
      sourcePlayerId: "player",
      targetPlayerId: "player2",
      points: -1,
      label: "Law Suit"
    }
  ];

  const breakdowns = calculateScoreBreakdowns(state);
  assert.equal(breakdowns.player2.modifier, -1);
  assert.equal(breakdowns.player.modifier, 0);
});

test("two law suits against the same player cost two points", () => {
  const state = table();
  state.scoreModifiers = ["a", "b"].map(id => ({
    id: `law-suit:${id}`,
    kind: "card-vp",
    sourceCardId: "card-promo-law-suit",
    sourcePlayerId: "player",
    targetPlayerId: "player2",
    points: -1,
    label: "Law Suit"
  }));

  assert.equal(calculateScoreBreakdowns(state).player2.modifier, -2);
});

test("a save written before these cards existed still scores", () => {
  const legacy = table();
  delete legacy.scoreModifiers;
  delete legacy.boardMarkers;
  delete legacy.generationAttackLedger;

  assert.doesNotThrow(() => computeScore(legacy, "player"));
  const cloned = cloneGameState(legacy);
  assert.deepEqual(cloned.scoreModifiers, []);
  assert.deepEqual(cloned.boardMarkers, []);
  assert.deepEqual(cloned.generationAttackLedger, []);
});

test("a modifier survives cloning and serialisation", () => {
  const state = table();
  state.scoreModifiers = [
    {
      id: "law-suit:choice-1",
      kind: "card-vp",
      sourceCardId: "card-promo-law-suit",
      sourcePlayerId: "player",
      targetPlayerId: "player2",
      points: -1,
      label: "Law Suit"
    }
  ];

  const roundTripped = JSON.parse(JSON.stringify(cloneGameState(state)));
  assert.equal(calculateScoreBreakdowns(roundTripped).player2.modifier, -1);

  // The clone must be deep, or editing one game edits the other.
  const clone = cloneGameState(state);
  clone.scoreModifiers[0].points = -99;
  assert.equal(state.scoreModifiers[0].points, -1);
});

test("Vermin does nothing until the tenth animal arrives", () => {
  let state = placeCities(table(), "player", 2);
  state = withCard(state, "player", "card-promo-vermin", 9);

  const breakdowns = calculateScoreBreakdowns(state);
  assert.equal(breakdowns.player.cards, 0);
  assert.equal(breakdowns.player2.cards, 0);
});

test("Vermin charges every player for their own cities", () => {
  let state = table();
  state = placeCities(state, "player", 2);
  const remaining = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, 3);
  for (const cell of remaining) {
    const key = `${cell.q},${cell.r}`;
    state.board[key] = { ...state.board[key], tileType: "city", placedBy: "player2" };
  }
  state = withCard(state, "player", "card-promo-vermin", 10);

  const breakdowns = calculateScoreBreakdowns(state);
  // The owner is charged too, and only for the cities that are theirs.
  assert.equal(breakdowns.player.cards, -2);
  assert.equal(breakdowns.player2.cards, -3);
});

test("Vermin counts cities, not greeneries or oceans", () => {
  let state = table();
  const land = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, 4);
  state.board[`${land[0].q},${land[0].r}`] = {
    ...state.board[`${land[0].q},${land[0].r}`], tileType: "city", placedBy: "player"
  };
  state.board[`${land[1].q},${land[1].r}`] = {
    ...state.board[`${land[1].q},${land[1].r}`], tileType: "forest", placedBy: "player"
  };
  state.board[`${land[2].q},${land[2].r}`] = {
    ...state.board[`${land[2].q},${land[2].r}`], tileType: "ocean", placedBy: "player"
  };
  state = withCard(state, "player", "card-promo-vermin", 10);

  assert.equal(countOwnedCities(state.board, "player"), 1);
  // One city costs one point; the greenery and ocean are not cities. The
  // greenery pays its own +1 elsewhere, so the card's own line is checked
  // rather than the category total.
  const verminLine = calculateScoreBreakdowns(state).player.details.filter(
    entry => entry.sourceId === "card-promo-vermin"
  );
  assert.equal(verminLine.length, 1);
  assert.equal(verminLine[0].points, -1);
});

test("Vermin reads the board at the end, not when it triggered", () => {
  let state = placeCities(table(), "player", 1);
  state = withCard(state, "player", "card-promo-vermin", 10);
  const early = calculateScoreBreakdowns(state).player.cards;

  // placeCities fills empty land, so this adds two more on top of the first.
  const later = placeCities(cloneGameState(state), "player", 2);
  assert.equal(early, -1);
  assert.equal(countOwnedCities(later.board, "player"), 3);
  assert.equal(
    calculateScoreBreakdowns(later).player.cards,
    -3,
    "cities built after the tenth animal still count"
  );
});

test("St. Joseph pays the card holder for every cathedral built", () => {
  const state = withCard(table(), "player", "card-promo-st-joseph-of-cupertino-mission");
  state.boardMarkers = [0, 1, 2].map(index => ({
    id: `cathedral:${index},0`,
    kind: "cathedral",
    cellKey: `${index},0`,
    sourceCardId: "card-promo-st-joseph-of-cupertino-mission",
    sourcePlayerId: "player"
  }));

  assert.equal(calculateScoreBreakdowns(state).player.cards, 3);
});

test("a cathedral on someone else's city still pays its builder", () => {
  let state = table();
  const land = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, 1)[0];
  const key = `${land.q},${land.r}`;
  state.board[key] = { ...state.board[key], tileType: "city", placedBy: "player2" };
  state = withCard(state, "player", "card-promo-st-joseph-of-cupertino-mission");
  state.boardMarkers = [
    {
      id: `cathedral:${key}`,
      kind: "cathedral",
      cellKey: key,
      sourceCardId: "card-promo-st-joseph-of-cupertino-mission",
      sourcePlayerId: "player"
    }
  ];

  const breakdowns = calculateScoreBreakdowns(state);
  assert.equal(breakdowns.player.cards, 1, "the builder scores");
  assert.equal(state.board[key].placedBy, "player2", "the city keeps its owner");
  assert.equal(state.board[key].tileType, "city", "the marker does not replace the tile");
});

test("a cathedral marker survives cloning and serialisation", () => {
  const state = withCard(table(), "player", "card-promo-st-joseph-of-cupertino-mission");
  state.boardMarkers = [
    {
      id: "cathedral:2,-1",
      kind: "cathedral",
      cellKey: "2,-1",
      sourceCardId: "card-promo-st-joseph-of-cupertino-mission",
      sourcePlayerId: "player"
    }
  ];

  const roundTripped = JSON.parse(JSON.stringify(cloneGameState(state)));
  assert.equal(roundTripped.boardMarkers[0].cellKey, "2,-1");
  assert.equal(calculateScoreBreakdowns(roundTripped).player.cards, 1);
});

test("the three special cards add up together", () => {
  // Player A: three cathedrals (+3), one law suit against them (-1), two
  // cities with Vermin live (-2). The special cards cancel out exactly.
  let state = placeCities(table(), "player", 2);
  state = withCard(state, "player", "card-promo-st-joseph-of-cupertino-mission");
  state = withCard(state, "player", "card-promo-vermin", 10);
  state.boardMarkers = [0, 1, 2].map(index => ({
    id: `cathedral:${index},0`,
    kind: "cathedral",
    cellKey: `${index},0`,
    sourceCardId: "card-promo-st-joseph-of-cupertino-mission",
    sourcePlayerId: "player"
  }));
  state.scoreModifiers = [
    {
      id: "law-suit:choice-1",
      kind: "card-vp",
      sourceCardId: "card-promo-law-suit",
      sourcePlayerId: "player2",
      targetPlayerId: "player",
      points: -1,
      label: "Law Suit"
    }
  ];

  const breakdown = calculateScoreBreakdowns(state).player;
  assert.equal(breakdown.cards, 1, "+3 cathedrals, -2 vermin");
  assert.equal(breakdown.modifier, -1);
  assert.equal(breakdown.cards + breakdown.modifier, 0, "the special cards cancel");

  // The breakdown lines must agree with the totals they claim to explain.
  const summed = breakdown.details.reduce((sum, entry) => sum + entry.points, 0);
  assert.equal(summed, breakdown.total);
});

// "Remove up to N plants from any player" read state.plants, which is the
// acting player's own stock. Playing Asteroid destroyed your own plants and
// left the opponent untouched.
test("removing plants asks who loses them, and never charges the attacker", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  const [me, them] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    plants: 5,
    mc: 100,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? ["p-asteroid"] : []
  }));
  state.currentPlayerId = me;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: me,
    cardId: "p-asteroid"
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "resource-attack");
  assert.equal(
    getPlayer(played.state, me).plants,
    5,
    "nothing is taken until the victim is named"
  );

  const option = played.state.pendingChoice.options.find(
    entry => entry.targetPlayerId === them
  );
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: option.id
  });

  assert.equal(getPlayer(settled.state, me).plants, 5, "the attacker keeps theirs");
  assert.equal(getPlayer(settled.state, them).plants, 2, "the victim loses three");
});

test("an attack that lands is recorded against its generation", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const state = table();
  state.phase = "action";
  const [me, them] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    plants: 5,
    mc: 100,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? ["p-asteroid"] : []
  }));
  state.currentPlayerId = me;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "p-asteroid"
  });
  const option = played.state.pendingChoice.options.find(
    entry => entry.targetPlayerId === them
  );
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });

  assert.deepEqual(settled.state.generationAttackLedger, [
    {
      attackerPlayerId: me,
      victimPlayerId: them,
      sourceCardId: "p-asteroid",
      kind: "resource-removal",
      generation: settled.state.generation
    }
  ]);
});

test("hitting yourself is not an attack anyone can answer", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const state = table();
  state.phase = "action";
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    plants: player.id === me ? 5 : 0,
    mc: 100,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? ["p-asteroid"] : []
  }));
  state.currentPlayerId = me;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "p-asteroid"
  });
  // Only the acting player holds plants, so they are the sole legal target.
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: played.state.pendingChoice.options[0].id
  });

  assert.deepEqual(settled.state.generationAttackLedger, []);
});

test("a production attack with one legal target still happens", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  state.oxygen = 10;
  const [me, them] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    mc: 100,
    actionsRemaining: 2,
    turnStep: "start",
    plantsProd: player.id === them ? 3 : 0,
    hand: player.id === me ? ["card-base-biomass-combustors"] : []
  }));
  state.currentPlayerId = me;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-base-biomass-combustors"
  });
  assert.equal(played.state.pendingChoice?.kind, "production-attack");
  assert.equal(played.state.pendingChoice.options.length, 1);

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: played.state.pendingChoice.options[0].id
  });
  assert.equal(
    getPlayer(settled.state, them).plantsProd,
    2,
    "the only target still loses production"
  );
});

test("the attack ledger empties when the generation turns over", async () => {
  const { triggerProduction } = await import("../app/game-logic.js");

  const state = table();
  state.generationAttackLedger = [
    {
      attackerPlayerId: "player2",
      victimPlayerId: "player",
      sourceCardId: "p-asteroid",
      kind: "resource-removal",
      generation: state.generation
    }
  ];

  const next = triggerProduction(state, state.logs);
  assert.deepEqual(next.generationAttackLedger, [], "last generation's attacks expire");
});

// Asteroid raises the temperature and attacks in the same play. The threshold
// bonus the temperature crosses is paid when the attack is answered, not
// dropped because the card parked a question.
test("a card that attacks still pays its threshold bonus once resolved", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  state.temperature = -26;
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    mc: 80,
    plants: 5,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? ["p-asteroid"] : []
  }));
  state.currentPlayerId = me;

  const before = getPlayer(state, me).heatProd;
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "p-asteroid"
  });
  assert.equal(played.state.temperature, -24);
  assert.equal(played.state.pendingChoice?.kind, "resource-attack");

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: played.state.pendingChoice.options[0].id
  });
  assert.equal(
    getPlayer(settled.state, me).heatProd,
    before + 1,
    "the -24C bonus arrives with the answer"
  );
});

// Events were kept in playedProjects, so their tags counted for the rest of
// the game. Preludes were missed for the opposite reason: their tags live in
// a field nothing looked at.
test("a resolved event stops counting toward tags", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { countActiveTags, getPlayer } = await import("../app/game-logic.js");

  const event = ALL_CARDS.find(
    card =>
      card.type === "event" &&
      card.tags.some(tag => String(tag).toLowerCase() === "earth") &&
      card.cost <= 15
  );

  const state = table();
  state.phase = "action";
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    mc: 100,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? [event.id] : []
  }));
  state.currentPlayerId = me;

  const before = countActiveTags(state, me, "earth");
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: event.id
  });
  assert.equal(played.ok, true);

  const seat = getPlayer(played.state, me);
  assert.deepEqual(seat.playedEvents, [event.id], "the event goes to its own pile");
  assert.equal(seat.playedProjects.includes(event.id), false);
  assert.equal(
    countActiveTags(played.state, me, "earth"),
    before,
    "a resolved event leaves no tag behind"
  );
});

test("prelude tags count toward the cards that read them", async () => {
  const { PRELUDES } = await import("../app/game-logic.js");

  const jovian = PRELUDES.filter(prelude =>
    (prelude.tags ?? []).some(tag => String(tag).toLowerCase() === "jovian")
  );
  assert.ok(jovian.length >= 3, "the deck carries Jovian preludes");

  function score(preludeIds) {
    const state = table();
    state.players = state.players.map(player =>
      player.id === "player"
        ? {
            ...player,
            playedProjects: ["card-base-ganymede-colony"],
            selectedPreludeIds: preludeIds
          }
        : player
    );
    return computeScore(state, "player");
  }

  // Ganymede Colony scores one point per Jovian tag, its own included.
  const alone = score([]);
  assert.equal(
    score(jovian.slice(0, 3).map(prelude => prelude.id)) - alone,
    3,
    "three Jovian preludes are three more points"
  );
});

test("counting events still works whichever pile they are in", async () => {
  const { BOARD_MILESTONES } = await import("../app/board-milestones.js");

  const legend = Object.values(BOARD_MILESTONES)
    .flat()
    .find(milestone => milestone.id === "legend");
  const events = ALL_CARDS.filter(card => card.type === "event").slice(0, 5).map(c => c.id);
  const context = player => ({ player, cards: ALL_CARDS, board: {} });

  assert.equal(legend.getScore(context({ playedEvents: events, playedProjects: [] })), 5);
  assert.equal(
    legend.getScore(context({ playedEvents: [], playedProjects: events })),
    5,
    "a save written before the split still counts its events"
  );
});

test("a version 4 save gains the new fields and keeps its score", async () => {
  const { loadSavedState, serializeSavedState, CURRENT_RULES_VERSION } = await import(
    "../app/save-migration.js"
  );

  const fresh = getInitialState({ playerCount: 2 });
  assert.equal(fresh.rulesVersion, CURRENT_RULES_VERSION);

  const old = JSON.parse(JSON.stringify({ ...fresh, rulesVersion: 4 }));
  delete old.scoreModifiers;
  delete old.boardMarkers;
  delete old.generationAttackLedger;
  old.players = old.players.map(player => {
    const copy = { ...player };
    delete copy.playedEvents;
    return copy;
  });

  const loaded = loadSavedState(JSON.stringify(old));
  assert.ok(loaded, "the save still loads");
  assert.equal(loaded.rulesVersion, CURRENT_RULES_VERSION);
  assert.deepEqual(loaded.scoreModifiers, []);
  assert.deepEqual(loaded.boardMarkers, []);
  assert.deepEqual(loaded.generationAttackLedger, []);
  for (const player of loaded.players) {
    assert.deepEqual(player.playedEvents, []);
  }
  assert.equal(computeScore(loaded, "player"), computeScore(fresh, "player"));

  // And a current save round-trips unchanged.
  const round = loadSavedState(serializeSavedState(fresh));
  assert.equal(round.rulesVersion, CURRENT_RULES_VERSION);
});
