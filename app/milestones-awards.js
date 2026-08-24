// Tharsis milestones and awards, matching the reference implementation
// (src/server/milestones, src/server/awards). Milestones cost 8 MC and at most
// three may be claimed per game; awards cost 8/14/20 MC and at most three may be
// funded. Milestones are claimed by the player who meets the threshold; awards are
// scored at game end across all players.
export const MILESTONE_COST = 8;
export const AWARD_COSTS = [8, 14, 20];
export const MAX_MILESTONES = 3;
export const MAX_AWARDS = 3;

export const MILESTONE_VP = 5;
export const AWARD_FIRST_VP = 5;
export const AWARD_SECOND_VP = 2;

export function countTiles(board, playerId, tileType) {
  return Object.values(board).filter(
    cell => cell.placedBy === playerId && cell.tileType === tileType
  ).length;
}

export function countTags(player, cards, tag, corporation) {
  const normalized = String(tag).toLowerCase();
  const fromCards = player.playedProjects.reduce((sum, id) => {
    const card = cards.find(item => item.id === id);
    return sum + (card?.tags?.some(t => String(t).toLowerCase() === normalized) ? 1 : 0);
  }, 0);
  const fromCorporation = corporation?.tags?.some(t => String(t).toLowerCase() === normalized) ? 1 : 0;
  return fromCards + fromCorporation;
}

export const MILESTONES = [
  {
    id: "terraformer",
    name: "テラフォーマー",
    // Turmoil lowers the requirement because TR is harder to gain, so the text
    // is built from the live threshold rather than fixed at 35.
    describe: threshold => `TR ${threshold}以上`,
    threshold: 35,
    turmoilThreshold: 26,
    getScore: context => context.player.tr
  },
  {
    id: "mayor",
    name: "市長",
    description: "都市タイル3枚以上",
    threshold: 3,
    getScore: context => countTiles(context.board, context.player.id, "city")
  },
  {
    id: "gardener",
    name: "造園家",
    description: "緑地タイル3枚以上",
    threshold: 3,
    getScore: context => countTiles(context.board, context.player.id, "forest")
  },
  {
    id: "builder",
    name: "建築家",
    description: "建材タグ8枚以上",
    threshold: 8,
    getScore: context => countTags(context.player, context.cards, "Building", context.corporation)
  },
  {
    id: "planner",
    name: "立案者",
    description: "手札16枚以上",
    threshold: 16,
    getScore: context => context.player.hand.length
  }
];

export const AWARDS = [
  {
    id: "landlord",
    name: "地主",
    description: "盤面上のタイル数が最多",
    // Oceans are never owned, so only the player's own tiles count.
    getScore: context =>
      Object.values(context.board).filter(
        cell => cell.placedBy === context.player.id && cell.tileType !== "empty" && cell.tileType !== "ocean"
      ).length
  },
  {
    id: "banker",
    name: "銀行家",
    description: "MC生産量が最多",
    getScore: context => context.player.mcProd
  },
  {
    id: "scientist",
    name: "科学者",
    description: "科学タグが最多",
    getScore: context => countTags(context.player, context.cards, "Science", context.corporation)
  },
  {
    id: "thermalist",
    name: "熱技術者",
    description: "熱資源が最多",
    getScore: context =>
      context.finalScoring
        ? context.player.heat
        : context.player.energy + context.player.heat + context.player.heatProd
  },
  {
    id: "miner",
    name: "鉱夫",
    description: "建材とチタンが最多",
    getScore: context =>
      context.finalScoring
        ? context.player.steel + context.player.titanium
        : context.player.steel +
          context.player.steelProd +
          context.player.titanium +
          context.player.titaniumProd
  }
];

// The alternate maps bring their own milestones and awards. They register here
// so an id can be resolved without this module importing them, which would be
// circular.
const EXTRA_MILESTONES = [];
const EXTRA_AWARDS = [];

export function registerBoardMilestones(milestones, awards) {
  for (const milestone of milestones) {
    if (!EXTRA_MILESTONES.some(entry => entry.id === milestone.id)) EXTRA_MILESTONES.push(milestone);
  }
  for (const award of awards) {
    if (!EXTRA_AWARDS.some(entry => entry.id === award.id)) EXTRA_AWARDS.push(award);
  }
}

export function getMilestone(id) {
  return MILESTONES.find(milestone => milestone.id === id) ??
    EXTRA_MILESTONES.find(milestone => milestone.id === id);
}

export function getAward(id) {
  return AWARDS.find(award => award.id === id) ??
    EXTRA_AWARDS.find(award => award.id === id);
}

export function getMilestoneThreshold(milestone, state) {
  return state?.turmoil && milestone.turmoilThreshold !== undefined
    ? milestone.turmoilThreshold
    : milestone.threshold;
}

// A milestone whose requirement moves with Turmoil describes itself from the
// live threshold; the rest carry a fixed description.
export function getMilestoneDescription(milestone, state) {
  if (typeof milestone.describe === "function") {
    return milestone.describe(getMilestoneThreshold(milestone, state));
  }
  return milestone.description ?? "";
}

export function getNextAwardCost(state) {
  return AWARD_COSTS[Math.min((state.fundedAwards?.length ?? 0), AWARD_COSTS.length - 1)];
}

// Ranks players by an award's metric. Ties share a place, and the count of tied
// players consumes the following places, matching the printed rules.
export function scoreAward(award, state, context) {
  const corporations = context.corporations ?? [];
  const scores = state.players.map(player => ({
    playerId: player.id,
    score: award.getScore({
      ...context,
      player,
      board: state.board,
      // Tag-counting awards need the scored player's own corporation.
      corporation: corporations.find(c => c.id === player.corporationId)
    })
  }));
  const ordered = [...scores].sort((a, b) => b.score - a.score);

  const first = ordered[0]?.score ?? 0;
  // The rule is "most", not "most and at least one": with Banker every seat can
  // sit at zero or below and the award still pays its 5 VP.
  const winners = ordered.filter(entry => entry.score === first);

  const runnerUpScore = ordered.find(entry => entry.score < first)?.score;
  const runnersUp =
    runnerUpScore === undefined
      ? []
      : ordered.filter(entry => entry.score === runnerUpScore);

  const vp = {};
  for (const entry of winners) vp[entry.playerId] = AWARD_FIRST_VP;
  // Second place pays nothing when first place is shared, and never in a
  // two-player game: "ただし２人プレイでは次席の褒賞はありません".
  if (winners.length === 1 && state.players.length > 2) {
    for (const entry of runnersUp) vp[entry.playerId] = AWARD_SECOND_VP;
  }

  return { scores, vp };
}

export function computeMilestoneVp(state) {
  const vp = {};
  for (const claimed of state.claimedMilestones ?? []) {
    vp[claimed.playerId] = (vp[claimed.playerId] ?? 0) + MILESTONE_VP;
  }
  return vp;
}

export function computeAwardVp(state, context) {
  const vp = {};
  for (const funded of state.fundedAwards ?? []) {
    const award = getAward(funded.awardId);
    if (!award) continue;
    const result = scoreAward(award, state, { ...context, finalScoring: true });
    for (const [playerId, points] of Object.entries(result.vp)) {
      vp[playerId] = (vp[playerId] ?? 0) + points;
    }
  }
  return vp;
}
