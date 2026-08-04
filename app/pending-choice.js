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
      payload: { tileType, specialName: context.specialName ?? null }
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
