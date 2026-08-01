export type PlayerId = string;

export type TileType = "empty" | "city" | "forest" | "ocean" | "special";

export type TilePlacedBy = PlayerId | "neutral" | null;

export interface BoardCell {
  q: number;
  r: number;
  isOceanOnly: boolean;
  bonusType: string;
  bonusAmount: number;
  tileType: TileType;
  placedBy: TilePlacedBy;
  name?: string;
  specialName?: string;
}

export type Board = Record<string, BoardCell>;

export interface LogEntry {
  id: string;
  timestamp: string;
  sender: "player" | "cpu" | "system";
  text: string;
}

export interface CardDiscounts {
  all: number;
  tags: Record<string, number>;
}

export type SetupStep = "corporation" | "prelude" | "research" | "done";

export type TurnStep = "start" | "one_action_taken" | "second_action_allowed";

export type GamePhase =
  | "setup"
  | "research"
  | "action"
  | "production"
  | "final_greenery"
  | "game_over";

export type GameMode = "solo" | "hotseat";

export interface PlayerState {
  id: PlayerId;
  name: string;
  setupStep: SetupStep;
  turnStep: TurnStep;
  actionsRemaining: number;
  generationStartTr: number;
  researchCards: string[];
  corporationOptions: string[];
  corporationId: string | null;
  preludeOptions: string[];
  selectedPreludeIds: string[];
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
  playedProjects: string[];
  cardResources: Record<string, number>;
  cardPlacements: Record<string, string>;
  cardDiscounts: CardDiscounts;
  globalRequirementBuffer: number;
  passed: boolean;
}

export type PendingChoiceKind =
  | "ocean-placement"
  | "tile-placement"
  | "any-card-resource"
  | "standard-resource"
  | "effect-branch"
  | "target-player";

export interface PendingChoiceOption {
  id: string;
  label: string;
  targetPlayerId?: PlayerId;
  targetCardId?: string;
  targetCellKey?: string;
  resource?: string;
  amount?: number;
}

export interface PendingChoiceContinuation {
  sourceKind: "card" | "prelude" | "corporation" | "standard-project" | "card-action";
  sourceId: string;
  stage: string;
  consumedAction: boolean;
  paid: boolean;
  remaining?: number;
  payload?: Record<string, unknown>;
}

export interface PendingChoice {
  id: string;
  kind: PendingChoiceKind;
  ownerPlayerId: PlayerId;
  prompt: string;
  optional: boolean;
  options: PendingChoiceOption[];
  continuation: PendingChoiceContinuation;
}

export interface GameResult {
  score: number;
  won: boolean;
  detail?: string;
}

export interface GameState {
  rulesVersion: number;
  mode: GameMode;
  generation: number;
  phase: GamePhase;
  players: PlayerState[];
  turnOrder: PlayerId[];
  currentPlayerId: PlayerId;
  firstPlayerId: PlayerId;
  temperature: number;
  oxygen: number;
  venus: number;
  oceans: number;
  board: Board;
  deck: string[];
  discardPile: string[];
  pendingChoice: PendingChoice | null;
  logs: LogEntry[];
  isGameOver: boolean;
  gameResult: GameResult | null;
  onboarded: boolean;
}

export type EffectResolution =
  | { status: "resolved"; state: GameState; logs: LogEntry[] }
  | { status: "pending"; state: GameState; logs: LogEntry[]; pendingChoice: PendingChoice };

export interface ActionStatus {
  playable: boolean;
  reason: string;
}
