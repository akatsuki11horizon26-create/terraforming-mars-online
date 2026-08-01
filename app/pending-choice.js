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

export function buildResourceChoice(state, spec, context) {
  const count = typeof spec === "number" ? spec : (spec.count ?? 1);
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

export function buildStandardResourceChoice(state, spec, context) {
  const count = typeof spec === "number" ? spec : (spec.count ?? 1);
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
