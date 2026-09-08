import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState, draftPick, getPlayer } from "../app/game-logic.js";
import { draftDirection, nextDraftSeat, createDraft, pickDraftCard, isDraftComplete } from "../app/draft.js";

const ORDER = ["p1", "p2", "p3"];

test("the pass direction alternates every generation", () => {
  // Odd generations pass clockwise, even ones anticlockwise, so the same
  // neighbour is never fed twice running.
  assert.equal(draftDirection(1), 1);
  assert.equal(draftDirection(2), -1);
  assert.equal(draftDirection(3), 1);

  assert.equal(nextDraftSeat(ORDER, "p1", 1), "p2");
  assert.equal(nextDraftSeat(ORDER, "p1", 2), "p3", "and reverses in even generations");
  assert.equal(nextDraftSeat(ORDER, "p3", 1), "p1", "wrapping round the table");
});

test("cards pass on only once everyone has picked", () => {
  const hands = {
    p1: ["a1", "a2", "a3", "a4"],
    p2: ["b1", "b2", "b3", "b4"],
    p3: ["c1", "c2", "c3", "c4"]
  };
  let draft = createDraft(ORDER, hands, 1);

  // One player picking must not move anyone's cards yet.
  draft = pickDraftCard(draft, ORDER, "p1", "a1").draft;
  assert.deepEqual(draft.queues.p1, ["a2", "a3", "a4"]);
  assert.deepEqual(draft.queues.p2, ["b1", "b2", "b3", "b4"], "p2 still holds its own");

  draft = pickDraftCard(draft, ORDER, "p2", "b1").draft;
  draft = pickDraftCard(draft, ORDER, "p3", "c1").draft;
  assert.deepEqual(draft.queues.p2, ["a2", "a3", "a4"], "now the remainders move on");
});

test("a card nobody holds cannot be drafted", () => {
  const draft = createDraft(ORDER, { p1: ["a1"], p2: ["b1"], p3: ["c1"] }, 1);
  const result = pickDraftCard(draft, ORDER, "p1", "b1");
  assert.equal(result.picked, false, "p1 must not take a card from p2's queue");
});

test("drafting the opening ten leaves every player a full research hand", () => {
  let state = getInitialState({ playerCount: 3, draft: true });
  assert.equal(state.draftEnabled, true);
  assert.ok(state.draft, "the opening cards go through the draft too");
  assert.equal(state.players.every(player => player.researchCards.length === 0), true);

  let guard = 0;
  while (state.draft && guard++ < 40) {
    for (const id of state.turnOrder) {
      const queue = state.draft?.queues[id];
      if (!queue?.length) continue;
      state = draftPick(state, queue[0], id);
    }
  }

  assert.equal(state.draft, null, "the draft ends when every card is claimed");
  for (const id of state.turnOrder) {
    assert.equal(getPlayer(state, id).researchCards.length, 10, `${id} drafted ten cards`);
  }
});

test("solo play never drafts", () => {
  const state = getInitialState({ playerCount: 1, draft: true });
  assert.equal(state.draftEnabled, false, "there is nobody to pass to");
  assert.equal(state.draft, null);
  assert.equal(state.players[0].researchCards.length, 10, "the hand is dealt directly");
});

test("a completed draft is recognised", () => {
  assert.equal(isDraftComplete({ queues: { p1: [], p2: [] } }), true);
  assert.equal(isDraftComplete({ queues: { p1: [], p2: ["x"] } }), false);
});

// The opening ten and the four cards dealt each generation are two separate
// variants upstream (initialDraftVariant and draftVariant), and one setting
// here drove both -- so a table wanting the ordinary research draft was forced
// into drafting its starting hand too.
test("the initial draft and the research draft are separate settings", async () => {
  const { getInitialState } = await import("../app/game-logic.js");

  const both = getInitialState({ playerCount: 2, draft: true, initialDraft: true, seed: 4 });
  assert.ok(both.draft, "the opening ten are passed around");
  assert.equal(both.draftEnabled, true, "and so are the generation's four");

  // The ordinary research draft, with the starting hands dealt whole.
  const researchOnly = getInitialState({ playerCount: 2, draft: true, initialDraft: false, seed: 4 });
  assert.equal(researchOnly.draft, null, "the opening ten are dealt, not drafted");
  assert.equal(researchOnly.draftEnabled, true, "the generation's four are still drafted");
  for (const player of researchOnly.players) {
    assert.equal(player.researchCards.length, 10, "each seat holds its own ten to buy from");
  }

  // Neither.
  const plain = getInitialState({ playerCount: 2, draft: false, seed: 4 });
  assert.equal(plain.draft, null);
  assert.equal(plain.draftEnabled, false);

  // A caller from before the split said only "draft" and got both, which is
  // what it was playing with.
  const legacy = getInitialState({ playerCount: 2, draft: true, seed: 4 });
  assert.ok(legacy.draft, "the old single flag still drafts the opening ten");
});
