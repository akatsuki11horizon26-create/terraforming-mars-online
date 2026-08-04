// Card drafting for multiplayer games.
//
// Official rules: each player is dealt four cards, keeps one and passes the rest
// to their neighbour, repeating until all four are taken. The direction
// alternates every generation — clockwise in odd generations, anticlockwise in
// even ones — so the same neighbour is not always fed.
//
// The drafted cards then go through the normal research step, where each player
// buys the ones they want at 3 M€ each.

export const DRAFT_HAND_SIZE = 4;

// Odd generations pass to the left (clockwise), even ones to the right.
export function draftDirection(generation) {
  return generation % 2 === 1 ? 1 : -1;
}

export function nextDraftSeat(turnOrder, playerId, generation) {
  const index = turnOrder.indexOf(playerId);
  if (index < 0) return turnOrder[0];
  const step = draftDirection(generation);
  return turnOrder[(index + step + turnOrder.length) % turnOrder.length];
}

// The draft is over once nobody holds cards left to pass.
export function isDraftComplete(draft) {
  return Object.values(draft?.queues ?? {}).every(queue => queue.length === 0);
}

export function createDraft(turnOrder, hands, generation) {
  const queues = {};
  for (const playerId of turnOrder) queues[playerId] = [...(hands[playerId] ?? [])];
  return {
    generation,
    direction: draftDirection(generation),
    queues,
    picked: Object.fromEntries(turnOrder.map(id => [id, []]))
  };
}

// One player takes a card. The rest of their queue moves to their neighbour
// only once every player has picked this round, which is what keeps the passes
// simultaneous the way they are at a real table.
export function pickDraftCard(draft, turnOrder, playerId, cardId) {
  const queue = draft.queues[playerId] ?? [];
  if (!queue.includes(cardId)) return { draft, picked: false, reason: "そのカードは選べません。" };

  const next = {
    ...draft,
    queues: { ...draft.queues },
    picked: { ...draft.picked, [playerId]: [...(draft.picked[playerId] ?? []), cardId] }
  };
  next.queues[playerId] = queue.filter(id => id !== cardId);

  // Everyone whose queue is one card shorter than the longest has already
  // picked this round; when they all have, the remainders pass on.
  const sizes = turnOrder.map(id => next.queues[id]?.length ?? 0);
  const allPicked = sizes.every(size => size === sizes[0]);
  if (allPicked && sizes[0] > 0) {
    const passed = {};
    for (const id of turnOrder) {
      const target = nextDraftSeat(turnOrder, id, draft.generation);
      passed[target] = next.queues[id];
    }
    next.queues = passed;
  }

  return { draft: next, picked: true, reason: "" };
}

export function draftedHandFor(draft, playerId) {
  return [...(draft?.picked?.[playerId] ?? [])];
}
