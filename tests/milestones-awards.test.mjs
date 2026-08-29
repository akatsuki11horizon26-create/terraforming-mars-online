import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  getInitialState,
  claimMilestone,
  fundAward,
  getMilestoneStatus,
  getAwardStatus,
  computeScore,
  getNextAwardCost,
  cloneGameState,
  MILESTONES,
  AWARDS,
  PRELUDES
} from "../app/game-logic.js";
import { scoreAward, getAward, AWARD_COSTS, MILESTONE_COST } from "../app/milestones-awards.js";

function freeLand(state, count) {
  return Object.values(state.board)
    .filter(cell => !cell.isOceanOnly && cell.tileType === "empty" && !cell.reservedFor)
    .slice(0, count);
}

test("Tharsis offers the five official milestones and awards", () => {
  assert.deepEqual(
    MILESTONES.map(m => m.id),
    ["terraformer", "mayor", "gardener", "builder", "planner"]
  );
  assert.deepEqual(
    AWARDS.map(a => a.id),
    ["landlord", "banker", "scientist", "thermalist", "miner"]
  );
});

test("The Terraformer description follows the live threshold", () => {
  const plain = getInitialState();
  const plainStatus = getMilestoneStatus(plain, "terraformer", "player");
  assert.equal(plainStatus.threshold, 35);
  assert.equal(plainStatus.description, "TR 35以上");

  // Turmoil lowers the requirement to 26; the text must move with it or the
  // panel reads "TR 35以上" beside a 26/26 progress line.
  const turmoil = getInitialState({ playerCount: 2, turmoil: true });
  const turmoilStatus = getMilestoneStatus(turmoil, "terraformer", "player");
  assert.equal(turmoilStatus.threshold, 26);
  assert.equal(turmoilStatus.description, "TR 26以上");
});

test("Fixed-requirement milestones keep their own description", () => {
  const state = getInitialState({ playerCount: 2, turmoil: true });
  assert.equal(getMilestoneStatus(state, "mayor", "player").description, "都市タイル3枚以上");
});

test("A milestone cannot be claimed below its threshold", () => {
  const state = getInitialState();
  const status = getMilestoneStatus(state, "terraformer", "player");

  assert.equal(status.claimable, false);
  assert.equal(status.threshold, 35);
  assert.equal(status.score, 14, "starting TR");
});

test("Claiming a milestone costs 8 MC and is recorded once", () => {
  // Milestones are a multiplayer race; the solo variant leaves them out, so
  // this has to be a table with opponents to exercise the cost at all.
  const state = getInitialState({ playerCount: 2 });
  state.players[0].tr = 35;

  const before = state.players[0].mc;
  const result = claimMilestone(state, "terraformer", state.logs, "player");

  assert.equal(result.claimed, true);
  assert.equal(result.state.players[0].mc, before - MILESTONE_COST);
  assert.deepEqual(result.state.claimedMilestones, [
    { milestoneId: "terraformer", playerId: "player" }
  ]);

  const again = claimMilestone(result.state, "terraformer", result.logs, "player");
  assert.equal(again.claimed, false, "a claimed milestone cannot be taken twice");
});

test("At most three milestones may be claimed", () => {
  let state = getInitialState({ playerCount: 2 });
  state.players[0].tr = 40;
  state.players[0].mc = 100;
  state.players[0].hand = new Array(16).fill("x");

  const cities = freeLand(state, 3);
  for (const cell of cities) {
    cell.tileType = "city";
    cell.placedBy = "player";
  }

  for (const id of ["terraformer", "mayor", "planner"]) {
    const result = claimMilestone(state, id, state.logs, "player");
    assert.equal(result.claimed, true, `${id} should be claimable`);
    state = result.state;
  }

  assert.equal(state.claimedMilestones.length, 3);
  const gardener = getMilestoneStatus(state, "gardener", "player");
  assert.equal(gardener.claimable, false, "the fourth milestone is refused");
});

test("Award funding costs escalate 8 / 14 / 20", () => {
  let state = getInitialState({ playerCount: 2 });
  state.players[0].mc = 100;

  assert.equal(getNextAwardCost(state), AWARD_COSTS[0]);

  const ids = ["banker", "scientist", "miner"];
  for (let i = 0; i < ids.length; i++) {
    const expected = AWARD_COSTS[i];
    const before = state.players[0].mc;
    const result = fundAward(state, ids[i], state.logs, "player");
    assert.equal(result.funded, true);
    assert.equal(result.state.players[0].mc, before - expected, `award ${i + 1} costs ${expected}`);
    state = result.state;
  }

  assert.equal(state.fundedAwards.length, 3);
  const fourth = getAwardStatus(state, "landlord", "player");
  assert.equal(fourth.fundable, false, "only three awards may be funded");
});

test("An award pays 5 VP for first and 2 VP for second", () => {
  const state = getInitialState({ playerCount: 3 });
  state.players[0].mcProd = 10;
  state.players[1].mcProd = 5;
  state.players[2].mcProd = 1;

  const result = scoreAward(getAward("banker"), state, { cards: [], corporations: [] });

  assert.equal(result.vp.player, 5);
  assert.equal(result.vp.player2, 2);
  assert.equal(result.vp.player3, undefined, "third place scores nothing");
});

test("Tied first place splits 5 VP each and pays no second place", () => {
  const state = getInitialState({ playerCount: 3 });
  state.players[0].mcProd = 7;
  state.players[1].mcProd = 7;
  state.players[2].mcProd = 3;

  const result = scoreAward(getAward("banker"), state, { cards: [], corporations: [] });

  assert.equal(result.vp.player, 5);
  assert.equal(result.vp.player2, 5);
  assert.equal(
    result.vp.player3,
    undefined,
    "a shared first place consumes second place"
  );
});

test("A two-player game pays no second place", () => {
  // "ただし２人プレイでは次席の褒賞はありません" — with only two players the
  // runner-up is simply the loser, so the award pays first place alone.
  const duel = getInitialState({ playerCount: 2 });
  duel.players[0].mcProd = 10;
  duel.players[1].mcProd = 5;

  const result = scoreAward(getAward("banker"), duel, { cards: [], corporations: [] });
  assert.equal(result.vp.player, 5);
  assert.equal(result.vp.player2, undefined);

  // Three or more players restore the second-place payout.
  const trio = getInitialState({ playerCount: 3 });
  trio.players[0].mcProd = 10;
  trio.players[1].mcProd = 5;
  trio.players[2].mcProd = 1;
  const trioResult = scoreAward(getAward("banker"), trio, { cards: [], corporations: [] });
  assert.equal(trioResult.vp.player2, 2);
});

// The rule is "most", with no minimum: a funded award always pays out. When
// every seat sits at zero they are all tied for first, so they all collect --
// and second place is skipped because first is shared.
test("An award everybody ties at zero on still pays first place", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].mcProd = 0;
  state.players[1].mcProd = 0;

  const result = scoreAward(getAward("banker"), state, { cards: [], corporations: [] });
  assert.deepEqual(
    result.vp,
    { [state.players[0].id]: 5, [state.players[1].id]: 5 },
    "a tie at zero is still a tie for most"
  );
});

// A negative leader still leads: Banker counts M€ production, which can go below
// zero, and the award is funded either way.
test("An award pays the least-negative player when all scores are below zero", () => {
  const state = getInitialState({ playerCount: 3 });
  state.players[0].mcProd = -1;
  state.players[1].mcProd = -3;
  state.players[2].mcProd = -3;

  const result = scoreAward(getAward("banker"), state, { cards: [], corporations: [] });
  assert.equal(result.vp[state.players[0].id], 5, "the highest score wins even when negative");
  assert.equal(result.vp[state.players[1].id], 2, "the tied runners-up split second");
  assert.equal(result.vp[state.players[2].id], 2);
});

test("Milestone and award victory points reach the final score", () => {
  let state = getInitialState({ playerCount: 2 });
  state.players[0].tr = 35;
  state.players[0].mc = 100;
  state.players[0].mcProd = 9;
  state.players[1].mcProd = 1;

  const baseline = computeScore(state, "player");

  state = claimMilestone(state, "terraformer", state.logs, "player").state;
  state = fundAward(state, "banker", state.logs, "player").state;

  const scored = computeScore(state, "player");
  // 5 VP for the milestone, 5 VP for winning the award.
  assert.equal(scored, baseline + 10);

  const opponent = computeScore(state, "player2");
  assert.equal(opponent, computeScore(state, "player2"), "scoring is stable");
});

// Preludes are kept in selectedPreludeIds, so a scorer that only walks
// playedProjects drops them silently -- no error, just missing points.
test("a prelude's victory points reach the final score", () => {
  const nobel = PRELUDES.find(prelude => prelude.id === "card-prelude2-nobel-prize");
  assert.equal(nobel.victoryPoints, 2, "Nobel Prize is the flat-2 prelude");

  const state = cloneGameState(getInitialState({ playerCount: 2 }));
  const seat = state.players[0].id;
  state.players = state.players.map(player =>
    player.id === seat ? { ...player, corporationId: null } : player
  );
  const baseline = computeScore(state, seat);

  const withPrelude = cloneGameState(state);
  withPrelude.players = withPrelude.players.map(player =>
    player.id === seat ? { ...player, selectedPreludeIds: [nobel.id] } : player
  );

  assert.equal(computeScore(withPrelude, seat), baseline + 2);
});

test("a prelude scoring per resource counts what is on it", () => {
  const asteroids = PRELUDES.find(
    prelude => prelude.id === "card-prelude2-main-belt-asteroids"
  );
  assert.equal(asteroids.victoryPointSpec.per, 2, "one point per two asteroids");

  const state = cloneGameState(getInitialState({ playerCount: 2 }));
  const seat = state.players[0].id;
  state.players = state.players.map(player =>
    player.id === seat ? { ...player, corporationId: null } : player
  );
  const baseline = computeScore(state, seat);

  const stocked = cloneGameState(state);
  stocked.players = stocked.players.map(player =>
    player.id === seat
      ? {
          ...player,
          selectedPreludeIds: [asteroids.id],
          cardResources: { [asteroids.id]: 7 }
        }
      : player
  );

  // Seven asteroids at one point per two, rounded down.
  assert.equal(computeScore(stocked, seat), baseline + 3);
});

// These two count the whole board or the whole colony track. They are never
// placed, so a scorer that only reads adjacency past a cardPlacements lookup
// silently gives them nothing.
test("Immigration Shuttles scores one point per three cities anywhere", () => {
  function scoreWith(cityCount, projects) {
    const state = cloneGameState(getInitialState({ playerCount: 2 }));
    const seat = state.players[0].id;
    const land = Object.values(state.board)
      .filter(cell => cell.tileType === "empty" && !cell.isOceanOnly)
      .slice(0, cityCount);
    for (const cell of land) {
      state.board[`${cell.q},${cell.r}`] = {
        ...state.board[`${cell.q},${cell.r}`],
        tileType: "city",
        placedBy: seat
      };
    }
    state.players = state.players.map(player =>
      player.id === seat ? { ...player, corporationId: null, playedProjects: projects } : player
    );
    return computeScore(state, seat);
  }

  // Cities also pay for adjacent greeneries, so the card's own contribution is
  // the gap between the same board with and without it.
  const card = ["card-base-immigration-shuttles"];
  assert.equal(scoreWith(3, card) - scoreWith(3, []), 1);
  assert.equal(scoreWith(6, card) - scoreWith(6, []), 2);
  assert.equal(scoreWith(7, card) - scoreWith(7, []), 2, "the remainder is dropped");
});

test("Space Port Colony scores one point per two colonies built", () => {
  function scoreWith(colonyCount, projects) {
    const state = cloneGameState(getInitialState({ playerCount: 2, colonies: true }));
    const seat = state.players[0].id;
    const tiles = Object.keys(state.colonies.tiles);
    for (let i = 0; i < colonyCount; i++) {
      const tile = tiles[i % tiles.length];
      state.colonies.tiles[tile] = {
        ...state.colonies.tiles[tile],
        colonies: [...(state.colonies.tiles[tile].colonies ?? []), seat]
      };
    }
    state.players = state.players.map(player =>
      player.id === seat ? { ...player, corporationId: null, playedProjects: projects } : player
    );
    return computeScore(state, seat);
  }

  const card = ["card-colonies-space-port-colony"];
  assert.equal(scoreWith(2, card) - scoreWith(2, []), 1);
  assert.equal(scoreWith(4, card) - scoreWith(4, []), 2);
  assert.equal(scoreWith(5, card) - scoreWith(5, []), 2, "the remainder is dropped");
});

test("Scoring counts only the requested player's tiles", () => {
  const state = getInitialState({ playerCount: 2 });
  const [a, b] = freeLand(state, 2);
  a.tileType = "forest";
  a.placedBy = "player";
  b.tileType = "forest";
  b.placedBy = "player2";

  const first = computeScore(state, "player");
  const second = computeScore(state, "player2");

  assert.equal(first, state.players[0].tr + 1);
  assert.equal(second, state.players[1].tr + 1);
});

// A card that scores one point per unit sets neither `per` nor `each`. The card
// face used to fall through to a bare "?" for those, which is most of them.
test("every dynamic victory point card shows a number, not a question mark", async () => {
  const { FULL_PROJECTS, FULL_CORPORATIONS, FULL_PRELUDES } = await import(
    "../app/full-card-catalog.js"
  );
  const tsx = await readFile(new URL("../app/project-card.tsx", import.meta.url), "utf8");
  assert.ok(
    !/return "\?"/.test(tsx),
    "project-card.tsx must not fall through to a question mark"
  );

  const dynamic = [...FULL_PROJECTS, ...FULL_CORPORATIONS, ...FULL_PRELUDES].filter(
    card => card.victoryPointSpec
  );
  assert.ok(dynamic.length >= 38, "the catalog carries the dynamic VP cards");

  for (const card of dynamic) {
    const spec = card.victoryPointSpec;
    const label = card.victoryPoints
      ? String(card.victoryPoints)
      : spec.per
        ? `1/${spec.per}`
        : String(spec.each ?? 1);
    assert.match(label, /^\d+(\/\d+)?$/, `${card.name} renders as "${label}"`);

    // Whatever it counts has to be something computeScore knows how to read.
    const counted =
      spec.resourcesHere !== undefined ||
      spec.tag !== undefined ||
      spec.colonies !== undefined ||
      spec.cities !== undefined ||
      spec.oceans !== undefined;
    assert.ok(counted, `${card.name} counts something the scorer recognises`);
  }
});

// The solo variant plays without milestones or awards: there is no opponent to
// race or to outrank. Both were purchasable, which handed a solo player 5 VP
// per milestone for nothing.
test("Milestones and awards are unavailable in a solo game", async () => {
  const { getMilestoneStatus, getAwardStatus, getPlayer } = await import("../app/game-logic.js");

  const solo = getInitialState({ playerCount: 1 });
  solo.phase = "action";
  const soloSeat = getPlayer(solo, "player");
  soloSeat.mc = 100;
  soloSeat.tr = 40;
  assert.equal(getMilestoneStatus(solo, "terraformer", "player").claimable, false);
  assert.equal(getAwardStatus(solo, "banker", "player").fundable, false);

  // With opponents both are available again.
  const table = getInitialState({ playerCount: 2 });
  table.phase = "action";
  const seat = getPlayer(table, table.players[0].id);
  seat.mc = 100;
  seat.tr = 40;
  assert.equal(getMilestoneStatus(table, "terraformer", seat.id).claimable, true);
  assert.equal(getAwardStatus(table, "banker", seat.id).fundable, true);
});

test("A corporation with a variable victory point spec scores it", () => {
  // Arklight, Pristar and Celestic each print a per-resource icon, and the
  // scorer walked projects, events and preludes but never the corporation. The
  // three did not score badly; they scored nothing, in every game ever played.
  function scoreWith(corporationId, resources) {
    const state = cloneGameState(
      getInitialState({ playerCount: 2, colonies: true, venus: true, turmoil: true })
    );
    const seat = state.players[0].id;
    state.players = state.players.map(player =>
      player.id === seat
        ? { ...player, corporationId, cardResources: { [corporationId]: resources } }
        : player
    );
    return computeScore(state, seat);
  }

  const baseline = id => scoreWith(id, 0);
  assert.equal(scoreWith("card-colonies-arklight", 5) - baseline("card-colonies-arklight"), 2);
  assert.equal(scoreWith("card-turmoil-pristar", 5) - baseline("card-turmoil-pristar"), 5);
  assert.equal(scoreWith("card-venus-celestic", 7) - baseline("card-venus-celestic"), 2);
});

test("Space Port Colony scores nothing below the first pair", () => {
  // 0 and 1 are the boundary the original test never reached: a scorer that
  // rounded up rather than down would pass 2/4/5 and fail here.
  function scoreWith(colonyCount, projects) {
    const state = cloneGameState(getInitialState({ playerCount: 2, colonies: true }));
    const seat = state.players[0].id;
    const tiles = Object.keys(state.colonies.tiles);
    for (let i = 0; i < colonyCount; i++) {
      const tile = tiles[i % tiles.length];
      state.colonies.tiles[tile] = {
        ...state.colonies.tiles[tile],
        colonies: [...(state.colonies.tiles[tile].colonies ?? []), seat]
      };
    }
    state.players = state.players.map(player =>
      player.id === seat ? { ...player, corporationId: null, playedProjects: projects } : player
    );
    return computeScore(state, seat);
  }

  const card = ["card-colonies-space-port-colony"];
  assert.equal(scoreWith(0, card) - scoreWith(0, []), 0);
  assert.equal(scoreWith(1, card) - scoreWith(1, []), 0);
  assert.equal(scoreWith(3, card) - scoreWith(3, []), 1, "the remainder is dropped");
});
