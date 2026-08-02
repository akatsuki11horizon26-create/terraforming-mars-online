import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CARDS,
  getInitialState,
  applyCardEffect,
  resolvePendingChoice,
  getCardEffect,
  legalCellsFor
} from "../app/game-logic.js";
import { CARD_RESOURCE_TYPES, getCardResourceType } from "../app/card-resource-types.js";

const microbeCards = Object.entries(CARD_RESOURCE_TYPES)
  .filter(([, type]) => type === "microbe")
  .map(([id]) => id);

const microbeGiver = ALL_CARDS.find(
  card => card.effectSpec?.behavior?.addResourcesToAnyCard?.type === "Microbe"
);

test("Resource-holding cards are identified from the reference data", () => {
  assert.ok(microbeCards.length >= 10, "the base game has many microbe cards");
  assert.equal(getCardResourceType("card-base-ants"), "microbe");
  assert.equal(getCardResourceType("card-base-birds"), "animal");
  assert.equal(getCardResourceType("card-base-search-for-life"), "science");
});

test("Adding resources to any card pauses for the player's choice", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].playedProjects = microbeCards.slice(0, 2);

  const result = applyCardEffect(state, microbeGiver, state.logs);

  assert.equal(result.status, "pending");
  assert.equal(result.pendingChoice.kind, "any-card-resource");
  assert.equal(result.pendingChoice.options.length, 2);
  assert.equal(result.pendingChoice.ownerPlayerId, "player");
});

test("Only cards holding the named resource are offered", () => {
  const state = getInitialState();
  const animal = Object.entries(CARD_RESOURCE_TYPES).find(([, t]) => t === "animal")[0];
  state.players[0].playedProjects = [...microbeCards.slice(0, 2), animal];

  const result = applyCardEffect(state, microbeGiver, state.logs);
  assert.equal(result.status, "pending");
  assert.equal(
    result.pendingChoice.options.every(option => microbeCards.includes(option.targetCardId)),
    true,
    "an animal card is never offered for a microbe effect"
  );
});

test("Resolving places the resources on the chosen card", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].playedProjects = microbeCards.slice(0, 2);

  const pending = applyCardEffect(state, microbeGiver, state.logs);
  const target = pending.pendingChoice.options[1];
  const resolved = resolvePendingChoice(pending.state, target.id, pending.logs, "player");

  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.state.pendingChoice, null);
  assert.equal(resolved.state.players[0].cardResources[target.targetCardId], 2);
});

test("A single legal target applies without prompting", () => {
  const state = getInitialState();
  state.players[0].playedProjects = [microbeCards[0]];

  const result = applyCardEffect(state, microbeGiver, state.logs);

  assert.equal(result.status, "resolved", "one option is not a decision");
  assert.equal(result.state.players[0].cardResources[microbeCards[0]], 2);
});

test("Another player cannot resolve someone else's choice", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].playedProjects = microbeCards.slice(0, 2);

  const pending = applyCardEffect(state, microbeGiver, state.logs);
  const stolen = resolvePendingChoice(
    pending.state,
    pending.pendingChoice.options[0].id,
    pending.logs,
    "player2"
  );

  assert.equal(stolen.status, "pending", "the choice stays open");
  assert.equal(stolen.state.pendingChoice.ownerPlayerId, "player");
});

test("An invalid option is refused without consuming the choice", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].playedProjects = microbeCards.slice(0, 2);

  const pending = applyCardEffect(state, microbeGiver, state.logs);
  const bogus = resolvePendingChoice(pending.state, "no-such-option", pending.logs, "player");

  assert.equal(bogus.status, "pending");
  assert.ok(bogus.state.pendingChoice);
});

test("A pending choice survives serialization", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].playedProjects = microbeCards.slice(0, 2);

  const pending = applyCardEffect(state, microbeGiver, state.logs);
  const roundTripped = JSON.parse(JSON.stringify({ ...pending.state }));

  assert.equal(roundTripped.pendingChoice.kind, "any-card-resource");
  assert.equal(roundTripped.pendingChoice.continuation.stage, "any-card-resource");
  assert.equal(
    Object.values(roundTripped.pendingChoice).some(value => typeof value === "function"),
    false,
    "choices never carry functions"
  );
});

test("Tile placement asks the player where the tile goes", () => {
  const state = getInitialState();
  const ocean = ALL_CARDS.find(card => card.id === "p-ice-asteroid");

  let result = applyCardEffect(state, ocean, state.logs);
  assert.equal(result.status, "pending");
  assert.equal(result.pendingChoice.kind, "tile-placement");
  assert.equal(result.state.oceans, 0, "nothing is placed before the player chooses");

  const legal = legalCellsFor(result.state, "ocean");
  assert.equal(result.pendingChoice.options.length, legal.length);

  for (let i = 0; i < 2; i++) {
    const option = result.state.pendingChoice.options[0];
    result = resolvePendingChoice(result.state, option.id, result.logs, "player");
  }

  assert.equal(result.status, "resolved");
  assert.equal(result.state.oceans, 2);
});

test("Placement bonuses go to the player who covers the space", () => {
  const state = getInitialState();
  const ocean = ALL_CARDS.find(card => card.id === "p-ice-asteroid");

  const pending = applyCardEffect(state, ocean, state.logs);
  const bonusOption = pending.state.pendingChoice.options.find(option => {
    const cell = pending.state.board[option.targetCellKey];
    return cell.bonusType === "steel" && cell.bonusAmount > 0;
  });
  assert.ok(bonusOption, "at least one ocean space grants steel");

  const before = pending.state.players[0].steel;
  const cell = pending.state.board[bonusOption.targetCellKey];
  const resolved = resolvePendingChoice(pending.state, bonusOption.id, pending.logs, "player");

  assert.equal(resolved.state.players[0].steel, before + cell.bonusAmount);
});

test("Special tiles occupy a space and keep their identity", () => {
  const special = ALL_CARDS.find(card => {
    const effect = getCardEffect(card);
    return effect.tile === "special" && effect.specialName;
  });
  assert.ok(special, "the catalog contains special-tile cards");

  const effect = getCardEffect(special);
  assert.equal(effect.tile, "special");
  assert.ok(effect.specialName);
  assert.equal(
    (effect.unsupported ?? []).some(reason => reason.startsWith("tile:")),
    false,
    "special tiles are no longer reported as unimplemented"
  );
});

test("Counted gains scale with what is on the table", () => {
  const prOffice = ALL_CARDS.find(card => (card.englishName ?? card.name) === "PR Office");
  const state = getInitialState();
  state.players[0].playedProjects = ALL_CARDS.filter(card => card.tags?.includes("Earth"))
    .slice(0, 3)
    .map(card => card.id);

  const before = state.players[0].mc;
  const result = applyCardEffect(state, prOffice, state.logs);
  assert.equal(result.state.players[0].mc - before, 3, "1 MC per Earth tag");
});

test("City counts include every player's cities", () => {
  const aerosport = ALL_CARDS.find(card => (card.englishName ?? card.name) === "Aerosport Tournament");
  const state = getInitialState({ playerCount: 2 });

  const land = Object.values(state.board)
    .filter(cell => !cell.isOceanOnly && cell.tileType === "empty")
    .slice(0, 3);
  land[0].tileType = "city";
  land[0].placedBy = "player";
  land[1].tileType = "city";
  land[1].placedBy = "player2";
  land[2].tileType = "city";
  land[2].placedBy = "player";

  const before = state.players[0].mc;
  const result = applyCardEffect(state, aerosport, state.logs);
  assert.equal(
    result.state.players[0].mc - before,
    3,
    "the card reads 'per each city tile in play'"
  );
});

test("Placing next to an ocean pays 2 MC per adjacent ocean", async () => {
  // "各海洋タイルは、隣接するように配置された他のタイルに対し、それぞれ
  // ２Ｍ€の配置ボーナスをもたらします" — the engine's own placement path has to
  // pay this, not just the inline handler in page.tsx.
  const { getAdjacentCells, countAdjacentOceans } = await import("../app/game-logic.js");

  const state = getInitialState({ playerCount: 2 });
  const seed = Object.values(state.board).find(cell => cell.isOceanOnly);
  seed.tileType = "ocean";
  state.oceans = 1;

  const greeneryCard = ALL_CARDS.find(card => card.effectSpec?.behavior?.greenery !== undefined);
  assert.ok(greeneryCard, "the catalog has a greenery-placing card");

  let result = applyCardEffect(state, greeneryCard, state.logs);
  assert.equal(result.status, "pending");

  const adjacent = new Set(
    getAdjacentCells(seed.q, seed.r).map(pos => `${pos.q},${pos.r}`)
  );
  const option = result.state.pendingChoice.options.find(o => adjacent.has(o.targetCellKey));
  assert.ok(option, "a legal space next to the ocean exists");

  const cell = result.state.board[option.targetCellKey];
  const oceans = countAdjacentOceans(cell.q, cell.r, result.state.board);
  const spaceBonus = cell.bonusType === "mc" ? cell.bonusAmount : 0;
  const before = result.state.players[0].mc;

  result = resolvePendingChoice(result.state, option.id, result.logs, "player");

  assert.equal(
    result.state.players[0].mc - before,
    spaceBonus + oceans * 2,
    "the placement bonus and the ocean adjacency bonus both apply"
  );
});
