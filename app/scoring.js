import { CORPORATIONS } from "./official-content.js";
import { computeMilestoneVp, computeAwardVp } from "./milestones-awards.js";
import { NEUTRAL as TURMOIL_NEUTRAL, getParty } from "./turmoil.js";

// Scoring runs in two stages: every point in the game becomes a contribution
// naming who receives it, then contributions are summed per player.
//
// The stages exist because a card can pay someone other than its owner. Law
// Suit takes a point from the player it names, and Vermin takes points from
// everyone at once. A scorer that walks one player's own cards can express
// neither, which is why this builds the whole game's contributions once.

/**
 * @typedef {Object} ScoreContribution
 * @property {string} targetPlayerId
 * @property {number} points
 * @property {"tr"|"board"|"cards"|"milestones"|"awards"|"turmoil"|"modifier"} category
 * @property {"system"|"card"|"milestone"|"award"|"turmoil"} sourceType
 * @property {string} sourceId
 * @property {string=} sourcePlayerId
 * @property {string} label
 * @property {string=} detail
 */

export const SCORE_CATEGORIES = Object.freeze([
  "tr",
  "board",
  "cards",
  "milestones",
  "awards",
  "turmoil",
  "modifier"
]);

// This codebase names the player who laid a tile `placedBy`; there is no
// `ownerId` on a cell.
export function countOwnedCities(board, playerId) {
  return Object.values(board ?? {}).filter(
    cell => cell.tileType === "city" && cell.placedBy === playerId
  ).length;
}

export function countCathedrals(state, cardId, ownerId) {
  return (state.boardMarkers ?? []).filter(
    marker =>
      marker.kind === "cathedral" &&
      marker.sourceCardId === cardId &&
      marker.sourcePlayerId === ownerId
  ).length;
}

// Vermin reads the board at the end of the game, not when the tenth animal
// arrived: a city built afterwards still costs its owner a point.
function scoreVermin(state, owner, card) {
  const animals = owner.cardResources?.[card.id] ?? 0;
  if (animals < 10) return [];

  return state.players.map(target => {
    const cities = countOwnedCities(state.board, target.id);
    return {
      targetPlayerId: target.id,
      points: -cities,
      category: "cards",
      sourceType: "card",
      sourceId: card.id,
      sourcePlayerId: owner.id,
      label: card.name,
      detail: `所有都市${cities}枚`
    };
  });
}

// The cathedrals pay the player holding the card, whoever owns the cities they
// stand on.
function scoreStJoseph(state, owner, card) {
  const cathedrals = countCathedrals(state, card.id, owner.id);
  return [
    {
      targetPlayerId: owner.id,
      points: cathedrals,
      category: "cards",
      sourceType: "card",
      sourceId: card.id,
      sourcePlayerId: owner.id,
      label: card.name,
      detail: `大聖堂${cathedrals}個`
    }
  ];
}

const SPECIAL_CARD_SCORERS = {
  vermin: scoreVermin,
  "st-joseph": scoreStJoseph
};

export function buildScoreContributions(state, options = {}) {
  const cards = options.cards ?? [];
  const preludes = options.preludes ?? [];
  // The board and tag helpers live in game-logic.js, which imports this module,
  // so they are passed in rather than imported back. Callers that only care
  // about the special cards may omit them; those paths then score zero instead
  // of throwing.
  const helpers = options.helpers ?? {};
  const countAdjacentOceans = helpers.countAdjacentOceans ?? (() => 0);
  const getAdjacentCells = helpers.getAdjacentCells ?? (() => []);
  const countPlayedTag = helpers.countPlayedTag ?? (() => 0);
  const countColonies = helpers.countColonies ?? (() => 0);

  const findCard = id => cards.find(card => card.id === id);
  const findPrelude = id => preludes.find(card => card.id === id);

  /** @type {ScoreContribution[]} */
  const contributions = [];

  for (const player of state.players) {
    contributions.push({
      targetPlayerId: player.id,
      points: player.tr,
      category: "tr",
      sourceType: "system",
      sourceId: "tr",
      label: "TR"
    });

    const greeneries = Object.values(state.board).filter(
      cell => cell.placedBy === player.id && cell.tileType === "forest"
    ).length;
    if (greeneries) {
      contributions.push({
        targetPlayerId: player.id,
        points: greeneries,
        category: "board",
        sourceType: "system",
        sourceId: "greenery",
        label: "緑地",
        detail: `${greeneries}枚`
      });
    }

    // A city scores for every greenery beside it, whoever planted the greenery.
    let cityVp = 0;
    for (const cell of Object.values(state.board)) {
      if (cell.placedBy !== player.id || cell.tileType !== "city") continue;
      cityVp += getAdjacentCells(cell.q, cell.r).filter(
        pos => state.board[`${pos.q},${pos.r}`]?.tileType === "forest"
      ).length;
    }
    if (cityVp) {
      contributions.push({
        targetPlayerId: player.id,
        points: cityVp,
        category: "board",
        sourceType: "system",
        sourceId: "city",
        label: "都市隣接の緑地",
        detail: `${cityVp}枚`
      });
    }

    const played = [
      ...player.playedProjects.map(id => [id, findCard(id)]),
      ...(player.selectedPreludeIds ?? []).map(id => [id, findPrelude(id)])
    ];

    for (const [cardId, card] of played) {
      if (!card) continue;

      const special = card.specialVictoryKind
        ? SPECIAL_CARD_SCORERS[card.specialVictoryKind]
        : undefined;
      if (special) {
        contributions.push(...special(state, player, card));
        continue;
      }

      if (card.victoryPoints) {
        contributions.push({
          targetPlayerId: player.id,
          points: card.victoryPoints,
          category: "cards",
          sourceType: "card",
          sourceId: cardId,
          sourcePlayerId: player.id,
          label: card.name
        });
      }

      if (card.victoryPointSpec && !card.dynamicVictory) {
        const spec = card.victoryPointSpec;
        const resources = player.cardResources?.[cardId] ?? 0;
        let points = 0;

        if (spec.resourcesHere !== undefined) {
          points += spec.per
            ? Math.floor(resources / spec.per)
            : resources * (spec.each ?? 1);
        }
        if (spec.tag) points += countPlayedTag(state, spec.tag, player);

        if (spec.all) {
          const counted =
            spec.cities !== undefined
              ? Object.values(state.board).filter(cell => cell.tileType === "city").length
              : spec.colonies !== undefined
                ? countColonies(state.colonies, player.id)
                : 0;
          points += spec.per ? Math.floor(counted / spec.per) : counted * (spec.each ?? 1);
        } else {
          const placementKey = player.cardPlacements?.[cardId];
          const placement = placementKey ? state.board[placementKey] : undefined;
          if (placement && spec.oceans !== undefined) {
            points += countAdjacentOceans(placement.q, placement.r, state.board);
          }
          if (placement && spec.cities !== undefined) {
            points += getAdjacentCells(placement.q, placement.r).filter(
              pos => state.board[`${pos.q},${pos.r}`]?.tileType === "city"
            ).length;
          }
        }

        if (points) {
          contributions.push({
            targetPlayerId: player.id,
            points,
            category: "cards",
            sourceType: "card",
            sourceId: cardId,
            sourcePlayerId: player.id,
            label: card.name
          });
        }
      }

      if (cardId === "p-search-for-life" && (player.cardResources?.[cardId] ?? 0) > 0) {
        contributions.push({
          targetPlayerId: player.id,
          points: 3,
          category: "cards",
          sourceType: "card",
          sourceId: cardId,
          sourcePlayerId: player.id,
          label: card.name
        });
      }
      if (cardId === "p-capital") {
        const key = player.cardPlacements?.[cardId];
        const capital = key ? state.board[key] : undefined;
        const adjacent = capital
          ? countAdjacentOceans(capital.q, capital.r, state.board)
          : 0;
        if (adjacent) {
          contributions.push({
            targetPlayerId: player.id,
            points: adjacent,
            category: "cards",
            sourceType: "card",
            sourceId: cardId,
            sourcePlayerId: player.id,
            label: card.name
          });
        }
      }
    }
  }

  const milestoneVp = computeMilestoneVp(state);
  for (const [playerId, points] of Object.entries(milestoneVp)) {
    if (!points) continue;
    contributions.push({
      targetPlayerId: playerId,
      points,
      category: "milestones",
      sourceType: "milestone",
      sourceId: "milestones",
      label: "マイルストーン"
    });
  }

  const awardVp = computeAwardVp(state, { cards, corporations: CORPORATIONS });
  for (const [playerId, points] of Object.entries(awardVp)) {
    if (!points) continue;
    contributions.push({
      targetPlayerId: playerId,
      points,
      category: "awards",
      sourceType: "award",
      sourceId: "awards",
      label: "褒賞"
    });
  }

  // Turmoil rules, FINAL SCORING: "all Party Leaders and the Chairman are worth
  // 1 VP for the respective player". Neutral markers score for nobody, and a
  // player leading several parties scores each one.
  if (state.turmoil) {
    for (const [partyId, party] of Object.entries(state.turmoil.parties ?? {})) {
      const leader = party?.leader;
      if (!leader || leader === TURMOIL_NEUTRAL) continue;
      contributions.push({
        targetPlayerId: leader,
        points: 1,
        category: "turmoil",
        sourceType: "turmoil",
        sourceId: `party-leader-${partyId}`,
        label: `${getParty(partyId)?.name ?? partyId}の党首`
      });
    }

    const chairman = state.turmoil.chairman;
    if (chairman && chairman !== TURMOIL_NEUTRAL) {
      contributions.push({
        targetPlayerId: chairman,
        points: 1,
        category: "turmoil",
        sourceType: "turmoil",
        sourceId: "chairman",
        label: "議長"
      });
    }
  }

  // Modifiers were settled when they were played -- Law Suit names its target
  // at that moment -- so they are read back rather than recomputed.
  for (const modifier of state.scoreModifiers ?? []) {
    contributions.push({
      targetPlayerId: modifier.targetPlayerId,
      points: modifier.points,
      category: "modifier",
      sourceType: "card",
      sourceId: modifier.sourceCardId,
      sourcePlayerId: modifier.sourcePlayerId,
      label: modifier.label
    });
  }

  return contributions;
}

export function calculateScoreBreakdowns(state, options = {}) {
  const contributions = buildScoreContributions(state, options);

  // Seeded from SCORE_CATEGORIES rather than a second hand-written list: a
  // category that exists in one and not the other lands as NaN in the breakdown
  // while the total stays right, so the UI shows a blank row and nothing throws.
  const results = Object.fromEntries(
    state.players.map(player => [
      player.id,
      {
        playerId: player.id,
        ...Object.fromEntries(SCORE_CATEGORIES.map(category => [category, 0])),
        total: 0,
        details: []
      }
    ])
  );

  for (const contribution of contributions) {
    const result = results[contribution.targetPlayerId];
    if (!result) continue;
    result[contribution.category] += contribution.points;
    result.total += contribution.points;
    result.details.push(contribution);
  }

  return results;
}

// A negative total is a real result, so it is never clamped to zero.
export function formatSignedVp(points) {
  return points > 0 ? `+${points}` : String(points);
}
