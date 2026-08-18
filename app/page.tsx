"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ALL_CARDS as jsALL_CARDS,
  BOARDS as jsBOARDS,
  CORPORATIONS as jsCORPORATIONS,
  PRELUDES as jsPRELUDES,
  getInitialState as jsGetInitialState,
  getPlaceholderState as jsGetPlaceholderState,
  computeScore as jsComputeScore,
  calculateScoreBreakdowns as jsCalculateScoreBreakdowns,
  formatSignedVp as jsFormatSignedVp,
  getCardDiscount as jsGetCardDiscount,
  getCardPaymentCost as jsGetCardPaymentCost,
  getCardPlayableStatus as jsGetCardPlayableStatus,
  handleActionSpend as jsHandleActionSpend,
  addLog as jsAddLog,
  applyCorporation as jsApplyCorporation,
  applyPreludes as jsApplyPreludes,
  getPreludeCost as jsGetPreludeCost,
  applyCardEffect as jsApplyCardEffect,
  applyCardAction as jsApplyCardAction,
  getCardActionStatus as jsGetCardActionStatus,
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
  passPlayer as jsPassPlayer,
  cloneGameState as jsCloneGameState,
  legalCellsFor as jsLegalCellsFor,
  placeTileAt as jsPlaceTileAt,
  getPlayer as jsGetPlayer,
  DECLINE_CHOICE as jsDeclineChoice,
  GLOBAL_EVENTS as jsGLOBAL_EVENTS,
  withLegacyPlayerAccessors as jsWithLegacyPlayerAccessors
} from "./game-logic.js";
import { BOARD_CENTRE } from "./tharsis-board.js";
import { colonyDescriptionJP } from "./colony-text.js";
import { CardTags, TAG_INFO } from "./card-tags";
import { ProjectCard, CARD_ASPECT, MIN_CARD_WIDTH } from "./project-card";
import { GlobalParameters, GlobalParametersCompact, OpponentStrip, ResourceGrid } from "./global-params";
import { milestonesForBoard, awardsForBoard } from "./board-milestones";
import { executeGameCommand, COMMAND, CORPORATION_ACTION_ID } from "./game-command.js";
import { Drawer } from "./ui-drawer";
import { TitleScreen, RobotSetup, GameSetupPanel } from "./title-screen";
import {
  advanceRobotGame as jsAdvanceRobotGame,
  makeBotRng as jsMakeBotRng,
  getBotDifficulty
} from "./bot-player";
import { describeCell, TILE_LEGEND } from "./tile-help";
import { MultiplayerLobby } from "./multiplayer-lobby";
import { useRoom } from "./use-room";

// The GitHub Pages build is a static export with no server, so online play is
// impossible there. The Workers build leaves this unset and offers it.
const ONLINE_ENABLED = process.env.NEXT_PUBLIC_SOLO_ONLY !== "1";

// The human always holds the first seat; robot opponents fill the rest.
const HUMAN_ID = "player";

// Keys match the tracked snapshot's labels. Values are the unit printed after
// the reading in the cut-in.
const GLOBAL_PARAMETERS: Record<string, string> = {
  気温: "℃",
  酸素: "%",
  海洋: "枚",
  金星: "%"
};

// Log lines carry the acting player's name in their text once more than one
// player is at the table, so labelling every one of them "あなた" was wrong.
function logLabel(log: { sender: string; playerName?: string }) {
  if (log.playerName) return log.playerName;
  if (log.sender === "cpu") return "CPU";
  if (log.sender === "player") return "プレイヤー";
  return "システム";
}

// bot-player.js resolves moves through the engine handed to it, which keeps the
// bot free of any dependency on this component.
const engineForBot = {
  cloneGameState: jsCloneGameState,
  applyCardEffect: jsApplyCardEffect,
  applyCardAction: jsApplyCardAction,
  claimMilestone: jsClaimMilestone,
  fundAward: jsFundAward,
  handleActionSpend: jsHandleActionSpend,
  passPlayer: jsPassPlayer,
  resolvePendingChoice: jsResolvePendingChoice,
  legalCellsFor: jsLegalCellsFor,
  placeTileAt: jsPlaceTileAt,
  getPlayer: jsGetPlayer,
  addLog: jsAddLog,
  DECLINE_CHOICE: jsDeclineChoice
};

// Corporation actions share the per-generation marker with card actions, under
// an id no project card can collide with.

interface PlayerRecord {
  id: string;
  name: string;
  tr: number;
  mc: number;
  passed?: boolean;
  actionsRemaining?: number;
  hand?: string[];
  usedCardActions?: string[];
  researchCards?: string[];
  playedProjects?: string[];
  playedEvents?: string[];
  corporationId?: string;
  steel?: number;
  titanium?: number;
  plants?: number;
  energy?: number;
  heat?: number;
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
  // The alternate maps add heat, energy, microbe and animal spaces, and spaces
  // paying more than one resource carry the list in `bonus`.
  bonusType: "none" | "plant" | "steel" | "titanium" | "mc" | "card" | "heat" | "energy" | "microbe" | "animal" | "multi" | "ocean-tile";
  bonus?: { type: string; amount: number }[];
  placementCost?: number;
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
  venusEnabled?: boolean;
  preludeEnabled?: boolean;
  promoEnabled?: boolean;
  botDifficulty?: string | null;
  boardId?: string;
  usedCardActions: string[];
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
  playedEvents: string[];
  cardResources: Record<string, number>;
  cardPlacements: Record<string, string>;
  board: Record<string, CellState>;
  logs: LogEntry[];
  isGameOver: boolean;
  gameResult: "win" | "loss" | null;
  // Null in solo, where the planet decides the outcome and there is no ranking.
  standings: { playerId: string; name: string; score: number; mc: number }[] | null;
  winnerPlayerIds: string[] | null;
  lastAction?: {
    seq: number;
    playerId: string;
    playerName?: string;
    kind: string;
    cardId?: string;
    cardName?: string;
  } | null;
  onboarded: boolean;
  // Canonical multiplayer state. The flat fields above remain readable through
  // the compatibility accessors installed by player-state.js.
  mode?: "solo" | "hotseat" | "robot";
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
const BOARDS = jsBOARDS as unknown as Record<string, { id: string; name: string; englishName: string }>;
const PRELUDES = jsPRELUDES as unknown as Prelude[];
const getInitialState = jsGetInitialState as unknown as (options?: {
  playerCount?: number;
  mode?: "solo" | "hotseat" | "robot";
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

interface ScoreContribution {
  targetPlayerId: string;
  points: number;
  category: string;
  sourceId: string;
  label: string;
  detail?: string;
}

interface ScoreBreakdown {
  playerId: string;
  tr: number;
  board: number;
  cards: number;
  milestones: number;
  awards: number;
  // Party leaders and the chairman, 1 VP each (Turmoil final scoring).
  turmoil: number;
  modifier: number;
  total: number;
  details: ScoreContribution[];
}

const calculateScoreBreakdowns = jsCalculateScoreBreakdowns as unknown as (
  state: GameState
) => Record<string, ScoreBreakdown>;
const formatSignedVp = jsFormatSignedVp as unknown as (points: number) => string;
const getCardDiscount = jsGetCardDiscount as unknown as (card: Card, state: GameState) => { maxSteel: number; maxTitanium: number };
const getCardPaymentCost = jsGetCardPaymentCost as unknown as (card: Card, state: GameState, steelUsed: number, titaniumUsed: number) => number;
const getCardPlayableStatus = jsGetCardPlayableStatus as unknown as (card: Card, state: GameState, steelUsed: number, titaniumUsed: number) => { playable: boolean; reason: string };
const handleActionSpend = jsHandleActionSpend as unknown as (state: GameState, logAcc: LogEntry[]) => GameState;
const applyCorporation = jsApplyCorporation as unknown as (state: GameState, corporationId: string) => GameState;
const applyPreludes = jsApplyPreludes as unknown as (state: GameState, preludeIds: string[]) => GameState;
const getPreludeCost = jsGetPreludeCost as unknown as (prelude: Prelude) => number;
const getCardActionStatus = jsGetCardActionStatus as unknown as (state: GameState, card: Card) => { playable: boolean; reason: string };
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
  // The board is a fixed 460px design; scale it to whatever space the centre
  // column has so the whole game stays on one screen without scrolling.
  const boardRef = React.useRef<HTMLDivElement | null>(null);
  const [boardScale, setBoardScale] = useState(1);

  useEffect(() => {
    const element = boardRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const fit = Math.min(box.width / 470, box.height / 470);
      setBoardScale(Math.max(0.45, Math.min(1, fit)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The hand must be readable at a glance without scrolling, so the cards are
  // sized to whatever the strip can hold. More cards means smaller cards rather
  // than cards disappearing off the edge.
  const handRef = React.useRef<HTMLDivElement | null>(null);
  const [handBox, setHandBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = handRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box) setHandBox({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The title screen owns the entry into a game; it stays up until a mode is
  // chosen so the board is never shown without a game behind it.
  const [showTitle, setShowTitle] = useState(true);
  const [hasSave, setHasSave] = useState(false);
  const [showRobotSetup, setShowRobotSetup] = useState(false);
  const [robotDifficulty, setRobotDifficulty] = useState("normal");
  const [robotOpponents, setRobotOpponents] = useState(1);

  const [showLobby, setShowLobby] = useState(false);
  const online = useRoom();

  const [showGameSetup, setShowGameSetup] = useState(false);
  // Which entry opened the expansion panel. The title screen used to start a
  // game the moment it was clicked, so the expansions could only be chosen by
  // finding this panel in the header and starting over.
  const [setupIntent, setSetupIntent] = useState<"custom" | "solo" | "robot">("custom");
  const [setupPlayerCount, setSetupPlayerCount] = useState(1);
  const [selectedBoard, setSelectedBoard] = useState("tharsis");
  const [setupPlayerNames, setSetupPlayerNames] = useState<string[]>([]);
  const [setupTurmoil, setSetupTurmoil] = useState(false);
  const [setupColonies, setSetupColonies] = useState(false);
  const [setupPrelude, setSetupPrelude] = useState(false);
  const [setupVenus, setSetupVenus] = useState(false);
  const [setupPromo, setSetupPromo] = useState(false);
  // Drafting is a turn rule rather than an expansion, and the engine ignores it
  // in a one-seat game, so it rides alongside the expansion flags but is only
  // offered once there is a table.
  const [setupDraft, setSetupDraft] = useState(false);

  // Swaps the placeholder for a real game and records that the deal happened.
  const setDealtState = (next: GameState) => {
    setGameState(jsWithLegacyPlayerAccessors(next) as GameState);
    setDealt(true);
  };
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [steelUsed, setSteelUsed] = useState<number>(0);
  const [titaniumUsed, setTitaniumUsed] = useState<number>(0);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpPage, setHelpPage] = useState(1);

  // Panels that used to occupy the screen permanently now open on demand, so
  // the board keeps the space.
  // Spending an action is irreversible, so every entry point routes through a
  // confirmation naming the cost and the effect.
  const [pendingConfirm, setPendingConfirm] = useState<
    null | { title: string; detail: string; onConfirm: () => void }
  >(null);
  const confirmAction = useCallback(
    (title: string, detail: string, run: () => void) => {
      setPendingConfirm({ title, detail, onConfirm: run });
    },
    []
  );

  const [openDrawer, setOpenDrawer] = useState<
    null | "log" | "milestones" | "standard" | "planet" | "legend" | "turmoil" | "colonies" | "tags"
  >(null);
  const closeDrawer = useCallback(() => setOpenDrawer(null), []);

  const [hoveredCell, setHoveredCell] = useState<{ key: string; text: string } | null>(null);



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
    setHasSave(Boolean(restored));
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

  // When connected to a room the server's filtered view is the state; the local
  // game is only used offline. Rendering reads whichever is active.
  const isOnline = Boolean(online.view);
  const activeState = (online.view ?? gameState) as GameState & { viewerId?: string };

  const players = (activeState.players ?? []) as PlayerRecord[];
  // Online, "current player" for UI purposes is the seat this device owns; the
  // engine's currentPlayerId still decides whose turn it is.
  const seatId = isOnline ? (activeState.viewerId ?? players[0]?.id ?? "player") : undefined;
  // A global event asks each player in turn, and on one shared screen the seat
  // has to follow the question — otherwise player 2's discard is shown to
  // player 1, whose answers the engine rightly refuses, and the queue never
  // drains. Online is untouched: there the seat is the device.
  const hotseatChoiceOwner =
    !isOnline && activeState.pendingChoice?.ownerPlayerId
      ? activeState.pendingChoice.ownerPlayerId
      : undefined;
  const currentPlayerId =
    seatId ?? hotseatChoiceOwner ?? activeState.currentPlayerId ?? players[0]?.id ?? "player";
  // In an online view currentPlayerId is rewritten to the viewer so the legacy
  // accessors read their own hand; turnHolderId carries who actually acts.
  const turnHolderId =
    (activeState as { turnHolderId?: string }).turnHolderId ??
    activeState.currentPlayerId ??
    currentPlayerId;

  // Everything used to change instantly and silently, so a turn gave no sense of
  // what it had done. Diff the numbers that moved and float them on screen.
  const [changeFlashes, setChangeFlashes] = useState<
    { id: number; label: string; delta: number }[]
  >([]);
  // One card, one card. The flashes above say a number moved; this says which
  // card moved it and — on someone else's turn — who played it. Without it a
  // robot's turn is just numbers changing for no visible reason.
  const [actionReport, setActionReport] = useState<{
    id: number;
    title: string;
    who: string | null;
    mine: boolean;
    changes: { label: string; delta: number; unit: string }[];
  } | null>(null);
  // The four global parameters, shown centre-screen with their readings.
  const [parameterCutIns, setParameterCutIns] = useState<
    { id: number; label: string; from: number; to: number; unit: string }[]
  >([]);
  const trackedRef = React.useRef<Record<string, number> | null>(null);
  const flashSeq = React.useRef(0);
  // Every seat's numbers, so a change on the opponent's turn can be reported.
  const tableRef = React.useRef<Record<string, Record<string, number>> | null>(null);
  const lastSeqRef = React.useRef(0);
  // A tile that just appeared, so the board itself shows where the move landed.
  const [freshTiles, setFreshTiles] = useState<string[]>([]);
  const tilesRef = React.useRef<Set<string> | null>(null);

  useEffect(() => {
    const me = activeState.players?.find(p => p.id === currentPlayerId);
    if (!me) return;
    const snapshot: Record<string, number> = {
      MC: me.mc,
      TR: me.tr,
      建材: me.steel ?? 0,
      チタン: me.titanium ?? 0,
      植物: me.plants ?? 0,
      エネルギー: me.energy ?? 0,
      熱: me.heat ?? 0,
      気温: activeState.temperature,
      酸素: activeState.oxygen,
      海洋: activeState.oceans,
      金星: activeState.venus ?? 0
    };

    const previous = trackedRef.current;
    trackedRef.current = snapshot;
    if (!previous) return;

    const moved = Object.entries(snapshot)
      .map(([label, value]) => ({ label, delta: value - (previous[label] ?? value) }))
      .filter(entry => entry.delta !== 0)
      .map(entry => ({ ...entry, id: ++flashSeq.current }));
    if (moved.length === 0) return;

    // Terraforming a parameter is the point of the game, so it gets the centre
    // of the screen and its actual reading — "-30 → -28", not "気温 +2" tucked
    // into the corner with every resource tick.
    const raised = moved
      .filter(entry => GLOBAL_PARAMETERS[entry.label])
      .map(entry => ({
        id: entry.id,
        label: entry.label,
        from: previous[entry.label] ?? snapshot[entry.label],
        to: snapshot[entry.label],
        unit: GLOBAL_PARAMETERS[entry.label]
      }));
    const minor = moved.filter(entry => !GLOBAL_PARAMETERS[entry.label]);

    if (minor.length > 0) setChangeFlashes(current => [...current, ...minor]);
    if (raised.length > 0) setParameterCutIns(current => [...current, ...raised]);

    const minorIds = new Set(minor.map(entry => entry.id));
    const raisedIds = new Set(raised.map(entry => entry.id));
    const minorTimer = setTimeout(
      () => setChangeFlashes(current => current.filter(entry => !minorIds.has(entry.id))),
      1800
    );
    const cutInTimer = setTimeout(
      () => setParameterCutIns(current => current.filter(entry => !raisedIds.has(entry.id))),
      1000
    );
    return () => {
      clearTimeout(minorTimer);
      clearTimeout(cutInTimer);
    };
  }, [activeState, currentPlayerId]);

  // Which spaces gained a tile since the last render. A panel says what a move
  // did; this says where, which is the half a number cannot carry.
  useEffect(() => {
    const occupied = new Set(
      Object.entries(activeState.board ?? {})
        .filter(([, cell]) => cell?.tileType && cell.tileType !== "empty")
        .map(([key]) => key)
    );
    const previous = tilesRef.current;
    tilesRef.current = occupied;
    if (!previous) return;
    const added = [...occupied].filter(key => !previous.has(key));
    if (added.length === 0) return;
    setFreshTiles(added);
    const timer = setTimeout(() => setFreshTiles([]), 2200);
    return () => clearTimeout(timer);
  }, [activeState]);

  // What the last card actually did, gathered per seat so it works for the
  // opponents too. lastAction names the card; the diff supplies the numbers.
  useEffect(() => {
    const RESOURCES: Record<string, string> = {
      MC: "", TR: "", 建材: "", チタン: "", 植物: "", エネルギー: "", 熱: ""
    };
    const readSeat = (player: PlayerRecord): Record<string, number> => ({
      MC: player.mc ?? 0,
      TR: player.tr ?? 0,
      建材: player.steel ?? 0,
      チタン: player.titanium ?? 0,
      植物: player.plants ?? 0,
      エネルギー: player.energy ?? 0,
      熱: player.heat ?? 0
    });
    const globals: Record<string, number> = {
      気温: activeState.temperature,
      酸素: activeState.oxygen,
      海洋: activeState.oceans,
      金星: activeState.venus ?? 0
    };

    const table: Record<string, Record<string, number>> = {};
    for (const player of activeState.players ?? []) table[player.id] = readSeat(player);
    table.__globals = globals;
    // The generation turning over pays everyone at once. Those numbers belong to
    // the production phase, not to whichever card happened to be played last —
    // attributing them to it printed a card's name over someone else's income.
    table.__phase = { generation: activeState.generation, production: activeState.phase === "production" ? 1 : 0 };

    const previous = tableRef.current;
    tableRef.current = table;
    const generationTurned =
      previous && previous.__phase?.generation !== table.__phase.generation;

    const action = activeState.lastAction;
    // The first pass only records the baseline. A restored save already carries
    // a seq, so it is adopted here rather than treated as a play that just
    // happened — otherwise the panel fires once on load with nothing to show.
    if (!previous) {
      lastSeqRef.current = action?.seq ?? 0;
      return;
    }
    if (!action) return;
    // Only report a play once. Re-renders of the same state must not replay it.
    if (action.seq <= lastSeqRef.current) return;
    if (generationTurned || activeState.phase === "production") {
      lastSeqRef.current = action.seq;
      return;
    }

    const actorBefore = previous[action.playerId];
    const actorNow = table[action.playerId];
    const changes: { label: string; delta: number; unit: string }[] = [];
    if (actorBefore && actorNow) {
      for (const label of Object.keys(RESOURCES)) {
        const delta = (actorNow[label] ?? 0) - (actorBefore[label] ?? 0);
        if (delta !== 0) changes.push({ label, delta, unit: "" });
      }
    }
    for (const [label, unit] of Object.entries(GLOBAL_PARAMETERS)) {
      const delta = globals[label] - (previous.__globals?.[label] ?? globals[label]);
      if (delta !== 0) changes.push({ label, delta, unit });
    }
    // A card that only asks a question moves nothing yet; the report follows
    // once the choice is answered and the numbers actually move. The seq is not
    // consumed until then, or that later movement would be skipped as stale.
    if (changes.length === 0) return;
    lastSeqRef.current = action.seq;

    // "Mine" is a seat, not a turn. currentPlayerId is whoever holds the turn
    // now, and by the time a play resolves the turn has often already moved on —
    // which labelled the player's own card as an opponent's and gave it the
    // longer, opponent-length stay. Online it is the viewer's seat; offline the
    // human is always "player". In hotseat every seat is this person, so nothing
    // is ever someone else's move.
    const mine = isOnline
      ? action.playerId === seatId
      : activeState.mode === "hotseat" || action.playerId === HUMAN_ID;
    setActionReport({
      id: ++flashSeq.current,
      title: action.cardName ?? "アクション",
      who: mine ? null : action.playerName ?? null,
      mine,
      changes
    });
  }, [activeState, currentPlayerId, isOnline, seatId]);

  // Your own move needs no explaining — you chose it — so it clears quickly and
  // gets out of the way of the board. Someone else's is the only thing that says
  // what just happened, so it stays long enough to read. Both durations let the
  // blink finish; cutting a panel mid-blink reads as a glitch.
  useEffect(() => {
    if (!actionReport) return;
    const timer = setTimeout(
      () => setActionReport(null),
      actionReport.mine ? 1300 : 2600
    );
    return () => clearTimeout(timer);
  }, [actionReport]);

  // In a robot game every non-human seat is driven here. The delay is deliberate:
  // instant opponent turns read as nothing having happened.
  const isRobotGame = activeState.mode === "robot";
  // Derived, not stored: the indicator is simply "a robot holds the seat".
  const botThinking =
    isRobotGame &&
    !isOnline &&
    (gameState.phase === "setup" || gameState.phase === "action" || gameState.phase === "final_greenery") &&
    (gameState.phase === "setup" || gameState.currentPlayerId !== HUMAN_ID);
  useEffect(() => {
    if (!isRobotGame || isOnline) return;
    if (!["setup", "action", "research", "final_greenery"].includes(gameState.phase)) return;
    if (gameState.pendingChoice && gameState.pendingChoice.ownerPlayerId === HUMAN_ID) return;

    const humanTurn =
      (gameState.phase === "action" || gameState.phase === "final_greenery") &&
      gameState.currentPlayerId === HUMAN_ID;
    const humanResearch =
      gameState.phase === "research" &&
      (gameState.players?.find(p => p.id === HUMAN_ID)?.researchCards?.length ?? 0) > 0;
    if (humanTurn || humanResearch) return;

    const timer = setTimeout(() => {
      const rng = jsMakeBotRng(
        (gameState.generation + 1) * 7919 + (gameState.logs?.length ?? 0) * 31 + 17
      );
      const advanced = jsAdvanceRobotGame(
        engineForBot,
        gameState,
        HUMAN_ID,
        gameState.botDifficulty ?? "normal",
        rng
      ) as GameState;
      if (advanced !== gameState) saveState(advanced);
    }, 700);

    return () => clearTimeout(timer);
  }, [isRobotGame, isOnline, gameState]);

  const corporationActionUsed = (
    (activeState.players?.find(p => p.id === currentPlayerId)?.usedCardActions ?? []) as string[]
  ).includes(CORPORATION_ACTION_ID);
  // In a robot game the seat moves to the bots, and the driver effect plays for
  // them. Treating every offline turn as the human's let the player act on the
  // bot's turn, so the human was operating both sides.
  const isMyTurn = isOnline
    ? turnHolderId === seatId
    : !isRobotGame || activeState.currentPlayerId === HUMAN_ID;
  const pendingChoice = activeState.pendingChoice ?? null;

  // Research happens for everyone at once, so the seat marker is not the player
  // answering here. In a robot game the marker passes to a bot from generation 2
  // on, and the single-player accessors follow it — the panel offered the bot's
  // cards and priced them against the bot's money while the driver effect waited
  // on the human's own offer, so neither side could move. Offline the answer is
  // always the human's; online and hotseat keep following the seat.
  const researchSeat =
    (isRobotGame && !isOnline
      ? players.find(player => player.id === HUMAN_ID)
      : players.find(player => player.id === currentPlayerId)) ?? null;
  const researchOffer = researchSeat?.researchCards ?? [];
  const researchBudget = researchSeat?.mc ?? 0;

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

  // Claiming a milestone, funding an award, sending a delegate, building a
  // colony and trading are each one action. The engine reports whether the
  // attempt succeeded; only a successful one may spend the turn.
  const runEngine = (
    result: {
      state?: GameState;
      logs?: LogEntry[];
      claimed?: boolean;
      funded?: boolean;
      sent?: boolean;
      built?: boolean;
      traded?: boolean;
    },
    spendsAction = false
  ) => {
    if (!result?.state) return;
    const succeeded =
      result.claimed || result.funded || result.sent || result.built || result.traded;
    let next = result.state;
    if (result.logs) {
      next = jsCloneGameState(next) as GameState;
      next.logs = result.logs;
    }
    if (spendsAction && succeeded) {
      next = handleActionSpend(next, next.logs) as GameState;
    }
    saveState(next);
  };

  const handleResolveChoice = (optionId: string) => {
    if (isOnline) return void online.sendAction("resolveChoice", { optionId });
    // Through the command layer, not the engine directly: answering the last
    // question is what spends the action, so resolving it here by hand made
    // every project that asks where to place its tile a free one.
    const result = executeGameCommand(activeState as never, {
      type: "RESOLVE_PENDING",
      playerId: currentPlayerId,
      optionId
    }) as { ok: boolean; state: GameState };
    if (!result.ok) return;
    saveState(result.state);
  };

  // Each map prints its own five milestones and five awards.
  const boardMilestones = milestonesForBoard(activeState.boardId) as MilestoneDefinition[];
  const boardAwards = awardsForBoard(activeState.boardId) as AwardDefinition[];

  const milestoneViews = boardMilestones.map(milestone => {
    const claimed = (activeState.claimedMilestones ?? []).find(
      entry => entry.milestoneId === milestone.id
    );
    const status = jsGetMilestoneStatus(activeState, milestone.id, currentPlayerId) as {
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

  const awardViews = boardAwards.map(award => {
    const funded = (activeState.fundedAwards ?? []).find(entry => entry.awardId === award.id);
    const status = jsGetAwardStatus(activeState, award.id, currentPlayerId) as {
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

  const turmoilView = activeState.turmoil
    ? {
        chairmanName: nameOf(activeState.turmoil.chairman),
        influence: jsGetInfluence(activeState.turmoil, currentPlayerId) as number,
        parties: (jsPARTIES as PartyDefinition[]).map(party => {
          const seat = activeState.turmoil!.parties[party.id];
          return {
            id: party.id,
            name: party.name,
            delegates: seat?.delegates ?? [],
            leaderName: seat?.leader ? nameOf(seat.leader) : undefined,
            isRuling: activeState.turmoil!.rulingParty === party.id,
            isDominant: activeState.turmoil!.dominantParty === party.id
          };
        }),
        events: (
          [
            ["current", "現行"],
            ["coming", "次回"],
            ["distant", "予告"]
          ] as const
        ).map(([slot, label]) => {
          const id = activeState.turmoil![`${slot}Event` as const];
          const event = (jsGLOBAL_EVENTS as { id: string; name: string }[]).find(
            item => item.id === id
          );
          return { slot, label, name: event?.name ?? "—" };
        })
      }
    : null;

  const colonyViews = activeState.colonies
    ? activeState.colonies.tilesInPlay.map(tileId => {
        const tile = activeState.colonies!.tiles[tileId];
        const definition = jsGetColonyTile(tileId) as ColonyDefinition;
        const build = jsCanBuildColony(activeState.colonies, tileId, currentPlayerId) as {
          ok: boolean;
          reason: string;
        };
        const tradeCheck = jsCanTrade(activeState.colonies, tileId, currentPlayerId) as {
          ok: boolean;
          reason: string;
        };
        return {
          id: tileId,
          name: definition?.name ?? tileId,
          tradeDescription: colonyDescriptionJP(definition?.trade?.description ?? ""),
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
    if (isOnline) return void online.sendAction("claimMilestone", { milestoneId });
    runEngine(
      jsClaimMilestone(activeState, milestoneId, activeState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
        claimed?: boolean;
      }
      ,
      true
    );
  };

  const handleFundAward = (awardId: string) => {
    if (isOnline) return void online.sendAction("fundAward", { awardId });
    runEngine(
      jsFundAward(activeState, awardId, activeState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
        funded?: boolean;
      }
      ,
      true
    );
  };

  const handleSendDelegate = (partyId: string) => {
    if (isOnline) return void online.sendAction("sendDelegate", { partyId });
    runEngine(
      jsSendDelegateToParty(activeState, partyId, activeState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
        sent?: boolean;
      }
      ,
      true
    );
  };

  const handleBuildColony = (tileId: string) => {
    if (isOnline) return void online.sendAction("buildColony", { tileId });
    runEngine(
      jsBuildColonyOn(activeState, tileId, activeState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
        built?: boolean;
      }
      ,
      true
    );
  };

  const handleTradeWithColony = (tileId: string) => {
    if (isOnline) return void online.sendAction("trade", { tileId });
    runEngine(
      jsTradeWith(activeState, tileId, activeState.logs, currentPlayerId) as {
        state: GameState;
        logs: LogEntry[];
        traded?: boolean;
      }
      ,
      true
    );
  };

  const initGame = (options?: {
    playerCount?: number;
    playerNames?: string[];
    turmoil?: boolean;
    colonies?: boolean;
    prelude?: boolean;
    venus?: boolean;
    promo?: boolean;
    draft?: boolean;
    mode?: "solo" | "hotseat" | "robot";
    botDifficulty?: string;
    board?: string;
  }) => {
    const state = getInitialState({ board: selectedBoard, ...options });
    saveState(state);
    setShowGameSetup(false);
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    setSelectedCorporationId(null);
    setSelectedPreludeIds([]);
    setSelectedResearchCardIds([]);
    setIsSellingPatents(false);
    setSelectedSellCardIds([]);
  };

  const handleCardClick = (cardId: string) => {
    if (pendingChoice) return;
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

  const canPayStandardCost = (cost: number) => activeState.mc + (CORPORATIONS.find(item => item.id === activeState.corporationId)?.effects?.heatAsMoney ? activeState.heat : 0) >= cost;

  const handlePlayCardInit = () => {
    if (!isMyTurn || !selectedCardId) return;

    if (isOnline) {
      // The server recomputes the cost from these, so sending them is what
      // makes steel and titanium usable online at all.
      online.sendAction("playCard", {
        cardId: selectedCardId,
        payment: { steel: steelUsed, titanium: titaniumUsed }
      });
      setSelectedCardId(null);
      setSteelUsed(0);
      setTitaniumUsed(0);
      return;
    }

    // Offline runs the same command. Paying, drawing the corporation triggers,
    // settling threshold bonuses and spending the action all happen there.
    const result = executeGameCommand(gameState as never, {
      type: "PLAY_CARD",
      playerId: currentPlayerId,
      cardId: selectedCardId,
      payment: { steel: steelUsed, titanium: titaniumUsed }
    }) as { ok: boolean; state: GameState };

    if (!result.ok) return;
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    saveState(result.state);
  };


  const handleCardAction = (card: Card) => {
    if (!isMyTurn) return;
    if (isOnline) return void online.sendAction("cardAction", { cardId: card.id });

    // Ownership, the once-per-generation marker and the action itself are all
    // checked in the command layer.
    const result = executeGameCommand(gameState as never, {
      type: "USE_CARD_ACTION",
      playerId: currentPlayerId,
      cardId: card.id
    }) as { ok: boolean; state: GameState };

    if (!result.ok) return;
    setSelectedCardId(null);
    saveState(result.state);
  };


  // The eight standard projects are named the same way everywhere now; these
  // are the UI's older labels for them.
  const PROJECT_IDS: Record<string, string> = {
    power_plant: "power-plant",
    asteroid: "asteroid",
    ocean: "aquifer",
    greenery: "greenery",
    city: "city",
    plants_convert: "convert-plants",
    heat_convert: "convert-heat",
    sell_patents: "sell-patents"
  };

  const handleStandardProjectPlay = (type: "asteroid" | "greenery" | "ocean" | "plants_convert" | "heat_convert" | "power_plant" | "city" | "sell_patents") => {
    // The bots drive themselves; acting on their turn would spend their action.
    if (!isMyTurn) return;
    // The drawer has served its purpose once a project is chosen, and it covers
    // the board the tile placement needs.
    setOpenDrawer(null);
    if (pendingChoice) return;

    const projectId = PROJECT_IDS[type];
    if (isOnline) {
      online.sendAction("standardProject", {
        projectId,
        cardIds: type === "sell_patents" ? selectedSellCardIds : undefined
      });
      setIsSellingPatents(false);
      setSelectedSellCardIds([]);
      return;
    }

    // Offline runs the same command; the rules live in the engine either way.
    const result = executeGameCommand(activeState as never, {
      type: "STANDARD_PROJECT",
      playerId: currentPlayerId,
      projectId,
      cardIds: type === "sell_patents" ? selectedSellCardIds : undefined
    }) as { ok: boolean; state: GameState; error?: { message: string } };

    if (!result.ok) return;
    setIsSellingPatents(false);
    setSelectedSellCardIds([]);
    saveState(result.state);
  };

  const handleCorporationAction = () => {
    if (!isMyTurn) return;
    if (pendingChoice) return;

    if (isOnline) {
      online.sendAction("corporationAction");
      return;
    }

    // The engine decides whether it is affordable, whether it is still
    // available this generation, and where a tile may go.
    const result = executeGameCommand(gameState as never, {
      type: "CORPORATION_ACTION",
      playerId: currentPlayerId
    }) as { ok: boolean; state: GameState; error?: { message: string } };

    if (!result.ok) return;
    saveState(result.state);
  };

  // Selling patents is the one standard project that needs to know which cards
  // before it can run, so the button opens a selection mode and this confirms
  // it. It used to write the state here directly, which the room never saw.
  const handleConfirmSellPatents = () => {
    if (selectedSellCardIds.length === 0) {
      setIsSellingPatents(false);
      return;
    }
    handleStandardProjectPlay("sell_patents");
  };

  const handleConfirmRestart = () => {
    initGame();
    setShowRestartConfirm(false);
  };

  const handleCloseOnboard = () => {
    const nextState = jsCloneGameState(gameState) as GameState;
    nextState.onboarded = true;
    saveState(nextState);
  };

  const handleCorporationConfirm = () => {
    if (!selectedCorporationId) return;
    // Online the server owns the state; sending the intent is the whole action.
    if (isOnline) {
      online.sendAction("chooseCorporation", { corporationId: selectedCorporationId });
      setSelectedCorporationId(null);
      return;
    }
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
    if (isOnline) {
      online.sendAction("choosePreludes", { preludeIds: selectedPreludeIds });
      setSelectedPreludeIds([]);
      return;
    }
    const nextState = applyPreludes(gameState, selectedPreludeIds);
    if (nextState === gameState) return;
    saveState(nextState);
    setSelectedPreludeIds([]);
  };

  // Setup/Research buy handler
  const handleBuyCardsConfirm = () => {
    if (isOnline) {
      online.sendAction("buyResearch", { cardIds: selectedResearchCardIds });
      setSelectedResearchCardIds([]);
      return;
    }
    // The same command the room runs. This used to be a second implementation
    // of buying — its own cost, its own phase advance, its own free-cards rule
    // — so Beginner Corporation was free here and charged everywhere else.
    const result = executeGameCommand(activeState as never, {
      type: "BUY_RESEARCH",
      // Research is answered by the player whose offer is on screen, which is
      // not the seat marker once a robot holds it (see researchSeat).
      playerId: researchSeat?.id ?? currentPlayerId,
      cardIds: selectedResearchCardIds
    }) as { ok: boolean; state: GameState };

    if (!result.ok) return;
    saveState(result.state);
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
    if (!isMyTurn) return;
    if (isOnline) return void online.sendAction("pass");
    // Passing leaves the action phase for this generation only; production runs
    // once every player has passed.
    const result = jsPassPlayer(gameState, gameState.logs, currentPlayerId) as {
      state: GameState;
      logs: LogEntry[];
    };
    runEngine(result);
    setSelectedCardId(null);
  };

  const handleFinalGreeneryConvert = () => {
    if (!isMyTurn || pendingChoice || activeState.plants < 8) return;
    if (isOnline) return void online.sendAction("convertFinalGreenery");
    const result = executeGameCommand(activeState as never, {
      type: COMMAND.CONVERT_FINAL_GREENERY,
      playerId: currentPlayerId
    }) as { ok: boolean; state: GameState };
    if (result.ok) saveState(result.state);
  };

  const handleFinalScoring = () => {
    if (!isMyTurn || pendingChoice) return;
    if (isOnline) return void online.sendAction("finishFinalGreenery");
    const result = executeGameCommand(activeState as never, {
      type: COMMAND.FINISH_FINAL_GREENERY,
      playerId: currentPlayerId
    }) as { ok: boolean; state: GameState };
    if (result.ok) saveState(result.state);
  };

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return ALL_CARDS.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId]);

  const handCards = (activeState.players?.find(p => p.id === currentPlayerId)?.hand ??
    gameState.hand ??
    []) as string[];

  // Find the largest card width whose rows still fit the strip's height. Cards
  // are 1.4x tall, wrap on the cross axis, and have a 6px gap.
  const cardWidth = useMemo(() => {
    const { width, height } = handBox;
    if (!width || !height || handCards.length === 0) return 148;
    const GAP = 6;
    for (let w = 148; w >= MIN_CARD_WIDTH; w -= 2) {
      const perRow = Math.max(1, Math.floor((width + GAP) / (w + GAP)));
      const rows = Math.ceil(handCards.length / perRow);
      if (rows * (w * CARD_ASPECT + GAP) - GAP <= height) return w;
    }
    // Shrinking further would make the effect text too small to read, so the
    // card stops here and .hand-cards scrolls instead.
    return MIN_CARD_WIDTH;
  }, [handBox, handCards.length]);

  // Tag totals decide whether requirement cards are playable, so the count has
  // to include the corporation's own tags the same way the engine does.
  // Everything below describes what the player is looking at, so it reads the
  // active state: online that is the server's view of this seat, and the local
  // game is a different game entirely.
  const seatPlayedProjects = useMemo(
    () =>
      (activeState.players?.find(p => p.id === currentPlayerId)?.playedProjects ??
        activeState.playedProjects ??
        []) as string[],
    [activeState, currentPlayerId]
  );
  const seatCorporationId = (activeState.players?.find(p => p.id === currentPlayerId)?.corporationId ??
    activeState.corporationId) as string | undefined;

  const tagTally = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of seatPlayedProjects) {
      const card = ALL_CARDS.find(item => item.id === id);
      for (const tag of card?.tags ?? []) counts[tag] = (counts[tag] ?? 0) + 1;
    }
    const corporation = CORPORATIONS.find(item => item.id === seatCorporationId);
    for (const tag of corporation?.tags ?? []) counts[tag] = (counts[tag] ?? 0) + 1;
    return Object.entries(TAG_INFO).map(([tag, info]) => ({
      tag,
      label: info.label,
      symbol: info.symbol,
      color: info.color,
      count: counts[tag] ?? 0
    }));
  }, [seatPlayedProjects, seatCorporationId]);

  const playedCardCount = seatPlayedProjects.length;

  const activeCards = useMemo(() => seatPlayedProjects
    .map(id => ALL_CARDS.find(card => card.id === id))
    .filter((card): card is Card => Boolean(card && getCardEffect(card).action)), [seatPlayedProjects]);

  const { playable: canPlaySelected, reason: playDisableReason } = selectedCard
    ? getCardPlayableStatus(selectedCard, activeState, steelUsed, titaniumUsed)
    : { playable: false, reason: "" };

  const { maxSteel, maxTitanium } = selectedCard
    ? getCardDiscount(selectedCard, activeState)
    : { maxSteel: 0, maxTitanium: 0 };

  const isPlantsConvertAffordable = activeState.plants >= 8;
  const isHeatConvertAffordable = activeState.heat >= 8;

  const scoreValue = computeScore(activeState);
  // The final screen used to re-derive its own breakdown from playedProjects
  // and fixed victoryPoints, so dynamic VP, preludes, milestones and awards all
  // read as zero while the total beside them included every one of them.
  const scoreBreakdown = calculateScoreBreakdowns(activeState)[currentPlayerId];
  const selectedCardPurchaseCost = activeState.phase === "setup" && CORPORATIONS.find(item => item.id === seatCorporationId)?.effects?.freeStartingCards
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

  // The expansions chosen in the setup panel, whichever entry opened it.
  const chosenExpansions = () => ({
    turmoil: setupTurmoil,
    colonies: setupColonies,
    prelude: setupPrelude,
    venus: setupVenus,
    promo: setupPromo
  });

  const startRobotGame = () => {
    const names = ["あなた"];
    for (let i = 0; i < robotOpponents; i++) {
      names.push(`${getBotDifficulty(robotDifficulty).name} ${i + 1}`);
    }
    initGame({
      playerCount: robotOpponents + 1,
      playerNames: names,
      mode: "robot",
      botDifficulty: robotDifficulty,
      draft: setupDraft,
      ...chosenExpansions()
    });
    setShowRobotSetup(false);
    setShowTitle(false);
  };

  // Starting from the setup panel. Solo and robot arrive here from the title
  // screen so they pick their expansions before the deck is dealt.
  const startFromSetup = () => {
    if (setupIntent === "solo") {
      initGame({ playerCount: 1, ...chosenExpansions() });
      setShowTitle(false);
      return;
    }
    if (setupIntent === "robot") {
      setShowGameSetup(false);
      setShowRobotSetup(true);
      return;
    }
    initGame({
      playerCount: setupPlayerCount,
      playerNames: setupPlayerNames
        .slice(0, setupPlayerCount)
        .map(name => name.trim())
        .map((name, index) => name || `プレイヤー${index + 1}`),
      draft: setupDraft,
      ...chosenExpansions()
    });
  };

  // A tile choice waiting on this seat, answered by clicking the board rather
  // than by reading "(3, -2)" off a dialog that covers it.
  const tileChoice =
    pendingChoice &&
    pendingChoice.ownerPlayerId === currentPlayerId &&
    (pendingChoice.options?.length ?? 0) > 0 &&
    (pendingChoice.kind === "tile-placement" || pendingChoice.kind === "ocean-placement")
      ? pendingChoice
      : null;
  const tileChoiceCells = tileChoice
    ? new Set(
        (tileChoice.options ?? [])
          .map(option => option.targetCellKey)
          .filter((key): key is string => Boolean(key))
      )
    : null;

  // One set of props for the panel, which both the title screen and the running
  // game render — the title screen returns early, so it needs its own copy.
  const setupPanelProps = {
    open: showGameSetup,
    intent: setupIntent,
    playerCount: setupPlayerCount,
    onPlayerCount: setSetupPlayerCount,
    playerNames: setupPlayerNames,
    onPlayerNames: setSetupPlayerNames,
    boards: Object.values(BOARDS) as { id: string; name: string }[],
    selectedBoard,
    onBoard: setSelectedBoard,
    turmoil: setupTurmoil,
    onTurmoil: setSetupTurmoil,
    colonies: setupColonies,
    onColonies: setSetupColonies,
    prelude: setupPrelude,
    onPrelude: setSetupPrelude,
    venus: setupVenus,
    onVenus: setSetupVenus,
    promo: setupPromo,
    onPromo: setSetupPromo,
    draft: setupDraft,
    onDraft: setSetupDraft,
    onCancel: () => setShowGameSetup(false),
    onStart: startFromSetup
  };

  if (showTitle) {
    return (
      <>
        <TitleScreen
          onlineEnabled={ONLINE_ENABLED}
          hasSave={hasSave}
          onContinue={() => setShowTitle(false)}
          onSolo={() => {
            setSetupIntent("solo");
            setShowGameSetup(true);
          }}
          onRobot={() => {
            setSetupIntent("robot");
            setShowGameSetup(true);
          }}
          onOnline={() => {
            setShowTitle(false);
            setShowLobby(true);
          }}
          onManual={() => {
            setShowTitle(false);
            setShowHelp(true);
          }}
        />
        <GameSetupPanel {...setupPanelProps} />
        {showRobotSetup && (
          <RobotSetup
            difficulty={robotDifficulty}
            onDifficulty={setRobotDifficulty}
            opponents={robotOpponents}
            onOpponents={setRobotOpponents}
            onStart={startRobotGame}
            // Back from the opponents screen returns to the expansions.
            onCancel={() => {
              setShowRobotSetup(false);
              if (setupIntent === "robot") setShowGameSetup(true);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="header-title-container">
          <h1 className="header-title">MARS FRONTIER</h1>
          <span className="header-subtitle">公式ソロルール準拠・非公式ファンメイド — 火星開拓戦略制御システム</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {botThinking && <span className="bot-thinking">ロボット思考中</span>}
          <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowTitle(true)}>
            タイトルへ
          </button>
          <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowHelp(true)}>
            マニュアル表示
          </button>
          {ONLINE_ENABLED && (
            <button
              className="btn-secondary"
              style={{
                padding: "4px 12px",
                fontSize: "0.8rem",
                borderColor: isOnline ? "var(--color-cyan)" : undefined,
                color: isOnline ? "var(--color-cyan)" : undefined
              }}
              onClick={() => setShowLobby(true)}
            >
              {isOnline ? `オンライン: ${online.room?.code ?? ""}` : "オンライン対戦"}
            </button>
          )}
          <button
            className="btn-secondary"
            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
            onClick={() => {
              // Defaults for starting a NEW local game, so they come from the
              // local one — not from whatever room is currently open. Prelude,
              // Venus and promo were left out, so they silently reset to off
              // every time the panel was reopened.
              setSetupPlayerCount(gameState.players?.length ?? 1);
              setSetupTurmoil(Boolean(gameState.turmoil));
              setSetupColonies(Boolean(gameState.colonies));
              setSetupPrelude(Boolean(gameState.preludeEnabled));
              setSetupVenus(Boolean(gameState.venusEnabled));
              setSetupPromo(Boolean(gameState.promoEnabled));
              setSetupIntent("custom");
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
          <PlayerBar players={playerSummaries} currentPlayerId={turnHolderId} />
          {isOnline && !isMyTurn && (
            <p style={{ marginTop: "6px", fontSize: "0.75rem", color: "var(--color-cyan)" }}>
              {players.find(p => p.id === turnHolderId)?.name ?? "他のプレイヤー"} の手番です。お待ちください。
            </p>
          )}
        </div>
      )}

      <main className="main-content">
        {/* Compact status bar: the detail lives in drawers so the board keeps the room. */}
        <div className="hud-bar">
          <div className="hud-stats">
            <span className="hud-stat" title="世代">
              <span className="hud-stat-label">世代</span>
              <span className="hud-stat-value">
                {activeState.generation}{activeState.mode === "solo" ? "/14" : ""}
              </span>
            </span>
            <span className="hud-stat" title="テラフォーミングレーティング">
              <span className="hud-stat-label">TR</span>
              <span className="hud-stat-value" style={{ color: "var(--accent-cyan)" }}>
                {players.find(p => p.id === currentPlayerId)?.tr ?? 0}
              </span>
            </span>
            <span className="hud-stat" title="現在の得点">
              <span className="hud-stat-label">得点</span>
              <span className="hud-stat-value">{scoreValue}</span>
            </span>
            {activeState.phase === "action" && (
              <span className="hud-stat" title="このターンに残っているアクション数">
                <span className="hud-stat-label">残AC</span>
                <span className="hud-stat-value" style={{ color: "var(--accent-amber)" }}>
                  {players.find(p => p.id === currentPlayerId)?.actionsRemaining ?? 0}/2
                </span>
              </span>
            )}
            <GlobalParametersCompact
              temperature={activeState.temperature}
              oxygen={activeState.oxygen}
              oceans={activeState.oceans}
              venus={activeState.venus ?? 0}
              showVenus={Boolean(activeState.venusEnabled) || (activeState.venus ?? 0) > 0}
            />
          </div>

          <div className="hud-buttons">
            <button className="hud-btn" onClick={() => setOpenDrawer("planet")}>惑星データ</button>
            <button className="hud-btn" onClick={() => setOpenDrawer("standard")}>標準プロジェクト</button>
            <button className="hud-btn" onClick={() => setOpenDrawer("milestones")}>マイルストーン / 表彰</button>
            {turmoilView && (
              <button className="hud-btn" onClick={() => setOpenDrawer("turmoil")}>動乱</button>
            )}
            {colonyViews.length > 0 && (
              <button className="hud-btn" onClick={() => setOpenDrawer("colonies")}>植民地</button>
            )}
            <button className="hud-btn" onClick={() => setOpenDrawer("tags")}>シンボル集計</button>
            <button className="hud-btn" onClick={() => setOpenDrawer("legend")}>タイル凡例</button>
            <button className="hud-btn" onClick={() => setOpenDrawer("log")}>ミッションログ</button>
          </div>
        </div>

        {/* Center Column: Mars Board */}
        <div
          className="board-panel"
          ref={boardRef}
          style={{ ["--board-scale" as string]: String(boardScale) }}
        >
          <div className="mars-sphere">
            <div className="hex-grid">
              {Object.values(activeState.board).map(cell => {
                let isValid = false;
                if (tileChoiceCells) {
                  // A pending tile choice names its own legal spaces, so the
                  // player picks them on the board instead of reading
                  // coordinates off a dialog that covered the board.
                  isValid = tileChoiceCells.has(`${cell.q},${cell.r}`);
                }

                // The axial origin is a corner of the Tharsis map, not its middle
                // (q runs 0..8), so offset by BOARD_CENTRE or the whole board sits
                // right of the planet. Spacing is scaled to keep 9 columns inside
                // the sphere.
                const left =
                  SPHERE_RADIUS + HEX_STEP_X * ((cell.q - BOARD_CENTRE.q) + (cell.r - BOARD_CENTRE.r) / 2) - HEX_WIDTH / 2;
                const top = SPHERE_RADIUS + HEX_STEP_Y * (cell.r - BOARD_CENTRE.r) - HEX_HEIGHT / 2;

                let classes = "hex-cell ";
                if (freshTiles.includes(`${cell.q},${cell.r}`)) classes += "hex-just-placed ";
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

                const isInteractionDisabled = tileChoiceCells ? !isValid : true;

                const help = describeCell(cell);

                return (
                  <button
                    key={`${cell.q},${cell.r}`}
                    className={classes}
                    style={{ left: `${left}px`, top: `${top}px` }}
                    onClick={() => {
                      if (isInteractionDisabled) {
                        // Not placeable, but the player still wants to know what
                        // the icon means — a tap has to explain rather than do nothing.
                        setHoveredCell({ key: `${cell.q},${cell.r}`, text: help });
                        return;
                      }
                      const option = (tileChoice?.options ?? []).find(
                        entry => entry.targetCellKey === `${cell.q},${cell.r}`
                      );
                      if (option) handleResolveChoice(option.id);
                    }}
                    aria-disabled={isInteractionDisabled}
                    onMouseEnter={() => setHoveredCell({ key: `${cell.q},${cell.r}`, text: help })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onFocus={() => setHoveredCell({ key: `${cell.q},${cell.r}`, text: help })}
                    onBlur={() => setHoveredCell(null)}
                    aria-label={`マス (${cell.q}, ${cell.r}) ${label} ${content} ${help}`}
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

          {hoveredCell && (
            <div className="hex-tooltip" role="status" onClick={() => setHoveredCell(null)}>
              {hoveredCell.text}
            </div>
          )}
        </div>

        {/* Right Column: Resources & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Resource Panel */}
          <div className="cyber-panel" style={{ flex: 1 }}>
            <div className="cyber-panel-header">
              <h2 className="cyber-panel-title">資源</h2>
            </div>
            <div className="cyber-panel-content">
              <ResourceGrid player={(players.find(p => p.id === currentPlayerId) ?? players[0]) as never} />
            </div>
          </div>

          {activeState.phase === "setup" && activeState.setupStep === "corporation" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-gold)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(238, 190, 77, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-gold)" }}>企業選択</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>2枚から1枚を選択。初期MC・資源・生産と企業効果が適用される。</p>
                {!dealt && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-cyan)" }}>カードを配布しています…</p>
                )}
                {activeState.corporationOptions.map(id => {
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

          {activeState.phase === "setup" && activeState.setupStep === "prelude" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-cyan)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(114, 217, 208, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-cyan)" }}>Prelude選択</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>4枚から2枚を選択。選択した順に初期効果を解決する。</p>
                {activeState.preludeOptions.map(id => {
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
                <button className="btn-primary" disabled={selectedPreludeIds.length !== 2 || selectedPreludeIds.reduce((sum, id) => sum + getPreludeCost(PRELUDES.find(item => item.id === id)!), 0) > activeState.mc} onClick={handlePreludeConfirm}>Preludeを確定</button>
              </div>
            </div>
          )}

          {/* Setup or Research phase buying Panel */}
          {((activeState.phase === "setup" && activeState.setupStep === "projects") || activeState.phase === "research") && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-cyan)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(114, 217, 208, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-cyan)" }}>
                  {activeState.phase === "setup" ? "初期カードの選定" : "研究開発フェーズ"}
                </h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "0.75rem", lineHeight: "1.3", color: "#c9bfae" }}>
                  提示されたプロジェクトから購入するカードを選択してください。(1枚あたり 3 MC。Beginner Corporationは無料)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "250px", overflowY: "auto" }}>
                  {researchOffer.map(id => {
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
                    disabled={selectedCardPurchaseCost > researchBudget}
                    onClick={handleBuyCardsConfirm}
                  >
                    購入を確定する
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* Final Greenery Conversion panel */}
          {activeState.phase === "final_greenery" && (
            <div className="cyber-panel" style={{ border: "2px solid var(--color-gold)" }}>
              <div className="cyber-panel-header" style={{ backgroundColor: "rgba(229, 181, 99, 0.15)" }}>
                <h2 className="cyber-panel-title" style={{ color: "var(--color-gold)" }}>最終植物緑化フェーズ</h2>
              </div>
              <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "0.75rem", lineHeight: "1.3" }}>
                  現在保有している植物資源（残り: {activeState.plants}）から最後の緑地を配置できます。(植物 8につき1枚)
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn-primary"
                    style={{ width: "50%", padding: "6px 12px", fontSize: "0.8rem" }}
                    disabled={!isMyTurn || Boolean(pendingChoice) || activeState.plants < 8}
                    onClick={handleFinalGreeneryConvert}
                  >
                    緑地を配置する
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ width: "50%", padding: "6px 12px", fontSize: "0.8rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                    disabled={!isMyTurn || Boolean(pendingChoice)}
                    onClick={handleFinalScoring}
                  >
                    このプレイヤーの配置を終える
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </main>

      {changeFlashes.length > 0 && (
        <div className="change-flash-stack" aria-live="polite">
          {changeFlashes.map(flash => (
            <div key={flash.id} className="change-flash" data-sign={flash.delta > 0 ? "up" : "down"}>
              {flash.label} {flash.delta > 0 ? "+" : ""}{flash.delta}
            </div>
          ))}
        </div>
      )}

      {actionReport && (
        <div
          className="action-report"
          data-mine={actionReport.mine ? "yes" : "no"}
          aria-live="polite"
          key={actionReport.id}
        >
          {actionReport.who && <div className="action-report-who">{actionReport.who}</div>}
          <div className="action-report-title">{actionReport.title}</div>
          <div className="action-report-changes">
            {actionReport.changes.map(change => (
              <span
                key={change.label}
                className="action-report-delta"
                data-sign={change.delta > 0 ? "up" : "down"}
              >
                <span className="action-report-delta-label">{change.label}</span>
                <span className="action-report-delta-value">
                  {change.delta > 0 ? "+" : "−"}
                  {Math.abs(change.delta)}
                  {change.unit}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {parameterCutIns.length > 0 && (
        <div className="param-cutin-stack" aria-live="polite">
          {parameterCutIns.map(cutIn => (
            <div key={cutIn.id} className="param-cutin">
              <span className="param-cutin-label">{cutIn.label}</span>
              <span className="param-cutin-reading">
                {cutIn.from}
                {cutIn.unit}
                <span className="param-cutin-arrow" aria-hidden="true"> → </span>
                {cutIn.to}
                {cutIn.unit}
              </span>
            </div>
          ))}
        </div>
      )}

      <PendingChoiceDialog
        choice={pendingChoice}
        players={playerSummaries}
        onResolve={handleResolveChoice}
        onBoard={Boolean(tileChoice)}
      />

      {pendingConfirm && (
        <div className="choice-overlay" role="dialog" aria-modal="true" aria-label={pendingConfirm.title}>
          <div className="choice-dialog">
            <div className="choice-header">
              <div className="choice-owner">実行の確認</div>
              <div className="choice-prompt">{pendingConfirm.title}</div>
            </div>
            <p className="confirm-detail">{pendingConfirm.detail}</p>
            <div className="confirm-buttons">
              <button className="btn-secondary" onClick={() => setPendingConfirm(null)}>
                やめる
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const run = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  run();
                }}
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hand Cards area. Shown while buying too: deciding what to buy means
          knowing what is already held, and the hand used to vanish for the
          whole research phase. */}
      {(activeState.phase === "action" ||
        activeState.phase === "research" ||
        activeState.phase === "setup") && (
        <div className="hand-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "0.85rem", color: "var(--color-ember)", fontWeight: 700, letterSpacing: "0.1em" }}>
              PROJECT CARDS (手札: {activeState.hand.length}枚) {isSellingPatents && <span style={{ color: "var(--color-gold)", marginLeft: "10px" }}>— 特許売却中: 売却するカードをクリックして選択してください。</span>}
            </h2>
            <div style={{ display: "flex", gap: "10px" }}>
              {activeState.phase !== "action" ? null : isSellingPatents ? (
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
                  disabled={!isMyTurn || Boolean(pendingChoice)}
                >
                  {(players.find(p => p.id === currentPlayerId)?.actionsRemaining ?? 2) < 2
                    ? "ターン終了"
                    : "パス (この世代を離脱)"}
                </button>
              )}
            </div>
          </div>

          <div className="hand-cards" ref={handRef} style={{ ["--card-w" as string]: `${cardWidth}px` }}>
            {handCards.map(cardId => {
              const cardObj = ALL_CARDS.find(c => c.id === cardId);
              if (!cardObj) return null;

              const isSelected =
                selectedCardId === cardId ||
                (isSellingPatents && selectedSellCardIds.includes(cardId));
              const status = getCardPlayableStatus(cardObj, activeState, 0, 0);
              const payable = getCardPaymentCost(cardObj, activeState, 0, 0);

              return (
                <ProjectCard
                  key={cardId}
                  card={cardObj as never}
                  cost={payable}
                  selected={isSelected}
                  affordable={status.playable}
                  disabled={!isMyTurn || Boolean(pendingChoice)}
                  onClick={() => handleCardClick(cardId)}
                />
              );
            })}
          </div>

          {activeCards.length > 0 && (
            <div style={{ marginTop: "10px", padding: "8px", border: "1px solid rgba(114,217,208,0.25)", borderRadius: "4px", background: "rgba(8,9,8,0.55)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--color-cyan)", marginBottom: "6px" }}>場にあるアクションカード</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {activeCards.map(card => {
                  const actionStatus = getCardActionStatus(activeState, card);
                  return (
                    <button key={card.id} className="btn-secondary" disabled={!actionStatus.playable || Boolean(pendingChoice)} onClick={() => confirmAction(`【${card.name}】のアクション`, `${card.effectText} この世代はこのカードのアクションを再度使用できません。`, () => handleCardAction(card))} style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
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
                        <span>チタンを使用 (1チタン={String(CORPORATIONS.find(item => item.id === activeState.corporationId)?.effects?.titaniumValue ?? 3)}MC値引き):</span>
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
                      実質コスト: <strong style={{ color: "var(--color-ember)" }}>{getCardPaymentCost(selectedCard, activeState, steelUsed, titaniumUsed)}</strong> MC
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-primary"
                  disabled={!canPlaySelected}
                  onClick={() =>
                    confirmAction(
                      `【${selectedCard.name}】をプレイ`,
                      `支払い ${getCardPaymentCost(selectedCard, activeState, steelUsed, titaniumUsed)} MC${steelUsed ? `、建材 ${steelUsed}` : ""}${titaniumUsed ? `、チタン ${titaniumUsed}` : ""}。アクションを1回消費します。`,
                      handlePlayCardInit
                    )
                  }
                >
                  {selectedCard.placementType ? "配置フェーズへ進む" : "プレイを実行"}
                </button>
                {selectedCard.type === "active" && activeState.playedProjects.includes(selectedCard.id) && (() => {
                  const actionStatus = getCardActionStatus(activeState, selectedCard);
                  return (
                    <button
                      className="btn-secondary"
                      disabled={!actionStatus.playable || Boolean(pendingChoice)}
                      onClick={() =>
                        confirmAction(
                          `【${selectedCard.name}】のアクション`,
                          `${selectedCard.effectText} この世代はこのカードのアクションを再度使用できません。`,
                          () => handleCardAction(selectedCard)
                        )
                      }
                    >
                      アクション実行
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* On-demand panels. Keeping these out of the main grid is what frees
          the board space, especially on a phone. */}
      <Drawer open={openDrawer === "planet"} title="惑星データ" onClose={closeDrawer}>
        <div className="drawer-section">
          <div className="status-row">
            <div className="status-cell">
              <span className="status-label">世代</span>
              <span className="status-value">
                {activeState.generation}{activeState.mode === "solo" ? " / 14" : ""}
              </span>
            </div>
            <div className="status-cell">
              <span className="status-label">TR</span>
              <span className="status-value" style={{ color: "var(--accent-cyan)" }}>
                {players.find(p => p.id === currentPlayerId)?.tr ?? 0}
              </span>
            </div>
            <div className="status-cell">
              <span className="status-label">得点</span>
              <span className="status-value">{scoreValue}</span>
            </div>
          </div>
          <div className="status-row" style={{ marginTop: "8px" }}>
            <div className="status-cell" style={{ flex: 2 }}>
              <span className="status-label">フェーズ</span>
              <span className="status-value" style={{ fontSize: "0.9rem" }}>
                {getPhaseNameJP(activeState.phase)}
              </span>
            </div>
            {activeState.phase === "action" && (
              <div className="status-cell">
                <span className="status-label">残アクション</span>
                <span className="status-value" style={{ color: "var(--accent-amber)" }}>
                  {players.find(p => p.id === currentPlayerId)?.actionsRemaining ?? 0} / 2
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="drawer-section">
          <GlobalParameters
            temperature={activeState.temperature}
            oxygen={activeState.oxygen}
            oceans={activeState.oceans}
            venus={activeState.venus ?? 0}
            showVenus={Boolean(activeState.venusEnabled) || (activeState.venus ?? 0) > 0}
          />
        </div>
        {players.length > 1 && (
          <div className="drawer-section">
            <div className="section-title"><span>他プレイヤー</span></div>
            <OpponentStrip
              players={players as never}
              selfId={currentPlayerId}
              turnHolderId={turnHolderId}
            />
          </div>
        )}
      </Drawer>

      <Drawer open={openDrawer === "standard"} title="標準プロジェクト" onClose={closeDrawer}>
        {activeState.phase === "action" ? (

          <div className="cyber-panel">
            <div className="cyber-panel-header">
              <h2 className="cyber-panel-title">標準プロジェクト</h2>
            </div>
            <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(["corp-ecoline", "corp-unmi", "corp-robinson"] as string[]).includes(activeState.corporationId ?? "") && (
                <div style={{ borderBottom: "1px solid rgba(242, 232, 220, 0.1)", paddingBottom: "8px", marginBottom: "2px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>企業アクション</div>
                  <div style={{ fontSize: "0.65rem", color: "#c9bfae", margin: "4px 0" }}>
                    {activeState.corporationId === "corp-ecoline" ? "植物7で緑地を配置" : activeState.corporationId === "corp-unmi" ? "この世代にTRが上がっていればMC3でTR+1" : "MC4で最低の生産量を1段階上げる"}
                      {corporationActionUsed && (
                        <span style={{ color: "var(--color-rust)" }}>（この世代は使用済み）</span>
                      )}
                  </div>
                  <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} disabled={Boolean(pendingChoice) || corporationActionUsed || (activeState.corporationId === "corp-ecoline" ? activeState.plants < 7 : activeState.corporationId === "corp-unmi" ? activeState.mc < 3 || activeState.tr <= activeState.generationStartTr : activeState.mc < 4)} onClick={() => confirmAction("企業アクション", `${activeState.corporationId === "corp-ecoline" ? "植物7を支払い緑地を配置します。" : activeState.corporationId === "corp-unmi" ? "MC3を支払いTRを1上げます。" : "MC4を支払い、最も低い生産量を1段階上げます。"} この世代は再度使用できません。`, handleCorporationAction)}>実行</button>
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
                  disabled={!canPayStandardCost(11) || Boolean(pendingChoice)}
                  onClick={() => confirmAction("発電所の建設", "11 MC を支払い、エネルギー生産量を1段階上げます。", () => handleStandardProjectPlay("power_plant"))}
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
                  disabled={!canPayStandardCost(14) || Boolean(pendingChoice) || activeState.temperature >= 8}
                  onClick={() => confirmAction("小惑星の衝突", "14 MC を支払い、気温を1段階(+2°C)上げます。TRが1上がります。", () => handleStandardProjectPlay("asteroid"))}
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
                  disabled={!canPayStandardCost(18) || Boolean(pendingChoice) || activeState.oceans >= 9}
                  onClick={() => confirmAction("海洋の沈降", "18 MC を支払い、海洋タイルを1枚配置します。TRが1上がります。", () => handleStandardProjectPlay("ocean"))}
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
                  disabled={!canPayStandardCost(23) || Boolean(pendingChoice)}
                  onClick={() => confirmAction("緑化プロジェクト", "23 MC を支払い、緑地タイルを1枚配置します。酸素とTRが1上がります。", () => handleStandardProjectPlay("greenery"))}
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
                  disabled={!canPayStandardCost(25) || Boolean(pendingChoice)}
                  onClick={() => confirmAction("都市の建設", "25 MC を支払い、都市タイルを1枚配置し、MC生産量を1上げます。", () => handleStandardProjectPlay("city"))}
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
                    disabled={activeState.heat < 8 || Boolean(pendingChoice) || activeState.temperature >= 8}
                    onClick={() => confirmAction("熱の変換", "熱 8 を支払い、気温を1段階(+2°C)上げます。TRが1上がります。", () => handleStandardProjectPlay("heat_convert"))}
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
                    disabled={activeState.plants < 8 || Boolean(pendingChoice)}
                    onClick={() => confirmAction("植物の変換", "植物 8 を支払い、緑地タイルを1枚配置します。酸素とTRが1上がります。", () => handleStandardProjectPlay("plants_convert"))}
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
                  disabled={activeState.hand.length === 0 || Boolean(pendingChoice) || isSellingPatents}
                  onClick={() => {
                    // Ask which cards first. Sending the project straight away
                    // sent an empty list, which the engine refused every time.
                    setOpenDrawer(null);
                    setSelectedSellCardIds([]);
                    setIsSellingPatents(true);
                  }}
                >
                  実行
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="drawer-empty">アクションフェーズでのみ実行できます。</p>
        )}
      </Drawer>

      <Drawer open={openDrawer === "milestones"} title="マイルストーン / 表彰" onClose={closeDrawer}>
        {activeState.phase !== "setup" ? (

          <div className="cyber-panel" style={{ marginTop: "12px" }}>
            <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <MilestonePanel milestones={milestoneViews} onClaim={handleClaimMilestone} />
              <AwardPanel
                awards={awardViews}
                nextCost={jsGetNextAwardCost(activeState) as number}
                onFund={handleFundAward}
              />
            </div>
          </div>
        ) : (
          <p className="drawer-empty">ゲーム開始後に表示されます。</p>
        )}
      </Drawer>

      <Drawer open={openDrawer === "turmoil"} title="動乱 — 議会と代表者" onClose={closeDrawer}>
        {turmoilView ? (
          <TurmoilPanel
            parties={turmoilView.parties}
            chairmanName={turmoilView.chairmanName}
            influence={turmoilView.influence}
            events={turmoilView.events}
            canSendDelegate={Boolean(activeState.turmoil?.lobby.includes(currentPlayerId))}
            onSendDelegate={handleSendDelegate}
          />
        ) : (
          <p className="drawer-empty">この試合では動乱拡張を使用していません。</p>
        )}
      </Drawer>

      <Drawer open={openDrawer === "colonies"} title="植民地 — 建設と交易" onClose={closeDrawer}>
        {colonyViews.length > 0 ? (
          <ColonyPanel
            colonies={colonyViews}
            fleets={jsAvailableFleets(activeState.colonies, currentPlayerId) as number}
            onBuild={handleBuildColony}
            onTrade={handleTradeWithColony}
          />
        ) : (
          <p className="drawer-empty">この試合では植民地拡張を使用していません。</p>
        )}
      </Drawer>

      <Drawer open={openDrawer === "tags"} title="シンボル集計" onClose={closeDrawer}>
        <p className="drawer-note">
          プレイ済みカードと企業が持つタグの合計。カードの条件（「科学タグ3個以上」など）はこの数で判定される。
        </p>
        <ul className="tag-tally">
          {tagTally.map(entry => (
            <li key={entry.tag} className="tag-tally-row" data-empty={entry.count === 0 ? "true" : "false"}>
              <span className="tag-tally-symbol" style={{ color: entry.color }}>{entry.symbol}</span>
              <span className="tag-tally-name">{entry.label}</span>
              <span className="tag-tally-count" style={{ color: entry.count > 0 ? entry.color : undefined }}>
                {entry.count}
              </span>
            </li>
          ))}
        </ul>
        <p className="drawer-note">
          プレイ済みカード {playedCardCount} 枚 · 合計タグ {tagTally.reduce((sum, e) => sum + e.count, 0)} 個
        </p>
      </Drawer>

      <Drawer open={openDrawer === "legend"} title="タイル凡例" onClose={closeDrawer}>
        <ul className="legend-list">
          {TILE_LEGEND.map(item => (
            <li key={item.name} className="legend-item">
              <span className="legend-icon">{item.icon}</span>
              <span>
                <strong className="legend-name">{item.name}</strong>
                <span className="legend-text">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </Drawer>

      <Drawer open={openDrawer === "log"} title="ミッションログ" onClose={closeDrawer}>
        <div className="log-container log-container--drawer">
          {[...activeState.logs].reverse().map(log => {
            let senderClass = "log-entry ";
            if (log.sender === "player") senderClass += "player";
            else if (log.sender === "cpu") senderClass += "cpu";
            else senderClass += "system";

            return (
              <div key={log.id} className={senderClass}>
                <span>[{log.timestamp}]</span> <span style={{ fontWeight: "bold" }}>{logLabel(log)}:</span> {log.text}
              </div>
            );
          })}
        </div>
      </Drawer>

      {/* Help Modal */}
      {/* Onboarding is dismissed into the local save, never sent to the room,
          so it is read from the same place it is written. */}
      {(!gameState.onboarded || showHelp) && (
        <div className="overlay-container">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">MARS FRONTIER — 指令マニュアル</h3>
            </div>
            <div className="modal-body">
              {helpPage === 1 && (
                <>
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
                </>
              )}

              {helpPage === 2 && (
                <>
                  <h4 style={{ color: "var(--color-gold)", marginBottom: "6px" }}>■ プレリュード (Prelude)</h4>
                  <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                    <li>企業選択のあと、配られた<strong>4枚から2枚</strong>を選び、<strong>即座に解決</strong>します。</li>
                    <li>解決後に通常どおり初期手札を購入します（1枚3 MC）。</li>
                    <li>支払いを伴うプレリュードは、支払えない場合は選べません。</li>
                    <li>ゲームの立ち上がりが数世代ぶん速くなるため、全体の世代数が短くなります。</li>
                  </ul>

                  <h4 style={{ color: "var(--color-gold)", marginBottom: "6px" }}>■ 金星 (Venus Next)</h4>
                  <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                    <li><strong>金星スケール</strong>が4つ目のグローバルパラメータとして加わります（0%〜30%）。</li>
                    <li>1ステップ＝<strong>2%</strong>。1ステップ上げるごとに<strong>TR +1</strong>。</li>
                    <li>金星は<strong>ゲーム終了条件に含まれません</strong>。気温・酸素・海洋の3つが最大になればゲームは終わります。</li>
                    <li>8%到達で<strong>カードを1枚ドロー</strong>、16%到達で<strong>TR +1</strong>のマイルストーンがあります。</li>
                    <li>金星タグ（♀）を持つカードが追加されます。</li>
                  </ul>

                  <h4 style={{ color: "var(--color-gold)", marginBottom: "6px" }}>■ 植民地 (Colonies)</h4>
                  <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                    <li>火星の外に<strong>植民地タイル</strong>が並びます。プレイヤー数+2枚を使用します。</li>
                    <li><strong>入植</strong>: 空きスロットに自分のマーカーを置きます。1つの植民地に最大3つ。同じ植民地に自分の入植地は1つだけ。</li>
                    <li><strong>交易</strong>: 交易船を1隻使い、その植民地の<strong>交易トラックの現在位置</strong>の報酬を得ます。交易後トラックは0に戻ります。</li>
                    <li>交易すると、その植民地に入植しているプレイヤー全員が<strong>入植ボーナス</strong>を得ます（交易した本人も含む）。</li>
                    <li>交易トラックは<strong>各世代の生産フェイズで1マス進みます</strong>。進んだ先ほど報酬が大きくなります。</li>
                    <li>交易船は生産フェイズで補充されます。</li>
                  </ul>
                  <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>
                    ※ 画面上部の「植民地」ボタンから、各植民地の入植状況・交易トラックの進行度・入植/交易の実行ができます。
                  </p>
                </>
              )}

              {helpPage === 3 && (
                <>
                  <h4 style={{ color: "var(--color-gold)", marginBottom: "6px" }}>■ 動乱 (Turmoil)</h4>
                  <p style={{ marginBottom: "8px" }}>
                    火星の政治を扱う拡張です。<strong>6つの政党</strong>があり、支配政党の政策が全員に影響します。
                  </p>
                  <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                    <li><strong>代表者</strong>: ロビーから政党に代表者を送り込みます。各政党で最も代表者が多いプレイヤーがその政党の<strong>党首</strong>になります。</li>
                    <li><strong>支配政党</strong>: 代表者が最も多い政党が支配政党となり、その<strong>政策効果が全プレイヤーに適用</strong>されます。</li>
                    <li><strong>議長</strong>: 議長を務めるプレイヤーは<strong>TR +1</strong>を得ます。</li>
                    <li><strong>影響力</strong>: 議長・党首・支配政党の代表者数などから算出され、世界的イベントの結果を緩和します。</li>
                    <li><strong>世界的イベント</strong>: 各世代の終わりに発生し、影響力の少ないプレイヤーほど大きな被害を受けます。</li>
                    <li><strong>毎世代 全員 TR -1</strong>。動乱ではテラフォーミングの維持自体にコストがかかります。</li>
                  </ul>
                  <p style={{ fontSize: "0.75rem", color: "#c9bfae", marginBottom: "14px" }}>
                    ※ 画面上部の「動乱」ボタンから、各政党の代表者数・支配政党・議長・自分の影響力・次の世界的イベントを確認し、代表者を送れます。
                  </p>

                  <h4 style={{ color: "var(--color-gold)", marginBottom: "6px" }}>■ 拡張の組み合わせ</h4>
                  <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                    <li>選択しなかった拡張のカードは<strong>山札に一切含まれません</strong>。基本のみなら基本カードだけで遊べます。</li>
                    <li>拡張は自由に組み合わせられます。数を増やすほど1ゲームが長くなります。</li>
                    <li>プロモカードは公式の追加カード集で、単体でも他拡張とも併用できます。</li>
                  </ul>
                </>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {[1, 2, 3].map(page => (
                  <button
                    key={page}
                    className={helpPage === page ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                    onClick={() => setHelpPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <span style={{ fontSize: "0.7rem", color: "#c9bfae", marginLeft: "4px" }}>
                  {helpPage === 1 ? "基本ルール" : helpPage === 2 ? "プレリュード / 金星 / 植民地" : "動乱 / 組み合わせ"}
                </span>
              </div>
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

      {ONLINE_ENABLED && showLobby && (
        <MultiplayerLobby
          status={online.status}
          room={online.room}
          error={online.error}
          playerId={online.playerId}
          onConnect={online.connect}
          onDisconnect={() => {
            online.disconnect();
            setShowLobby(false);
          }}
          onStart={options => {
            // Starting the match leaves the lobby; it used to stay open, so the
            // player had to press "back to the board" to see the game begin.
            online.startGame(options);
            setShowLobby(false);
          }}
          onClose={() => setShowLobby(false)}
        />
      )}

      <GameSetupPanel {...setupPanelProps} />

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
      {activeState.isGameOver && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "450px", border: `2px solid ${activeState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)"}` }}>
            <div className="modal-header" style={{ backgroundColor: activeState.gameResult === "win" ? "rgba(114, 217, 208, 0.1)" : "rgba(168, 50, 32, 0.1)" }}>
              <h3 className="modal-title" style={{ color: activeState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)" }}>
                {activeState.gameResult === "win" ? "MISSION SUCCESS" : "MISSION FAILED"}
              </h3>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "14px 0", color: "var(--color-ink)" }}>
                {activeState.standings
                  ? (activeState.winnerPlayerIds && activeState.winnerPlayerIds.length > 1
                      ? "🤝 同点、勝利を分け合いました"
                      : activeState.gameResult === "win" ? "🎉 勝利！" : "💀 敗北")
                  : activeState.gameResult === "win" ? "🎉 テラフォーミング完了！" : "💀 世代限界値に達しました"}
              </p>
              {/* Solo is scored against the planet, so there is nobody to rank.
                  With opponents the result is the ranking, so show it. */}
              {activeState.standings && (
                <div style={{ padding: "12px 16px", backgroundColor: "rgba(8, 9, 8, 0.5)", borderRadius: "6px", display: "block", maxWidth: "320px", textAlign: "left", margin: "0 auto 14px" }}>
                  {activeState.standings.map((entry, index) => {
                    const isWinner = (activeState.winnerPlayerIds ?? []).includes(entry.playerId);
                    return (
                      <div key={entry.playerId} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontWeight: isWinner ? "bold" : "normal", color: isWinner ? "var(--color-gold)" : "var(--color-ink)" }}>
                        <span>{isWinner ? "👑 " : `${index + 1}. `}{entry.name}</span>
                        <span>{entry.score} 点<span style={{ opacity: 0.6, fontSize: "0.8rem" }}>（{entry.mc} MC）</span></span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ padding: "16px", backgroundColor: "rgba(8, 9, 8, 0.5)", borderRadius: "6px", display: "inline-block", minWidth: "250px", textAlign: "left", margin: "0 auto" }}>
                {([
                  ["tr", "TR (開拓評価点)", "var(--color-cyan)"],
                  ["board", "タイル (緑地・都市隣接)", "var(--color-ember)"],
                  ["cards", "カード勝利点", "var(--color-gold)"],
                  ["milestones", "マイルストーン", "var(--color-gold)"],
                  ["awards", "褒賞", "var(--color-gold)"],
                  ["turmoil", "党首・議長", "var(--color-cyan)"],
                  ["modifier", "その他の増減", "var(--color-rust)"]
                ] as const).map(([key, label, color]) =>
                  scoreBreakdown[key] === 0 && key !== "tr" ? null : (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span>{label}:</span>
                      <span style={{ fontWeight: "bold", color }}>
                        {formatSignedVp(scoreBreakdown[key])} 点
                      </span>
                    </div>
                  )
                )}
                {scoreBreakdown.details.filter(entry => entry.category === "cards" || entry.category === "modifier").length > 0 && (
                  <div style={{ marginBottom: "6px", paddingLeft: "10px", borderLeft: "2px solid rgba(242, 232, 220, 0.15)" }}>
                    {scoreBreakdown.details
                      .filter(entry => entry.category === "cards" || entry.category === "modifier")
                      .map((entry, index) => (
                        <div key={`${entry.sourceId}-${index}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", opacity: 0.75 }}>
                          <span>{entry.label}{entry.detail ? `（${entry.detail}）` : ""}</span>
                          <span>{formatSignedVp(entry.points)}</span>
                        </div>
                      ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(242, 232, 220, 0.2)", paddingTop: "8px", marginTop: "8px", fontSize: "1.1rem" }}>
                  <span>合計スコア:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-ink)" }}>{scoreValue} 点</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => initGame()}>
                新しいミッションを開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
