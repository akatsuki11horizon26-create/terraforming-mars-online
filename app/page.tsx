"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ALL_CARDS as jsALL_CARDS,
  CORPORATIONS as jsCORPORATIONS,
  PRELUDES as jsPRELUDES,
  getInitialState as jsGetInitialState,
  getPlaceholderState as jsGetPlaceholderState,
  computeScore as jsComputeScore,
  getCardDiscount as jsGetCardDiscount,
  getCardPaymentCost as jsGetCardPaymentCost,
  getCardPlayableStatus as jsGetCardPlayableStatus,
  getAdjacentCells as jsGetAdjacentCells,
  isCellPlacementValid as jsIsCellPlacementValid,
  countAdjacentOceans as jsCountAdjacentOceans,
  checkParameterThresholds as jsCheckParameterThresholds,
  handleActionSpend as jsHandleActionSpend,
  triggerProduction as jsTriggerProduction,
  isGameOverCheck as jsIsGameOverCheck,
  addLog as jsAddLog,
  applyCorporation as jsApplyCorporation,
  applyPreludes as jsApplyPreludes,
  getPreludeCost as jsGetPreludeCost,
  applyCardEffect as jsApplyCardEffect,
  applyCorporationTriggers as jsApplyCorporationTriggers,
  getCardActionStatus as jsGetCardActionStatus,
  applyCardAction as jsApplyCardAction,
  getCardEffect as jsGetCardEffect
} from "./game-logic.js";
import { SAVE_KEY, loadSavedState, serializeSavedState } from "./save-migration.js";
import {
  AwardPanel,
  ColonyPanel,
  MilestonePanel,
  PendingChoiceDialog,
  PlayerBar,
  TurmoilPanel
} from "./expansion-panels";
import {
  MILESTONES as jsMILESTONES,
  AWARDS as jsAWARDS,
  PARTIES as jsPARTIES,
  claimMilestone as jsClaimMilestone,
  fundAward as jsFundAward,
  getMilestoneStatus as jsGetMilestoneStatus,
  getAwardStatus as jsGetAwardStatus,
  getNextAwardCost as jsGetNextAwardCost,
  getInfluence as jsGetInfluence,
  sendDelegateToParty as jsSendDelegateToParty,
  buildColonyOn as jsBuildColonyOn,
  tradeWith as jsTradeWith,
  canBuildColony as jsCanBuildColony,
  canTrade as jsCanTrade,
  availableFleets as jsAvailableFleets,
  getColonyTile as jsGetColonyTile,
  resolvePendingChoice as jsResolvePendingChoice,
  GLOBAL_EVENTS as jsGLOBAL_EVENTS,
  withLegacyPlayerAccessors as jsWithLegacyPlayerAccessors
} from "./game-logic.js";
import { BOARD_CENTRE } from "./tharsis-board.js";
import { CardTags } from "./card-tags";

interface PlayerRecord {
  id: string;
  name: string;
  tr: number;
  mc: number;
  passed?: boolean;
}
interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
}
type AwardDefinition = MilestoneDefinition;
interface PartyDefinition {
  id: string;
  name: string;
}
interface ColonyDefinition {
  name: string;
  trade?: { description?: string; quantity?: number[]; resourceTrack?: string[] };
}

interface CellState {
  q: number;
  r: number;
  isOceanOnly: boolean;
  bonusType: "none" | "plant" | "steel" | "titanium" | "mc" | "card";
  bonusAmount: number;
  tileType: "empty" | "forest" | "city" | "ocean";
  placedBy: "player" | "cpu" | "neutral" | null;
}

interface Card {
  id: string;
  name: string;
  cost: number;
  tags: string[];
  reqText: string;
  effectText: string;
  placementType?: "forest" | "city" | "ocean";
  placementCount?: number;
  victoryPoints?: number;
  type: "automated" | "event" | "active";
  effect?: Record<string, unknown>;
  effectSpec?: Record<string, unknown>;
  requirements?: Record<string, unknown>[];
  expansion?: string;
  requires?: Record<string, unknown>;
  resourceType?: string;
  dynamicVictory?: string;
}

interface Corporation {
  id: string;
  name: string;
  tags: string[];
  starting: Record<string, unknown>;
  effectText: string;
  effects: Record<string, unknown>;
}

interface Prelude {
  id: string;
  name: string;
  tags: string[];
  effectText: string;
  effect: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  sender: "player" | "cpu" | "system";
  text: string;
}

interface GameState {
  rulesVersion: number;
  generation: number;
  generationStartTr: number;
  phase: "setup" | "research" | "action" | "production" | "final_greenery" | "game_over";
  setupStep: "corporation" | "prelude" | "projects" | "complete";
  turnStep: "start" | "one_action_taken" | "second_action_allowed";
  pendingOceans: number;
  researchCards: string[];
  corporationOptions: string[];
  corporationId: string | null;
  preludeOptions: string[];
  selectedPreludeIds: string[];
  discardPile: string[];
  actionsRemaining: number;
  temperature: number;
  oxygen: number;
  venus: number;
  oceans: number;
  tr: number;
  mc: number;
  mcProd: number;
  steel: number;
  steelProd: number;
  titanium: number;
  titaniumProd: number;
  plants: number;
  plantsProd: number;
  energy: number;
  energyProd: number;
  heat: number;
  heatProd: number;
  hand: string[];
  deck: string[];
  playedProjects: string[];
  cardResources: Record<string, number>;
  cardPlacements: Record<string, string>;
  board: Record<string, CellState>;
  logs: LogEntry[];
  isGameOver: boolean;
  gameResult: "win" | "loss" | null;
  onboarded: boolean;
  // Canonical multiplayer state. The flat fields above remain readable through
  // the compatibility accessors installed by player-state.js.
  mode?: "solo" | "hotseat";
  players?: PlayerRecord[];
  turnOrder?: string[];
  currentPlayerId?: string;
  claimedMilestones?: { milestoneId: string; playerId: string }[];
  fundedAwards?: { awardId: string; playerId: string }[];
  pendingChoice?: {
    id: string;
    kind: string;
    ownerPlayerId: string;
    prompt: string;
    optional: boolean;
    options: {
      id: string;
      label: string;
      targetCardId?: string;
      targetCellKey?: string;
      resource?: string;
      amount?: number;
    }[];
    continuation: { remaining?: number };
  } | null;
  turmoil?: {
    chairman: string;
    rulingParty: string;
    dominantParty: string;
    parties: Record<string, { delegates: string[]; leader: string | null }>;
    lobby: string[];
    currentEvent: string | null;
    comingEvent: string | null;
    distantEvent: string | null;
  } | null;
  colonies?: {
    tilesInPlay: string[];
    tiles: Record<string, { id: string; trackPosition: number; colonies: string[] }>;
    fleets: Record<string, number>;
    usedFleets: Record<string, number>;
  } | null;
}

// Cast untyped imports to strongly-typed constants
const ALL_CARDS = jsALL_CARDS as unknown as Card[];
const CORPORATIONS = jsCORPORATIONS as unknown as Corporation[];
const PRELUDES = jsPRELUDES as unknown as Prelude[];
const getInitialState = jsGetInitialState as unknown as (options?: {
  playerCount?: number;
  mode?: "solo" | "hotseat";
  playerNames?: string[];
  turmoil?: boolean;
  colonies?: boolean;
}) => GameState;
const getPlaceholderState = jsGetPlaceholderState as unknown as () => GameState;

// Board rendering geometry. The Tharsis map is 9 columns wide, so the hexes are
// spaced slightly tighter than their 54px width to keep the widest row inside the
// 460px planet.
const SPHERE_RADIUS = 230;
const HEX_WIDTH = 48;
const HEX_HEIGHT = 41.6;
const HEX_STEP_X = 46;
const HEX_STEP_Y = 40;
const computeScore = jsComputeScore as unknown as (state: GameState) => number;
const getCardDiscount = jsGetCardDiscount as unknown as (card: Card, state: GameState) => { maxSteel: number; maxTitanium: number };
const getCardPaymentCost = jsGetCardPaymentCost as unknown as (card: Card, state: GameState, steelUsed: number, titaniumUsed: number) => number;
const getCardPlayableStatus = jsGetCardPlayableStatus as unknown as (card: Card, state: GameState, steelUsed: number, titaniumUsed: number) => { playable: boolean; reason: string };
const getAdjacentCells = jsGetAdjacentCells as unknown as (q: number, r: number) => { q: number; r: number }[];
const isCellPlacementValid = jsIsCellPlacementValid as unknown as (cell: CellState, type: "forest" | "city" | "ocean", board: Record<string, CellState>) => boolean;
const countAdjacentOceans = jsCountAdjacentOceans as unknown as (q: number, r: number, board: Record<string, CellState>) => number;
const checkParameterThresholds = jsCheckParameterThresholds as unknown as (oldTemp: number, newTemp: number, oldOxy: number, newOxy: number, state: GameState, logs: LogEntry[]) => { state: GameState; logs: LogEntry[] };
const handleActionSpend = jsHandleActionSpend as unknown as (state: GameState, logAcc: LogEntry[]) => GameState;
const triggerProduction = jsTriggerProduction as unknown as (state: GameState, logAcc: LogEntry[]) => GameState;
const isGameOverCheck = jsIsGameOverCheck as unknown as (temp: number, oxy: number, oce: number) => boolean;
const addLog = jsAddLog as unknown as (logsList: LogEntry[], sender: "player" | "cpu" | "system", text: string) => LogEntry[];
const applyCorporation = jsApplyCorporation as unknown as (state: GameState, corporationId: string) => GameState;
const applyPreludes = jsApplyPreludes as unknown as (state: GameState, preludeIds: string[]) => GameState;
const getPreludeCost = jsGetPreludeCost as unknown as (prelude: Prelude) => number;
const applyCardEffect = jsApplyCardEffect as unknown as (state: GameState, card: Card, logs: LogEntry[], options?: { skipTile?: boolean }) => { state: GameState; logs: LogEntry[] };
const applyCorporationTriggers = jsApplyCorporationTriggers as unknown as (state: GameState, card: Card, logs: LogEntry[]) => { state: GameState; logs: LogEntry[] };
const getCardActionStatus = jsGetCardActionStatus as unknown as (state: GameState, card: Card) => { playable: boolean; reason: string };
const applyCardAction = jsApplyCardAction as unknown as (state: GameState, card: Card, logs: LogEntry[]) => { state: GameState; logs: LogEntry[]; playable: boolean };
const getCardEffect = jsGetCardEffect as unknown as (card: Card) => Record<string, unknown>;

export default function Home() {
  // getInitialState shuffles the deck, and solo neutral tiles are now placed from
  // that shuffle, so calling it during render makes the server and client draw
  // different boards and hydration fails. Start from a deterministic empty board
  // and deal the real game once, on the client, after mount.
  const [gameState, setGameState] = useState<GameState>(getPlaceholderState);
  const [dealt, setDealt] = useState(false);

  // New-game options. The setup panel opens from the header and replaces the
  // board until a game is started, so multiplayer is reachable without editing
  // code.
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [setupPlayerCount, setSetupPlayerCount] = useState(1);
  const [setupPlayerNames, setSetupPlayerNames] = useState<string[]>([]);
  const [setupTurmoil, setSetupTurmoil] = useState(false);
  const [setupColonies, setSetupColonies] = useState(false);

  // Swaps the placeholder for a real game and records that the deal happened.
  const setDealtState = (next: GameState) => {
    setGameState(jsWithLegacyPlayerAccessors(next) as GameState);
    setDealt(true);
  };
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [steelUsed, setSteelUsed] = useState<number>(0);
  const [titaniumUsed, setTitaniumUsed] = useState<number>(0);
  const [placementMode, setPlacementMode] = useState<{
    active: boolean;
    type: "forest" | "city" | "ocean";
    sourceCardId?: string;
    sourceProject?: "greenery" | "plants" | "ocean" | "city" | "ecoline";
    remainingPlacements?: number;
    cardPaymentDone?: boolean;
  } | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Setup / Research phase card selection state
  const [selectedCorporationId, setSelectedCorporationId] = useState<string | null>(null);
  const [selectedPreludeIds, setSelectedPreludeIds] = useState<string[]>([]);
  const [selectedResearchCardIds, setSelectedResearchCardIds] = useState<string[]>([]);

  // Sell patents mode state
  const [isSellingPatents, setIsSellingPatents] = useState(false);
  const [selectedSellCardIds, setSelectedSellCardIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    // v3 saves are converted to the canonical shape; unusable ones are dropped.
    const restored = saved ? (loadSavedState(saved) as GameState | null) : null;
    if (saved && !restored) localStorage.removeItem(SAVE_KEY);

    // Dealing the game is nondeterministic (it shuffles), so it cannot happen
    // during render without the server and client disagreeing. Doing it once on
    // mount is the intended fix for hydration mismatch, which is what this rule
    // would otherwise forbid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDealtState(restored ?? (getInitialState() as GameState));
  }, []);

  const saveState = (newState: GameState) => {
    // page.tsx builds next states with `{ ...gameState }` in many places, which
    // drops the non-enumerable single-player accessors. Re-attach them on the way
    // through so `gameState.playedProjects` and friends never come back undefined.
    const next = jsWithLegacyPlayerAccessors(newState) as GameState;
    setGameState(next);
    localStorage.setItem(SAVE_KEY, serializeSavedState(next));
  };

  // --- Expansion and multiplayer surfaces -------------------------------

  const players = (gameState.players ?? []) as PlayerRecord[];
  const currentPlayerId = gameState.currentPlayerId ?? players[0]?.id ?? "player";
  const pendingChoice = gameState.pendingChoice ?? null;

  const playerSummaries = players.map(player => ({
    id: player.id,
    name: player.name,
    tr: player.tr,
    mc: player.mc,
    passed: player.passed
  }));

  const nameOf = (playerId?: string) =>
    playerId === "NEUTRAL"
      ? "中立"
      : players.find(player => player.id === playerId)?.name ?? playerId ?? "";

  const runEngine = (result: { state?: GameState; logs?: LogEntry[] }) => {
    if (!result?.state) return;
    const next = { ...result.state, logs: result.logs ?? result.state.logs };
    saveState(next as GameState);
  };

  const handleResolveChoice = (optionId: string) => {
    runEngine(
      jsResolvePendingChoice(gameState, optionId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const milestoneViews = (jsMILESTONES as MilestoneDefinition[]).map(milestone => {
    const claimed = (gameState.claimedMilestones ?? []).find(
      entry => entry.milestoneId === milestone.id
    );
    const status = jsGetMilestoneStatus(gameState, milestone.id, currentPlayerId) as {
      claimable: boolean;
      reason: string;
      score: number;
      threshold: number;
      description: string;
    };
    return {
      id: milestone.id,
      name: milestone.name,
      // Turmoil lowers the Terraformer requirement, so take the resolved text.
      description: status.description || milestone.description,
      score: status.score,
      threshold: status.threshold,
      claimable: status.claimable,
      reason: status.reason,
      ownerName: claimed ? nameOf(claimed.playerId) : undefined
    };
  });

  const awardViews = (jsAWARDS as AwardDefinition[]).map(award => {
    const funded = (gameState.fundedAwards ?? []).find(entry => entry.awardId === award.id);
    const status = jsGetAwardStatus(gameState, award.id, currentPlayerId) as {
      fundable: boolean;
      reason: string;
      cost: number;
    };
    return {
      id: award.id,
      name: award.name,
      description: award.description,
      fundable: status.fundable,
      reason: status.reason,
      cost: status.cost ?? 0,
      ownerName: funded ? nameOf(funded.playerId) : undefined
    };
  });

  const turmoilView = gameState.turmoil
    ? {
        chairmanName: nameOf(gameState.turmoil.chairman),
        influence: jsGetInfluence(gameState.turmoil, currentPlayerId) as number,
        parties: (jsPARTIES as PartyDefinition[]).map(party => {
          const seat = gameState.turmoil!.parties[party.id];
          return {
            id: party.id,
            name: party.name,
            delegates: seat?.delegates ?? [],
            leaderName: seat?.leader ? nameOf(seat.leader) : undefined,
            isRuling: gameState.turmoil!.rulingParty === party.id,
            isDominant: gameState.turmoil!.dominantParty === party.id
          };
        }),
        events: (
          [
            ["current", "現行"],
            ["coming", "次回"],
            ["distant", "予告"]
          ] as const
        ).map(([slot, label]) => {
          const id = gameState.turmoil![`${slot}Event` as const];
          const event = (jsGLOBAL_EVENTS as { id: string; name: string }[]).find(
            item => item.id === id
          );
          return { slot, label, name: event?.name ?? "—" };
        })
      }
    : null;

  const colonyViews = gameState.colonies
    ? gameState.colonies.tilesInPlay.map(tileId => {
        const tile = gameState.colonies!.tiles[tileId];
        const definition = jsGetColonyTile(tileId) as ColonyDefinition;
        const build = jsCanBuildColony(gameState.colonies, tileId, currentPlayerId) as {
          ok: boolean;
          reason: string;
        };
        const tradeCheck = jsCanTrade(gameState.colonies, tileId, currentPlayerId) as {
          ok: boolean;
          reason: string;
        };
        return {
          id: tileId,
          name: definition?.name ?? tileId,
          tradeDescription: definition?.trade?.description ?? "",
          track: definition?.trade?.quantity ?? definition?.trade?.resourceTrack ?? [],
          trackPosition: tile?.trackPosition ?? 0,
          colonies: (tile?.colonies ?? []).map(nameOf),
          canBuild: build.ok,
          buildReason: build.reason,
          canTrade: tradeCheck.ok,
          tradeReason: tradeCheck.reason
        };
      })
    : [];

  const handleClaimMilestone = (milestoneId: string) => {
    runEngine(
      jsClaimMilestone(gameState, milestoneId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const handleFundAward = (awardId: string) => {
    runEngine(
      jsFundAward(gameState, awardId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const handleSendDelegate = (partyId: string) => {
    runEngine(
      jsSendDelegateToParty(gameState, partyId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const handleBuildColony = (tileId: string) => {
    runEngine(
      jsBuildColonyOn(gameState, tileId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const handleTradeWithColony = (tileId: string) => {
    runEngine(
      jsTradeWith(gameState, tileId, gameState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
      }
    );
  };

  const initGame = (options?: {
    playerCount?: number;
    playerNames?: string[];
    turmoil?: boolean;
    colonies?: boolean;
  }) => {
    const state = getInitialState(options);
    saveState(state);
    setShowGameSetup(false);
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    setPlacementMode(null);
    setSelectedCorporationId(null);
    setSelectedPreludeIds([]);
    setSelectedResearchCardIds([]);
    setIsSellingPatents(false);
    setSelectedSellCardIds([]);
  };

  const handleCardClick = (cardId: string) => {
    if (placementMode) return;
    if (isSellingPatents) {
      // Toggle selection for selling
      if (selectedSellCardIds.includes(cardId)) {
        setSelectedSellCardIds(selectedSellCardIds.filter(id => id !== cardId));
      } else {
        setSelectedSellCardIds([...selectedSellCardIds, cardId]);
      }
      return;
    }

    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      setSteelUsed(0);
      setTitaniumUsed(0);
    } else {
      setSelectedCardId(cardId);
      setSteelUsed(0);
      setTitaniumUsed(0);
    }
  };

  const payCardCost = (state: GameState, card: Card) => {
    const cost = getCardPaymentCost(card, state, steelUsed, titaniumUsed);
    const heatAsMoney = CORPORATIONS.find(item => item.id === state.corporationId)?.effects?.heatAsMoney ? state.heat : 0;
    const heatUsed = Math.min(heatAsMoney, Math.max(0, cost - state.mc));
    state.mc -= cost - heatUsed;
    state.heat -= heatUsed;
    state.steel -= steelUsed;
    state.titanium -= titaniumUsed;
    return { cost, heatUsed };
  };

  const canPayStandardCost = (cost: number) => gameState.mc + (CORPORATIONS.find(item => item.id === gameState.corporationId)?.effects?.heatAsMoney ? gameState.heat : 0) >= cost;

  const payStandardCost = (state: GameState, cost: number) => {
    const heatAsMoney = CORPORATIONS.find(item => item.id === state.corporationId)?.effects?.heatAsMoney ? state.heat : 0;
    const heatUsed = Math.min(heatAsMoney, Math.max(0, cost - state.mc));
    state.mc -= cost - heatUsed;
    state.heat -= heatUsed;
    return heatUsed;
  };

  const handlePlayCardInit = () => {
    if (!selectedCardId) return;
    const card = ALL_CARDS.find(c => c.id === selectedCardId);
    if (!card) return;

    const { playable } = getCardPlayableStatus(card, gameState, steelUsed, titaniumUsed);
    if (!playable) return;

    if (card.placementType) {
      setPlacementMode({
        active: true,
        type: card.placementType,
        sourceCardId: card.id,
        remainingPlacements: card.placementCount ?? 1,
        cardPaymentDone: false
      });
    } else {
      executePlayCardNoPlacement(card);
    }
  };

  const executeLegacyPlayCardNoPlacement = (card: Card) => {
    const nextState = {
      ...gameState,
      hand: [...gameState.hand],
      deck: [...gameState.deck],
      playedProjects: [...gameState.playedProjects],
      board: { ...gameState.board }
    };
    const costAfterDiscount = Math.max(0, card.cost - (steelUsed * 2) - (titaniumUsed * 3));

    nextState.mc -= costAfterDiscount;
    nextState.steel -= steelUsed;
    nextState.titanium -= titaniumUsed;
    nextState.hand = nextState.hand.filter(id => id !== card.id);
    nextState.playedProjects.push(card.id);

    let localLogs = addLog(
      nextState.logs,
      "player",
      `カードをプレイしました: 【${card.name}】 (支払: MC ${costAfterDiscount}${steelUsed ? `, 建材 ${steelUsed}` : ""}${titaniumUsed ? `, チタン ${titaniumUsed}` : ""})`
    );

    const oldTemp = nextState.temperature;
    const oldOxy = nextState.oxygen;

    if (card.id === "c1") {
      nextState.energyProd += 3;
      nextState.tr += 1;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +3, TR +1");
    } else if (card.id === "c2") {
      nextState.temperature = Math.min(8, nextState.temperature + 4);
      nextState.heat += 4;
      const steps = Math.floor((nextState.temperature - oldTemp) / 2);
      if (steps > 0) {
        nextState.tr += steps;
      }
      nextState.tr += 2; // Card native TR
      localLogs = addLog(localLogs, "system", `効果適用: 気温 +4°C, 熱 +4, TR +${steps + 2}`);
    } else if (card.id === "c3") {
      nextState.energyProd += 1;
      nextState.heat += 2;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +1, 熱 +2");
    } else if (card.id === "c4") {
      nextState.energyProd += 2;
      nextState.heat += 1;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +2, 熱 +1");
    } else if (card.id === "c5") {
      nextState.plantsProd += 2;
      nextState.plants += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +2, 植物 +1 (勝利点 +1)");
    } else if (card.id === "c6") {
      nextState.plantsProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1");
      if (nextState.deck.length > 0) {
        const [drawn, ...rest] = nextState.deck;
        nextState.hand.push(drawn);
        nextState.deck = rest;
        const drawnObj = ALL_CARDS.find(c => c.id === drawn);
        localLogs = addLog(localLogs, "system", `追加カードドロー: 【${drawnObj?.name || drawn}】`);
      }
    } else if (card.id === "c7") {
      nextState.heatProd += 1;
      nextState.heat += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 熱生産量 +1, 熱 +2");
    } else if (card.id === "c9") {
      nextState.steelProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 建材生産量 +2");
    } else if (card.id === "c10") {
      nextState.titaniumProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: チタン生産量 +1");
    } else if (card.id === "c11") {
      nextState.tr += 2;
      nextState.plantsProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: TR +2, 植物生産量 +2");
    } else if (card.id === "c12") {
      nextState.plantsProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1");
    } else if (card.id === "c13") {
      nextState.heatProd += 3;
      localLogs = addLog(localLogs, "system", "効果適用: 熱生産量 +3");
    } else if (card.id === "c14") {
      nextState.steelProd += 1;
      nextState.heatProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 建材生産量 +1, 熱生産量 +2");
    } else if (card.id === "c17") {
      nextState.plantsProd += 2;
      nextState.plants += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +2, 植物 +2");
    } else if (card.id === "c18") {
      nextState.plantsProd += 1;
      nextState.mcProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1, MC生産量 +1");
    } else if (card.id === "c19") {
      nextState.mcProd += 2;
      nextState.tr += 1;
      localLogs = addLog(localLogs, "system", "効果適用: MC生産量 +2, TR +1 (勝利点 +2)");
    }

    const { state: updatedState, logs: updatedLogs } = checkParameterThresholds(
      oldTemp, nextState.temperature,
      oldOxy, nextState.oxygen,
      nextState,
      localLogs
    );

    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);

    const afterAction = handleActionSpend(updatedState, updatedLogs);
    saveState(afterAction);
  };

  void executeLegacyPlayCardNoPlacement;

  const executePlayCardNoPlacement = (card: Card) => {
    const nextState = {
      ...gameState,
      hand: [...gameState.hand],
      deck: [...gameState.deck],
      playedProjects: [...gameState.playedProjects],
      board: { ...gameState.board },
      cardResources: { ...gameState.cardResources },
      cardPlacements: { ...gameState.cardPlacements },
    };
    const { cost: costAfterDiscount, heatUsed } = payCardCost(nextState, card);
    nextState.hand = nextState.hand.filter(id => id !== card.id);
    nextState.playedProjects.push(card.id);

    const localLogs = addLog(nextState.logs, "player", `カードをプレイしました: 【${card.name}】 (支払: MC ${costAfterDiscount}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
    const oldTemp = nextState.temperature;
    const oldOxy = nextState.oxygen;
    const effectResult = applyCardEffect(nextState, card, localLogs);
    const triggerResult = applyCorporationTriggers(effectResult.state, card, effectResult.logs);
    const thresholdResult = checkParameterThresholds(
      oldTemp,
      triggerResult.state.temperature,
      oldOxy,
      triggerResult.state.oxygen,
      triggerResult.state,
      triggerResult.logs,
    );
    const afterAction = handleActionSpend(thresholdResult.state, thresholdResult.logs);
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    saveState(afterAction);
  };

  const handleCardAction = (card: Card) => {
    if (card.type !== "active") return;
    const status = getCardActionStatus(gameState, card);
    if (!status.playable) return;
    const oldTemp = gameState.temperature;
    const oldOxy = gameState.oxygen;
    const actionResult = applyCardAction(gameState, card, gameState.logs);
    if (!actionResult.playable) return;
    const thresholdResult = checkParameterThresholds(
      oldTemp,
      actionResult.state.temperature,
      oldOxy,
      actionResult.state.oxygen,
      actionResult.state,
      actionResult.logs,
    );
    const afterAction = handleActionSpend(thresholdResult.state, thresholdResult.logs);
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    saveState(afterAction);
  };

  const handleCellClick = (cell: CellState) => {
    // If pending ocean placement is active
    if (gameState.pendingOceans > 0) {
      if (cell.tileType !== "empty" || !cell.isOceanOnly) return;
      const nextState = {
        ...gameState,
        board: { ...gameState.board }
      };
      nextState.board[`${cell.q},${cell.r}`] = {
        ...cell,
        tileType: "ocean",
        placedBy: null
      };

      const oldOceans = nextState.oceans;
      nextState.oceans = Math.min(9, nextState.oceans + 1);
      
      let localLogs = addLog(nextState.logs, "player", `ボーナス海洋を (${cell.q}, ${cell.r}) に配置しました。`);
      if (oldOceans < 9) {
        nextState.tr += 1;
        localLogs = addLog(localLogs, "system", "海洋面積 +1, TR +1");
      }
      nextState.pendingOceans -= 1;
      nextState.logs = localLogs;
      saveState(nextState);
      return;
    }

    if (!placementMode) return;
    if (!isCellPlacementValid(cell, placementMode.type, gameState.board)) return;

    let nextState = {
      ...gameState,
      hand: [...gameState.hand],
      deck: [...gameState.deck],
      playedProjects: [...gameState.playedProjects],
      board: { ...gameState.board },
      cardResources: { ...gameState.cardResources },
      cardPlacements: { ...gameState.cardPlacements },
    };
    let localLogs = nextState.logs;

    const oldTemp = nextState.temperature;
    const oldOxy = nextState.oxygen;
    const oldOceans = nextState.oceans;

    if (placementMode.sourceCardId) {
      const card = ALL_CARDS.find(c => c.id === placementMode.sourceCardId);
      if (!card) return;

      const isFirstPlacement = !placementMode.cardPaymentDone;
      if (isFirstPlacement) {
        const { cost: costAfterDiscount, heatUsed } = payCardCost(nextState, card);
        nextState.hand = nextState.hand.filter(id => id !== card.id);
        nextState.playedProjects.push(card.id);

        localLogs = addLog(
          localLogs,
          "player",
          `カードをプレイしました: 【${card.name}】 (支払: MC ${costAfterDiscount}${heatUsed ? `、熱 ${heatUsed}` : ""}${steelUsed ? `, 建材 ${steelUsed}` : ""}${titaniumUsed ? `, チタン ${titaniumUsed}` : ""})`
        );
      }

      nextState.board[`${cell.q},${cell.r}`] = {
        ...cell,
        tileType: placementMode.type,
        placedBy: placementMode.type === "ocean" ? null : "player"
      };
      if (placementMode.sourceCardId && !placementMode.cardPaymentDone) {
        nextState.cardPlacements[placementMode.sourceCardId] = `${cell.q},${cell.r}`;
      }

      localLogs = addLog(localLogs, "player", `タイルを配置しました: 【${placementMode.type === "ocean" ? "海洋" : placementMode.type === "city" ? "都市" : "緑地"}】 (${cell.q}, ${cell.r})`);

      // Ocean adjacency bonus MC
      if (placementMode.type !== "ocean") {
        const adjOceans = countAdjacentOceans(cell.q, cell.r, nextState.board);
        if (adjOceans > 0) {
          const bonusMc = adjOceans * 2;
          nextState.mc += bonusMc;
          localLogs = addLog(localLogs, "system", `海洋隣接ボーナス: MC +${bonusMc} (隣接海洋数: ${adjOceans})`);
        }
      }

      if (placementMode.type === "forest") {
        nextState.oxygen = Math.min(14, nextState.oxygen + 1);
        if (oldOxy < 14) {
          nextState.tr += 1;
          localLogs = addLog(localLogs, "system", "酸素濃度 +1%, TR +1");
        }
      } else if (placementMode.type === "ocean") {
        nextState.oceans = Math.min(9, nextState.oceans + 1);
        if (oldOceans < 9) {
          nextState.tr += 1;
          localLogs = addLog(localLogs, "system", "海洋面積 +1, TR +1");
        }
      }

      if (isFirstPlacement) {
        const effectResult = applyCardEffect(nextState, card, localLogs, { skipTile: true });
        nextState = effectResult.state;
        localLogs = effectResult.logs;
        const triggerResult = applyCorporationTriggers(nextState, card, localLogs);
        nextState = triggerResult.state;
        localLogs = triggerResult.logs;
      }
    } else if (placementMode.sourceProject) {
      if (placementMode.sourceProject === "ecoline") {
        nextState.plants -= 7;
        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "forest",
          placedBy: "player"
        };
        nextState.oxygen = Math.min(14, nextState.oxygen + 1);
        if (oldOxy < 14) nextState.tr += 1;
        localLogs = addLog(localLogs, "player", "Ecoline: 植物7を支払い緑地を配置しました。");
      } else if (placementMode.sourceProject === "greenery" || placementMode.sourceProject === "plants") {
        const payInPlants = placementMode.sourceProject === "plants";
        const isFinalGreenery = gameState.phase === "final_greenery";
        if (payInPlants) {
          nextState.plants -= 8;
          localLogs = addLog(localLogs, "player", "植物の緑化を実行しました (支払: 植物 8)");
        } else {
          const heatUsed = payStandardCost(nextState, 23);
          localLogs = addLog(localLogs, "player", `標準プロジェクト【緑化プロジェクト】を実行しました (支払: MC ${23 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
          if (gameState.corporationId === "corp-credicor") {
            nextState.mc += 4;
            localLogs = addLog(localLogs, "system", "CrediCor: 高額標準プロジェクトの支払いでMC +4");
          }
        }

        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "forest",
          placedBy: "player"
        };

        // Ocean adjacency bonus
        const adjOceans = countAdjacentOceans(cell.q, cell.r, nextState.board);
        if (adjOceans > 0) {
          const bonusMc = adjOceans * 2;
          nextState.mc += bonusMc;
          localLogs = addLog(localLogs, "system", `海洋隣接ボーナス: MC +${bonusMc} (隣接海洋数: ${adjOceans})`);
        }

        if (isFinalGreenery) {
          localLogs = addLog(localLogs, "system", "最終緑化: 酸素濃度とTRは変化しません。");
        } else {
          nextState.oxygen = Math.min(14, nextState.oxygen + 1);
          if (oldOxy < 14) {
            nextState.tr += 1;
            localLogs = addLog(localLogs, "system", "酸素濃度 +1%, TR +1");
          }
        }
        localLogs = addLog(localLogs, "player", `緑地を (${cell.q}, ${cell.r}) に配置しました。`);
      } else if (placementMode.sourceProject === "ocean") {
        const heatUsed = payStandardCost(nextState, 18);
        localLogs = addLog(localLogs, "player", `標準プロジェクト【海洋の沈降】を実行しました (支払: MC ${18 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);

        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "ocean",
          placedBy: null
        };
        nextState.oceans = Math.min(9, nextState.oceans + 1);
        if (oldOceans < 9) {
          nextState.tr += 1;
          localLogs = addLog(localLogs, "system", "海洋面積 +1, TR +1");
        }
        localLogs = addLog(localLogs, "player", `海洋を (${cell.q}, ${cell.r}) に配置しました。`);
      } else if (placementMode.sourceProject === "city") {
        const heatUsed = payStandardCost(nextState, 25);
        nextState.mcProd += 1;
        localLogs = addLog(localLogs, "player", `標準プロジェクト【都市の建設】を実行しました (支払: MC ${25 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
        if (gameState.corporationId === "corp-credicor") {
          nextState.mc += 4;
          localLogs = addLog(localLogs, "system", "CrediCor: 高額標準プロジェクトの支払いでMC +4");
        }

        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "city",
          placedBy: "player"
        };

        // Ocean adjacency bonus
        const adjOceans = countAdjacentOceans(cell.q, cell.r, nextState.board);
        if (adjOceans > 0) {
          const bonusMc = adjOceans * 2;
          nextState.mc += bonusMc;
          localLogs = addLog(localLogs, "system", `海洋隣接ボーナス: MC +${bonusMc} (隣接海洋数: ${adjOceans})`);
        }

        localLogs = addLog(localLogs, "system", "MC生産量 +1");
        localLogs = addLog(localLogs, "player", `都市を (${cell.q}, ${cell.r}) に配置しました。`);
      }
    }

    const corporation = CORPORATIONS.find(item => item.id === nextState.corporationId);
    if (corporation?.effects?.miningBonus && (cell.bonusType === "steel" || cell.bonusType === "titanium")) {
      nextState.steelProd += 1;
      localLogs = addLog(localLogs, "system", "Mining Guild: 金属ボーナスの配置で建材生産量 +1");
    }
    if (corporation?.effects?.cityProduction && placementMode.type === "city") {
      const cityProduction = typeof corporation.effects.cityProduction === "number" ? corporation.effects.cityProduction : 0;
      const ownCityBonus = typeof corporation.effects.ownCityBonus === "number" ? corporation.effects.ownCityBonus : 0;
      nextState.mcProd += cityProduction;
      nextState.mc += ownCityBonus;
      localLogs = addLog(localLogs, "system", `Tharsis Republic: MC生産量 +${cityProduction}${ownCityBonus ? `、MC +${ownCityBonus}` : ""}`);
    }

    // Apply cell placement bonus exactly once
    if (cell.bonusType !== "none") {
      if (cell.bonusType === "plant") {
        nextState.plants += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: 植物 +${cell.bonusAmount}`);
      } else if (cell.bonusType === "steel") {
        nextState.steel += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: 建材 +${cell.bonusAmount}`);
      } else if (cell.bonusType === "titanium") {
        nextState.titanium += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: チタン +${cell.bonusAmount}`);
      } else if (cell.bonusType === "mc") {
        nextState.mc += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: MC +${cell.bonusAmount}`);
      } else if (cell.bonusType === "card") {
        if (nextState.deck.length > 0) {
          const [drawn, ...rest] = nextState.deck;
          nextState.hand.push(drawn);
          nextState.deck = rest;
          const cardObj = ALL_CARDS.find(c => c.id === drawn);
          localLogs = addLog(localLogs, "system", `配置ボーナス獲得: カードを引きました 【${cardObj?.name || drawn}】`);
        }
      }
    }

    // Run parameter threshold check
    const { state: updatedState, logs: updatedLogs } = checkParameterThresholds(
      oldTemp, nextState.temperature,
      oldOxy, nextState.oxygen,
      nextState,
      localLogs
    );

    const remainingPlacements = Math.max(0, (placementMode.remainingPlacements ?? 1) - 1);
    if (placementMode.sourceCardId && remainingPlacements > 0) {
      setPlacementMode({ active: placementMode.active, type: placementMode.type, sourceCardId: placementMode.sourceCardId, remainingPlacements, cardPaymentDone: true });
      saveState(updatedState);
      return;
    }

    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    setPlacementMode(null);

    // If final greenery phase, we do not spend turn actions
    if (gameState.phase === "final_greenery") {
      updatedState.logs = updatedLogs;
      saveState(updatedState);
      return;
    }

    const afterAction = handleActionSpend(updatedState, updatedLogs);
    saveState(afterAction);
  };

  const handleStandardProjectPlay = (type: "asteroid" | "greenery" | "ocean" | "plants_convert" | "heat_convert" | "power_plant" | "city" | "sell_patents") => {
    if (placementMode) return;
    const nextState = { ...gameState };
    let localLogs = nextState.logs;

    if (type === "power_plant") {
      const heatUsed = payStandardCost(nextState, 11);
      nextState.energyProd += 1;
      localLogs = addLog(localLogs, "player", `標準プロジェクト【発電所の建設】を実行しました (支払: MC ${11 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
      localLogs = addLog(localLogs, "system", "エネルギー生産量 +1");
      const afterAction = handleActionSpend(nextState, localLogs);
      saveState(afterAction);
    } else if (type === "asteroid") {
      const heatUsed = payStandardCost(nextState, 14);
      const oldTemp = nextState.temperature;
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      if (oldTemp < 8) {
        nextState.tr += 1;
        localLogs = addLog(localLogs, "player", `標準プロジェクト【小惑星の衝突】を実行しました (支払: MC ${14 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
        localLogs = addLog(localLogs, "system", "気温 +2°C, TR +1");
      } else {
        localLogs = addLog(localLogs, "player", `標準プロジェクト【小惑星の衝突】を実行しました (支払: MC ${14 - heatUsed}${heatUsed ? `、熱 ${heatUsed}` : ""})`);
        localLogs = addLog(localLogs, "system", "気温 +2°C (気温上限のためTR増加なし)");
      }
      const { state: updatedState, logs: updatedLogs } = checkParameterThresholds(
        oldTemp, nextState.temperature,
        nextState.oxygen, nextState.oxygen,
        nextState,
        localLogs
      );
      const afterAction = handleActionSpend(updatedState, updatedLogs);
      saveState(afterAction);
    } else if (type === "heat_convert") {
      nextState.heat -= 8;
      const oldTemp = nextState.temperature;
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      if (oldTemp < 8) {
        nextState.tr += 1;
        localLogs = addLog(localLogs, "player", "熱の放出を実行しました (支払: 熱 8)");
        localLogs = addLog(localLogs, "system", "気温 +2°C, TR +1");
      } else {
        localLogs = addLog(localLogs, "player", "熱の放出を実行しました (支払: 熱 8)");
        localLogs = addLog(localLogs, "system", "気温 +2°C (気温上限のためTR増加なし)");
      }
      const { state: updatedState, logs: updatedLogs } = checkParameterThresholds(
        oldTemp, nextState.temperature,
        nextState.oxygen, nextState.oxygen,
        nextState,
        localLogs
      );
      const afterAction = handleActionSpend(updatedState, updatedLogs);
      saveState(afterAction);
    } else if (type === "greenery") {
      setPlacementMode({
        active: true,
        type: "forest",
        sourceProject: "greenery"
      });
    } else if (type === "plants_convert") {
      setPlacementMode({
        active: true,
        type: "forest",
        sourceProject: "plants"
      });
    } else if (type === "ocean") {
      setPlacementMode({
        active: true,
        type: "ocean",
        sourceProject: "ocean"
      });
    } else if (type === "city") {
      setPlacementMode({
        active: true,
        type: "city",
        sourceProject: "city"
      });
    } else if (type === "sell_patents") {
      setIsSellingPatents(true);
      setSelectedSellCardIds([]);
    }
  };

  const handleCorporationAction = () => {
    if (placementMode || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken") return;
    if (gameState.corporationId === "corp-ecoline") {
      if (gameState.plants < 7) return;
      setPlacementMode({ active: true, type: "forest", sourceProject: "ecoline" });
      return;
    }
    const nextState = { ...gameState };
    let localLogs = nextState.logs;
    if (gameState.corporationId === "corp-unmi") {
      if (gameState.tr <= gameState.generationStartTr || gameState.mc < 3) return;
      nextState.mc -= 3;
      nextState.tr += 1;
      localLogs = addLog(localLogs, "player", "UNMI: MC3を支払いTRを1上げました。");
    } else if (gameState.corporationId === "corp-robinson") {
      if (gameState.mc < 4) return;
      nextState.mc -= 4;
      const resources = ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"] as const;
      const lowest = Math.min(...resources.map(resource => nextState[resource]));
      const target = resources.find(resource => nextState[resource] === lowest) ?? "mcProd";
      nextState[target] += 1;
      localLogs = addLog(localLogs, "player", `Robinson Industries: MC4で${target}を1段階上げました。`);
    } else {
      return;
    }
    saveState(handleActionSpend(nextState, localLogs));
  };

  const handleConfirmSellPatents = () => {
    if (selectedSellCardIds.length === 0) {
      setIsSellingPatents(false);
      return;
    }
    const nextState = {
      ...gameState,
      hand: gameState.hand.filter(id => !selectedSellCardIds.includes(id)),
      discardPile: [...gameState.discardPile, ...selectedSellCardIds]
    };
    nextState.mc += selectedSellCardIds.length;
    const localLogs = addLog(
      nextState.logs,
      "player",
      `特許の売却を実行しました: カード ${selectedSellCardIds.length} 枚を売却 (MC +${selectedSellCardIds.length})`
    );

    setIsSellingPatents(false);
    setSelectedSellCardIds([]);
    const afterAction = handleActionSpend(nextState, localLogs);
    saveState(afterAction);
  };

  const handleConfirmRestart = () => {
    initGame();
    setShowRestartConfirm(false);
  };

  const handleCloseOnboard = () => {
    const nextState = { ...gameState, onboarded: true };
    saveState(nextState);
  };

  const handleCorporationConfirm = () => {
    if (!selectedCorporationId) return;
    const nextState = applyCorporation(gameState, selectedCorporationId);
    saveState(nextState);
    setSelectedCorporationId(null);
  };

  const togglePreludeSelect = (id: string) => {
    setSelectedPreludeIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : current.length < 2 ? [...current, id] : current);
  };

  const handlePreludeConfirm = () => {
    if (selectedPreludeIds.length !== 2) return;
    const nextState = applyPreludes(gameState, selectedPreludeIds);
    if (nextState === gameState) return;
    saveState(nextState);
    setSelectedPreludeIds([]);
  };

  // Setup/Research buy handler
  const handleBuyCardsConfirm = () => {
    if (gameState.phase === "setup" && gameState.setupStep !== "projects") return;
    const cost = selectedResearchCardIds.length * 3;
    const corporation = CORPORATIONS.find(item => item.id === gameState.corporationId);
    const setupCost = corporation?.effects?.freeStartingCards ? 0 : cost;
    if (setupCost > gameState.mc) return;

    const nextState = {
      ...gameState,
      hand: [...gameState.hand, ...selectedResearchCardIds],
      discardPile: [...gameState.discardPile, ...gameState.researchCards.filter(id => !selectedResearchCardIds.includes(id))]
    };
    nextState.mc -= setupCost;
    nextState.researchCards = [];

    let msg = "";
    if (gameState.phase === "setup") {
      msg = `初期カード購入確定: ${selectedResearchCardIds.length} 枚を購入しました (支払: MC ${setupCost})`;
      nextState.setupStep = "prelude";
    } else {
      msg = `研究フェーズカード購入確定: ${selectedResearchCardIds.length} 枚を購入しました (支払: MC ${cost})`;
      nextState.phase = "action";
      nextState.actionsRemaining = 2;
      nextState.turnStep = "start";
    }

    const localLogs = addLog(nextState.logs, "player", msg);
    nextState.logs = localLogs;

    saveState(nextState);
    setSelectedResearchCardIds([]);
  };

  const toggleResearchCardSelect = (id: string) => {
    if (selectedResearchCardIds.includes(id)) {
      setSelectedResearchCardIds(selectedResearchCardIds.filter(item => item !== id));
    } else {
      setSelectedResearchCardIds([...selectedResearchCardIds, id]);
    }
  };

  const handlePass = () => {
    const nextState = { ...gameState };
    const localLogs = addLog(nextState.logs, "player", `パスを選択しました。この世代のアクションフェーズを終了します。`);
    const resolved = triggerProduction(nextState, localLogs);
    saveState(resolved);
    setSelectedCardId(null);
    setPlacementMode(null);
  };

  const handleEndTurnChoice = (action: "another" | "end") => {
    const nextState = { ...gameState };
    if (action === "another") {
      nextState.turnStep = "second_action_allowed";
      nextState.logs = addLog(nextState.logs, "player", "もう1アクションを実行します。");
    } else {
      nextState.actionsRemaining = 2;
      nextState.turnStep = "start";
      nextState.logs = addLog(nextState.logs, "player", "ターンを終了しました。新しいターンを開始します。");
    }
    saveState(nextState);
  };

  // Final greenery converters
  const handleFinalGreeneryConvert = () => {
    if (gameState.plants < 8) return;
    setPlacementMode({
      active: true,
      type: "forest",
      sourceProject: "plants"
    });
  };

  const handleFinalScoring = () => {
    const nextState = { ...gameState };
    nextState.phase = "game_over";
    nextState.isGameOver = true;
    const isWin = isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans);
    nextState.gameResult = isWin ? "win" : "loss";
    nextState.logs = addLog(nextState.logs, "system", `ゲーム終了: ${isWin ? "テラフォーミングミッション成功！" : "テラフォーミング未完了、ミッション失敗。"}`);
    saveState(nextState);
  };

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return ALL_CARDS.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId]);

  const activeCards = useMemo(() => gameState.playedProjects
    .map(id => ALL_CARDS.find(card => card.id === id))
    .filter((card): card is Card => Boolean(card && getCardEffect(card).action)), [gameState.playedProjects]);

  const { playable: canPlaySelected, reason: playDisableReason } = selectedCard
    ? getCardPlayableStatus(selectedCard, gameState, steelUsed, titaniumUsed)
    : { playable: false, reason: "" };

  const { maxSteel, maxTitanium } = selectedCard
    ? getCardDiscount(selectedCard, gameState)
    : { maxSteel: 0, maxTitanium: 0 };

  const isPlantsConvertAffordable = gameState.plants >= 8;
  const isHeatConvertAffordable = gameState.heat >= 8;

  const scoreValue = computeScore(gameState);
  const selectedCardPurchaseCost = gameState.phase === "setup" && CORPORATIONS.find(item => item.id === gameState.corporationId)?.effects?.freeStartingCards
    ? 0
    : selectedResearchCardIds.length * 3;

  const getPhaseNameJP = (phase: string) => {
    switch (phase) {
      case "setup": return "初期セットアップ (カード選択)";
      case "research": return "研究フェーズ (カード購入)";
      case "action": return "アクションフェーズ";
      case "production": return "生産フェーズ";
      case "final_greenery": return "最終植物緑化";
      case "game_over": return "ミッション完了報告";
      default: return "";
    }
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="header-title-container">
          <h1 className="header-title">MARS FRONTIER</h1>
          <span className="header-subtitle">公式ソロルール準拠・非公式ファンメイド — 火星開拓戦略制御システム</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowHelp(true)}>
            マニュアル表示
          </button>
          <button
            className="btn-secondary"
            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
            onClick={() => {
              setSetupPlayerCount(gameState.players?.length ?? 1);
              setSetupTurmoil(Boolean(gameState.turmoil));
              setSetupColonies(Boolean(gameState.colonies));
              setShowGameSetup(true);
            }}
          >
            新規ゲーム設定
          </button>
          <button className="btn-primary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowRestartConfirm(true)}>
            指令リセット
          </button>
          <span className="header-version">非公式ファンメイド試作版</span>
        </div>
      </header>

      {players.length > 1 && (
        <div style={{ padding: "10px 16px 0" }}>
          <PlayerBar players={playerSummaries} currentPlayerId={currentPlayerId} />
        </div>
      )}

      <main className="main-content">
        {/* Left Column: Global Telemetry */}
        <div className="cyber-panel">
          <div className="cyber-panel-header">
            <h2 className="cyber-panel-title">惑星データ</h2>
          </div>
          <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-ink)" }}>現在の世代 / 限界世代:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-ember)" }}>G-{gameState.generation} / 14</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-ink)" }}>現在の進行フェーズ:</span>
              <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "var(--color-gold)" }}>{getPhaseNameJP(gameState.phase)}</span>
            </div>

            {gameState.phase === "action" && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>ターン内残りアクション:</span>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-gold)" }}>{gameState.actionsRemaining} / 2</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>TR (開拓評価):</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-cyan)" }}>{gameState.tr}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>現在スコア:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-ink)" }}>{scoreValue} 点</span>
            </div>

            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>気温 (目標: +8°C)</span>
                  <span style={{ color: "var(--color-ember)" }}>{gameState.temperature}°C</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-ember)",
                      width: `${Math.min(100, Math.max(0, ((gameState.temperature - (-30)) / 38) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>酸素濃度 (目標: 14%)</span>
                  <span style={{ color: "var(--color-cyan)" }}>{gameState.oxygen}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-cyan)",
                      width: `${Math.min(100, Math.max(0, (gameState.oxygen / 14) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>海洋数 (目標: 9)</span>
                  <span style={{ color: "var(--color-gold)" }}>{gameState.oceans} / 9</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-gold)",
                      width: `${Math.min(100, Math.max(0, (gameState.oceans / 9) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>金星 (Venus Next)</span>
                  <span style={{ color: "var(--color-cyan)" }}>{gameState.venus}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-cyan)",
                      width: `${Math.min(100, Math.max(0, (gameState.venus / 30) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Turn step choice control when turnStep === "one_action_taken" */}
            {gameState.phase === "action" && gameState.turnStep === "one_action_taken" && (
              <div style={{ marginTop: "14px", padding: "12px", backgroundColor: "rgba(229, 181, 99, 0.08)", border: "2px solid var(--color-gold)", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--color-gold)", fontWeight: "bold", marginBottom: "8px", textAlign: "center" }}>
                  ターン継続確認
                </div>
                <p style={{ fontSize: "0.7rem", color: "#c9bfae", marginBottom: "10px", lineHeight: "1.3" }}>
                  1アクション目を完了しました。もう1アクション実行するか、このターンを終了するか選択してください。
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <button
                    className="btn-primary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "50%" }}
                    onClick={() => handleEndTurnChoice("another")}
                  >
                    もう1アクション
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", width: "50%" }}
                    onClick={() => handleEndTurnChoice("end")}
                  >
                    ターン終了
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Mars Board */}
        <div className="board-panel">
          {gameState.pendingOceans > 0 && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                zIndex: 20,
                backgroundColor: "var(--color-panel)",
                border: "2px solid var(--color-cyan)",
                borderRadius: "4px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 0 15px rgba(114, 217, 208, 0.4)"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                【気温0°Cボーナス】海洋タイルを配置する reserved スペースを選択してください（残り {gameState.pendingOceans}枚）
              </span>
            </div>
          )}

          {placementMode && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                zIndex: 20,
                backgroundColor: "var(--color-panel)",
                border: "2px solid var(--color-cyan)",
                borderRadius: "4px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 0 15px rgba(114, 217, 208, 0.4)"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                【{placementMode.type === "ocean" ? "海洋" : placementMode.type === "city" ? "都市" : "緑地"}】の配置場所を選択してください
                {placementMode.remainingPlacements && placementMode.remainingPlacements > 1 ? `（残り${placementMode.remainingPlacements}枚）` : ""}
              </span>
              <button
                className="btn-secondary"
                style={{ padding: "2px 8px", fontSize: "0.75rem", color: "var(--color-rust)", borderColor: "var(--color-rust)" }}
                disabled={placementMode.cardPaymentDone}
                onClick={() => {
                  setPlacementMode(null);
                  setSelectedCardId(null);
                  setSteelUsed(0);
                  setTitaniumUsed(0);
                }}
              >
                キャンセル
              </button>
            </div>
          )}

          <div className="mars-sphere">
            <div className="hex-grid">
              {Object.values(gameState.board).map(cell => {
                let isValid = false;
                if (gameState.pendingOceans > 0) {
                  isValid = cell.tileType === "empty" && cell.isOceanOnly;
                } else if (placementMode?.active) {
                  isValid = isCellPlacementValid(cell, placementMode.type, gameState.board);
                }

                // The axial origin is a corner of the Tharsis map, not its middle
                // (q runs 0..8), so offset by BOARD_CENTRE or the whole board sits
                // right of the planet. Spacing is scaled to keep 9 columns inside
                // the sphere.
                const left =
                  SPHERE_RADIUS + HEX_STEP_X * ((cell.q - BOARD_CENTRE.q) + (cell.r - BOARD_CENTRE.r) / 2) - HEX_WIDTH / 2;
                const top = SPHERE_RADIUS + HEX_STEP_Y * (cell.r - BOARD_CENTRE.r) - HEX_HEIGHT / 2;

                let classes = "hex-cell ";
                let content = "";
                let label = "";

                if (cell.tileType === "forest") {
                  classes += "hex-forest";
                  content = "🌲";
                  label = cell.placedBy === "neutral" ? "中立緑地" : "緑地";
                } else if (cell.tileType === "city") {
                  classes += "hex-city";
                  content = "🏙️";
                  label = cell.placedBy === "neutral" ? "中立都市" : "都市";
                } else if (cell.tileType === "ocean") {
                  classes += "hex-ocean";
                  content = "🌊";
                  label = "海洋";
                } else {
                  classes += cell.isOceanOnly ? "hex-ocean-reserved" : "hex-empty";
                  if (cell.bonusType !== "none") {
                    if (cell.bonusType === "plant") content = `🌱${cell.bonusAmount}`;
                    else if (cell.bonusType === "steel") content = `🤖${cell.bonusAmount}`;
                    else if (cell.bonusType === "titanium") content = `🚀${cell.bonusAmount}`;
                    else if (cell.bonusType === "mc") content = `💳${cell.bonusAmount}`;
                    else if (cell.bonusType === "card") content = `🃏${cell.bonusAmount}`;
                  }
                  if (cell.isOceanOnly && cell.tileType === "empty") {
                    label = "海洋専用";
                  }
                }

                if (isValid) {
                  classes += " hex-placement-valid";
                }

                const isInteractionDisabled = gameState.pendingOceans > 0 ? !isValid : (placementMode?.active ? !isValid : true);

                return (
                  <button
                    key={`${cell.q},${cell.r}`}
                    className={classes}
                    style={{ left: `${left}px`, top: `${top}px` }}
                    onClick={() => handleCellClick(cell)}
                    disabled={isInteractionDisabled}
                    title={`座標: (${cell.q}, ${cell.r})`}
                    aria-label={`マス (${cell.q}, ${cell.r}) ${label} ${content}`}
                  >
                    <span className="hex-bonus" style={{ pointerEvents: "none" }}>{content}</span>
                    <span className="hex-label" style={{ pointerEvents: "none", color: "var(--color-ink)", fontSize: "0.5rem" }}>
                      {cell.tileType === "empty" && cell.isOceanOnly ? "🌊" : label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Resources & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Resource Panel */}
          <div className="cyber-panel" style={{ flex: 1 }}>
            <div className="cyber-panel-header">
              <h2 className="cyber-panel-title">資源</h2>
            </div>
            <div className="cyber-panel-content">
              <div className="resources-grid">
                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>💳 MegaCredits</span>
                  </div>
                  <span className="resource-value">{gameState.mc}</span>
                  <span className="resource-prod">生産: {gameState.mcProd} (+{gameState.tr} TR)</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🤖 建材 (Steel)</span>
                  </div>
                  <span className="resource-value">{gameState.steel}</span>
                  <span className="resource-prod">生産: {gameState.steelProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🚀 チタン (Titanium)</span>
                  </div>
                  <span className="resource-value">{gameState.titanium}</span>
                  <span className="resource-prod">生産: {gameState.titaniumProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🌱 植物 (Plants)</span>
                  </div>
                  <span className="resource-value">{gameState.plants}</span>
                  <span className="resource-prod">生産: {gameState.plantsProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>⚡ エネルギー (Energy)</span>
                  </div>
                  <span className="resource-value">{gameState.energy}</span>
                  <span className="resource-prod">生産: {gameState.energyProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🔥 熱 (Heat)</span>
                  </div>
                  <span className="resource-value">{gameState.heat}</span>
                  <span className="resource-prod">生産: {gameState.heatProd}</span>
                </div>
              </div>
            </div>
          </div>

          {gameState.phase === "setup" && gameState.setupStep === "corporation" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-gold)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(238, 190, 77, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-gold)" }}>企業選択</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>2枚から1枚を選択。初期MC・資源・生産と企業効果が適用される。</p>
                {!dealt && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-cyan)" }}>カードを配布しています…</p>
                )}
                {gameState.corporationOptions.map(id => {
                  const corporation = CORPORATIONS.find(item => item.id === id);
                  if (!corporation) return null;
                  const selected = selectedCorporationId === id;
                  return (
                    <button key={id} onClick={() => setSelectedCorporationId(id)} style={{ textAlign: "left", padding: "8px 10px", color: "var(--color-ink)", background: selected ? "rgba(238,190,77,0.18)" : "rgba(8,9,8,0.6)", border: `1px solid ${selected ? "var(--color-gold)" : "rgba(242,232,220,0.15)"}`, borderRadius: "4px" }}>
                      <div style={{ fontWeight: "bold" }}>{corporation.name}</div>
                      <div style={{ margin: "3px 0" }}>
                        <CardTags tags={corporation.tags} />
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>{corporation.effectText}</div>
                    </button>
                  );
                })}
                <button className="btn-primary" disabled={!selectedCorporationId} onClick={handleCorporationConfirm}>企業を確定</button>
              </div>
            </div>
          )}

          {gameState.phase === "setup" && gameState.setupStep === "prelude" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-cyan)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(114, 217, 208, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-cyan)" }}>Prelude選択</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>4枚から2枚を選択。選択した順に初期効果を解決する。</p>
                {gameState.preludeOptions.map(id => {
                  const prelude = PRELUDES.find(item => item.id === id);
                  if (!prelude) return null;
                  const selected = selectedPreludeIds.includes(id);
                  const cost = getPreludeCost(prelude);
                  return (
                    <button key={id} onClick={() => togglePreludeSelect(id)} style={{ textAlign: "left", padding: "8px 10px", color: "var(--color-ink)", background: selected ? "rgba(114,217,208,0.16)" : "rgba(8,9,8,0.6)", border: `1px solid ${selected ? "var(--color-cyan)" : "rgba(242,232,220,0.15)"}`, borderRadius: "4px" }}>
                      <div style={{ fontWeight: "bold" }}>{prelude.name}{cost ? ` (支払 ${cost} MC)` : ""}</div>
                      <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>{prelude.effectText}</div>
                    </button>
                  );
                })}
                <button className="btn-primary" disabled={selectedPreludeIds.length !== 2 || selectedPreludeIds.reduce((sum, id) => sum + getPreludeCost(PRELUDES.find(item => item.id === id)!), 0) > gameState.mc} onClick={handlePreludeConfirm}>Preludeを確定</button>
              </div>
            </div>
          )}

          {/* Setup or Research phase buying Panel */}
          {((gameState.phase === "setup" && gameState.setupStep === "projects") || gameState.phase === "research") && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-cyan)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(114, 217, 208, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-cyan)" }}>
                  {gameState.phase === "setup" ? "初期カードの選定" : "研究開発フェーズ"}
                </h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "0.75rem", lineHeight: "1.3", color: "#c9bfae" }}>
                  提示されたプロジェクトから購入するカードを選択してください。(1枚あたり 3 MC。Beginner Corporationは無料)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "250px", overflowY: "auto" }}>
                  {gameState.researchCards.map(id => {
                    const card = ALL_CARDS.find(c => c.id === id);
                    if (!card) return null;
                    const isSelected = selectedResearchCardIds.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleResearchCardSelect(id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          backgroundColor: isSelected ? "rgba(114, 217, 208, 0.1)" : "rgba(8, 9, 8, 0.6)",
                          border: `1px solid ${isSelected ? "var(--color-cyan)" : "rgba(242, 232, 220, 0.15)"}`,
                          borderRadius: "4px",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "var(--color-ink)",
                          fontSize: "0.75rem"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "bold" }}>{card.name} ({card.cost} MC)</div>
                          <div style={{ margin: "3px 0" }}>
                            <CardTags tags={card.tags} />
                          </div>
                          <div style={{ fontSize: "0.6rem", color: "#c9bfae" }}>{card.effectText}</div>
                        </div>
                        <div style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "2px",
                          border: "1px solid var(--color-cyan)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? "var(--color-cyan)" : "transparent"
                        }}>
                          {isSelected && <span style={{ color: "black", fontSize: "0.6rem", fontWeight: "bold" }}>✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.75rem" }}>
                    選択: <strong style={{ color: "var(--color-cyan)" }}>{selectedResearchCardIds.length}</strong> 枚 | 合計コスト: <strong style={{ color: "var(--color-ember)" }}>{selectedCardPurchaseCost}</strong> MC
                  </div>
                  <button
                    className="btn-primary"
                    style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                    disabled={selectedCardPurchaseCost > gameState.mc}
                    onClick={handleBuyCardsConfirm}
                  >
                    購入を確定する
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Standard Project Panel */}
          {gameState.phase === "action" && (
            <div className="cyber-panel">
              <div className="cyber-panel-header">
                <h2 className="cyber-panel-title">標準プロジェクト</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(["corp-ecoline", "corp-unmi", "corp-robinson"] as string[]).includes(gameState.corporationId ?? "") && (
                  <div style={{ borderBottom: "1px solid rgba(242, 232, 220, 0.1)", paddingBottom: "8px", marginBottom: "2px" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>企業アクション</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae", margin: "4px 0" }}>
                      {gameState.corporationId === "corp-ecoline" ? "植物7で緑地を配置" : gameState.corporationId === "corp-unmi" ? "この世代にTRが上がっていればMC3でTR+1" : "MC4で最低の生産量を1段階上げる"}
                    </div>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} disabled={placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken" || (gameState.corporationId === "corp-ecoline" ? gameState.plants < 7 : gameState.corporationId === "corp-unmi" ? gameState.mc < 3 || gameState.tr <= gameState.generationStartTr : gameState.mc < 4)} onClick={handleCorporationAction}>実行</button>
                  </div>
                )}
                {/* 1. Power Plant */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>発電所の建設 (Power Plant)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 11 | エネルギー生産量 +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={!canPayStandardCost(11) || placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("power_plant")}
                  >
                    実行
                  </button>
                </div>

                {/* 2. Asteroid */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>小惑星の衝突 (Asteroid)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 14 | 気温 +2°C, TR +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={!canPayStandardCost(14) || placementMode !== null || gameState.pendingOceans > 0 || gameState.temperature >= 8 || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("asteroid")}
                  >
                    実行
                  </button>
                </div>

                {/* 3. Aquifer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>海洋の沈降 (Aquifer)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 18 | 海洋タイルを配置, TR +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={!canPayStandardCost(18) || placementMode !== null || gameState.pendingOceans > 0 || gameState.oceans >= 9 || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("ocean")}
                  >
                    配置
                  </button>
                </div>

                {/* 4. Greenery */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>緑化プロジェクト (Greenery)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 23 | 緑地タイルを配置, 酸素 +1%, TR +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={!canPayStandardCost(23) || placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("greenery")}
                  >
                    配置
                  </button>
                </div>

                {/* 5. City */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>都市の建設 (City)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 25 | 都市タイルを配置, MC生産量 +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={!canPayStandardCost(25) || placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("city")}
                  >
                    配置
                  </button>
                </div>

                {/* 6. Heat release */}
                {isHeatConvertAffordable && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>熱の放出 (Convert Heat)</div>
                      <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>熱 8 | 気温 +2°C, TR +1</div>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                      disabled={gameState.heat < 8 || placementMode !== null || gameState.pendingOceans > 0 || gameState.temperature >= 8 || gameState.turnStep === "one_action_taken"}
                      onClick={() => handleStandardProjectPlay("heat_convert")}
                    >
                      変換
                    </button>
                  </div>
                )}

                {/* 7. Plant greenery convert */}
                {isPlantsConvertAffordable && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>植物の緑化 (Convert Plants)</div>
                      <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>植物 8 | 緑地タイルを配置, 酸素 +1%, TR +1</div>
                    </div>
                    <button
                      className="btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                      disabled={gameState.plants < 8 || placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                      onClick={() => handleStandardProjectPlay("plants_convert")}
                    >
                      変換
                    </button>
                  </div>
                )}

                {/* 8. Sell patents */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>特許の売却 (Sell Patents)</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>手札を売却 | 1枚あたり 1 MC を獲得</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    disabled={gameState.hand.length === 0 || placementMode !== null || gameState.pendingOceans > 0 || isSellingPatents || gameState.turnStep === "one_action_taken"}
                    onClick={() => handleStandardProjectPlay("sell_patents")}
                  >
                    実行
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Final Greenery Conversion panel */}
          {gameState.phase === "final_greenery" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-gold)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(229, 181, 99, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-gold)" }}>最終植物緑化フェーズ</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "0.75rem", lineHeight: "1.3" }}>
                  現在保有している植物資源（残り: {gameState.plants}）から最後の緑地を配置できます。(植物 8につき1枚)
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn-primary"
                    style={{ width: "50%", padding: "6px 12px", fontSize: "0.8rem" }}
                    disabled={gameState.plants < 8 || placementMode !== null}
                    onClick={handleFinalGreeneryConvert}
                  >
                    緑地を配置する
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ width: "50%", padding: "6px 12px", fontSize: "0.8rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                    disabled={placementMode !== null}
                    onClick={handleFinalScoring}
                  >
                    最終集計へ進む
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Milestones, awards and the expansion boards. These only render
              when the matching state exists, so a plain solo game is unchanged. */}
          {gameState.phase !== "setup" && (
            <div className="cyber-panel" style={{ marginTop: "12px" }}>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <MilestonePanel milestones={milestoneViews} onClaim={handleClaimMilestone} />
                <AwardPanel
                  awards={awardViews}
                  nextCost={jsGetNextAwardCost(gameState) as number}
                  onFund={handleFundAward}
                />
                {turmoilView && (
                  <TurmoilPanel
                    parties={turmoilView.parties}
                    chairmanName={turmoilView.chairmanName}
                    influence={turmoilView.influence}
                    events={turmoilView.events}
                    canSendDelegate={Boolean(gameState.turmoil?.lobby.includes(currentPlayerId))}
                    onSendDelegate={handleSendDelegate}
                  />
                )}
                {colonyViews.length > 0 && (
                  <ColonyPanel
                    colonies={colonyViews}
                    fleets={jsAvailableFleets(gameState.colonies, currentPlayerId) as number}
                    onBuild={handleBuildColony}
                    onTrade={handleTradeWithColony}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <PendingChoiceDialog
        choice={pendingChoice}
        players={playerSummaries}
        onResolve={handleResolveChoice}
      />

      {/* Hand Cards area */}
      {gameState.phase === "action" && (
        <div className="hand-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "0.85rem", color: "var(--color-ember)", fontWeight: 700, letterSpacing: "0.1em" }}>
              PROJECT CARDS (手札: {gameState.hand.length}枚) {isSellingPatents && <span style={{ color: "var(--color-gold)", marginLeft: "10px" }}>— 特許売却中: 売却するカードをクリックして選択してください。</span>}
            </h2>
            <div style={{ display: "flex", gap: "10px" }}>
              {isSellingPatents ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-primary"
                    style={{ padding: "4px 14px", fontSize: "0.75rem", backgroundColor: "var(--color-gold)", borderColor: "var(--color-gold)", color: "#000" }}
                    onClick={handleConfirmSellPatents}
                  >
                    選択した {selectedSellCardIds.length} 枚を売却
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 14px", fontSize: "0.75rem", borderColor: "var(--color-rust)", color: "var(--color-rust)" }}
                    onClick={() => {
                      setIsSellingPatents(false);
                      setSelectedSellCardIds([]);
                    }}
                  >
                    売却キャンセル
                  </button>
                </div>
              ) : (
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 14px", fontSize: "0.75rem", borderColor: "var(--color-rust)", color: "var(--color-rust)" }}
                  onClick={handlePass}
                  disabled={placementMode !== null || gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                >
                  パス (世代終了)
                </button>
              )}
            </div>
          </div>

          <div className="hand-cards">
            {gameState.hand.map(cardId => {
              const cardObj = ALL_CARDS.find(c => c.id === cardId);
              if (!cardObj) return null;
              
              const isSelected = selectedCardId === cardId || (isSellingPatents && selectedSellCardIds.includes(cardId));
              const cardReqMet = getCardPlayableStatus(cardObj, { ...gameState, mc: Number.MAX_SAFE_INTEGER }, 0, 0).playable;
              return (
                <button
                  key={cardId}
                  className={`project-card ${isSelected ? "selected" : ""}`}
                  onClick={() => handleCardClick(cardId)}
                  disabled={gameState.pendingOceans > 0 || gameState.turnStep === "one_action_taken"}
                  aria-pressed={isSelected}
                  style={{ textAlign: "left", display: "flex", flexDirection: "column" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <CardTags tags={cardObj.tags} />
                    <span style={{ fontSize: "0.55rem", padding: "1px 4px", borderRadius: "3px", backgroundColor: "rgba(242, 232, 220, 0.1)" }}>
                      {cardObj.type === "event" ? "イベント" : cardObj.type === "active" ? "アクション" : "自動"}
                    </span>
                  </div>
                  <div className="card-title">{cardObj.name}</div>
                  {cardObj.expansion && (
                    <div style={{ fontSize: "0.55rem", color: "var(--color-cyan)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {cardObj.expansion}
                    </div>
                  )}
                  {cardObj.reqText !== "なし" && (
                    <div className={`card-req ${cardReqMet ? "met" : ""}`}>
                      要件: {cardObj.reqText}
                    </div>
                  )}
                  <div className="card-effect">{cardObj.effectText}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span className="card-cost">{cardObj.cost} MC</span>
                    {cardObj.victoryPoints ? (
                      <span style={{ fontSize: "0.65rem", color: "var(--color-gold)" }}>⭐+{cardObj.victoryPoints}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {activeCards.length > 0 && (
            <div style={{ marginTop: "10px", padding: "8px", border: "1px solid rgba(114,217,208,0.25)", borderRadius: "4px", background: "rgba(8,9,8,0.55)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--color-cyan)", marginBottom: "6px" }}>場にあるアクションカード</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {activeCards.map(card => {
                  const actionStatus = getCardActionStatus(gameState, card);
                  return (
                    <button key={card.id} className="btn-secondary" disabled={!actionStatus.playable || placementMode !== null || gameState.turnStep === "one_action_taken"} onClick={() => handleCardAction(card)} style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
                      {card.name} — アクション
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedCard && !isSellingPatents && (
            <div
              className="selected-card-panel"
              style={{
                padding: "10px",
                backgroundColor: "rgba(8, 9, 8, 0.7)",
                border: "1px solid rgba(114, 217, 208, 0.2)",
                borderRadius: "4px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--color-gold)", fontWeight: "bold" }}>【{selectedCard.name}】を選択中</span>
                <span style={{ marginLeft: "8px", display: "inline-flex", verticalAlign: "middle" }}>
                  <CardTags tags={selectedCard.tags} />
                </span>
                {!canPlaySelected && (
                  <span style={{ color: "var(--color-rust)", fontSize: "0.8rem", marginLeft: "10px" }}>
                    ※ {playDisableReason}
                  </span>
                )}
                {canPlaySelected && (
                  <div style={{ display: "flex", gap: "16px", marginTop: "4px", alignItems: "center" }}>
                    {selectedCard.tags.includes("Building") && maxSteel > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                        <span>建材を使用 (1建材=2MC値引き):</span>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0 6px", fontSize: "0.7rem" }}
                          disabled={steelUsed <= 0}
                          onClick={() => setSteelUsed(v => v - 1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>{steelUsed} / {maxSteel}</span>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0 6px", fontSize: "0.7rem" }}
                          disabled={steelUsed >= maxSteel}
                          onClick={() => setSteelUsed(v => v + 1)}
                        >
                          +
                        </button>
                      </div>
                    )}

                    {selectedCard.tags.includes("Space") && maxTitanium > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                        <span>チタンを使用 (1チタン={String(CORPORATIONS.find(item => item.id === gameState.corporationId)?.effects?.titaniumValue ?? 3)}MC値引き):</span>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0 6px", fontSize: "0.7rem" }}
                          disabled={titaniumUsed <= 0}
                          onClick={() => setTitaniumUsed(v => v - 1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>{titaniumUsed} / {maxTitanium}</span>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0 6px", fontSize: "0.7rem" }}
                          disabled={titaniumUsed >= maxTitanium}
                          onClick={() => setTitaniumUsed(v => v + 1)}
                        >
                          +
                        </button>
                      </div>
                    )}

                    <span style={{ fontSize: "0.75rem" }}>
                      実質コスト: <strong style={{ color: "var(--color-ember)" }}>{getCardPaymentCost(selectedCard, gameState, steelUsed, titaniumUsed)}</strong> MC
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-primary"
                  disabled={!canPlaySelected}
                  onClick={handlePlayCardInit}
                >
                  {selectedCard.placementType ? "配置フェーズへ進む" : "プレイを実行"}
                </button>
                {selectedCard.type === "active" && gameState.playedProjects.includes(selectedCard.id) && (() => {
                  const actionStatus = getCardActionStatus(gameState, selectedCard);
                  return (
                    <button className="btn-secondary" disabled={!actionStatus.playable || placementMode !== null || gameState.turnStep === "one_action_taken"} onClick={() => handleCardAction(selectedCard)}>
                      アクション実行
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log area */}
      <div className="cyber-panel" style={{ margin: "16px", flex: "none" }}>
        <div className="cyber-panel-header">
          <h2 className="cyber-panel-title">ミッションログ</h2>
        </div>
        <div className="cyber-panel-content" style={{ padding: "8px" }}>
          <div className="log-container">
            {gameState.logs.map(log => {
              let senderClass = "log-entry ";
              if (log.sender === "player") senderClass += "player";
              else if (log.sender === "cpu") senderClass += "cpu";
              else senderClass += "system";

              return (
                <div key={log.id} className={senderClass}>
                  <span>[{log.timestamp}]</span> <span style={{ fontWeight: "bold" }}>{log.sender === "player" ? "あなた" : log.sender === "cpu" ? "CPU" : "システム"}:</span> {log.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {(!gameState.onboarded || showHelp) && (
        <div className="overlay-container">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">MARS FRONTIER — 指令マニュアル</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontWeight: "bold", color: "var(--color-ember)", marginBottom: "10px" }}>
                公式ソロルール準拠・非公式ファンメイド
              </p>
              <p style={{ marginBottom: "8px" }}>
                あなたは14世代の制限時間内に、火星を人が呼吸可能な緑の惑星へ作り変える指令を受けました。
              </p>
              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ クリア条件 (全パラメータの最大化)</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li><strong>気温:</strong> -30°C から <strong>+8°C</strong> (最大)</li>
                <li><strong>酸素濃度:</strong> 0% から <strong>14%</strong> (最大)</li>
                <li><strong>海洋数:</strong> <strong>9タイル</strong> すべての配置</li>
              </ul>
              <p style={{ marginBottom: "10px" }}>
                ※ 第14世代の終了時（アクションおよび生産完了後）に上記すべての条件をクリアすれば<strong>ミッション成功 (WIN)</strong>、達成できなければ<strong>失敗 (LOSS)</strong>となります。
              </p>

              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ 世代の進行フロー</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li><strong>初期セットアップ:</strong> 最初に配られる10枚のカードから、1枚 3 MC で必要な数だけ購入し、手札としてスタートします。初期TRは14、各資源の初期生産量は0です。</li>
                <li><strong>研究開発フェーズ (第2世代以降):</strong> 各世代の開始時に4枚のカードが公開され、1枚 3 MC で任意の枚数を選択・購入できます。</li>
                <li><strong>アクションフェーズ:</strong> プレイヤーは1ターンに1回または2回のアクションを行うことができます。1アクション実行後、「もう1アクション」または「ターン終了」を選択します。「ターン終了」を選ぶか2アクション実行すると新たなターンとなります。プレイヤーが「パス」を選択するとその世代のアクションフェーズを終え、生産フェーズへと移行します。</li>
                <li><strong>生産フェーズ:</strong> 蓄積されたエネルギーはすべて熱資源に変換され、TR（開拓評価）＋MC生産量（最低-5まで）に等しいMCと、その他の資源が生産されます。</li>
                <li><strong>最終植物緑化:</strong> 第14世代の生産フェーズ終了後、保有する植物資源 (8につき1枚) を使用して最後の緑地配置が可能です。</li>
              </ul>

              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ アクションの種類</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li><strong>カードのプレイ:</strong> 手札のカードを、MCを支払ってプレイします。「建」タグには建材（1つ=2MC）、「宇」タグにはチタン（1つ=3MC）を値引きに使用できます。（お釣りは出ません）</li>
                <li><strong>標準プロジェクト:</strong> 発電所（11MC：エネルギー生産+1）、小惑星（14MC：気温上昇）、海洋（18MC）、緑化（23MC）、都市（25MC：MC生産+1）、特許の売却（不要カードを1枚1MCで売却）が可能です。</li>
                <li><strong>資源の直接変換:</strong> 植物8を緑地へ、または熱8を気温上昇へ直接変換できます。</li>
              </ul>

              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ タイル配置ルール</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li><strong>海洋タイル:</strong> 青い点線の専用スペースにのみ配置できます。</li>
                <li><strong>緑地タイル:</strong> すでにプレイヤーの所有するタイルがある場合、必ずそれらに隣接するように配置しなければなりません（不可能な場合や所有タイルがない場合を除く）。</li>
                <li><strong>都市タイル:</strong> 他の都市タイル（中立都市を含む）の隣には配置できません。</li>
                <li><strong>隣接ボーナス:</strong> プレイヤーの都市や緑地を海洋タイルに隣接して配置した際、隣接する海洋1つにつき2 MCの即時ボーナスを獲得します。</li>
              </ul>
              <p style={{ fontStyle: "italic", fontSize: "0.8rem", color: "var(--color-gold)", marginTop: "8px" }}>
                ※ 基本セット、Prelude、Venus Next、Colonies、Turmoil、Prelude 2、公式プロモのカード台帳を収録しています。
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowHelp(false);
                  handleCloseOnboard();
                }}
              >
                了解、ミッション開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New game setup: player count and expansions */}
      {showGameSetup && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--color-gold)" }}>新規ゲーム設定</h3>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div className="section-title">
                  <span>プレイ人数</span>
                  <span className="section-note">
                    {setupPlayerCount === 1 ? "公式ソロルール・14世代制限" : "ホットシート（1画面を交代で使用）"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 2, 3, 4, 5].map(count => (
                    <button
                      key={count}
                      type="button"
                      className="claim-button"
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        fontSize: "0.9rem",
                        backgroundColor:
                          setupPlayerCount === count ? "var(--color-rust)" : "rgba(168, 50, 32, 0.2)"
                      }}
                      aria-pressed={setupPlayerCount === count}
                      onClick={() => setSetupPlayerCount(count)}
                    >
                      {count}人
                    </button>
                  ))}
                </div>
              </div>

              {setupPlayerCount > 1 && (
                <div>
                  <div className="section-title">
                    <span>プレイヤー名</span>
                    <span className="section-note">空欄なら既定名</span>
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {Array.from({ length: setupPlayerCount }, (_, index) => (
                      <input
                        key={index}
                        type="text"
                        value={setupPlayerNames[index] ?? ""}
                        placeholder={`プレイヤー${index + 1}`}
                        onChange={event => {
                          const next = [...setupPlayerNames];
                          next[index] = event.target.value;
                          setSetupPlayerNames(next);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "4px",
                          border: "1px solid rgba(242, 232, 220, 0.2)",
                          backgroundColor: "rgba(8, 9, 8, 0.6)",
                          color: "var(--color-ink)",
                          fontSize: "0.8rem"
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="section-title">
                  <span>拡張</span>
                  <span className="section-note">任意</span>
                </div>
                <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer", marginBottom: "8px" }}>
                  <input
                    type="checkbox"
                    checked={setupTurmoil}
                    onChange={event => setSetupTurmoil(event.target.checked)}
                  />
                  <span>
                    <strong style={{ fontSize: "0.8rem" }}>動乱 (Turmoil)</strong>
                    <div style={{ fontSize: "0.7rem", color: "#c9bfae" }}>
                      6政党・代表者・議長・世界的イベント。毎世代 全員TR-1。
                    </div>
                  </span>
                </label>
                <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={setupColonies}
                    onChange={event => setSetupColonies(event.target.checked)}
                  />
                  <span>
                    <strong style={{ fontSize: "0.8rem" }}>植民地 (Colonies)</strong>
                    <div style={{ fontSize: "0.7rem", color: "#c9bfae" }}>
                      植民地タイル・交易船・交易報酬。
                    </div>
                  </span>
                </label>
              </div>

              <p style={{ fontSize: "0.7rem", color: "var(--color-rust)" }}>
                開始すると現在の進行状況は消去されます。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowGameSetup(false)}>
                キャンセル
              </button>
              <button
                className="btn-primary"
                onClick={() =>
                  initGame({
                    playerCount: setupPlayerCount,
                    playerNames: setupPlayerNames
                      .slice(0, setupPlayerCount)
                      .map(name => name.trim())
                      .map((name, index) => name || `プレイヤー${index + 1}`),
                    turmoil: setupTurmoil,
                    colonies: setupColonies
                  })
                }
              >
                この設定で開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirm Modal */}
      {showRestartConfirm && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--color-rust)" }}>システム再起動確認</h3>
            </div>
            <div className="modal-body">
              <p>現在の進行状況はすべて消去され、初期化されます。本当によろしいですか？</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRestartConfirm(false)}>
                キャンセル
              </button>
              <button className="btn-primary" style={{ backgroundColor: "var(--color-rust)" }} onClick={handleConfirmRestart}>
                再起動実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.isGameOver && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "450px", border: `2px solid ${gameState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)"}` }}>
            <div className="modal-header" style={{ backgroundColor: gameState.gameResult === "win" ? "rgba(114, 217, 208, 0.1)" : "rgba(168, 50, 32, 0.1)" }}>
              <h3 className="modal-title" style={{ color: gameState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)" }}>
                {gameState.gameResult === "win" ? "MISSION SUCCESS" : "MISSION FAILED"}
              </h3>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "14px 0", color: "var(--color-ink)" }}>
                {gameState.gameResult === "win" ? "🎉 テラフォーミング完了！" : "💀 世代限界値に達しました"}
              </p>
              <div style={{ padding: "16px", backgroundColor: "rgba(8, 9, 8, 0.5)", borderRadius: "6px", display: "inline-block", minWidth: "250px", textAlign: "left", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>TR (開拓評価点):</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-cyan)" }}>{gameState.tr} 点</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>配置した緑地数:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-ember)" }}>
                    {Object.values(gameState.board).filter(c => c.placedBy === "player" && c.tileType === "forest").length} 点
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>都市隣接緑地ボーナス:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>
                    {(() => {
                      let cityVp = 0;
                      Object.values(gameState.board).forEach(cell => {
                        if (cell.placedBy === "player" && cell.tileType === "city") {
                          const adj = getAdjacentCells(cell.q, cell.r);
                          adj.forEach(pos => {
                            const key = `${pos.q},${pos.r}`;
                            const adjCell = gameState.board[key];
                            if (adjCell && adjCell.tileType === "forest") {
                              cityVp += 1;
                            }
                          });
                        }
                      });
                      return cityVp;
                    })()} 点
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>プロジェクトカード勝利点:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>
                    {gameState.playedProjects.reduce((sum, id) => sum + (ALL_CARDS.find(c => c.id === id)?.victoryPoints || 0), 0)} 点
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(242, 232, 220, 0.2)", paddingTop: "8px", marginTop: "8px", fontSize: "1.1rem" }}>
                  <span>合計スコア:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-ink)" }}>{scoreValue} 点</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={initGame}>
                新しいミッションを開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
