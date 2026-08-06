import assert from "node:assert/strict";
import test from "node:test";
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
  const state = getInitialState();
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

test("An award nobody scores on pays nothing", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].mcProd = 0;
  state.players[1].mcProd = 0;

  const result = scoreAward(getAward("banker"), state, { cards: [], corporations: [] });
  assert.deepEqual(result.vp, {}, "a zero score never wins an award");
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
