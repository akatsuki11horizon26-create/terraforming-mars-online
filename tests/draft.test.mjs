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
