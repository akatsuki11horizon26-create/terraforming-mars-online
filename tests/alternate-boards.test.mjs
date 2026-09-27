import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState, getBoardCells, getGlobalParameterLimits, getSoloGenerationLimit, getVenusTrackLimit, getPlayer, applyGlobalParameterChange, applyCardEffect, isCellPlacementValid, isGameOverCheck, isSoloMissionComplete, worldGovernmentOptions } from "../app/game-logic.js";
import { nextThreshold } from "../app/parameter-thresholds.js";
import { milestonesForBoard, awardsForBoard } from "../app/board-milestones.js";
import { getMilestone, getAward } from "../app/milestones-awards.js";

// Titan, Enceladus and Miranda stay off the track until a card that can hold
// their resource is played, so a test that just wants "a colony" has to ask for
// one that is usable -- the tiles in play are shuffled.
function activeTile(colonies) {
  const id = colonies.tilesInPlay.find(tile => colonies.tiles[tile]?.active !== false);
  if (!id) throw new Error("no active colony tile in play");
  return id;
}


const MAPS = ["tharsis", "hellas", "elysium", "utopia", "amazonis", "terra-cimmeria", "vastitas-borealis"];

test("Amazonis extends all three Mars tracks without changing standard maps", () => {
  assert.deepEqual(getGlobalParameterLimits("amazonis"), { temperature: 14, oxygen: 18, oceans: 11 });
  for (const id of MAPS.filter(id => id !== "amazonis")) {
    assert.deepEqual(getGlobalParameterLimits(id), { temperature: 8, oxygen: 14, oceans: 9 });
  }
  assert.equal(isGameOverCheck(8, 14, 9, "amazonis"), false);
  assert.equal(isGameOverCheck(14, 18, 11, "amazonis"), true);
  assert.equal(isGameOverCheck(8, 14, 9, "tharsis"), true);
  assert.equal(nextThreshold("temperature", 8, getGlobalParameterLimits("amazonis")).at, 14);
  assert.equal(nextThreshold("oxygen", 14, getGlobalParameterLimits("amazonis")).at, 18);
});

test("Prelude 2 alone shortens the solo limit on both standard and Amazonis boards", () => {
  const standard = getInitialState({ board: "tharsis", prelude: false, prelude2: true });
  const amazonis = getInitialState({ board: "amazonis", prelude: false, prelude2: true });
  assert.equal(standard.preludeEnabled, true);
  assert.equal(getSoloGenerationLimit(standard), 12);
  assert.equal(amazonis.preludeEnabled, true);
  assert.equal(getSoloGenerationLimit(amazonis), 13);
});

test("Amazonis parameter changes continue beyond standard caps and stop at its own caps", () => {
  const state = getInitialState({ playerCount: 2, board: "amazonis" });
  state.temperature = 8;
  state.oxygen = 14;
  state.oceans = 9;
  for (const parameter of ["temperature", "oxygen", "oceans"]) {
    applyGlobalParameterChange(state, { parameter, steps: 10, grantTr: false }, []);
  }
  assert.equal(state.temperature, 14);
  assert.equal(state.oxygen, 18);
  assert.equal(state.oceans, 11);
  assert.equal(isGameOverCheck(state.temperature, state.oxygen, state.oceans, state.boardId), true);
});

test("card effects use the Amazonis caps too", () => {
  const state = getInitialState({ playerCount: 2, board: "amazonis" });
  state.temperature = 8;
  state.oxygen = 14;
  const result = applyCardEffect(state, {
    id: "test-amazonis-parameters",
    effect: { temperatureSteps: 2, oxygenSteps: 2 }
  }, []);
  assert.equal(result.state.temperature, 12);
  assert.equal(result.state.oxygen, 16);
});

test("Amazonis allows the tenth and eleventh oceans, but not a twelfth", () => {
  const state = getInitialState({ playerCount: 2, board: "amazonis" });
  const spaces = Object.values(state.board).filter(cell => cell.isOceanOnly);
  assert.ok(spaces.length > 11);
  for (let index = 0; index < 9; index++) spaces[index].tileType = "ocean";
  assert.equal(isCellPlacementValid(spaces[9], "ocean", state.board, "player", null, state.boardId), true);
  spaces[9].tileType = "ocean";
  assert.equal(isCellPlacementValid(spaces[10], "ocean", state.board, "player", null, state.boardId), true);
  spaces[10].tileType = "ocean";
  assert.equal(isCellPlacementValid(spaces[11], "ocean", state.board, "player", null, state.boardId), false);
});

test("the optional Amazonis Venus board runs from 30% to 33% in one-percent steps", () => {
  const state = getInitialState({ board: "amazonis", venus: true, extendedVenus: true });
  assert.equal(getVenusTrackLimit(state), 33);
  state.venus = 28;
  const actor = state.currentPlayerId;
  const beforeTr = getPlayer(state, actor).tr;
  assert.ok(worldGovernmentOptions(state).some(option => option.parameter === "venus"));
  applyGlobalParameterChange(state, { parameter: "venus", steps: 4, actorPlayerId: actor }, []);
  assert.equal(state.venus, 33);
  assert.equal(getPlayer(state, actor).tr, beforeTr + 4);
  assert.equal(worldGovernmentOptions(state).some(option => option.parameter === "venus"), false);
  applyGlobalParameterChange(state, { parameter: "venus", steps: 1, actorPlayerId: actor }, []);
  assert.equal(state.venus, 33);
  assert.equal(getPlayer(state, actor).tr, beforeTr + 4);
  assert.equal(nextThreshold("venus", 30, { venus: 33 }).steps, 3);
  assert.equal(nextThreshold("venus", 31, { venus: 33 }).steps, 2);
});

test("short Venus stays at 30%, and Amazonis solo needs 33% only when extended", () => {
  const extended = getInitialState({ board: "amazonis", venus: true, extendedVenus: true });
  extended.temperature = 14;
  extended.oxygen = 18;
  extended.oceans = 11;
  extended.venus = 30;
  assert.equal(isSoloMissionComplete(extended), false);
  extended.venus = 33;
  assert.equal(isSoloMissionComplete(extended), true);

  const short = getInitialState({ board: "amazonis", venus: true, extendedVenus: false });
  assert.equal(getVenusTrackLimit(short), 30);
  const otherBoard = getInitialState({ board: "tharsis", venus: true, extendedVenus: true });
  assert.equal(getVenusTrackLimit(otherBoard), 30);
});

test("cards raise extended Venus one track step and pay one TR past 30%", () => {
  const state = getInitialState({ board: "amazonis", venus: true, extendedVenus: true });
  state.venus = 30;
  const beforeTr = getPlayer(state, state.currentPlayerId).tr;
  const result = applyCardEffect(state, { id: "test-long-venus", effect: { venusSteps: 1 } }, []);
  assert.equal(result.state.venus, 31);
  assert.equal(getPlayer(result.state, state.currentPlayerId).tr, beforeTr + 1);
});

test("standard-size maps have the complete 61-space layout", () => {
  for (const id of MAPS.filter(id => id !== "amazonis")) {
    const cells = getBoardCells(id);
    assert.equal(cells.length, 61, `${id} must have 61 spaces`);

    // Nine rows of 5,6,7,8,9,8,7,6,5 — the printed layout.
    const perRow = {};
    for (const cell of cells) perRow[cell.r] = (perRow[cell.r] ?? 0) + 1;
    assert.deepEqual(
      Object.keys(perRow).sort((a, b) => a - b).map(r => perRow[r]),
      [5, 6, 7, 8, 9, 8, 7, 6, 5],
      `${id} row layout`
    );

    // Coordinates must be unique or two spaces would occupy one hex.
    const keys = new Set(cells.map(cell => `${cell.q},${cell.r}`));
    assert.equal(keys.size, 61, `${id} has duplicate coordinates`);

    // The board holds more ocean areas than the nine ocean tiles in the game.
    const oceans = cells.filter(cell => cell.isOceanOnly).length;
    assert.ok(oceans >= 9, `${id} has only ${oceans} ocean areas`);
  }
});

test("the printed Amazonis board has 91 unique spaces and five volcanic regions", () => {
  const cells = getBoardCells("amazonis");
  assert.equal(cells.length, 91);
  const rows = new Map();
  for (const cell of cells) rows.set(cell.r, (rows.get(cell.r) ?? 0) + 1);
  assert.deepEqual([...rows.values()], [6, 7, 8, 9, 10, 11, 10, 9, 8, 7, 6]);
  assert.equal(new Set(cells.map(cell => `${cell.q},${cell.r}`)).size, 91);
  assert.equal(cells.filter(cell => cell.isOceanOnly).length, 15);
  assert.deepEqual(cells.filter(cell => cell.volcanic).map(cell => cell.name),
    ["Hecates Tholus", "Olympus Mons", "Ascraeus Mons", "Pavonis Mons", "Arsia Mons"]);
  assert.ok(cells.some(cell => cell.bonusType === "wild"));
  assert.ok(cells.some(cell => cell.bonusType === "delegate"));
  assert.ok(cells.some(cell => cell.bonusType === "energy"));
});

test("Amazonis printed board matches every space's terrain and placement bonus", () => {
  const printedRows = [
    "s1 s2 s1 t1 w2 -",
    "o:- d1 s1 - p1 o:p2 o:w2",
    "o:s2 - t2 - p1 o:- - -",
    "w1 o:- - - p1 p1 p2 p1 p1+t1",
    "s2 p1 c1 p1 o:t1 p1 p2 p1 c1 o:p2",
    "p1 p1 p2 p2 o:p2 o:p2 s1+p2 p1 - p1 o:t1",
    "p1 p2 o:p2 e2 e1 e2 p1 p1 - -",
    "- o:t2 p1 e1 e2 p1 d2 s1 d1",
    "o:s1+w1 - w1 - - p2 - w1",
    "o:- - c1 - p3 p2 s2",
    "- s1+w1 s2 - p1 t1"
  ];
  const symbol = { plant: "p", steel: "s", titanium: "t", energy: "e", card: "c", wild: "w", delegate: "d" };
  const cells = getBoardCells("amazonis");
  const actualRows = [...new Set(cells.map(cell => cell.r))].map(row => cells
    .filter(cell => cell.r === row)
    .map(cell => {
      const bonuses = cell.bonusType === "multi" ? cell.bonus :
        cell.bonusType === "none" ? [] : [{ type: cell.bonusType, amount: cell.bonusAmount }];
      return `${cell.isOceanOnly ? "o:" : ""}${bonuses.length ? bonuses.map(bonus => `${symbol[bonus.type]}${bonus.amount}`).join("+") : "-"}`;
    }).join(" "));
  assert.deepEqual(actualRows, printedRows);
});

test("Amazonis wild bonuses choose each standard resource separately", async () => {
  const { placeTileAt, resolvePendingChoice } = await import("../app/game-logic.js");
  const state = getInitialState({ board: "amazonis" });
  state.phase = "action";
  const owner = state.currentPlayerId;
  const cell = Object.values(state.board).find(candidate => candidate.bonusType === "wild" && candidate.bonusAmount === 2);
  const before = getPlayer(state, owner);
  placeTileAt(state, cell, "city", owner);
  assert.equal(state.pendingChoice?.kind, "standard-resource");
  const first = resolvePendingChoice(state, "steel", state.logs, owner);
  assert.equal(first.state.pendingChoice?.kind, "standard-resource");
  const second = resolvePendingChoice(first.state, "plants", first.logs, owner);
  assert.equal(second.state.pendingChoice, null);
  assert.equal(getPlayer(second.state, owner).steel, before.steel + 1);
  assert.equal(getPlayer(second.state, owner).plants, before.plants + 1);
});

test("Amazonis delegate bonuses send from reserve without payment only with Turmoil", async () => {
  const { placeTileAt, resolvePendingChoice } = await import("../app/game-logic.js");
  const state = getInitialState({ board: "amazonis", turmoil: true });
  state.phase = "action";
  const owner = state.currentPlayerId;
  const cell = Object.values(state.board).find(candidate => candidate.bonusType === "delegate");
  const beforeMc = getPlayer(state, owner).mc;
  const beforeReserve = state.turmoil.delegateReserve[owner];
  placeTileAt(state, cell, "city", owner);
  assert.equal(state.pendingChoice?.kind, "placement-delegate");
  const result = resolvePendingChoice(state, "mars", state.logs, owner);
  assert.equal(result.state.turmoil.delegateReserve[owner], beforeReserve - 1);
  assert.equal(getPlayer(result.state, owner).mc, beforeMc);
  assert.ok(result.state.turmoil.parties.mars.delegates.includes(owner));

  const noTurmoil = getInitialState({ board: "amazonis" });
  noTurmoil.phase = "action";
  const sameCell = noTurmoil.board[`${cell.q},${cell.r}`];
  placeTileAt(noTurmoil, sameCell, "city", noTurmoil.currentPlayerId);
  assert.equal(noTurmoil.pendingChoice, null);
});

test("repeated Amazonis delegate bonuses never ask for more delegates than remain in reserve", async () => {
  const { placeTileAt, resolvePendingChoice } = await import("../app/game-logic.js");
  const state = getInitialState({ board: "amazonis", turmoil: true, playerCount: 2 });
  state.phase = "action";
  const owner = state.currentPlayerId;
  state.turmoil.delegateReserve[owner] = 3;
  const cell = Object.values(state.board).find(candidate => candidate.bonusType === "delegate" && candidate.bonusAmount === 2);
  placeTileAt(state, cell, "city", owner, "card-prelude2-frontier-town", { placementBonusMultiplier: 3 });
  let settled = state;
  let choices = 0;
  while (settled.pendingChoice && choices < 7) {
    const result = resolvePendingChoice(settled, "mars", settled.logs, owner);
    settled = result.state;
    choices++;
  }
  assert.equal(choices, 3);
  assert.equal(settled.pendingChoice, null);
  assert.equal(settled.turmoil.delegateReserve[owner], 0);
  assert.equal(settled.turmoil.parties.mars.delegates.filter(id => id === owner).length, 3);
});

test("a paid tile project completes after both Amazonis wild-resource choices", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const state = getInitialState({ board: "amazonis", playerCount: 2 });
  state.phase = "action";
  const owner = state.currentPlayerId;
  state.players = state.players.map(player => player.id === owner ? { ...player, mc: 50 } : player);
  const before = getPlayer(state, owner);
  const wild = Object.values(state.board).find(cell => cell.bonusType === "wild" && cell.bonusAmount === 2);
  const started = executeGameCommand(state, { type: COMMAND.STANDARD_PROJECT, playerId: owner, projectId: "city" });
  assert.equal(started.ok, true);
  const placed = executeGameCommand(started.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: `${wild.q},${wild.r}`
  });
  assert.equal(placed.ok, true);
  assert.equal(placed.state.pendingChoice?.kind, "standard-resource");
  const first = executeGameCommand(JSON.parse(JSON.stringify(placed.state)), {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: "energy"
  });
  assert.equal(first.state.pendingChoice?.kind, "standard-resource");
  const second = executeGameCommand(first.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: "heat"
  });
  assert.equal(second.ok, true);
  assert.equal(second.state.pendingChoice, null);
  assert.equal(getPlayer(second.state, owner).energy, before.energy + 1);
  assert.equal(getPlayer(second.state, owner).heat, before.heat + 1);
  assert.equal(getPlayer(second.state, owner).actionsRemaining, before.actionsRemaining - 1);
});

test("a paid tile project sends both Amazonis bonus delegates after reload and spends one action", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const state = getInitialState({ board: "amazonis", turmoil: true, playerCount: 2 });
  state.phase = "action";
  const owner = state.currentPlayerId;
  state.players = state.players.map(player => player.id === owner ? { ...player, mc: 50 } : player);
  const before = getPlayer(state, owner);
  const beforeReserve = state.turmoil.delegateReserve[owner];
  const cell = Object.values(state.board).find(candidate => candidate.bonusType === "delegate" && candidate.bonusAmount === 2);
  const started = executeGameCommand(state, { type: COMMAND.STANDARD_PROJECT, playerId: owner, projectId: "city" });
  assert.equal(started.ok, true);
  const placed = executeGameCommand(started.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: `${cell.q},${cell.r}`
  });
  assert.equal(placed.ok, true);
  assert.equal(placed.state.pendingChoice?.kind, "placement-delegate");
  assert.equal(getPlayer(placed.state, owner).actionsRemaining, before.actionsRemaining);
  const mcAfterPlacement = getPlayer(placed.state, owner).mc;
  const first = executeGameCommand(JSON.parse(JSON.stringify(placed.state)), {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: "mars"
  });
  assert.equal(first.ok, true);
  assert.equal(first.state.pendingChoice?.kind, "placement-delegate");
  const second = executeGameCommand(first.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: "unity"
  });
  assert.equal(second.ok, true);
  assert.equal(second.state.pendingChoice, null);
  assert.equal(second.state.turmoil.delegateReserve[owner], beforeReserve - 2);
  assert.ok(second.state.turmoil.parties.mars.delegates.includes(owner));
  assert.ok(second.state.turmoil.parties.unity.delegates.includes(owner));
  assert.equal(getPlayer(second.state, owner).delegatesPlaced, (before.delegatesPlaced ?? 0) + 2);
  assert.equal(getPlayer(second.state, owner).mc, mcAfterPlacement);
  assert.equal(getPlayer(second.state, owner).actionsRemaining, before.actionsRemaining - 1);
  assert.equal(second.state.board[`${cell.q},${cell.r}`].tileType, "city");
});

test("a game can be dealt on any map", () => {
  for (const id of MAPS) {
    const state = getInitialState({ playerCount: 2, board: id });
    assert.equal(state.boardId, id);
    assert.equal(Object.keys(state.board).length, id === "amazonis" ? 91 : 61);
  }
});

test("an unknown map falls back to Tharsis rather than dealing an empty board", () => {
  const state = getInitialState({ playerCount: 1, board: "not-a-map" });
  assert.equal(state.boardId, "tharsis");
  assert.equal(Object.keys(state.board).length, 61);
});

test("each map brings its own five milestones and five awards", () => {
  for (const id of MAPS) {
    const milestones = milestonesForBoard(id);
    const awards = awardsForBoard(id);
    assert.equal(milestones.length, 5, `${id} milestones`);
    assert.equal(awards.length, 5, `${id} awards`);

    // Claiming resolves an id back to its definition; an unregistered id would
    // make the milestone unclaimable on that map.
    for (const milestone of milestones) {
      assert.ok(getMilestone(milestone.id), `${milestone.id} must resolve`);
      assert.equal(typeof milestone.getScore, "function");
    }
    for (const award of awards) {
      assert.ok(getAward(award.id), `${award.id} must resolve`);
      assert.equal(typeof award.getScore, "function");
    }
  }
});

test("the Hellas south pole charges to place and pays an ocean", () => {
  const pole = getBoardCells("hellas").find(cell => cell.name === "南極");
  assert.ok(pole, "Hellas must have a south pole space");
  assert.equal(pole.placementCost, 6, "the rulebook charges 6 M€ there");
  assert.equal(pole.bonusType, "ocean-tile");
});

test("the maps differ from each other", () => {
  const fingerprint = id =>
    getBoardCells(id)
      .map(cell => `${cell.bonusType}${cell.bonusAmount}${cell.isOceanOnly ? "o" : ""}`)
      .join("|");
  const seen = new Map();
  for (const id of MAPS) {
    const print = fingerprint(id);
    const twin = seen.get(print);
    assert.equal(twin, undefined, `${id} is identical to ${twin}`);
    seen.set(print, id);
  }
});

test("board milestones read the same tile names the engine writes", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer, placeTileAt, ALL_CARDS } =
    await import("../app/game-logic.js");
  const { milestonesForBoard, awardsForBoard } = await import("../app/board-milestones.js");

  let state = getInitialState({ playerCount: 2, board: "hellas" });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";

  const { legalCellsFor } = await import("../app/game-logic.js");
  for (let i = 0; i < 2; i++) {
    placeTileAt(state, legalCellsFor(state, "forest", "player")[0], "forest", "player");
  }

  const context = {
    player: getPlayer(state, "player"),
    board: state.board,
    cards: ALL_CARDS,
    corporation: null,
    colonyCount: 0
  };

  // The engine writes greeneries as "forest"; scoring them as "greenery" meant
  // nobody could ever win Cultivator.
  const cultivator = awardsForBoard("hellas").find(award => award.id === "cultivator");
  assert.equal(cultivator.getScore(context), 2, "Cultivator counts the greeneries placed");

  // And Manager counts special tiles, which an ordinary greenery is not.
  const manager = milestonesForBoard("utopia").find(milestone => milestone.id === "manager");
  assert.equal(manager.getScore(context), 0, "an ordinary greenery is not a special tile");
});

test("Pioneer reads the live colony count", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer, buildColonyOn, getMilestoneStatus } =
    await import("../app/game-logic.js");

  let state = getInitialState({ playerCount: 2, colonies: true, board: "utopia" });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 80 }));

  const tile = activeTile(state.colonies);
  state = buildColonyOn(state, tile, [], "player").state;

  // milestoneContext did not pass colonyCount, so Pioneer was unclaimable.
  assert.equal(getMilestoneStatus(state, "pioneer", "player").score, 1);
});

// The board data carries these three fields and the engine read none of them.
// A test that asserts only the data passes while the rule is entirely absent —
// which is how "the Hellas south pole charges to place" sat green above with
// nothing ever charging it.
test("the Hellas south pole charges 6 M€ and pays an ocean tile", async () => {
  const { getInitialState, getBoardCells, placeTileAt, getPlayer } =
    await import("../app/game-logic.js");
  const state = getInitialState({ board: "hellas", mode: "solo" });
  const pole = getBoardCells("hellas").find(cell => cell.name === "南極");
  const before = getPlayer(state, "player").mc;
  const oceansBefore = state.oceans;

  // It is a land space whose placement bonus is an ocean tile, so the tile laid
  // here is an ordinary city/greenery — the ocean comes from the bonus.
  placeTileAt(state, state.board[`${pole.q},${pole.r}`], "city", "player");

  assert.equal(before - getPlayer(state, "player").mc, 6,
    "placing on the south pole charges 6 M€");
  assert.equal(state.oceans, oceansBefore + 1,
    "the south pole pays an ocean tile as its placement bonus");
});

// `tile.on` is parsed into effect.tilePlacementRule and then read by nothing,
// so every card that names where its tile may go offered the whole board.
// Mohole Area is the sharp case: it must go ON an ocean-reserved space, but a
// special tile is only allowed on dry land, so none of the spaces it was
// offered were ever legal ones.
test("a card that names where its tile goes only offers those spaces", async () => {
  const { getInitialState, legalCellsFor } = await import("../app/game-logic.js");
  const state = getInitialState({ board: "tharsis", mode: "solo" });

  const mohole = legalCellsFor(state, "special", "player", "ocean");
  assert.ok(mohole.length > 0, "Mohole Area must have somewhere legal to go");
  assert.ok(mohole.every(cell => cell.isOceanOnly),
    "Mohole Area goes on a space reserved for an ocean");

  const lava = legalCellsFor(state, "special", "player", "volcanic");
  assert.ok(lava.length > 0, "Lava Flows must have somewhere legal to go");
  assert.ok(lava.every(cell => cell.volcanic),
    "Lava Flows goes on a volcano");

  const preserve = legalCellsFor(state, "special", "player", "isolated");
  assert.ok(preserve.length > 0, "Natural Preserve must have somewhere legal to go");
  assert.ok(preserve.every(cell => cell.isOceanOnly === false),
    "Natural Preserve still needs dry land");
});

// Hellas and Utopia have no volcanic spaces, so enforcing the volcanic rule
// there would leave Lava Flows with nowhere legal to go. The board data has
// carried noVolcanicRestriction from the start for exactly this reason.
test("a card needing a volcano loses that restriction on maps without one", async () => {
  const { getInitialState, legalCellsFor, BOARDS } = await import("../app/game-logic.js");
  for (const id of MAPS) {
    const state = getInitialState({ board: id, mode: "solo" });
    const legal = legalCellsFor(state, "special", "player", "volcanic");
    assert.ok(legal.length > 0, `${id} must leave Lava Flows somewhere to go`);
    if (!BOARDS[id].noVolcanicRestriction) {
      assert.ok(legal.every(cell => cell.volcanic),
        `${id} has volcanoes, so the tile belongs on one`);
    }
  }
});

test("Noctis City uses its reserved Mars space only on Tharsis", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getAdjacentCells, getCardEffect, ALL_CARDS } = await import("../app/game-logic.js");
  const cardId = "card-base-noctis-city";
  assert.equal(getCardEffect(ALL_CARDS.find(card => card.id === cardId)).offBoardCity, undefined);
  assert.equal(getCardEffect(ALL_CARDS.find(card => card.id === "card-base-ganymede-colony")).offBoardCity, "01");
  for (const boardId of ["tharsis", "amazonis", "vastitas-borealis"]) {
    const state = getInitialState({ board: boardId, playerCount: 2 });
    state.phase = "action";
    const owner = state.currentPlayerId;
    const player = getPlayer(state, owner);
    player.setupStep = "complete";
    player.mc = 50;
    player.energyProd = 1;
    player.hand = [cardId];
    const beforeMcProd = player.mcProd;
    const beforeActions = player.actionsRemaining;
    if (boardId === "tharsis") {
      const reserved = Object.values(state.board).find(cell => cell.reservedFor === "noctis-city");
      const neighbour = getAdjacentCells(reserved.q, reserved.r)
        .map(pos => state.board[`${pos.q},${pos.r}`])
        .find(cell => cell && !cell.isOceanOnly && !cell.reservedFor);
      neighbour.tileType = "city";
      neighbour.placedBy = "player2";
    }
    const result = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: owner, cardId });
    assert.equal(result.ok, true, boardId);
    let settled = result.state;
    let target;
    if (boardId === "tharsis") {
      target = Object.values(settled.board).find(cell => cell.reservedFor === "noctis-city");
      assert.equal(settled.pendingChoice, null);
    } else {
      assert.equal(settled.pendingChoice?.kind, "tile-placement", boardId);
      target = Object.values(settled.board).find(cell =>
        cell.tileType === "empty" && !cell.isOceanOnly && cell.bonusType === "none" &&
        settled.pendingChoice.options.some(option => option.id === `${cell.q},${cell.r}`));
      assert.ok(target, boardId);
      const placed = executeGameCommand(JSON.parse(JSON.stringify(settled)), {
        type: COMMAND.RESOLVE_PENDING, playerId: owner, optionId: `${target.q},${target.r}`
      });
      assert.equal(placed.ok, true, boardId);
      settled = placed.state;
    }
    assert.equal(settled.board[`${target.q},${target.r}`].tileType, "city", boardId);
    assert.equal(settled.board[`${target.q},${target.r}`].placedBy, owner, boardId);
    assert.equal(getPlayer(settled, owner).energyProd, 0, boardId);
    assert.equal(getPlayer(settled, owner).mcProd, beforeMcProd + 3, boardId);
    assert.equal((settled.offBoardCities ?? []).some(city => city.cardId === cardId), false, boardId);
    assert.equal(getPlayer(settled, owner).cardPlacements[cardId], `${target.q},${target.r}`, boardId);
    assert.equal(getPlayer(settled, owner).actionsRemaining, beforeActions - 1, boardId);
  }
});

// The Elysium sheet prints its own five awards; the code aliased them to the
// Hellas set, so every Elysium game scored the wrong five.
// Source: TM_HE_WRAP_ENGi.pdf (Hellas & Elysium rulebook).
test("Elysium funds its own five awards, not the Hellas set", () => {
  const ids = awardsForBoard("elysium").map(award => award.id).sort();
  assert.deepEqual(
    ids,
    ["benefactor", "celebrity", "desert-settler", "estate-dealer", "industrialist"].sort(),
    "Elysium prints Celebrity, Industrialist, Desert Settler, Estate Dealer and Benefactor"
  );
  const hellas = awardsForBoard("hellas").map(award => award.id).sort();
  assert.notDeepEqual(ids, hellas, "the two maps must not share one award set");
});

test("Incorporator counts cards costing 10 M€ or less", async () => {
  const award = awardsForBoard("utopia").find(entry => entry.id === "entrepreneur");
  const cards = [
    { id: "c10", cost: 10, tags: [] },
    { id: "c11", cost: 11, tags: [] },
    { id: "c19", cost: 19, tags: [] },
    { id: "c20", cost: 20, tags: [] }
  ];
  const score = id =>
    award.getScore({ player: { id: "player", playedProjects: [id] }, board: {}, cards, corporation: null });

  // The printed threshold is 10 M€; 11 through 19 were being counted too.
  assert.equal(score("c10"), 1, "10 M€ counts");
  assert.equal(score("c11"), 0, "11 M€ does not count");
  assert.equal(score("c19"), 0, "19 M€ does not count");
  assert.equal(score("c20"), 0, "20 M€ does not count");
});

// The physical map's objectives differ from the older online reference.
test("Amazonis brings its own five milestones and five awards", () => {
  assert.deepEqual(
    milestonesForBoard("amazonis").map(entry => entry.id).sort(),
    ["a-terran", "a-landshaper", "a-merchant", "a-sponsor", "a-lobbyist"].sort()
  );
  assert.deepEqual(
    awardsForBoard("amazonis").map(entry => entry.id).sort(),
    ["a-collector", "a-innovator", "a-constructor", "a-manufacturer", "a-physicist"].sort()
  );
  // And they must not simply be the Utopia set under new names.
  assert.notDeepEqual(
    milestonesForBoard("amazonis").map(entry => entry.id),
    milestonesForBoard("utopia").map(entry => entry.id)
  );
});

test("legacy Amazonis milestones stay registered for saved games", () => {
  const milestone = id => getMilestone(id);

  // Minimalist: "Have no more than 2 cards in hand" -- the only one here whose
  // claim is a ceiling rather than a floor.
  const minimalist = milestone("minimalist");
  assert.equal(minimalist.atMost, true, "Minimalist is claimed by holding FEW cards");
  assert.equal(minimalist.threshold, 2);
  assert.equal(minimalist.getScore({ player: { hand: ["a", "b"] } }), 2);

  // Forester: 4 plant production. Production, not plants held.
  assert.equal(milestone("forester").threshold, 4);
  assert.equal(milestone("forester").getScore({ player: { plantsProd: 4, plants: 0 } }), 4);

  // Colonizer: 4 colonies, where Utopia's Pioneer wanted 3.
  assert.equal(milestone("colonizer").threshold, 4);
  assert.equal(milestone("colonizer").getScore({ colonyCount: 4 }), 4);

  // Terran: 6 Earth tags.
  assert.equal(milestone("terran").threshold, 6);

  // Tropicalist: 3 tiles in the middle three equatorial rows (y 3..5).
  const tropicalist = milestone("tropicalist");
  assert.equal(tropicalist.threshold, 3);
  // A full nine-row board, so the row offsets are the printed ones rather than
  // whatever the fixture's lowest r happens to be.
  const board = {};
  for (let r = 0; r < 9; r += 1) board[`9,${r}`] = { q: 9, r, tileType: "empty", placedBy: null };
  for (const r of [2, 3, 4, 5, 6]) board[`0,${r}`] = { q: 0, r, tileType: "city", placedBy: "player" };
  assert.equal(
    tropicalist.getScore({ player: { id: "player" }, board }),
    3,
    "rows 3, 4 and 5 count; 2 and 6 do not"
  );
});

test("legacy Amazonis awards stay registered for saved games", () => {
  const award = id => getAward(id);
  const cards = [
    { id: "e1", type: "event", tags: ["Earth"] },
    { id: "e2", type: "event", tags: ["Space"] },
    { id: "p1", type: "automated", tags: ["Earth", "Earth"] }
  ];

  // Promoter counts the event pile, which the engine keeps separately.
  assert.equal(
    award("promoter").getScore({ player: { playedEvents: ["e1", "e2"], playedProjects: ["p1"] }, cards }),
    2
  );

  // Curator: the most tags of any ONE type, and events are excluded.
  assert.equal(
    award("curator").getScore({
      player: { playedProjects: ["p1"], playedEvents: ["e1", "e2"] },
      cards,
      corporation: null
    }),
    2,
    "two Earth tags on the played project; the events' tags do not count"
  );

  // A. Zoologist: animal and microbe resources only.
  const zooCards = [
    { id: "a", resourceType: "animal" },
    { id: "m", resourceType: "microbe" },
    { id: "f", resourceType: "floater" }
  ];
  assert.equal(
    award("amazonis-zoologist").getScore({
      player: { cardResources: { a: 3, m: 2, f: 9 } },
      cards: zooCards
    }),
    5,
    "floaters are not animals or microbes"
  );

  // Tourist: empty spaces ADJACENT to the player's tiles, counted once each.
  const board = {};
  for (let q = -2; q <= 2; q += 1) {
    for (let r = -2; r <= 2; r += 1) board[`${q},${r}`] = { q, r, tileType: "empty", placedBy: null };
  }
  board["0,0"] = { q: 0, r: 0, tileType: "city", placedBy: "player" };
  const tourist = award("tourist").getScore({ player: { id: "player" }, board });
  assert.equal(tourist, 6, "a lone tile in open ground touches six empty spaces");

  // A. Engineer: cards in play that alter the owner's own production.
  const prodCards = [
    { id: "prod", type: "automated", effectSpec: { production: { mc: 1 } } },
    { id: "flat", type: "automated", effectSpec: { mc: 3 } }
  ];
  assert.equal(
    award("amazonis-engineer").getScore({ player: { playedProjects: ["prod", "flat"] }, cards: prodCards }),
    1,
    "only the card that moves production counts"
  );
});

test("official Amazonis milestones use printed thresholds and live state", () => {
  const milestone = id => milestonesForBoard("amazonis").find(entry => entry.id === id);
  const cards = [
    { id: "earth", tags: ["Earth"] },
    { id: "expensive", cost: 20 },
    { id: "cheap", cost: 19 }
  ];
  const player = { id: "player", playedProjects: ["earth", "expensive", "cheap"], selectedPreludeIds: [], mc: 3, steel: 3, titanium: 3, plants: 3, energy: 3, heat: 2 };
  const board = {
    "0,0": { q: 0, r: 0, tileType: "forest", placedBy: "player" },
    "1,0": { q: 1, r: 0, tileType: "city", placedBy: "player" },
    "2,0": { q: 2, r: 0, tileType: "special", placedBy: "player" }
  };
  assert.equal(milestone("a-terran").threshold, 5);
  assert.equal(milestone("a-terran").getScore({ player, cards, corporation: { tags: ["Earth"] } }), 2);
  assert.equal(milestone("a-landshaper").getScore({ player, board }), 3);
  assert.equal(milestone("a-merchant").getScore({ player }), 5);
  assert.equal(milestone("a-sponsor").getScore({ player, cards }), 1);
  assert.equal(milestone("a-lobbyist").getScore({ player, turmoil: { delegateReserve: { player: 0 }, lobby: [], parties: {} } }), 7);
  assert.equal(milestone("a-lobbyist").getScore({ player, turmoil: { delegateReserve: { player: 1 }, lobby: ["player"], parties: {} } }), 5);
  assert.equal(milestone("a-lobbyist").getScore({ player, turmoil: null }), 0);
});

test("official Amazonis awards count the printed resources, cards, tiles and tags", () => {
  const award = id => awardsForBoard("amazonis").find(entry => entry.id === id);
  const cards = [
    { id: "animal", resourceType: "animal", tags: ["Science"] },
    { id: "microbe", resourceType: "microbe", tags: ["Space"] },
    { id: "event", type: "event", tags: ["Space"] }
  ];
  const player = { id: "player", mc: 3, steel: 1, titanium: 0, plants: 1, energy: 0, heat: 0,
    cardResources: { animal: 2, microbe: 3, "card-colonies-arklight": 1, "card-prelude2-cloud-tourism": 1 },
    playedProjects: ["animal", "microbe"], playedEvents: ["event"],
    steelProd: 2, heatProd: 3, selectedPreludeIds: [] };
  const board = { "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player" } };
  const context = { player, cards, board, colonyCount: 2, corporation: null, preludes: [] };
  assert.equal(award("a-collector").getScore(context), 6);
  assert.equal(award("a-innovator").getScore(context), 3);
  assert.equal(award("a-constructor").getScore(context), 3);
  assert.equal(award("a-manufacturer").getScore(context), 5);
  assert.equal(award("a-physicist").getScore(context), 2);
});

test("Amazonis Lobbyist and Constructor use the actual game state", async () => {
  const { getMilestoneStatus, computeScore } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2, board: "amazonis", turmoil: true, colonies: true });
  state.phase = "action";
  state.players[0].mc = 40;
  state.turmoil.delegateReserve.player = 0;
  state.turmoil.lobby = state.turmoil.lobby.filter(id => id !== "player");
  state.turmoil.parties.mars.delegates.push(...Array(7).fill("player"));
  assert.equal(getMilestoneStatus(state, "a-lobbyist", "player").claimable, true);
  state.turmoil.delegateReserve.player = 1;
  state.turmoil.parties.mars.delegates.pop();
  assert.equal(getMilestoneStatus(state, "a-lobbyist", "player").claimable, false);

  const ownCity = Object.values(state.board).find(cell => !cell.isOceanOnly);
  const rivalCities = Object.values(state.board).filter(cell => !cell.isOceanOnly && cell.id !== ownCity.id).slice(0, 2);
  state.board[`${ownCity.q},${ownCity.r}`].tileType = "city";
  state.board[`${ownCity.q},${ownCity.r}`].placedBy = "player";
  for (const cell of rivalCities) {
    state.board[`${cell.q},${cell.r}`].tileType = "city";
    state.board[`${cell.q},${cell.r}`].placedBy = "player2";
  }
  const colonyTiles = Object.values(state.colonies.tiles).slice(0, 2);
  for (const tile of colonyTiles) tile.colonies.push("player");
  state.fundedAwards = [{ awardId: "a-constructor", playerId: "player" }];
  const withColonies = computeScore(state, "player");
  for (const tile of colonyTiles) tile.colonies = [];
  const withoutColonies = computeScore(state, "player");
  assert.equal(withColonies - withoutColonies, 5);
});

test("obsolete Amazonis objectives cannot be claimed or funded in new games", async () => {
  const { getMilestoneStatus, getAwardStatus, computeScore } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2, board: "amazonis" });
  assert.equal(getMilestoneStatus(state, "minimalist", "player").claimable, false);
  assert.match(getMilestoneStatus(state, "minimalist", "player").reason, /この盤面/);
  assert.equal(getAwardStatus(state, "curator", "player").fundable, false);
  assert.match(getAwardStatus(state, "curator", "player").reason, /この盤面/);
  const before = computeScore(state, "player");
  state.fundedAwards = [{ awardId: "curator", playerId: "player" }];
  assert.equal(computeScore(state, "player") - before, 5, "an old funded award still scores after loading");
});

// Terra Cimmeria's own five and five, transcribed from the reference
// (src/server/milestones/terraCimmeria, src/server/awards/terraCimmeria).
test("Terra Cimmeria brings its own five milestones and five awards", () => {
  assert.deepEqual(
    milestonesForBoard("terra-cimmeria").map(entry => entry.id).sort(),
    ["t-collector", "firestarter", "terra-pioneer", "spacefarer", "gambler"].sort()
  );
  assert.deepEqual(
    awardsForBoard("terra-cimmeria").map(entry => entry.id).sort(),
    ["biologist", "incorporator", "t-politician", "urbanist", "warmonger"].sort()
  );
});

test("the Terra Cimmeria milestones score what the reference scores", () => {
  const milestone = id => milestonesForBoard("terra-cimmeria").find(entry => entry.id === id);

  // Firestarter: 20 heat HELD, not produced.
  assert.equal(milestone("firestarter").threshold, 20);
  assert.equal(milestone("firestarter").getScore({ player: { heat: 20, heatProd: 0 } }), 20);

  // Spacefarer: 6 space tags.
  assert.equal(milestone("spacefarer").threshold, 6);

  // Gambler: two awards funded BY THIS PLAYER.
  const gambler = milestone("gambler");
  assert.equal(gambler.threshold, 2);
  assert.equal(
    gambler.getScore({
      player: { id: "player" },
      fundedAwards: [{ awardId: "a", playerId: "player" }, { awardId: "b", playerId: "rival" }]
    }),
    1,
    "a rival's funding is not this player's"
  );

  // T. Collector: complete SETS of green, blue and red -- the smallest of the
  // three counts, so two greens and no events is zero sets.
  const collector = milestone("t-collector");
  assert.equal(collector.threshold, 3);
  const cards = [
    { id: "g1", type: "automated" },
    { id: "g2", type: "automated" },
    { id: "b1", type: "active" }
  ];
  assert.equal(
    collector.getScore({ player: { playedProjects: ["g1", "g2", "b1"], playedEvents: [] }, cards }),
    0,
    "no events means no complete set"
  );
  assert.equal(
    collector.getScore({ player: { playedProjects: ["g1", "g2", "b1"], playedEvents: ["e1"] }, cards }),
    1,
    "one of each is one set"
  );

  // Terra Pioneer: tiles on Mars, and an ocean is not one of them.
  const pioneer = milestone("terra-pioneer");
  assert.equal(pioneer.threshold, 5);
  const board = {
    "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player" },
    "1,0": { q: 1, r: 0, tileType: "forest", placedBy: "player" },
    "2,0": { q: 2, r: 0, tileType: "ocean", placedBy: "player" },
    "3,0": { q: 3, r: 0, tileType: "city", placedBy: "rival" }
  };
  assert.equal(
    pioneer.getScore({ player: { id: "player" }, board }),
    2,
    "the ocean does not count, and neither does the rival's city"
  );
});

test("the Terra Cimmeria awards score what the reference scores", () => {
  const award = id => awardsForBoard("terra-cimmeria").find(entry => entry.id === id);

  // Incorporator: 10 M€ or less, and NOT events -- unlike Utopia's version,
  // which reads the same threshold but is a different award entry.
  const cards = [
    { id: "cheap", cost: 8, type: "automated", tags: [] },
    { id: "cheapEvent", cost: 8, type: "event", tags: [] },
    { id: "dear", cost: 11, type: "automated", tags: [] }
  ];
  assert.equal(
    award("incorporator").getScore({ player: { playedProjects: ["cheap", "cheapEvent", "dear"] }, cards }),
    1,
    "only the cheap non-event counts"
  );

  // Biologist: animal, plant and microbe tags together.
  const tagged = [{ id: "t", type: "automated", tags: ["Plant", "Microbe", "Animal", "Space"] }];
  assert.equal(
    award("biologist").getScore({ player: { playedProjects: ["t"] }, cards: tagged, corporation: null }),
    3,
    "the space tag is not one of the three"
  );

  // T. Politician: delegates placed over the whole game, not those still seated.
  assert.equal(award("t-politician").getScore({ player: { delegatesPlaced: 4 } }), 4);

  // Warmonger: cards that take from other players, events included.
  const attacks = [
    { id: "attack", type: "event", effectSpec: { removeAnyPlants: 2 } },
    { id: "quiet", type: "automated", effectSpec: { mc: 3 } }
  ];
  assert.equal(
    award("warmonger").getScore({
      player: { playedProjects: ["quiet"], playedEvents: ["attack"] },
      cards: attacks
    }),
    1,
    "the event counts and the harmless card does not"
  );
});

// Through the engine rather than the scoring function: Gambler reads the game's
// funded awards and T. Politician a running count, and neither lives on the
// player where the other milestones look.
test("Gambler and T. Politician read state the engine actually maintains", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer,
          getMilestoneStatus, fundAward, sendDelegateToParty } = await import("../app/game-logic.js");
  const { awardsForBoard } = await import("../app/board-milestones.js");

  let state = getInitialState({ playerCount: 2, board: "terra-cimmeria", turmoil: true, seed: 9 });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 120 }));

  // Gambler: nothing funded yet, so it must not be claimable.
  assert.equal(getMilestoneStatus(state, "gambler", "player").score, 0);

  const available = awardsForBoard("terra-cimmeria").map(entry => entry.id);
  let funded = state;
  for (const awardId of available.slice(0, 2)) {
    const result = fundAward(funded, awardId, funded.logs, "player");
    assert.equal(result.funded, true, `${awardId} must be fundable`);
    funded = result.state;
  }
  assert.equal(
    getMilestoneStatus(funded, "gambler", "player").score,
    2,
    "the milestone sees the awards this player funded"
  );

  // T. Politician: the count rises as delegates are sent, and it is per player.
  const party = Object.keys(funded.turmoil.parties)[0];
  const sent = sendDelegateToParty(funded, party, funded.logs, "player");
  assert.equal(sent.sent, true);
  assert.equal(getPlayer(sent.state, "player").delegatesPlaced, 1);
  assert.equal(getPlayer(sent.state, "player2").delegatesPlaced ?? 0, 0, "the rival sent none");
});

test("Vastitas Borealis has its own board, milestones and awards", () => {
  const cells = getBoardCells("vastitas-borealis");
  const pole = cells.find(cell => cell.bonusType === "temperature");
  assert.ok(pole);
  assert.equal(pole.id, "33");
  assert.equal(pole.unshufflable, true);
  assert.equal(pole.bonusAmount, 1);
  assert.deepEqual(cells.filter(cell => cell.volcanic).map(cell => [cell.id, cell.name]), [
    ["05", "Hecates Tholus"], ["13", "Elysium Mons"],
    ["21", "Alba Mons"], ["46", "Uranius Tholus"]
  ]);
  assert.deepEqual(cells.filter(cell => cell.bonusType === "delegate").map(cell => cell.id), ["28", "59"]);
  assert.deepEqual(milestonesForBoard("vastitas-borealis").map(entry => entry.id),
    ["v-agronomist", "v-engineer", "v-spacefarer", "v-geologist", "v-farmer"]);
  assert.deepEqual(awardsForBoard("vastitas-borealis").map(entry => entry.id),
    ["v-traveller", "v-landscaper", "v-highlander", "v-promoter", "v-blacksmith"]);
});

test("Vastitas printed board matches every space's terrain and placement bonus", () => {
  const printedRows = [
    "p1 - s1 - -",
    "p2 p2 - - p1 c1",
    "c1 o:p2 o:p2 p2 p1 - -",
    "s2 t1 o:p2 p1 - c1 p1 d1",
    "- - o:p1 p2 T1 o:p2 o:p2 o:p2 c2",
    "c2 - p1 o:h2 o:h2+p1 o:c1 p1 t2",
    "t1 s1 o:- o:h2 p2 p1 -",
    "p1 - p1 s1+p1 s1 p1",
    "d1 - c1 t1 s1"
  ];
  const symbol = { plant: "p", steel: "s", titanium: "t", heat: "h", card: "c", delegate: "d", temperature: "T" };
  const cells = getBoardCells("vastitas-borealis");
  const actualRows = [...new Set(cells.map(cell => cell.r))].map(row => cells
    .filter(cell => cell.r === row)
    .map(cell => {
      const bonuses = cell.bonusType === "multi" ? cell.bonus :
        cell.bonusType === "none" ? [] : [{ type: cell.bonusType, amount: cell.bonusAmount }];
      return `${cell.isOceanOnly ? "o:" : ""}${bonuses.length ? bonuses.map(bonus => `${symbol[bonus.type]}${bonus.amount}`).join("+") : "-"}`;
    }).join(" "));
  assert.deepEqual(actualRows, printedRows);
});

test("Vastitas Viking sites send a free delegate only with Turmoil", async () => {
  const { placeTileAt, resolvePendingChoice } = await import("../app/game-logic.js");
  for (const id of ["28", "59"]) {
    const state = getInitialState({ board: "vastitas-borealis", turmoil: true });
    state.phase = "action";
    const owner = state.currentPlayerId;
    const cell = Object.values(state.board).find(candidate => candidate.id === id);
    const beforeMc = getPlayer(state, owner).mc;
    const beforeReserve = state.turmoil.delegateReserve[owner];
    placeTileAt(state, cell, "city", owner);
    assert.equal(state.pendingChoice?.kind, "placement-delegate", id);
    const settled = resolvePendingChoice(state, "mars", state.logs, owner).state;
    assert.equal(settled.turmoil.delegateReserve[owner], beforeReserve - 1, id);
    assert.equal(getPlayer(settled, owner).mc, beforeMc, id);

    const noTurmoil = getInitialState({ board: "vastitas-borealis" });
    noTurmoil.phase = "action";
    const sameCell = Object.values(noTurmoil.board).find(candidate => candidate.id === id);
    placeTileAt(noTurmoil, sameCell, "city", noTurmoil.currentPlayerId);
    assert.equal(noTurmoil.pendingChoice, null, id);
  }
});

test("legacy Vastitas milestones stay registered for saved games", () => {
  const milestone = id => getMilestone(id);
  const cards = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `power${i}`, tags: ["Power"] })),
    { id: "animal", resourceType: "animal" }, { id: "animal2", resourceType: "animal" },
    { id: "microbe", resourceType: "microbe" }, { id: "floater", resourceType: "floater" }
  ];
  const context = { player: { id: "player", playedProjects: [] }, cards, corporation: null, board: {} };
  for (const count of [3, 4, 5]) {
    assert.equal(milestone("v-electrician").threshold, 4);
    assert.equal(milestone("v-electrician").getScore({ ...context,
      player: { playedProjects: cards.slice(0, Math.min(count, 4)).map(c => c.id) },
      corporation: count === 5 ? { tags: ["Power"] } : null }), count);
  }
  for (const count of [5, 6, 7]) {
    assert.equal(milestone("smith").threshold, 6);
    assert.equal(milestone("smith").getScore({ player: { steelProd: 2, titaniumProd: count - 2, steel: 99 } }), count);
  }
  assert.equal(milestone("tradesman").threshold, 3);
  for (const floater of [0, 1]) {
    assert.equal(milestone("tradesman").getScore({ ...context,
      player: { cardResources: { animal: 5, animal2: 2, microbe: 1, floater } } }), 2 + floater);
  }
  assert.notEqual(milestone("tradesman").id, "trader");
  for (const count of [63, 64, 65]) {
    assert.equal(milestone("capitalist").threshold, 64);
    assert.equal(milestone("capitalist").getScore({ player: { mc: count, mcProd: 99 } }), count);
  }
  for (const count of [3, 4, 5]) {
    const board = {};
    for (let i = 0; i < count; i++) {
      board[`${i * 4},0`] = { q: i * 4, r: 0, tileType: "city", placedBy: "player" };
      board[`${i * 4 + 1},0`] = { q: i * 4 + 1, r: 0, tileType: "ocean", placedBy: null };
      board[`${i * 4},1`] = { q: i * 4, r: 1, tileType: "ocean", placedBy: null };
    }
    board["0,-1"] = { q: 0, r: -1, tileType: "empty", placedBy: "player" };
    board["1,-1"] = { q: 1, r: -1, tileType: "city", placedBy: "rival" };
    assert.equal(milestone("irrigator").threshold, 4);
    assert.equal(milestone("irrigator").getScore({ ...context, board }), count);
  }
});

test("legacy Vastitas awards stay registered for saved games", () => {
  const award = id => getAward(id);
  const cards = [
    { id: "required", type: "active", requirements: [{ temperature: -10 }], tags: ["Jovian"] },
    { id: "text", type: "automated", reqText: "海洋3枚", tags: [] },
    { id: "empty", type: "automated", requirements: [], reqText: "なし", tags: [] },
    { id: "event", type: "event", requirements: [{ oxygen: 4 }], tags: [] }
  ];
  const context = { player: { id: "player", playedProjects: cards.map(c => c.id), playedEvents: ["event"], hand: ["a", "b"] }, cards };
  assert.equal(award("forecaster").getScore(context), 2);
  assert.equal(award("forecaster").getScore({ ...context, player: { playedProjects: ["empty", "event"] } }), 0);
  assert.equal(award("visionary").getScore(context), 2);
  assert.equal(award("visionary").getScore({ player: { hand: [] } }), 0);
  assert.equal(award("naturalist").getScore({ player: { plantsProd: 2, heatProd: 3, plants: 99, heat: 99 } }), 5);
  assert.equal(award("naturalist").getScore({ player: {} }), 0);
  assert.equal(award("voyager").getScore({ ...context, corporation: { tags: ["Jovian"] } }), 2);
  assert.equal(award("voyager").getScore({ ...context, player: { playedProjects: [] } }), 0);
  const board = Object.fromEntries(getBoardCells("vastitas-borealis").map(cell => [`${cell.q},${cell.r}`, { ...cell, tileType: "empty", placedBy: null }]));
  for (const [key, owner] of [["4,-4", "player"], ["0,0", "player"], ["4,4", "player"], ["4,0", "player"], ["8,0", "rival"]]) {
    board[key] = { ...board[key], tileType: "city", placedBy: owner };
  }
  assert.equal(award("edgedancer").getScore({ ...context, board }), 3);
});

test("official Vastitas milestones use tags, production, volcanoes and card resources", () => {
  const milestone = id => milestonesForBoard("vastitas-borealis").find(entry => entry.id === id);
  const cards = [
    { id: "plant", tags: ["Plant"] }, { id: "space", tags: ["Space"] },
    { id: "animal", resourceType: "animal" }, { id: "microbe", resourceType: "microbe" },
    { id: "floater", resourceType: "floater" }
  ];
  const player = { id: "player", playedProjects: ["plant", "space"], selectedPreludeIds: [],
    energyProd: 6, heatProd: 4, cardResources: { animal: 3, microbe: 2, floater: 9 } };
  const board = {
    "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player", volcanic: true },
    "1,0": { q: 1, r: 0, tileType: "forest", placedBy: "player" },
    "2,0": { q: 2, r: 0, tileType: "city", placedBy: "player" },
    "3,0": { q: 3, r: 0, tileType: "city", placedBy: "player" }
  };
  const context = { player, cards, board, corporation: null, preludes: [] };
  assert.equal(milestone("v-agronomist").getScore(context), 1);
  assert.equal(milestone("v-engineer").getScore(context), 10);
  assert.equal(milestone("v-spacefarer").getScore(context), 1);
  assert.equal(milestone("v-geologist").getScore(context), 2);
  assert.equal(milestone("v-farmer").getScore(context), 5);
});

test("official Vastitas awards count connected groups and non-coastal tiles", () => {
  const award = id => awardsForBoard("vastitas-borealis").find(entry => entry.id === id);
  const cards = [{ id: "j", tags: ["Jovian"] }, { id: "e", tags: ["Earth"] }];
  const player = { id: "player", playedProjects: ["j", "e"], playedEvents: ["event"],
    selectedPreludeIds: [], steelProd: 2, titaniumProd: 3 };
  const board = {
    "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player" },
    "1,0": { q: 1, r: 0, tileType: "forest", placedBy: "player" },
    "2,0": { q: 2, r: 0, tileType: "city", placedBy: "player" },
    "5,0": { q: 5, r: 0, tileType: "city", placedBy: "player" },
    "1,1": { q: 1, r: 1, tileType: "ocean", placedBy: null }
  };
  const context = { player, cards, board, corporation: null, preludes: [] };
  assert.equal(award("v-traveller").getScore(context), 2);
  assert.equal(award("v-landscaper").getScore(context), 3);
  assert.equal(award("v-highlander").getScore(context), 2);
  assert.equal(award("v-promoter").getScore(context), 1);
  assert.equal(award("v-blacksmith").getScore(context), 5);
});

async function vastitasTable(mc = 20, temperature = -30) {
  const { applyCorporation, completeSetupPurchase, cloneGameState, CORPORATIONS } = await import("../app/game-logic.js");
  let state = getInitialState({ playerCount: 2, board: "vastitas-borealis", seed: 71 });
  for (const player of state.players) state = applyCorporation(state, CORPORATIONS.find(c => c.id === "corp-credicor"), player.id);
  for (let i = 0; state.phase === "setup" && i < 12; i++) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc, plants: 8 }));
  state.temperature = temperature;
  const pole = Object.values(state.board).find(cell => cell.bonusType === "temperature");
  assert.ok(pole, "the real dealt map must contain the temperature bonus");
  return { state, pole, seat: state.currentPlayerId };
}

for (const answer of ["amount-1"]) {
  test(`Vastitas real placement requires the paid temperature step: ${answer}`, async () => {
    const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
    const { getPlayer } = await import("../app/game-logic.js");
    const { state, pole, seat } = await vastitasTable(4);
    const project = executeGameCommand(state, { type: COMMAND.STANDARD_PROJECT, playerId: seat, projectId: "convert-plants" });
    assert.equal(project.ok, true);
    const placed = executeGameCommand(project.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: `${pole.q},${pole.r}` });
    assert.equal(placed.ok, true);
    assert.equal(placed.state.board[`${pole.q},${pole.r}`].tileType, "forest");
    assert.equal(placed.state.pendingChoice?.continuation.stage, "placement-temperature");
    assert.equal(placed.state.pendingChoice.optional, false);
    assert.equal(placed.state.pendingChoice.options[0].label, "4 MCを支払い、気温 +2°C");
    assert.equal(placed.state.temperature, -30);
    const declined = executeGameCommand(placed.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: "__decline__" });
    assert.equal(declined.state.pendingChoice?.continuation.stage, "placement-temperature");
    assert.equal(declined.state.temperature, -30);
    const before = getPlayer(placed.state, seat);
    const paid = executeGameCommand(placed.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: answer });
    assert.equal(paid.ok, true);
    assert.equal(getPlayer(paid.state, seat).mc, before.mc - 4);
    assert.equal(getPlayer(paid.state, seat).tr, before.tr + 1);
    assert.equal(paid.state.temperature, -28);
    assert.equal(paid.state.pendingChoice, null);
  });
}

for (const [mc, temperature] of [[3, -30], [0, -30], [4, 8]]) {
  test(`Vastitas skips unaffordable or capped temperature bonus (${mc}, ${temperature})`, async () => {
    const { placeTileAt, getPlayer } = await import("../app/game-logic.js");
    const { state, pole, seat } = await vastitasTable(mc, temperature);
    placeTileAt(state, pole, "city", seat);
    assert.equal(state.pendingChoice, null);
    assert.equal(state.temperature, temperature);
    assert.equal(getPlayer(state, seat).mc, mc);
  });
}

for (const start of [-26, -22, -2]) {
  test(`Vastitas paid temperature crosses ${start + 2} exactly once and finishes the project`, async () => {
    const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
    const { getPlayer } = await import("../app/game-logic.js");
    const { state, pole, seat } = await vastitasTable(20, start);
    const before = getPlayer(state, seat);
    const project = executeGameCommand(state, { type: COMMAND.STANDARD_PROJECT, projectId: "convert-plants", playerId: seat });
    let result = executeGameCommand(project.state, { type: COMMAND.RESOLVE_PENDING, optionId: `${pole.q},${pole.r}`, playerId: seat });
    assert.equal(result.state.pendingChoice?.continuation.stage, "placement-temperature");
    // The pending placement and its continuation must survive a save/reload.
    result = executeGameCommand(JSON.parse(JSON.stringify(result.state)), { type: COMMAND.RESOLVE_PENDING, optionId: "amount-1", playerId: seat });
    assert.equal(result.ok, true);
    if (start === -2) {
      assert.equal(result.state.pendingChoice?.continuation.stage, "temperature-zero-ocean");
      const ocean = result.state.pendingChoice.options[0].id;
      result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, optionId: ocean, playerId: seat });
      assert.equal(result.state.oceans, state.oceans + 1);
    } else {
      assert.equal(getPlayer(result.state, seat).heatProd, before.heatProd + 1);
    }
    assert.equal(result.state.pendingChoice, null);
    assert.equal(result.state.temperature, start + 2);
    assert.equal(getPlayer(result.state, seat).tr, before.tr + (start === -2 ? 3 : 2));
    assert.equal(result.state.actionsRemaining, state.actionsRemaining - 1);
    assert.match(result.state.logs.map(log => log.text ?? log.message ?? "").join("\n"), /標準プロジェクト/);
  });
}

test("Vastitas multi-bonuses and repeated payments preserve other choices and never overdraw", async () => {
  const { placeTileAt, resolvePendingChoice, getPlayer } = await import("../app/game-logic.js");
  const { buildAmountChoice } = await import("../app/pending-choice.js");
  const { state, pole, seat } = await vastitasTable(4);
  const original = buildAmountChoice(state, { sourceKind: "test", sourceId: "existing", max: 1 });
  state.pendingChoice = original;
  const before = getPlayer(state, seat);
  const multi = { ...pole, bonusType: "multi", bonus: [{ type: "temperature", amount: 2 }, { type: "steel", amount: 2 }, { type: "card", amount: 1 }] };
  placeTileAt(state, multi, "city", seat);
  assert.equal(state.pendingChoice.id, original.id);
  assert.equal(state.pendingChoiceQueue.length, 2);
  assert.equal(getPlayer(state, seat).steel, before.steel + 2);
  assert.equal(getPlayer(state, seat).hand.length, before.hand.length + 1);
  let result = resolvePendingChoice(state, "amount-1", state.logs, seat);
  result = resolvePendingChoice(result.state, "amount-1", result.logs, seat);
  result = resolvePendingChoice(result.state, "amount-1", result.logs, seat);
  assert.equal(getPlayer(result.state, seat).mc, 0);
  assert.equal(result.state.temperature, -28);
  assert.equal(result.state.pendingChoice, null);
});

for (const answer of ["amount-1"]) {
  test(`Vastitas preserves a card's follow-up placement and after-play work: ${answer}`, async () => {
    const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
    const { buildTileChoice } = await import("../app/pending-choice.js");
    const { legalCellsFor } = await import("../app/game-logic.js");
    const { state, pole, seat } = await vastitasTable(30);
    state.pendingChoice = buildTileChoice(state, "city", {
      sourceKind: "card", sourceId: "card-base-research-outpost", remaining: 2,
      afterPlay: { cardId: "card-base-research-outpost", temperature: state.temperature, oxygen: state.oxygen }
    }, legalCellsFor(state, "city", seat));
    let result = executeGameCommand(state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: `${pole.q},${pole.r}` });
    assert.equal(result.state.pendingChoice?.continuation.stage, "placement-temperature");
    result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: answer });
    assert.equal(result.state.pendingChoice?.kind, "tile-placement");
    assert.equal(result.state.pendingChoice.continuation.remaining, 1);
    const target = result.state.pendingChoice.options[0].id;
    result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: target });
    assert.equal(result.state.pendingChoice, null);
    assert.equal(Object.values(result.state.board).filter(c => c.tileType === "city" && c.placedBy === seat).length, 2);
    assert.equal(result.state.actionsRemaining, state.actionsRemaining - 1);
  });
}

for (const answer of ["amount-1"]) {
  test(`Vastitas automatic prelude placement resumes the next prelude: ${answer}`, async () => {
    const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
    const { getPlayer } = await import("../app/game-logic.js");
    const { state, pole, seat } = await vastitasTable(30);
    state.phase = "setup";
    const ids = ["prelude-experimental-forest", "prelude-power-generation"];
    state.players = state.players.map(p => p.id === seat ? { ...p, setupStep: "prelude", preludeOptions: ids } : p);
    // Force the automatic branch to use the real pole; all other land is occupied.
    state.board = Object.fromEntries(Object.entries(state.board).map(([key, c]) => [key,
      c.id === pole.id || c.isOceanOnly ? c : { ...c, tileType: "forest", placedBy: "rival" }]));
    const before = getPlayer(state, seat).energyProd;
    let result = executeGameCommand(state, { type: COMMAND.SELECT_PRELUDES, playerId: seat, preludeIds: ids });
    assert.equal(result.ok, true);
    assert.equal(result.state.pendingChoice?.continuation.stage, "placement-temperature");
    assert.equal(getPlayer(result.state, seat).energyProd, before);
    result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: answer });
    assert.equal(result.ok, true);
    assert.equal(getPlayer(result.state, seat).energyProd, before + 3);
    assert.equal(result.state.pendingChoice, null);
  });
}

test("Vastitas real card play retains its discount, trigger and action through the bonus", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");
  const { state, pole, seat } = await vastitasTable(60, -26);
  const id = "card-base-research-outpost";
  state.players = state.players.map(p => p.id === seat ? { ...p, hand: [id, "p-power-plant"], playedProjects: ["p-mars-university", "p-rover-construction"] } : p);
  let result = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: id });
  assert.equal(result.ok, true);
  assert.equal(result.state.pendingChoice.kind, "tile-placement");
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: `${pole.q},${pole.r}` });
  assert.equal(result.state.pendingChoice.continuation.stage, "placement-temperature");
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: "amount-1" });
  assert.equal(result.state.pendingChoice?.continuation.stage, "mars-university");
  assert.equal(result.state.actionsRemaining, state.actionsRemaining);
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: "__decline__" });
  assert.equal(result.state.pendingChoice, null);
  assert.equal(getPlayer(result.state, seat).heatProd, getPlayer(state, seat).heatProd + 1);
  assert.equal(result.state.actionsRemaining, state.actionsRemaining - 1);
  assert.ok(getPlayer(result.state, seat).playedProjects.includes(id));
});

test("Vastitas prelude waits for the paid temperature ocean before resuming setup", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");
  const { state, pole, seat } = await vastitasTable(30, -2);
  state.phase = "setup";
  const ids = ["prelude-experimental-forest", "prelude-power-generation"];
  state.players = state.players.map(p => p.id === seat ? { ...p, setupStep: "prelude", preludeOptions: ids } : p);
  state.board = Object.fromEntries(Object.entries(state.board).map(([key, c]) => [key,
    c.id === pole.id || c.isOceanOnly ? c : { ...c, tileType: "forest", placedBy: "rival" }]));
  const before = getPlayer(state, seat).energyProd;
  let result = executeGameCommand(state, { type: COMMAND.SELECT_PRELUDES, playerId: seat, preludeIds: ids });
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: "amount-1" });
  assert.equal(result.state.pendingChoice?.continuation.stage, "temperature-zero-ocean");
  assert.equal(getPlayer(result.state, seat).energyProd, before);
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, playerId: seat, optionId: result.state.pendingChoice.options[0].id });
  assert.equal(getPlayer(result.state, seat).energyProd, before + 3);
  assert.equal(result.state.pendingChoice, null);
});

test("Vastitas Electrician counts actual power cards and prelude tags", async () => {
  const { ALL_CARDS, getMilestoneStatus, getPlayer } = await import("../app/game-logic.js");
  const { state, seat } = await vastitasTable(64);
  const power = ALL_CARDS.filter(card => card.type !== "event" && card.tags.includes("Power")).slice(0, 3);
  assert.equal(power.length, 3);
  state.players = state.players.map(p => p.id === seat ? { ...p, playedProjects: power.map(c => c.id), selectedPreludeIds: ["prelude-power-generation"] } : p);
  assert.equal(getMilestone("v-electrician").getScore({ player: getPlayer(state, seat), cards: ALL_CARDS, corporation: null, preludes: [] }), 3);
  assert.equal(getMilestoneStatus(state, "v-electrician", seat).claimable, false);
  state.players = state.players.map(p => p.id === seat ? { ...p, selectedPreludeIds: [] } : p);
  assert.equal(getMilestoneStatus(state, "v-electrician", seat).claimable, false);
});

test("Vastitas mixed resource payout can fund the temperature offer", async () => {
  const { placeTileAt, resolvePendingChoice, getPlayer } = await import("../app/game-logic.js");
  const { state, pole, seat } = await vastitasTable(0);
  placeTileAt(state, { ...pole, bonusType: "multi", bonus: [{ type: "temperature", amount: 1 }, { type: "mc", amount: 4 }] }, "city", seat);
  assert.equal(state.pendingChoice?.continuation.stage, "placement-temperature");
  const result = resolvePendingChoice(state, "amount-1", state.logs, seat);
  assert.equal(getPlayer(result.state, seat).mc, 0);
  assert.equal(result.state.temperature, -28);
});

test("Vastitas greenery threshold and paid step award each heat threshold once", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");
  const { state, pole, seat } = await vastitasTable(20, -24);
  state.oxygen = 7;
  const before = getPlayer(state, seat);
  let result = executeGameCommand(state, { type: COMMAND.STANDARD_PROJECT, projectId: "convert-plants", playerId: seat });
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, optionId: `${pole.q},${pole.r}`, playerId: seat });
  result = executeGameCommand(result.state, { type: COMMAND.RESOLVE_PENDING, optionId: "amount-1", playerId: seat });
  assert.equal(result.state.temperature, -20);
  assert.equal(getPlayer(result.state, seat).tr, before.tr + 3);
  assert.equal(getPlayer(result.state, seat).heatProd, before.heatProd + 1);
  assert.equal(result.state.actionsRemaining, state.actionsRemaining - 1);
});

test("Vastitas payment and TR belong to the placer and reject another player's answer", async () => {
  const { placeTileAt, resolvePendingChoice, getPlayer } = await import("../app/game-logic.js");
  const { state, pole, seat } = await vastitasTable(4);
  const owner = state.players.find(p => p.id !== seat).id;
  const before = getPlayer(state, owner);
  placeTileAt(state, pole, "city", owner);
  const rejected = resolvePendingChoice(state, "amount-1", state.logs, seat);
  assert.equal(rejected.state, state);
  const result = resolvePendingChoice(state, "amount-1", state.logs, owner);
  assert.equal(getPlayer(result.state, owner).mc, 0);
  assert.equal(getPlayer(result.state, owner).tr, before.tr + 1);
  assert.equal(getPlayer(result.state, seat).mc, 4);
});
