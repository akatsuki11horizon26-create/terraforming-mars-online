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
  "cardResources",
  "cardPlacements",
  "cardDiscounts"
];

export const LEGACY_PLAYER_FIELDS = [...PLAYER_SCALAR_FIELDS, ...PLAYER_REF_FIELDS];

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
    generationStartTr: 14,
    researchCards: [],
    corporationOptions: [],
    corporationId: null,
    preludeOptions: [],
    selectedPreludeIds: [],
    tr: 14,
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
    cardResources: {},
    cardPlacements: {},
    cardDiscounts: { all: 0, tags: {} },
    globalRequirementBuffer: 0,
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
      delete state[field];
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

  if (!Object.prototype.hasOwnProperty.call(state, "pendingOceans")) {
    Object.defineProperty(state, "pendingOceans", {
      configurable: true,
      enumerable: false,
      get() {
        const choice = this.pendingChoice;
        if (!choice || choice.kind !== "ocean-placement") return 0;
        return choice.continuation?.remaining ?? 1;
      },
      set(value) {
        const amount = Number(value) || 0;
        if (amount <= 0) {
          if (this.pendingChoice?.kind === "ocean-placement") this.pendingChoice = null;
          return;
        }
        const ownerId = (getCurrentPlayer(this) ?? this.players[0])?.id;
        if (this.pendingChoice?.kind === "ocean-placement") {
          this.pendingChoice = {
            ...this.pendingChoice,
            continuation: { ...this.pendingChoice.continuation, remaining: amount }
          };
          return;
        }
        this.pendingChoice = {
          id: `ocean-${ownerId}`,
          kind: "ocean-placement",
          ownerPlayerId: ownerId,
          prompt: "海洋タイルを配置してください。",
          optional: false,
          options: [],
          continuation: {
            sourceKind: "card",
            sourceId: "",
            stage: "place-ocean",
            consumedAction: true,
            paid: true,
            remaining: amount
          }
        };
      }
    });
  }

  return state;
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
      cardResources: { ...player.cardResources },
      cardPlacements: { ...player.cardPlacements },
      cardDiscounts: {
        all: player.cardDiscounts.all,
        tags: { ...player.cardDiscounts.tags }
      }
    })),
    turnOrder: [...state.turnOrder],
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    logs: [...state.logs],
    board: Object.fromEntries(
      Object.entries(state.board).map(([key, cell]) => [key, { ...cell }])
    ),
    pendingChoice: state.pendingChoice
      ? {
          ...state.pendingChoice,
          options: state.pendingChoice.options.map(option => ({ ...option })),
          continuation: { ...state.pendingChoice.continuation }
        }
      : null
  };
  return withLegacyPlayerAccessors(clone);
}

export function serializeGameState(state) {
  // Accessors are non-enumerable, so a plain spread drops them and keeps only
  // canonical fields. players/board are already owned by the state object.
  return { ...state };
}
