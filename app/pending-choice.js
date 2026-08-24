// Builds and resolves the choices a card effect cannot make on the player's
// behalf: which card receives resources, which standard resource to gain, which
// branch of an "or" effect to take, and where a tile goes.
//
// A pending choice is plain serializable data: card ids and a continuation stage,
// never functions or React state, so a half-resolved effect survives a reload.

export const STANDARD_RESOURCES = [
  { id: "mc", label: "MC" },
  { id: "steel", label: "建材" },
  { id: "titanium", label: "チタン" },
  { id: "plants", label: "植物" },
  { id: "energy", label: "エネルギー" },
  { id: "heat", label: "熱" }
];

export function makeChoiceId(kind, sourceId, playerId) {
  return `${kind}:${sourceId}:${playerId}`;
}

// Cards that can hold the given resource type, across every player. Effects that
// name a resource type (Microbe, Animal, Science, Floater...) may only target
// cards declaring that type.
export function collectResourceTargets(state, resourceType, cards, options = {}) {
  const wanted = resourceType ? String(resourceType).toLowerCase() : null;
  const resolveType = options.getResourceType ?? (() => undefined);
  const targets = [];

  for (const player of state.players) {
    if (options.ownCardsOnly && player.id !== state.currentPlayerId) continue;

    for (const cardId of player.playedProjects) {
      const card = cards.find(item => item.id === cardId);
      if (!card) continue;

      const declared = card.resourceType ?? resolveType(cardId);
      const holds = declared ? String(declared).toLowerCase() : null;
      if (wanted && holds !== wanted) continue;
      if (!wanted && !holds) continue;

      const current = player.cardResources?.[cardId] ?? 0;
      if (options.mustHaveResources && current <= 0) continue;

      targets.push({
        id: `${player.id}:${cardId}`,
        label: `${card.name}${state.players.length > 1 ? `（${player.name}）` : ""}`,
        targetPlayerId: player.id,
        targetCardId: cardId,
        amount: current
      });
    }
  }
  return targets;
}

// `count` is usually a number, but a few cards express it as a counting rule
// ("1 per science tag"). Anything non-numeric is resolved by the caller, which
// knows the game state; without this the raw object reached the resource total
// and turned it into a string.
export function resolveCount(spec, context) {
  const raw = typeof spec === "number" ? spec : spec?.count;
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && typeof context?.evaluateCount === "function") {
    const value = context.evaluateCount(raw);
    return Number.isFinite(value) ? value : 1;
  }
  return 1;
}

export function buildResourceChoice(state, spec, context) {
  const count = resolveCount(spec, context);
  const resourceType = typeof spec === "object" ? spec.type : undefined;
  const options = collectResourceTargets(state, resourceType, context.cards, {
    mustHaveResources: Boolean(spec?.mustHaveCard),
    getResourceType: context.getResourceType
  });

  if (options.length === 0) return null;
  // A single legal target is not a decision; the caller applies it directly.
  if (options.length === 1 && !spec?.forceChoice) {
    return { autoTarget: options[0], count };
  }

  return {
    id: makeChoiceId("any-card-resource", context.sourceId, state.currentPlayerId),
    kind: "any-card-resource",
    ownerPlayerId: state.currentPlayerId,
    prompt: resourceType
      ? `${resourceType}資源を${count}個置くカードを選んでください。`
      : `資源を${count}個置くカードを選んでください。`,
    optional: false,
    options,
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "any-card-resource",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      remaining: count,
      payload: { resourceType: resourceType ?? null }
    }
  };
}

// "手札1枚を捨てて1枚引いてよい" — the player picks which card leaves the hand,
// and may decline entirely, so this cannot be resolved on their behalf.
export function buildDiscardChoice(state, hand, context, cards) {
  if (!hand || hand.length === 0) return null;

  return {
    id: makeChoiceId("discard-card", context.sourceId, state.currentPlayerId),
    kind: "discard-card",
    ownerPlayerId: state.currentPlayerId,
    prompt: context.prompt ?? "捨てるカードを選んでください。",
    optional: context.optional ?? true,
    options: hand.map(cardId => {
      const card = (cards ?? []).find(item => item.id === cardId);
      return {
        id: cardId,
        label: card?.name ?? cardId,
        cardId
      };
    }),
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: context.stage ?? "discard-card",
      consumedAction: context.consumedAction ?? false,
      paid: context.paid ?? true,
      remaining: context.remaining ?? 1
    }
  };
}

export function buildStandardResourceChoice(state, spec, context) {
  const count = resolveCount(spec, context);
  return {
    id: makeChoiceId("standard-resource", context.sourceId, state.currentPlayerId),
    kind: "standard-resource",
    ownerPlayerId: state.currentPlayerId,
    prompt: `獲得する標準資源を選んでください（${count}個）。`,
    optional: false,
    options: STANDARD_RESOURCES.map(resource => ({
      id: resource.id,
      label: resource.label,
      resource: resource.id,
      amount: count
    })),
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "standard-resource",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      remaining: count
    }
  };
}

export function buildBranchChoice(state, behaviors, context) {
  const options = behaviors.map((behavior, index) => ({
    id: String(index),
    label: behavior.title ?? `選択肢 ${index + 1}`
  }));

  return {
    id: makeChoiceId("effect-branch", context.sourceId, state.currentPlayerId),
    kind: "effect-branch",
    ownerPlayerId: state.currentPlayerId,
    prompt: "適用する効果を選んでください。",
    optional: false,
    options,
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "effect-branch",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true
    }
  };
}

export function buildTileChoice(state, tileType, context, legalCells) {
  const options = legalCells.map(cell => ({
    id: `${cell.q},${cell.r}`,
    label: cell.name ? `${cell.name} (${cell.q},${cell.r})` : `(${cell.q},${cell.r})`,
    targetCellKey: `${cell.q},${cell.r}`
  }));
  if (options.length === 0) return null;

  const labels = { ocean: "海洋", city: "都市", forest: "緑地", special: "特殊" };
  return {
    id: makeChoiceId("tile-placement", context.sourceId, state.currentPlayerId),
    kind: "tile-placement",
    ownerPlayerId: state.currentPlayerId,
    prompt: `${labels[tileType] ?? tileType}タイルを配置するマスを選んでください。`,
    optional: false,
    options,
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "tile-placement",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      remaining: context.remaining ?? 1,
      // Work the caller parked until the space is chosen: the triggers a card
      // still owes, and the parameter levels to measure the bonus against.
      ...(context.afterPlay ? { afterPlay: context.afterPlay } : {}),
      payload: { tileType, specialName: context.specialName ?? null }
    }
  };
}

// Solar phase step 2 (Venus Next): "The first player [...] now acts as the WG,
// and chooses a non-maxed global parameter and increases that track one step, or
// places an ocean tile."
//
// The owner is the first player, not the player whose turn it is — the marker
// has not moved yet and the acting player may be someone else entirely, so this
// takes the owner explicitly rather than reading state.currentPlayerId.
export function buildWorldGovernmentChoice(state, ownerPlayerId, options) {
  if (!options || options.length === 0) return null;
  return {
    id: makeChoiceId("world-government", "solar-phase", ownerPlayerId),
    kind: "world-government",
    ownerPlayerId,
    prompt: "世界政府のテラフォーミング: 上昇させるパラメータを選んでください。",
    // The step is mandatory while any parameter is unmaxed.
    optional: false,
    options,
    continuation: {
      sourceKind: "solar-phase",
      sourceId: "world-government",
      stage: "world-government",
      // Nothing about this belongs to a player's turn.
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };
}

// One "discard a card" question for a global event, owned by a named player
// rather than whoever is in turn.
//
// The options are a snapshot of the hand when the question was queued. The
// resolver re-checks that the answer is still in the hand, because an earlier
// question in the same queue may already have removed it.
export function buildEventDiscardChoice(state, ownerPlayerId, sourceId, index, total, cards) {
  const player = (state.players ?? []).find(entry => entry.id === ownerPlayerId);
  const hand = player?.hand ?? [];
  if (hand.length === 0) return null;

  return {
    id: makeChoiceId(`event-discard-${index}`, sourceId, ownerPlayerId),
    kind: "event-discard",
    ownerPlayerId,
    prompt:
      total > 1
        ? `世界的イベント: 捨てるカードを選んでください（${index + 1}/${total}）。`
        : "世界的イベント: 捨てるカードを選んでください。",
    optional: false,
    options: hand.map(cardId => {
      const card = (cards ?? []).find(item => item.id === cardId);
      return { id: cardId, label: card?.name ?? cardId, cardId };
    }),
    continuation: {
      sourceKind: "global-event",
      sourceId,
      stage: `event-discard-${index}`,
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };
}

// Corrosive Rain: pay up to 10 M€, or take 2 floaters off one card. Both
// branches are in one list — picking a card is picking the floater branch — so
// a player with several floater cards names the one they spend.
export function buildCorrosiveRainChoice(state, ownerPlayerId, sourceId, { floaters, mc, cards }) {
  if (!cards || cards.length === 0) return null;
  return {
    id: makeChoiceId("corrosive-rain", sourceId, ownerPlayerId),
    kind: "corrosive-rain",
    ownerPlayerId,
    prompt: `世界的イベント: ${mc} MC を失うか、カードからフローターを${floaters}個取り除いてください。`,
    optional: false,
    options: [
      { id: "__mc__", label: `${mc} MC を失う`, payMc: true },
      ...cards.map(card => ({
        id: card.cardId,
        label: `${card.label} からフローターを${floaters}個`,
        cardId: card.cardId
      }))
    ],
    continuation: {
      sourceKind: "global-event",
      sourceId,
      stage: "corrosive-rain",
      consumedAction: false,
      paid: true,
      remaining: 1,
      payload: { floaters, mc }
    }
  };
}

// "Gain 1 standard resource per influence." The reference lets the player split
// the total freely across the six resources (SelectAmount 0..count each, summing
// to count), so this asks one resource at a time — the same freedom, one pick
// per point, and it fits the queue without a bespoke multi-amount widget.
export function buildStandardResourcePickChoice(state, ownerPlayerId, sourceId, index, total) {
  return {
    id: makeChoiceId(`standard-resource-${index}`, sourceId, ownerPlayerId),
    kind: "standard-resource-pick",
    ownerPlayerId,
    prompt:
      total > 1
        ? `世界的イベント: 獲得する資源を選んでください（${index + 1}/${total}）。`
        : "世界的イベント: 獲得する資源を選んでください。",
    optional: false,
    options: STANDARD_RESOURCES.map(resource => ({
      id: resource.id,
      label: resource.label,
      resource: resource.id
    })),
    continuation: {
      sourceKind: "global-event",
      sourceId,
      stage: `standard-resource-${index}`,
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };
}

// "Add a floater to a card per influence." The player names the card each time,
// and may stack them all on one card.
export function buildFloaterPlacementChoice(state, ownerPlayerId, sourceId, index, total, targets) {
  if (!targets || targets.length === 0) return null;
  return {
    id: makeChoiceId(`floater-placement-${index}`, sourceId, ownerPlayerId),
    kind: "floater-placement",
    ownerPlayerId,
    prompt:
      total > 1
        ? `世界的イベント: フローターを置くカードを選んでください（${index + 1}/${total}）。`
        : "世界的イベント: フローターを置くカードを選んでください。",
    optional: false,
    options: targets.map(target => ({
      id: target.cardId,
      label: target.label,
      cardId: target.cardId
    })),
    continuation: {
      sourceKind: "global-event",
      sourceId,
      stage: `floater-placement-${index}`,
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };
}

// Dry Deserts takes an ocean back off the board. The first player picks which,
// and the squares under it revert to empty.
export function buildOceanRemovalChoice(state, sourceId, ownerPlayerId, oceanCells) {
  if (!oceanCells || oceanCells.length === 0) return null;
  return {
    id: makeChoiceId("ocean-removal", sourceId, ownerPlayerId),
    kind: "ocean-removal",
    ownerPlayerId,
    prompt: "世界的イベント: 取り除く海洋タイルを選んでください。",
    optional: false,
    options: oceanCells.map(cell => ({
      id: `${cell.q},${cell.r}`,
      label: `(${cell.q}, ${cell.r})`,
      targetCellKey: `${cell.q},${cell.r}`
    })),
    continuation: {
      sourceKind: "global-event",
      sourceId,
      stage: "ocean-removal",
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };
}

export function isChoiceOwnedBy(choice, playerId) {
  return Boolean(choice) && choice.ownerPlayerId === playerId;
}

export function findOption(choice, optionId) {
  return choice?.options.find(option => option.id === optionId);
}

// "Decrease any player's production" is an attack: the rulebook lets the player
// pick the victim, and picking yourself is legal but rarely wanted. Without this
// the effect silently hit the acting player every time.
export function buildProductionAttackChoice(state, resource, count, context) {
  const key = `${resource}Prod`;
  const floor = resource === "mc" ? -5 : 0;
  const targets = (state.players ?? []).filter(player => (player[key] ?? 0) > floor);
  if (targets.length === 0) return null;

  const label = PRODUCTION_LABELS[resource] ?? resource;
  const options = targets.map(player => ({
    id: player.id,
    targetPlayerId: player.id,
    label: `${player.name}（${label}生産 ${player[key]}）`
  }));

  return {
    id: makeChoiceId("production-attack", context.sourceId, state.currentPlayerId),
    kind: "production-attack",
    ownerPlayerId: state.currentPlayerId,
    prompt: `${label}生産量を${count}下げる対象を選んでください。`,
    optional: false,
    options,
    payload: { resource, count },
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "production-attack",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      payload: { resource, count }
    }
  };
}

// A cathedral sits on top of a city rather than replacing it, so it is stored
// as a marker and a city may only carry one.
export function buildCathedralChoice(state, cells, context) {
  if (cells.length === 0) return null;

  const options = cells.map(cellKey => {
    const cell = state.board[cellKey];
    const owner = (state.players ?? []).find(player => player.id === cell?.placedBy);
    return {
      id: cellKey,
      targetCellKey: cellKey,
      label: `(${cell?.q}, ${cell?.r})${owner ? ` ${owner.name}の都市` : " 中立都市"}`
    };
  });

  return {
    id: makeChoiceId("cathedral", context.sourceId, state.currentPlayerId),
    kind: "cathedral-placement",
    ownerPlayerId: state.currentPlayerId,
    prompt: "大聖堂を建設する都市を選んでください。",
    optional: false,
    options,
    payload: {},
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "cathedral",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      ...(context.afterPlay ? { afterPlay: context.afterPlay } : {})
    }
  };
}

// Law Suit may only be aimed at someone who actually attacked you this
// generation, so the options come from the ledger rather than the player list.
export function buildLawSuitChoice(state, targets, context) {
  if (targets.length === 0) return null;

  const options = targets.map(player => ({
    id: player.id,
    targetPlayerId: player.id,
    label: `${player.name}（MC ${player.mc}）`
  }));

  return {
    id: makeChoiceId("law-suit", context.sourceId, state.currentPlayerId),
    kind: "law-suit",
    ownerPlayerId: state.currentPlayerId,
    prompt: "訴える相手を選んでください。",
    optional: false,
    options,
    payload: {},
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "law-suit",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      ...(context.afterPlay ? { afterPlay: context.afterPlay } : {})
    }
  };
}

// "Take up to N of X, or M of Y, from any player" is one question with an
// option per (victim, resource) pair. Sabotage offers three resources, Hired
// Raiders and Virus two, and most cards one.
//
// `eligible` narrows who may be hit -- Comet for Venus only reaches players
// holding a Venus tag, Flooding only the owners of tiles beside the new ocean.
// The solo game plays against a neutral opponent that "has whatever resources
// are needed"; what is stolen from it comes out of the general supply. Kept as
// a virtual target rather than a player, because a real entry in state.players
// would leak into turn order, awards, production and scoring.
export const SOLO_NEUTRAL_TARGET_ID = "@solo-neutral";

export function buildResourceStealChoice(state, spec, context) {
  const attackerId = state.currentPlayerId;
  const eligible = spec.eligible ?? (() => true);
  const options = [];

  // Only taking is possible against the neutral opponent: removing a resource
  // it does not really hold would achieve nothing, so Sabotage and Virus offer
  // it no target.
  if (spec.steal && (state.players ?? []).length === 1) {
    for (const choice of spec.resources ?? []) {
      const label = PRODUCTION_LABELS[choice.resource] ?? choice.resource;
      options.push({
        id: `${SOLO_NEUTRAL_TARGET_ID}:${choice.resource}`,
        targetPlayerId: SOLO_NEUTRAL_TARGET_ID,
        resource: choice.resource,
        count: choice.count,
        label: `中立相手から ${label} ${choice.count}`
      });
    }
  }

  for (const player of state.players ?? []) {
    // Stealing from yourself is legal in the printed rules but pointless, and
    // it is never what the player means. The attacker is offered only if no
    // one else can be hit, which keeps a required attack resolvable.
    if (player.id === attackerId) continue;
    if (!eligible(player, state)) continue;
    for (const choice of spec.resources ?? []) {
      const held = player[choice.resource] ?? 0;
      if (held <= 0) continue;
      const taken = Math.min(held, choice.count);
      const label = PRODUCTION_LABELS[choice.resource] ?? choice.resource;
      options.push({
        id: `${player.id}:${choice.resource}`,
        targetPlayerId: player.id,
        resource: choice.resource,
        count: choice.count,
        label: `${player.name} から ${label} ${taken}`
      });
    }
  }

  // Virus removes animals from a *card*, not from a stock. Every card that can
  // hold the named resource and currently holds at least one is a target,
  // whoever owns it -- including the attacker, whose own cards are legal
  // targets under the printed rules even though hitting them earns no
  // grievance (`recordAttack` drops self-attacks).
  for (const spent of spec.cardResources ?? []) {
    const holders = collectResourceTargets(state, spent.resourceType, context.cards ?? [], {
      mustHaveResources: true,
      getResourceType: context.getResourceType
    });
    for (const target of holders) {
      // A card holding one animal loses one, not two.
      const taken = Math.min(target.amount, spent.count);
      const label = CARD_RESOURCE_LABELS[spent.resourceType] ?? spent.resourceType;
      options.push({
        id: `card:${target.targetPlayerId}:${target.targetCardId}:${spent.resourceType}`,
        targetPlayerId: target.targetPlayerId,
        targetCardId: target.targetCardId,
        cardResourceType: spent.resourceType,
        count: spent.count,
        label: `${target.label} から ${label} ${taken}`
      });
    }
  }

  if (options.length === 0) return null;

  return {
    id: makeChoiceId("resource-steal", context.sourceId, attackerId),
    kind: "resource-steal",
    ownerPlayerId: attackerId,
    prompt: spec.prompt ?? "対象を選んでください。",
    optional: Boolean(spec.optional),
    options,
    payload: { steal: Boolean(spec.steal) },
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "resource-steal",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      payload: { steal: Boolean(spec.steal) },
      ...(context.afterPlay ? { afterPlay: context.afterPlay } : {})
    }
  };
}

// "Remove up to N plants from any player" picks a victim the same way a
// production attack does. Without this the removal fell through to the acting
// player's own stock, so playing Asteroid destroyed your own plants.
export function buildResourceAttackChoice(state, resource, count, context) {
  const targets = (state.players ?? []).filter(player => (player[resource] ?? 0) > 0);
  if (targets.length === 0) return null;

  const label = PRODUCTION_LABELS[resource] ?? resource;
  const options = targets.map(player => ({
    id: player.id,
    targetPlayerId: player.id,
    label: `${player.name}（${label} ${player[resource]}）`
  }));

  return {
    id: makeChoiceId("resource-attack", context.sourceId, state.currentPlayerId),
    kind: "resource-attack",
    ownerPlayerId: state.currentPlayerId,
    prompt: `${label}を最大${count}個取り除く対象を選んでください。`,
    optional: false,
    options,
    payload: { resource, count },
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "resource-attack",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      payload: { resource, count },
      ...(context.afterPlay ? { afterPlay: context.afterPlay } : {})
    }
  };
}

const CARD_RESOURCE_LABELS = {
  animal: "動物",
  microbe: "微生物",
  science: "サイエンス",
  floater: "フローター",
  asteroid: "小惑星",
  fighter: "戦力",
  camp: "キャンプ"
};

const PRODUCTION_LABELS = {
  mc: "MC",
  steel: "建材",
  titanium: "チタン",
  plants: "植物",
  energy: "電力",
  heat: "熱"
};

// "Place a colony" lets the player choose the moon. Building is free here: the
// card already paid for it, so this bypasses the usual 17 M€.
export function buildColonyChoice(state, spec, context, tiles) {
  const options = (tiles ?? []).map(tile => ({
    id: tile.id,
    targetTileId: tile.id,
    label: tile.name ?? tile.id
  }));
  if (options.length === 0) return null;

  return {
    id: makeChoiceId("colony-placement", context.sourceId, state.currentPlayerId),
    kind: "colony-placement",
    ownerPlayerId: state.currentPlayerId,
    prompt: "入植する植民地を選んでください。",
    optional: false,
    options,
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "colony-placement",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true,
      payload: { allowDuplicates: Boolean(spec?.allowDuplicates) }
    }
  };
}
