export const PLAYER_SCALAR_FIELDS = [
  "tr",
  "mc",
  "mcProd",
  "steel",
  "steelProd",
  "titanium",
  "titaniumProd",
  "plants",
  "plantsProd",
  "energy",
  "energyProd",
  "heat",
  "heatProd",
  "actionsRemaining",
  "generationStartTr",
  "globalRequirementBuffer",
  "oneShotRequirementBuffer",
  "oneShotCardDiscount",
  "freeAwardUsed",
  "initialActionDone",
  "corporationId",
  "setupStep",
  "turnStep",
  "passed"
];

export const PLAYER_REF_FIELDS = [
  "researchCards",
  "corporationOptions",
  "preludeOptions",
  "selectedPreludeIds",
  "hand",
  "playedProjects",
  "playedEvents",
  "cardResources",
  "cardPlacements",
  "cardDiscounts",
  "copiedProductions",
  "usedCardActions",
  "usedPolicyActions"
];

export const LEGACY_PLAYER_FIELDS = [...PLAYER_SCALAR_FIELDS, ...PLAYER_REF_FIELDS];

// Multiplayer starts at 20 TR; the solo variant starts at 14 because there is
// no opponent to race and the 14-generation limit provides the pressure instead.
export const STARTING_TR = 20;
export const SOLO_STARTING_TR = 14;
// The solo replacement for "the player with the lowest TR": Turmoil's Reds
// bonus lands only while TR is at or below this.
export const SOLO_TR_SWING_THRESHOLD = 20;
// Colonies' solo variant starts the player 2 M€ production down.
export const SOLO_COLONIES_MC_PENALTY = 2;

export const DEFAULT_PLAYER_NAMES = [
  "プレイヤー1",
  "プレイヤー2",
  "プレイヤー3",
  "プレイヤー4",
  "プレイヤー5"
];

export function createPlayer(id, name, overrides = {}) {
  return {
    id,
    name,
    setupStep: "corporation",
    turnStep: "start",
    actionsRemaining: 2,
    generationStartTr: STARTING_TR,
    freeAwardUsed: false,
    initialActionDone: false,
    researchCards: [],
    corporationOptions: [],
    corporationId: null,
    preludeOptions: [],
    selectedPreludeIds: [],
    tr: STARTING_TR,
    mc: 42,
    mcProd: 0,
    steel: 0,
    steelProd: 0,
    titanium: 0,
    titaniumProd: 0,
    plants: 0,
    plantsProd: 0,
    energy: 0,
    energyProd: 0,
    heat: 0,
    heatProd: 0,
    hand: [],
    playedProjects: [],
    // Red events leave play once resolved. Keeping them out of playedProjects
    // is what stops their tags being counted for ever after.
    playedEvents: [],
    cardResources: {},
    cardPlacements: {},
    cardDiscounts: { all: 0, tags: {} },
    copiedProductions: [],
    // "各世代につき１回ずつしか使用できません" — the ids of blue-card actions
    // already spent this generation. Cleared in the production phase.
    usedCardActions: [],
    usedPolicyActions: [],
    globalRequirementBuffer: 0,
    oneShotRequirementBuffer: 0,
    oneShotCardDiscount: 0,
    passed: false,
    ...overrides
  };
}

export function getPlayer(state, playerId) {
  if (!state || !Array.isArray(state.players)) return undefined;
  const id = playerId ?? state.currentPlayerId;
  return state.players.find(player => player.id === id);
}

export function getCurrentPlayer(state) {
  return getPlayer(state, state?.currentPlayerId);
}

export function requirePlayer(state, playerId) {
  const player = getPlayer(state, playerId);
  if (!player) {
    throw new Error(`Unknown playerId: ${String(playerId ?? state?.currentPlayerId)}`);
  }
  return player;
}

export function updatePlayer(state, playerId, updater) {
  const id = playerId ?? state.currentPlayerId;
  const players = state.players.map(player => {
    if (player.id !== id) return player;
    const patch = typeof updater === "function" ? updater(player) : updater;
    return patch === player ? player : { ...player, ...patch };
  });
  return withLegacyPlayerAccessors({ ...state, players });
}

// The existing test-suite and large parts of page.tsx read and write single-player
// fields directly on the state root (state.mc, state.hand, ...). Canonical state now
// keeps those on players[<currentPlayerId>]. These accessors bridge the two without
// duplicating data: they are non-enumerable so JSON.stringify never emits them, which
// keeps saved games free of stale mirrors of the real player fields.
export function withLegacyPlayerAccessors(state) {
  if (!state || !Array.isArray(state.players) || state.players.length === 0) return state;

  for (const field of LEGACY_PLAYER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      // A plain `{ ...state, hand: [...] }` spread turns the accessor into an own
      // data property. Deleting it outright would discard whatever the caller
      // just wrote, so carry the value down to the player it belongs to first.
      const shadowed = state[field];
      delete state[field];
      const owner = getCurrentPlayer(state) ?? state.players[0];
      const index = owner ? state.players.findIndex(player => player.id === owner.id) : -1;
      if (index >= 0 && !Object.is(shadowed, state.players[index][field])) {
        const next = { ...state.players[index], [field]: shadowed };
        state.players = state.players.map((player, i) => (i === index ? next : player));
      }
    }
    Object.defineProperty(state, field, {
      configurable: true,
      enumerable: false,
      get() {
        const player = getCurrentPlayer(this) ?? this.players[0];
        return player ? player[field] : undefined;
      },
      set(value) {
        const targetId = (getCurrentPlayer(this) ?? this.players[0])?.id;
        const index = this.players.findIndex(player => player.id === targetId);
        if (index < 0) return;
        // Replace the element rather than mutating it so callers that snapshot
        // `state.players` before a write still observe the old value.
        const next = { ...this.players[index], [field]: value };
        this.players = this.players.map((player, i) => (i === index ? next : player));
      }
    });
  }

  return state;
}

function cloneChoiceValue(value) {
  if (Array.isArray(value)) return value.map(cloneChoiceValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cloneChoiceValue(entry)])
  );
}

export function clonePendingChoice(choice) {
  return choice ? cloneChoiceValue(choice) : null;
}

export function cloneGameState(state) {
  const clone = {
    ...state,
    players: state.players.map(player => ({
      ...player,
      researchCards: [...player.researchCards],
      corporationOptions: [...player.corporationOptions],
      preludeOptions: [...player.preludeOptions],
      selectedPreludeIds: [...player.selectedPreludeIds],
      hand: [...player.hand],
      playedProjects: [...player.playedProjects],
      playedEvents: [...(player.playedEvents ?? [])],
      cardResources: { ...player.cardResources },
      cardPlacements: { ...player.cardPlacements },
      cardDiscounts: {
        all: player.cardDiscounts.all,
        tags: { ...player.cardDiscounts.tags }
      },
      copiedProductions: (player.copiedProductions ?? []).map(entry => ({
        sourceCardId: entry.sourceCardId,
        production: { ...(entry.production ?? {}) }
      })),
      usedCardActions: [...(player.usedCardActions ?? [])]
    })),
    turnOrder: [...state.turnOrder],
    deck: [...state.deck],
    preludeDeck: [...(state.preludeDeck ?? [])],
    discardPile: [...state.discardPile],
    logs: [...state.logs],
    board: Object.fromEntries(
      Object.entries(state.board).map(([key, cell]) => [key, { ...cell }])
    ),
    claimedMilestones: [...(state.claimedMilestones ?? [])],
    fundedAwards: [...(state.fundedAwards ?? [])],
    scoreModifiers: cloneChoiceValue(state.scoreModifiers ?? []),
    boardMarkers: cloneChoiceValue(state.boardMarkers ?? []),
    generationAttackLedger: cloneChoiceValue(state.generationAttackLedger ?? []),
    resolvedChoices: cloneChoiceValue(state.resolvedChoices ?? {}),
    turmoil: cloneChoiceValue(state.turmoil),
    colonies: cloneChoiceValue(state.colonies),
    pendingChoice: clonePendingChoice(state.pendingChoice),
    setupContinuation: state.setupContinuation ? { ...state.setupContinuation } : null,
    pendingChoiceQueue: (state.pendingChoiceQueue ?? []).map(clonePendingChoice)
  };
  return withLegacyPlayerAccessors(clone);
}

export function serializeGameState(state) {
  // Accessors are non-enumerable, so a plain spread drops them and keeps only
  // canonical fields. players/board are already owned by the state object.
  return { ...state };
}
