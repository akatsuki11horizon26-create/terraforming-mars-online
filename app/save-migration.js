import { createPlayer, withLegacyPlayerAccessors } from "./player-state.js";
import { isCellPlacementValid } from "./game-logic.js";
import { buildTileChoice } from "./pending-choice.js";

export const SAVE_KEY = "mars_frontier_game";
export const CURRENT_RULES_VERSION = 5;

const PHASES = ["setup", "research", "action", "production", "final_greenery", "game_over"];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// v3 stored a single player's resources on the state root. Convert it to the
// canonical shape rather than discarding the save.
function migrateV3(parsed) {
  const player = createPlayer("player", "プレイヤー1", {
    setupStep: typeof parsed.setupStep === "string" ? parsed.setupStep : "corporation",
    turnStep: typeof parsed.turnStep === "string" ? parsed.turnStep : "start",
    actionsRemaining: Number(parsed.actionsRemaining ?? 2),
    generationStartTr: Number(parsed.generationStartTr ?? 14),
    researchCards: Array.isArray(parsed.researchCards) ? parsed.researchCards : [],
    corporationOptions: Array.isArray(parsed.corporationOptions) ? parsed.corporationOptions : [],
    corporationId: parsed.corporationId ?? null,
    preludeOptions: Array.isArray(parsed.preludeOptions) ? parsed.preludeOptions : [],
    selectedPreludeIds: Array.isArray(parsed.selectedPreludeIds) ? parsed.selectedPreludeIds : [],
    tr: Number(parsed.tr ?? 14),
    mc: Number(parsed.mc ?? 0),
    mcProd: Number(parsed.mcProd ?? 0),
    steel: Number(parsed.steel ?? 0),
    steelProd: Number(parsed.steelProd ?? 0),
    titanium: Number(parsed.titanium ?? 0),
    titaniumProd: Number(parsed.titaniumProd ?? 0),
    plants: Number(parsed.plants ?? 0),
    plantsProd: Number(parsed.plantsProd ?? 0),
    energy: Number(parsed.energy ?? 0),
    energyProd: Number(parsed.energyProd ?? 0),
    heat: Number(parsed.heat ?? 0),
    heatProd: Number(parsed.heatProd ?? 0),
    hand: Array.isArray(parsed.hand) ? parsed.hand : [],
    playedProjects: Array.isArray(parsed.playedProjects) ? parsed.playedProjects : [],
    cardResources: isPlainObject(parsed.cardResources) ? { ...parsed.cardResources } : {},
    cardPlacements: isPlainObject(parsed.cardPlacements) ? { ...parsed.cardPlacements } : {},
    cardDiscounts: isPlainObject(parsed.cardDiscounts)
      ? { all: Number(parsed.cardDiscounts.all ?? 0), tags: { ...(parsed.cardDiscounts.tags ?? {}) } }
      : { all: 0, tags: {} },
    globalRequirementBuffer: Number(parsed.globalRequirementBuffer ?? 0),
    oneShotRequirementBuffer: Number(parsed.oneShotRequirementBuffer ?? 0)
  });

  const board = isPlainObject(parsed.board) ? parsed.board : {};
  const pendingOceans = Number(parsed.pendingOceans ?? 0);
  // v3 owed these oceans as a bare number and let the player click the board to
  // spend it. The board now answers a choice that names its own legal spaces, so
  // the debt has to be converted into one — a choice with no options highlights
  // nothing and leaves the restored game with no way to continue.
  const pendingChoice =
    pendingOceans > 0
      ? buildTileChoice(
          { board, currentPlayerId: "player" },
          "ocean",
          {
            sourceKind: "card",
            sourceId: "",
            consumedAction: true,
            paid: true,
            remaining: pendingOceans
          },
          Object.values(board).filter(cell => isCellPlacementValid(cell, "ocean", board, "player"))
        )
      : null;
  if (pendingChoice) {
    // buildTileChoice makes a generic tile-placement; the ocean debt is resolved
    // by its own stage, which is what pays the placement out.
    pendingChoice.kind = "ocean-placement";
    pendingChoice.continuation.stage = "place-ocean";
  }

  return {
    // migrateV4ToV5 fills the v5 additions; this stays the v4 shape so there
    // is one place that knows what v5 added.
    rulesVersion: 4,
    mode: "solo",
    generation: Number(parsed.generation ?? 1),
    phase: parsed.phase,
    players: [player],
    turnOrder: ["player"],
    currentPlayerId: "player",
    firstPlayerId: "player",
    temperature: Number(parsed.temperature ?? -30),
    oxygen: Number(parsed.oxygen ?? 0),
    venus: Number(parsed.venus ?? 0),
    oceans: Number(parsed.oceans ?? 0),
    board,
    deck: Array.isArray(parsed.deck) ? parsed.deck : [],
    discardPile: Array.isArray(parsed.discardPile) ? parsed.discardPile : [],
    pendingChoice,
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    isGameOver: Boolean(parsed.isGameOver),
    gameResult: parsed.gameResult ?? null,
    // Saves written before multiplayer had a winner carry neither field; the end
    // screen falls back to gameResult when standings is null.
    standings: Array.isArray(parsed.standings) ? parsed.standings : null,
    winnerPlayerIds: Array.isArray(parsed.winnerPlayerIds) ? parsed.winnerPlayerIds : null,
    // Only drives the on-screen effect, so a save without it simply shows nothing
    // until the next card is played.
    lastAction: isPlainObject(parsed.lastAction) ? parsed.lastAction : null,
    onboarded: Boolean(parsed.onboarded)
  };
}

function isValidV3(parsed) {
  return (
    parsed.rulesVersion === 3 &&
    "generation" in parsed &&
    typeof parsed.generationStartTr === "number" &&
    PHASES.includes(parsed.phase) &&
    Array.isArray(parsed.researchCards) &&
    Array.isArray(parsed.corporationOptions) &&
    Array.isArray(parsed.preludeOptions) &&
    Array.isArray(parsed.selectedPreludeIds) &&
    isPlainObject(parsed.cardPlacements) &&
    typeof parsed.setupStep === "string" &&
    typeof parsed.pendingOceans === "number"
  );
}

// v4 and v5 share a shape; v5 only adds fields that default to empty, so one
// validator covers both and migrateV4ToV5 fills the gaps.
function isValidV4(parsed) {
  if (parsed.rulesVersion !== 4 && parsed.rulesVersion !== 5) return false;
  if (!PHASES.includes(parsed.phase)) return false;
  if (!Array.isArray(parsed.players) || parsed.players.length === 0 || parsed.players.length > 5) return false;
  if (!Array.isArray(parsed.turnOrder) || parsed.turnOrder.length !== parsed.players.length) return false;

  const ids = parsed.players.map(player => player?.id);
  if (ids.some(id => typeof id !== "string")) return false;
  if (new Set(ids).size !== ids.length) return false;
  if (!ids.includes(parsed.currentPlayerId)) return false;
  if (!ids.includes(parsed.firstPlayerId)) return false;
  if (!parsed.turnOrder.every(id => ids.includes(id))) return false;
  if (!isPlainObject(parsed.board)) return false;
  if (!Array.isArray(parsed.deck) || !Array.isArray(parsed.discardPile)) return false;
  if (!["solo", "hotseat", "robot"].includes(parsed.mode)) return false;

  const numericFields = ["tr", "mc", "steel", "titanium", "plants", "energy", "heat"];
  if (
    parsed.players.some(
      player => !isPlainObject(player) || numericFields.some(field => typeof player[field] !== "number")
    )
  ) {
    return false;
  }

  if (parsed.pendingChoice !== null && parsed.pendingChoice !== undefined) {
    const choice = parsed.pendingChoice;
    if (!isPlainObject(choice)) return false;
    if (!ids.includes(choice.ownerPlayerId)) return false;
    if (!isPlainObject(choice.continuation)) return false;
  }

  return true;
}

// v5 adds the three scoring ledgers and splits events out of playedProjects.
// A v4 save keeps its events where they are: board-milestones reads both piles,
// so Legend still counts them, and moving them here would need the card
// catalogue this module deliberately does not import.
function migrateV4ToV5(parsed) {
  if (parsed.rulesVersion === CURRENT_RULES_VERSION) return parsed;
  return {
    ...parsed,
    rulesVersion: CURRENT_RULES_VERSION,
    scoreModifiers: parsed.scoreModifiers ?? [],
    boardMarkers: parsed.boardMarkers ?? [],
    generationAttackLedger: parsed.generationAttackLedger ?? [],
    players: parsed.players.map(player => ({
      ...player,
      playedEvents: player.playedEvents ?? []
    }))
  };
}

// Returns canonical state, or null when the save is unusable and should be dropped.
export function loadSavedState(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  if (isValidV4(parsed)) {
    if (parsed.pendingChoice === undefined) parsed.pendingChoice = null;
    return withLegacyPlayerAccessors(migrateV4ToV5(parsed));
  }
  if (isValidV3(parsed)) {
    return withLegacyPlayerAccessors(migrateV4ToV5(migrateV3(parsed)));
  }
  return null;
}

export function serializeSavedState(state) {
  // Legacy accessors are non-enumerable, so the spread emits canonical fields only.
  return JSON.stringify({ ...state });
}
