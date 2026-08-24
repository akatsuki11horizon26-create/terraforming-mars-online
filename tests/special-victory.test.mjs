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
      resource: "plants",
      amount: 3,
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

// Vitor pays for the victory point icon printed on a card. Most dynamic VP
// cards carry victoryPoints 0 and describe themselves in victoryPointSpec, so
// reading the number alone silently skipped 34 of them.
test("Vitor pays for a printed victory point icon, however it is scored", async () => {
  const { hasPositiveVpIcon } = await import("../app/game-logic.js");

  const card = id => ALL_CARDS.find(entry => entry.id === id);
  assert.equal(hasPositiveVpIcon(card("card-base-birds")), true, "one point per animal");
  assert.equal(hasPositiveVpIcon(card("card-base-ants")), true, "one point per two microbes");
  assert.equal(hasPositiveVpIcon(card("p-capital")), true, "one point per adjacent ocean");
  assert.equal(
    hasPositiveVpIcon(card("card-promo-st-joseph-of-cupertino-mission")),
    true,
    "cathedrals print a positive icon"
  );

  // These two print negative icons, so they earn Vitor nothing.
  assert.equal(hasPositiveVpIcon(card("card-promo-law-suit")), false);
  assert.equal(hasPositiveVpIcon(card("card-promo-vermin")), false);

  const plain = ALL_CARDS.find(
    entry => !entry.victoryPoints && !entry.victoryPointSpec && !entry.specialVictoryKind
  );
  assert.equal(hasPositiveVpIcon(plain), false);
});

test("Vitor's discount reaches a dynamic victory point card", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const birds = ALL_CARDS.find(entry => entry.id === "card-base-birds");
  const state = table();
  state.phase = "action";
  state.oxygen = 14;
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    corporationId: player.id === me ? "corp-vitor" : null,
    mc: 200,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === me ? [birds.id] : []
  }));
  state.currentPlayerId = me;

  const before = getPlayer(state, me).mc;
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: birds.id
  });
  assert.equal(played.ok, true);
  assert.equal(
    before - getPlayer(played.state, me).mc,
    birds.cost - 3,
    "the card costs three less than printed"
  );
});

// The bot answered choices by calling resolvePendingChoice directly, which
// skips everything COMMAND.RESOLVE_PENDING does: the deferred action spend,
// the corporation triggers and the threshold bonuses.
test("a bot answering a choice spends the action and collects the bonus", async () => {
  const engine = await import("../app/game-logic.js");
  const { applyBotMove, resolveBotChoices } = await import("../app/bot-player.js");
  const { getPlayer } = engine;

  const state = table();
  state.phase = "action";
  state.temperature = -26;
  const [bot] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    mc: 100,
    plants: 5,
    actionsRemaining: 2,
    turnStep: "start",
    hand: player.id === bot ? ["p-asteroid"] : []
  }));
  state.currentPlayerId = bot;

  const applied = applyBotMove(engine, state, bot, { kind: "play", card: { id: "p-asteroid" } }, state.logs);
  assert.equal(
    applied.actionSpent,
    false,
    "a parked choice means the action is not spent yet"
  );
  assert.equal(getPlayer(applied.state, bot).actionsRemaining, 2);

  const settled = resolveBotChoices(engine, applied.state, bot, () => 0);
  assert.equal(
    getPlayer(settled, bot).actionsRemaining,
    1,
    "answering spends it exactly once"
  );
  assert.equal(
    getPlayer(settled, bot).heatProd,
    1,
    "and pays the -24C threshold bonus the play crossed"
  );
});

// The final screen summed fixed victoryPoints over playedProjects while the
// total beside it came from computeScore, so dynamic VP, preludes, milestones
// and awards were all missing from the breakdown that claimed to explain it.
test("every category of the breakdown adds up to the total shown", () => {
  const state = table();
  const land = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, 2);
  state.board[`${land[0].q},${land[0].r}`] = {
    ...state.board[`${land[0].q},${land[0].r}`], tileType: "city", placedBy: "player"
  };
  state.board[`${land[1].q},${land[1].r}`] = {
    ...state.board[`${land[1].q},${land[1].r}`], tileType: "forest", placedBy: "player"
  };
  state.players = state.players.map(player =>
    player.id === "player"
      ? {
          ...player,
          playedProjects: ["card-base-birds", "card-base-ganymede-colony"],
          cardResources: { "card-base-birds": 4 },
          selectedPreludeIds: ["card-prelude2-nobel-prize"]
        }
      : player
  );
  state.scoreModifiers = [
    {
      id: "law-suit:x",
      kind: "card-vp",
      sourceCardId: "card-promo-law-suit",
      sourcePlayerId: "player2",
      targetPlayerId: "player",
      points: -1,
      label: "Law Suit"
    }
  ];

  const breakdown = calculateScoreBreakdowns(state).player;
  const categories =
    breakdown.tr +
    breakdown.board +
    breakdown.cards +
    breakdown.milestones +
    breakdown.awards +
    breakdown.modifier;

  assert.equal(categories, breakdown.total, "the categories are the total");
  assert.equal(breakdown.total, computeScore(state, "player"), "and match the headline");

  // Four points of birds, one Jovian tag, a prelude's two, less the law suit.
  assert.equal(breakdown.cards, 7);
  assert.equal(breakdown.modifier, -1);
});

// ---------------------------------------------------------------------------
// Card effects: the three promos, and the seven attacks that feed Law Suit.
// ---------------------------------------------------------------------------

// The last column is whether the attacker GAINS what the victim loses. Sabotage
// says "Remove up to 3 titanium from any player, or 4 steel, or 7 M€" -- the
// resources go back to the supply, the same as Virus, and the saboteur takes
// nothing. It was listed as a theft.
const STEAL_CARDS = [
  ["card-base-hired-raiders", "steel", 2, true],
  ["card-base-sabotage", "titanium", 3, false],
  ["card-base-virus", "plants", 5, false],
  ["card-colonies-air-raid", "mc", 5, true]
  // Special Permit needs the Greens ruling, which is a Turmoil precondition
  // rather than anything about the attack; it is covered by the spec test below.
];

function attackTable(cardId, overrides = {}) {
  const state = table();
  state.phase = "action";
  state.oxygen = 14;
  state.temperature = 8;
  state.oceans = 5;
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player,
    mc: 100, steel: 9, titanium: 9, plants: 9, heat: 9, energy: 9,
    actionsRemaining: 2, turnStep: "start",
    ...overrides,
    hand: player.id === me ? [cardId] : []
  }));
  state.currentPlayerId = me;
  return [state, me, state.players[1].id];
}

for (const [cardId, resource, amount, steals] of STEAL_CARDS) {
  test(`${cardId} takes ${amount} ${resource} from a chosen player`, async () => {
    const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
    const { getPlayer } = await import("../app/game-logic.js");

    const [state, me, them] = attackTable(cardId);
    const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId });
    assert.equal(played.ok, true, `${cardId} is playable`);
    assert.equal(played.state.pendingChoice?.kind, "resource-steal");

    const option = played.state.pendingChoice.options.find(
      entry => entry.targetPlayerId === them && entry.resource === resource
    );
    assert.ok(option, `${cardId} offers ${resource}`);

    const attackerBefore = getPlayer(played.state, me)[resource];
    const victimBefore = getPlayer(played.state, them)[resource];
    const settled = executeGameCommand(played.state, {
      type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
    });

    assert.equal(
      getPlayer(settled.state, them)[resource],
      victimBefore - amount,
      "the victim pays"
    );
    if (steals) {
      assert.equal(
        getPlayer(settled.state, me)[resource],
        attackerBefore + amount,
        "and the attacker receives it"
      );
    }

    const ledger = settled.state.generationAttackLedger;
    assert.equal(ledger.length, 1);
    assert.deepEqual(
      { ...ledger[0], generation: undefined },
      {
        attackerPlayerId: me,
        victimPlayerId: them,
        sourceCardId: cardId,
        kind: "resource-removal",
        resource,
        amount,
        generation: undefined
      }
    );
  });
}

test("Comet for Venus only reaches players holding a Venus tag", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const venusCard = ALL_CARDS.find(
    card => card.tags.some(tag => String(tag).toLowerCase() === "venus") && card.type !== "event"
  );

  // Nobody holds a Venus tag: no target, so no question and no ledger entry.
  const [bare, meBare] = attackTable("card-venus-comet-for-venus");
  const none = executeGameCommand(bare, {
    type: COMMAND.PLAY_CARD, playerId: meBare, cardId: "card-venus-comet-for-venus"
  });
  assert.equal(none.state.pendingChoice, null);
  assert.deepEqual(none.state.generationAttackLedger, []);

  const [state, me, them] = attackTable("card-venus-comet-for-venus");
  state.players = state.players.map(player =>
    player.id === them ? { ...player, playedProjects: [venusCard.id] } : player
  );
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-venus-comet-for-venus"
  });
  assert.equal(played.state.pendingChoice?.kind, "resource-steal");
  assert.equal(played.state.pendingChoice.options.length, 1, "only the tagged player");

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: played.state.pendingChoice.options[0].id
  });
  assert.equal(getPlayer(settled.state, them).mc, 96);
});

test("Flooding may be declined, and declining leaves no grievance", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer, getAdjacentCells, DECLINE_CHOICE } = await import("../app/game-logic.js");

  function floodTable() {
    const [state, me, them] = attackTable("card-base-flooding");
    const ocean = Object.values(state.board).find(
      cell => cell.isOceanOnly && cell.tileType === "empty"
    );
    const beside = getAdjacentCells(ocean.q, ocean.r)
      .map(pos => state.board[`${pos.q},${pos.r}`])
      .find(cell => cell && cell.tileType === "empty" && !cell.isOceanOnly);
    state.board[`${beside.q},${beside.r}`] = {
      ...beside, tileType: "city", placedBy: them
    };
    return [state, me, them, ocean];
  }

  const [state, me, them, ocean] = floodTable();
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-base-flooding"
  });
  // The ocean is placed first, then the optional attack is offered.
  const placement = played.state.pendingChoice.options.find(
    entry => entry.targetCellKey === `${ocean.q},${ocean.r}`
  );
  const placed = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: placement.id
  });
  assert.equal(placed.state.pendingChoice?.kind, "resource-steal");
  assert.equal(placed.state.pendingChoice.optional, true, "the card says 取り除いてもよい");

  const declined = executeGameCommand(placed.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: DECLINE_CHOICE
  });
  assert.equal(getPlayer(declined.state, them).mc, 100, "nothing was taken");
  assert.deepEqual(declined.state.generationAttackLedger, [], "so nobody was attacked");

  // Taking it does record.
  const taken = executeGameCommand(placed.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: placed.state.pendingChoice.options[0].id
  });
  assert.equal(getPlayer(taken.state, them).mc, 96);
  assert.equal(taken.state.generationAttackLedger.length, 1);
});

test("a victim holding none of the resource is never offered or recorded", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [state, me] = attackTable("card-base-hired-raiders", { steel: 0, mc: 0 });
  state.players = state.players.map(player =>
    player.id === me ? { ...player, mc: 100 } : player
  );
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-base-hired-raiders"
  });
  assert.equal(played.state.pendingChoice, null, "there is nobody worth asking about");
  assert.deepEqual(played.state.generationAttackLedger, []);
});

// ---------------------------------------------------------------------------
// Virus: "任意のカードから動物2個、または任意のプレイヤーから植物5個".
// The animal half targets a card, so it needs the resource-type metadata that
// `card-resource-types.js` already carries for the adding direction.
// ---------------------------------------------------------------------------

const VIRUS = "card-base-virus";

// Puts an animal-holding card in front of `playerId` with `amount` on it.
function withAnimals(state, playerId, cardId, amount) {
  return {
    ...state,
    players: state.players.map(player =>
      player.id === playerId
        ? {
            ...player,
            playedProjects: [...player.playedProjects, cardId],
            cardResources: { ...player.cardResources, [cardId]: amount }
          }
        : player
    )
  };
}

test("Virus offers animals on any player's card alongside the plant half", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [bare, me, them] = attackTable(VIRUS);
  const state = withAnimals(
    withAnimals(bare, them, "card-base-birds", 3),
    me,
    "card-base-pets",
    2
  );
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "resource-steal");

  const options = played.state.pendingChoice.options;
  // The plant half still reaches the opponent's stock.
  assert.ok(options.some(entry => entry.resource === "plants" && entry.targetPlayerId === them));
  // Both animal cards are targets -- the attacker's own included.
  const animals = options.filter(entry => entry.cardResourceType === "animal");
  assert.deepEqual(
    animals.map(entry => `${entry.targetPlayerId}:${entry.targetCardId}`).sort(),
    [`${me}:card-base-pets`, `${them}:card-base-birds`].sort()
  );
  // A card holding no animals is not a candidate.
  const empty = withAnimals(bare, them, "card-base-birds", 0);
  const none = executeGameCommand(empty, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  assert.equal(
    none.state.pendingChoice.options.some(entry => entry.cardResourceType === "animal"),
    false,
    "an empty card holds nothing to remove"
  );
});

test("Virus removes two animals from the chosen card and records the attack", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [bare, me, them] = attackTable(VIRUS);
  const state = withAnimals(bare, them, "card-base-birds", 3);
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });

  const option = played.state.pendingChoice.options.find(
    entry => entry.cardResourceType === "animal" && entry.targetPlayerId === them
  );
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });

  assert.equal(getPlayer(settled.state, them).cardResources["card-base-birds"], 1);
  assert.equal(getPlayer(settled.state, them).plants, 9, "the plant half was not also taken");
  assert.equal(settled.state.generationAttackLedger.length, 1);
  assert.deepEqual(
    { ...settled.state.generationAttackLedger[0], generation: undefined },
    {
      attackerPlayerId: me,
      victimPlayerId: them,
      sourceCardId: VIRUS,
      kind: "resource-removal",
      resource: "animal",
      amount: 2,
      generation: undefined
    }
  );
});

test("Virus destroys the animals rather than taking them", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  // The choice runs through `resource-steal`, which is also the path the
  // stealing cards use. Virus's spec says steal:false, so the two animals must
  // leave the table entirely: not onto the attacker's own animal card, not
  // into any stock of theirs.
  const [bare, me, them] = attackTable(VIRUS);
  const state = withAnimals(
    withAnimals(bare, them, "card-base-birds", 3),
    me,
    "card-base-pets",
    1
  );
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  const option = played.state.pendingChoice.options.find(
    entry => entry.cardResourceType === "animal" && entry.targetPlayerId === them
  );

  const before = getPlayer(played.state, me);
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });
  const after = getPlayer(settled.state, me);

  assert.equal(getPlayer(settled.state, them).cardResources["card-base-birds"], 1, "two are gone");
  assert.equal(
    after.cardResources["card-base-pets"],
    before.cardResources["card-base-pets"],
    "the attacker's own animal card gains nothing"
  );
  for (const field of ["mc", "steel", "titanium", "plants", "energy", "heat"]) {
    assert.equal(after[field], before[field], `the attacker's ${field} is untouched`);
  }
  // Nothing arrived anywhere else on the attacker's card resources either.
  assert.deepEqual(after.cardResources, before.cardResources, "no card of theirs gained anything");
});

test("Virus takes only the one animal a card actually holds", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [bare, me, them] = attackTable(VIRUS);
  const state = withAnimals(bare, them, "card-base-birds", 1);
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  const option = played.state.pendingChoice.options.find(
    entry => entry.cardResourceType === "animal"
  );
  assert.match(option.label, /動物 1/, "the offer says one, not two");

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });
  assert.equal(getPlayer(settled.state, them).cardResources["card-base-birds"], 0);
  assert.equal(settled.state.generationAttackLedger[0].amount, 1, "one animal, one grievance");
});

test("Virus hitting the attacker's own card leaves no grievance for Law Suit", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer, lawSuitTargets } = await import("../app/game-logic.js");

  const [bare, me] = attackTable(VIRUS);
  const state = withAnimals(bare, me, "card-base-pets", 3);
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  const own = played.state.pendingChoice.options.find(
    entry => entry.cardResourceType === "animal" && entry.targetPlayerId === me
  );
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: own.id
  });

  assert.equal(getPlayer(settled.state, me).cardResources["card-base-pets"], 1, "they still go");
  assert.deepEqual(settled.state.generationAttackLedger, [], "but attacking yourself is no attack");
  assert.deepEqual(lawSuitTargets(settled.state, me), []);
});

test("Virus still offers the plant half when no card holds an animal", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [state, me, them] = attackTable(VIRUS);
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  const options = played.state.pendingChoice.options;
  assert.equal(options.every(entry => !entry.cardResourceType), true, "no animals anywhere");

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: options.find(entry => entry.resource === "plants").id
  });
  assert.equal(getPlayer(settled.state, them).plants, 4, "five plants leave");
});

test("Virus reaches a card in solo, where there is no other player to hit", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer, getInitialState, cloneGameState } = await import("../app/game-logic.js");

  // The plant half needs an opponent, so in solo the animal half is the only
  // branch left -- and it must not be applied twice on the way through.
  const solo = cloneGameState(getInitialState({ playerCount: 1 }));
  const me = solo.players[0].id;
  solo.phase = "action";
  solo.oxygen = 14; solo.temperature = 8; solo.oceans = 5;
  solo.players = solo.players.map(player => ({
    ...player,
    corporationId: null, mc: 100, plants: 9, actionsRemaining: 2, turnStep: "start",
    hand: [VIRUS],
    playedProjects: [...player.playedProjects, "card-base-birds"],
    cardResources: { ...player.cardResources, "card-base-birds": 3 }
  }));
  solo.currentPlayerId = me;

  const played = executeGameCommand(solo, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });
  assert.equal(played.state.pendingChoice?.kind, "resource-steal");
  assert.equal(
    getPlayer(played.state, me).cardResources["card-base-birds"],
    3,
    "nothing moves before the question is answered"
  );

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: me,
    optionId: played.state.pendingChoice.options[0].id
  });
  assert.equal(getPlayer(settled.state, me).cardResources["card-base-birds"], 1, "two, not four");
  assert.deepEqual(settled.state.generationAttackLedger, []);
});

test("a Virus choice survives a save and reload", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { serializeSavedState, loadSavedState } = await import("../app/save-migration.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [bare, me, them] = attackTable(VIRUS);
  const state = withAnimals(bare, them, "card-base-birds", 3);
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: VIRUS });

  const reloaded = loadSavedState(serializeSavedState(played.state));
  assert.equal(reloaded.pendingChoice?.kind, "resource-steal", "the question survived");

  const option = reloaded.pendingChoice.options.find(entry => entry.cardResourceType === "animal");
  const settled = executeGameCommand(reloaded, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });
  assert.equal(getPlayer(settled.state, them).cardResources["card-base-birds"], 1);
});

// ---------------------------------------------------------------------------
// Special Permit: playable only while the Greens rule, so it needs a Turmoil
// table rather than the neutral one the other attacks are tested on.
// ---------------------------------------------------------------------------

const PERMIT = "card-prelude2-special-permit";

// The same two-player attack table, with Turmoil switched on and a ruling party
// chosen. `createTurmoilState` already opens with the Greens dominant, so the
// party is set explicitly to say which case each test is exercising.
async function permitTable(rulingParty) {
  const { createTurmoilState } = await import("../app/turmoil.js");
  const [state, me, them] = attackTable(PERMIT);
  const turmoil = createTurmoilState(state.players.map(player => player.id), []);
  state.turmoil = { ...turmoil, rulingParty };
  return [state, me, them];
}

test("Special Permit is refused unless the Greens rule", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [neutral, meNeutral] = attackTable(PERMIT);
  const noTurmoil = executeGameCommand(neutral, {
    type: COMMAND.PLAY_CARD, playerId: meNeutral, cardId: PERMIT
  });
  assert.equal(noTurmoil.ok, false, "no Turmoil, no permit");

  const [state, me] = await permitTable("mars-first");
  const wrongParty = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: PERMIT
  });
  assert.equal(wrongParty.ok, false, "the wrong party rules");
  assert.deepEqual(wrongParty.state.generationAttackLedger ?? [], []);
});

test("Special Permit takes four plants from the chosen player and records it", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer, lawSuitTargets } = await import("../app/game-logic.js");

  const [state, me, them] = await permitTable("greens");
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: PERMIT });
  assert.equal(played.ok, true, "the Greens rule, so it is playable");
  assert.equal(played.state.pendingChoice?.kind, "resource-steal");

  const option = played.state.pendingChoice.options.find(
    entry => entry.targetPlayerId === them && entry.resource === "plants"
  );
  assert.ok(option, "the opponent is a target");
  assert.equal(
    played.state.pendingChoice.options.some(entry => entry.targetPlayerId === me),
    false,
    "and the attacker is not"
  );

  const attackerBefore = getPlayer(played.state, me).plants;
  const victimBefore = getPlayer(played.state, them).plants;
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });

  assert.equal(getPlayer(settled.state, them).plants, victimBefore - 4, "four leave");
  assert.equal(getPlayer(settled.state, me).plants, attackerBefore + 4, "and arrive");

  assert.equal(settled.state.generationAttackLedger.length, 1);
  assert.deepEqual(settled.state.generationAttackLedger[0], {
    attackerPlayerId: me,
    victimPlayerId: them,
    sourceCardId: PERMIT,
    kind: "resource-removal",
    resource: "plants",
    amount: 4,
    generation: settled.state.generation
  });

  // The victim may now sue, and nobody else may.
  assert.deepEqual(lawSuitTargets(settled.state, them).map(player => player.id), [me]);
  assert.deepEqual(lawSuitTargets(settled.state, me), []);
});

test("Special Permit records nothing when the victim holds no plants", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [state, me] = await permitTable("greens");
  state.players = state.players.map(player =>
    player.id === me ? player : { ...player, plants: 0 }
  );
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: PERMIT });
  assert.equal(played.ok, true, "the card is still played");
  assert.equal(played.state.pendingChoice, null, "but there is nobody worth asking about");
  assert.deepEqual(played.state.generationAttackLedger, [], "and no grievance");
});

test("Special Permit runs end to end for the attacking seat", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer, lawSuitTargets } = await import("../app/game-logic.js");

  // One pass over the whole path a real seat takes: play, get asked, answer,
  // and land. Each step is checked rather than only the end state, because a
  // choice that resolves correctly while spending two actions, or leaving the
  // question up, is still broken.
  const [state, me, them] = await permitTable("greens");
  const actionsBefore = state.actionsRemaining;
  const attackerBefore = getPlayer(state, me).plants;
  const victimBefore = getPlayer(state, them).plants;

  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: PERMIT });
  assert.equal(played.ok, true, "the card is played");
  assert.equal(played.state.pendingChoice?.kind, "resource-steal", "and raises the question");
  assert.equal(
    getPlayer(played.state, them).plants,
    victimBefore,
    "nothing moves before the question is answered"
  );

  const option = played.state.pendingChoice.options.find(entry => entry.targetPlayerId === them);
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });
  assert.equal(settled.ok, true);

  assert.equal(getPlayer(settled.state, them).plants, victimBefore - 4, "four leave the victim");
  assert.equal(getPlayer(settled.state, me).plants, attackerBefore + 4, "and reach the attacker");
  assert.equal(settled.state.pendingChoice, null, "the question is gone");
  assert.equal(
    settled.state.actionsRemaining,
    actionsBefore - 1,
    "playing a card through a choice costs exactly one action"
  );

  assert.equal(settled.state.generationAttackLedger.length, 1, "one attack, one entry");
  assert.deepEqual(settled.state.generationAttackLedger[0], {
    attackerPlayerId: me,
    victimPlayerId: them,
    sourceCardId: PERMIT,
    kind: "resource-removal",
    resource: "plants",
    amount: 4,
    generation: settled.state.generation
  });
  assert.deepEqual(lawSuitTargets(settled.state, them).map(player => player.id), [me]);
});

test("Special Permit settles identically through the online command path", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  // The online seat sends the same two commands a Durable Object would relay.
  const [state, me, them] = await permitTable("greens");
  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: me, cardId: PERMIT });
  const option = played.state.pendingChoice.options.find(entry => entry.targetPlayerId === them);

  // A seat that is not the attacker may not answer the attacker's question.
  const wrongSeat = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: them, optionId: option.id
  });
  assert.equal(wrongSeat.ok, false, "only the attacker resolves it");

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: option.id
  });
  assert.equal(getPlayer(settled.state, them).plants, 5);
  assert.equal(settled.state.generationAttackLedger.length, 1);
});

test("all seven attack cards carry a steal spec", () => {
  const expected = [
    "card-base-flooding",
    "card-base-hired-raiders",
    "card-base-sabotage",
    "card-base-virus",
    "card-colonies-air-raid",
    "card-prelude2-special-permit",
    "card-venus-comet-for-venus"
  ];
  const specced = ALL_CARDS.filter(card => card.effectSpec?.behavior?.stealFromPlayer);
  assert.deepEqual(specced.map(card => card.id).sort(), expected);

  // Special Permit gates on Turmoil politics rather than on the attack, so its
  // spec is checked here instead of by playing it.
  const permit = ALL_CARDS.find(card => card.id === "card-prelude2-special-permit");
  assert.deepEqual(permit.effectSpec.behavior.stealFromPlayer.resources, [
    { resource: "plants", count: 4 }
  ]);
  assert.equal(permit.effectSpec.behavior.stealFromPlayer.steal, true);
});

test("Vermin gains an animal from every city built", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player, mc: 200, actionsRemaining: 2, turnStep: "start",
    playedProjects: player.id === me ? ["card-promo-vermin"] : []
  }));
  state.currentPlayerId = me;

  const built = executeGameCommand(state, {
    type: COMMAND.STANDARD_PROJECT, playerId: me, projectId: "city"
  });
  const settled = built.state.pendingChoice
    ? executeGameCommand(built.state, {
        type: COMMAND.RESOLVE_PENDING, playerId: me,
        optionId: built.state.pendingChoice.options[0].id
      }).state
    : built.state;

  assert.equal(getPlayer(settled, me).cardResources["card-promo-vermin"], 1);
});

test("the Vermin action adds an animal and costs the turn", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  const [me] = state.players.map(player => player.id);
  state.players = state.players.map(player => ({
    ...player, mc: 100, actionsRemaining: 2, turnStep: "start",
    playedProjects: player.id === me ? ["card-promo-vermin"] : []
  }));
  state.currentPlayerId = me;

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: me, cardId: "card-promo-vermin"
  });
  const settled = executeGameCommand(used.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me,
    optionId: used.state.pendingChoice.options[0].id
  });

  assert.equal(getPlayer(settled.state, me).cardResources["card-promo-vermin"], 1);
  assert.equal(
    getPlayer(settled.state, me).actionsRemaining,
    1,
    "choosing which half of an action to take is still taking it"
  );
});

function josephTable(cityCount, cityOwner) {
  const state = table();
  state.phase = "action";
  const [me] = state.players.map(player => player.id);
  const land = Object.values(state.board)
    .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
    .slice(0, cityCount);
  for (const cell of land) {
    const key = `${cell.q},${cell.r}`;
    state.board[key] = { ...state.board[key], tileType: "city", placedBy: cityOwner };
  }
  state.players = state.players.map(player => ({
    ...player, mc: 100, steel: 0, actionsRemaining: 2, turnStep: "start",
    playedProjects: player.id === me ? ["card-promo-st-joseph-of-cupertino-mission"] : []
  }));
  state.currentPlayerId = me;
  return [state, me];
}

test("St. Joseph cannot act with no city to build on", async () => {
  const { getCardActionStatus } = await import("../app/game-logic.js");
  const [state] = josephTable(0, "player");
  const status = getCardActionStatus(
    state,
    ALL_CARDS.find(card => card.id === "card-promo-st-joseph-of-cupertino-mission")
  );
  assert.equal(status.playable, false);
});

test("St. Joseph builds a cathedral for five megacredits and an action", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [state, me] = josephTable(1, "player");
  const before = getPlayer(state, me).mc;
  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: me,
    cardId: "card-promo-st-joseph-of-cupertino-mission"
  });

  assert.equal(used.state.boardMarkers.length, 1, "one city means no question");
  assert.equal(before - getPlayer(used.state, me).mc, 5);
  assert.equal(getPlayer(used.state, me).actionsRemaining, 1);
  assert.equal(calculateScoreBreakdowns(used.state).player.cards, 1);
});

test("a city may carry only one cathedral", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [state, me] = josephTable(3, "player");
  const first = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: me,
    cardId: "card-promo-st-joseph-of-cupertino-mission"
  });
  assert.equal(first.state.pendingChoice?.kind, "cathedral-placement");
  assert.equal(first.state.pendingChoice.options.length, 3);

  const chosen = first.state.pendingChoice.options[0];
  const placed = executeGameCommand(first.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: chosen.id
  });

  // Next generation, that city is no longer on offer.
  const next = cloneGameState(placed.state);
  next.players = next.players.map(player => ({
    ...player, usedCardActions: [], actionsRemaining: 2
  }));
  const again = executeGameCommand(next, {
    type: COMMAND.USE_CARD_ACTION, playerId: me,
    cardId: "card-promo-st-joseph-of-cupertino-mission"
  });
  assert.equal(again.state.pendingChoice.options.length, 2);
  assert.equal(
    again.state.pendingChoice.options.some(option => option.id === chosen.id),
    false
  );
});

test("a cathedral on another player's city pays its builder only", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const [state, me] = josephTable(1, "player2");
  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: me,
    cardId: "card-promo-st-joseph-of-cupertino-mission"
  });

  const key = used.state.boardMarkers[0].cellKey;
  assert.equal(used.state.boardMarkers[0].sourcePlayerId, me);
  assert.equal(used.state.board[key].placedBy, "player2", "the city keeps its owner");
  assert.equal(used.state.board[key].tileType, "city", "and is still a city");
  assert.equal(calculateScoreBreakdowns(used.state).player.cards, 1, "the builder scores");
  assert.equal(calculateScoreBreakdowns(used.state).player2.cards, 0);
});

function lawSuitTable(playerCount, attackerIds) {
  const state = cloneGameState(getInitialState({ playerCount }));
  state.phase = "action";
  const me = state.players[0].id;
  state.players = state.players.map(player => ({
    ...player, corporationId: null, mc: 40, actionsRemaining: 2, turnStep: "start",
    hand: player.id === me ? ["card-promo-law-suit"] : []
  }));
  state.currentPlayerId = me;
  state.generationAttackLedger = attackerIds.map(id => ({
    attackerPlayerId: id, victimPlayerId: me, sourceCardId: "p-asteroid",
    kind: "resource-removal", resource: "plants", amount: 3, generation: state.generation
  }));
  return [state, me];
}

test("Law Suit cannot be played when nobody attacked you", async () => {
  const { getCardPlayableStatus } = await import("../app/game-logic.js");
  const [state] = lawSuitTable(3, []);
  const status = getCardPlayableStatus(
    ALL_CARDS.find(card => card.id === "card-promo-law-suit"), state, 0, 0
  );
  assert.equal(status.playable, false);
});

test("Law Suit resolves against a single attacker without asking", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [state, me] = lawSuitTable(3, ["player2"]);
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-promo-law-suit"
  });

  assert.equal(played.state.pendingChoice, null);
  assert.equal(getPlayer(played.state, "player2").mc, 37, "three megacredits move");
  assert.equal(calculateScoreBreakdowns(played.state).player2.modifier, -1);
  assert.deepEqual(
    getPlayer(played.state, "player2").playedEvents,
    ["card-promo-law-suit"],
    "the card sits with the player who was sued"
  );
  assert.deepEqual(getPlayer(played.state, me).playedEvents, [], "not with the plaintiff");
  assert.deepEqual(getPlayer(played.state, me).playedProjects, []);
});

test("Law Suit asks which of several attackers to sue", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [state, me] = lawSuitTable(3, ["player2", "player3"]);
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-promo-law-suit"
  });
  assert.equal(played.state.pendingChoice?.kind, "law-suit");
  assert.equal(played.state.pendingChoice.options.length, 2);

  const pick = played.state.pendingChoice.options.find(
    option => option.targetPlayerId === "player3"
  );
  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: pick.id
  });

  assert.equal(getPlayer(settled.state, "player3").mc, 37);
  assert.equal(getPlayer(settled.state, "player2").mc, 40, "the other is untouched");
  assert.equal(calculateScoreBreakdowns(settled.state).player3.modifier, -1);
  assert.equal(calculateScoreBreakdowns(settled.state).player2.modifier, 0);

  // Resending the same answer must not charge twice.
  const resent = executeGameCommand(settled.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: me, optionId: pick.id
  });
  assert.equal(getPlayer(resent.state, "player3").mc, 37);
  assert.equal(resent.state.scoreModifiers.length, 1);
});

test("Law Suit takes what the target has when that is under three", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");

  const [state, me] = lawSuitTable(3, ["player2"]);
  state.players = state.players.map(player =>
    player.id === "player2" ? { ...player, mc: 2 } : player
  );
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-promo-law-suit"
  });

  assert.equal(getPlayer(played.state, "player2").mc, 0, "never negative");
  assert.equal(
    calculateScoreBreakdowns(played.state).player2.modifier,
    -1,
    "the point is lost whatever the balance"
  );
});

test("a settled suit and its cathedral survive a save and reload", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { loadSavedState, serializeSavedState } = await import("../app/save-migration.js");

  const [state, me] = lawSuitTable(2, ["player2"]);
  const sued = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: me, cardId: "card-promo-law-suit"
  }).state;
  sued.boardMarkers = [
    {
      id: "cathedral:1,1", kind: "cathedral", cellKey: "1,1",
      sourceCardId: "card-promo-st-joseph-of-cupertino-mission", sourcePlayerId: me
    }
  ];

  const reloaded = loadSavedState(serializeSavedState(sued));
  assert.ok(reloaded, "the save loads");
  assert.equal(calculateScoreBreakdowns(reloaded).player2.modifier, -1);
  assert.equal(reloaded.boardMarkers[0].cellKey, "1,1");
  assert.deepEqual(
    reloaded.players.find(player => player.id === "player2").playedEvents,
    ["card-promo-law-suit"]
  );
  assert.equal(computeScore(reloaded, "player2"), computeScore(sued, "player2"));
});

test("the bot rates a card scoring per resource above one scoring nothing", async () => {
  const { enumerateBotMoves } = await import("../app/bot-player.js");
  const { hasPositiveVpIcon } = await import("../app/game-logic.js");

  const state = table();
  state.phase = "action";
  state.oxygen = 14;
  const [me] = state.players.map(player => player.id);
  const plain = ALL_CARDS.find(
    card =>
      !card.victoryPoints && !card.victoryPointSpec && !card.specialVictoryKind &&
      card.type === "automated" && card.cost <= 12
  );
  state.players = state.players.map(player => ({
    ...player, mc: 100, actionsRemaining: 2, turnStep: "start",
    hand: player.id === me ? ["card-base-birds", plain.id] : []
  }));
  state.currentPlayerId = me;

  const moves = enumerateBotMoves(state, me).filter(move => move.kind === "play");
  const birds = moves.find(move => move.card.id === "card-base-birds");
  const other = moves.find(move => move.card.id === plain.id);

  assert.ok(birds, "Birds is on the list");
  assert.equal(hasPositiveVpIcon(birds.card), true);
  assert.ok(
    birds.bonus > (other?.bonus ?? 0),
    "a printed victory point icon is worth more than none"
  );
});

test("the three special cards print a victory point badge of their own", async () => {
  const tsx = await import("node:fs/promises").then(fs =>
    fs.readFile(new URL("../app/project-card.tsx", import.meta.url), "utf8")
  );
  assert.match(
    tsx,
    /specialVictoryDisplay/,
    "the card face reads the special label"
  );

  const expected = {
    "card-promo-law-suit": "-1",
    "card-promo-vermin": "特殊",
    "card-promo-st-joseph-of-cupertino-mission": "1"
  };

  for (const [id, label] of Object.entries(expected)) {
    const card = ALL_CARDS.find(entry => entry.id === id);
    assert.equal(card.specialVictoryDisplay?.label, label, `${id} prints ${label}`);
    assert.ok(
      card.specialVictoryDisplay?.description?.length > 0,
      `${id} explains itself in the tooltip`
    );
  }

  // Nothing else grew a special badge.
  assert.equal(ALL_CARDS.filter(card => card.specialVictoryDisplay).length, 3);
});
