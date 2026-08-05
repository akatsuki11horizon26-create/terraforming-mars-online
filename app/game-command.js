// The single entry point for changing game state.
//
// Every mode — the offline UI, the room server, the bot — sends a command and
// takes back the state it returns. None of them may write to the state
// themselves. That is what keeps a rule from being fixed in one mode and left
// broken in another, which is how the same greenery came to be worth different
// amounts depending on who placed it.
//
// The published solo build has no server, so its UI calls this directly; the
// online build sends the same command over the socket and the server calls it.
// Either way the rules live here and nowhere else.

import {
  applyCardEffect,
  applyCardAction,
  applyCorporation,
  applyPreludes,
  claimMilestone,
  fundAward,
  sendDelegateToParty,
  buildColonyOn,
  tradeWith,
  passPlayer,
  endTurn,
  resolvePendingChoice,
  handleActionSpend,
  cloneGameState,
  getPlayer,
  getCardPlayableStatus,
  getCardPaymentCost,
  getCardActionStatus,
  draftPick,
  advanceSetupTurn,
  addLog,
  RESEARCH_CARD_COST,
  applyCorporationTriggers,
  checkParameterThresholds,
  ALL_CARDS,
  CORPORATIONS
} from "./game-logic.js";

export const COMMAND = {
  PLAY_CARD: "PLAY_CARD",
  USE_CARD_ACTION: "USE_CARD_ACTION",
  CLAIM_MILESTONE: "CLAIM_MILESTONE",
  FUND_AWARD: "FUND_AWARD",
  SEND_DELEGATE: "SEND_DELEGATE",
  BUILD_COLONY: "BUILD_COLONY",
  TRADE: "TRADE",
  PASS: "PASS",
  END_TURN: "END_TURN",
  RESOLVE_PENDING: "RESOLVE_PENDING",
  SELECT_CORPORATION: "SELECT_CORPORATION",
  SELECT_PRELUDES: "SELECT_PRELUDES",
  DRAFT_PICK: "DRAFT_PICK",
  BUY_RESEARCH: "BUY_RESEARCH"
};

export const ERROR = {
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  WRONG_PHASE: "WRONG_PHASE",
  CARD_NOT_IN_HAND: "CARD_NOT_IN_HAND",
  CARD_NOT_OWNED: "CARD_NOT_OWNED",
  CARD_NOT_ACTIVE: "CARD_NOT_ACTIVE",
  CARD_NOT_PLAYABLE: "CARD_NOT_PLAYABLE",
  CANNOT_AFFORD: "CANNOT_AFFORD",
  ACTION_REFUSED: "ACTION_REFUSED",
  NOT_YOUR_CHOICE: "NOT_YOUR_CHOICE",
  UNKNOWN_PLAYER: "UNKNOWN_PLAYER",
  CARD_NOT_OFFERED: "CARD_NOT_OFFERED",
  DUPLICATE_CARD: "DUPLICATE_CARD"
};

function fail(state, code, message) {
  return { ok: false, state, error: { code, message }, events: [] };
}

function done(state, logs) {
  const next = logs && logs !== state.logs ? cloneGameState(state) : state;
  if (logs && logs !== state.logs) next.logs = logs;
  return { ok: true, state: next, events: [] };
}

// A command may only come from the seat it names, and only on that seat's turn.
// Setup steps are exempt: players choose corporations simultaneously.
const SETUP_COMMANDS = new Set([
  COMMAND.SELECT_CORPORATION,
  COMMAND.SELECT_PRELUDES,
  COMMAND.DRAFT_PICK,
  COMMAND.BUY_RESEARCH,
  COMMAND.RESOLVE_PENDING
]);

function checkTurn(state, command) {
  const actor = getPlayer(state, command.playerId);
  if (!actor) return fail(state, ERROR.UNKNOWN_PLAYER, "そのプレイヤーは存在しません。");
  if (SETUP_COMMANDS.has(command.type)) return null;
  if (state.currentPlayerId !== command.playerId) {
    return fail(state, ERROR.NOT_YOUR_TURN, "あなたの手番ではありません。");
  }
  return null;
}

// Spending the turn belongs to the command layer: an attempt the engine refused
// must not cost an action, and one that succeeded must cost exactly one.
function spend(state, result, flag) {
  if (!result?.[flag]) {
    return fail(state, ERROR.ACTION_REFUSED, "その操作は実行できませんでした。");
  }
  const spent = handleActionSpend(result.state, result.logs ?? result.state.logs);
  return { ok: true, state: spent, events: [] };
}

const HANDLERS = {
  [COMMAND.PLAY_CARD](state, command) {
    const actor = getPlayer(state, command.playerId);
    const card = ALL_CARDS.find(item => item.id === command.cardId);
    if (!card) return fail(state, ERROR.CARD_NOT_IN_HAND, "そのカードは存在しません。");
    // Playability is about cost and requirements, not possession, so the hand
    // has to be checked separately or any card could be played by naming it.
    if (!(actor.hand ?? []).includes(card.id)) {
      return fail(state, ERROR.CARD_NOT_IN_HAND, "そのカードは手札にありません。");
    }

    const steelUsed = Number(command.payment?.steel ?? 0);
    const titaniumUsed = Number(command.payment?.titanium ?? 0);
    const status = getCardPlayableStatus(card, state, steelUsed, titaniumUsed);
    if (!status.playable) return fail(state, ERROR.CARD_NOT_PLAYABLE, status.reason);

    const cost = getCardPaymentCost(card, state, steelUsed, titaniumUsed);
    const corporation = CORPORATIONS.find(item => item.id === actor.corporationId);
    const heatPaid = corporation?.effects?.heatAsMoney
      ? Math.max(0, Math.min(actor.heat ?? 0, cost - (actor.mc ?? 0)))
      : 0;
    if ((actor.mc ?? 0) + heatPaid < cost) {
      return fail(state, ERROR.CANNOT_AFFORD, "支払いできません。");
    }

    const paid = cloneGameState(state);
    paid.players = paid.players.map(player =>
      player.id === command.playerId
        ? {
            ...player,
            mc: player.mc - (cost - heatPaid),
            heat: (player.heat ?? 0) - heatPaid,
            steel: (player.steel ?? 0) - steelUsed,
            titanium: (player.titanium ?? 0) - titaniumUsed,
            hand: player.hand.filter(id => id !== card.id),
            playedProjects: [...player.playedProjects, card.id]
          }
        : player
    );

    const beforeTemp = paid.temperature;
    const beforeOxygen = paid.oxygen;
    const result = applyCardEffect(paid, card, paid.logs);
    // A card that needs a target parks the rest of the work in pendingChoice;
    // the action is spent once that resolves, not now.
    if (result.status === "pending") {
      return { ok: true, state: result.state, events: [], pendingAction: result.pendingChoice };
    }

    // Corporation effects that watch for a tag, and the bonuses printed part
    // way up the temperature and oxygen tracks, fire for every mode here
    // rather than only for whichever one remembered to call them.
    const triggered = applyCorporationTriggers(result.state, card, result.logs);
    const thresholds = checkParameterThresholds(
      beforeTemp,
      triggered.state.temperature,
      beforeOxygen,
      triggered.state.oxygen,
      triggered.state,
      triggered.logs
    );
    if (thresholds.state.pendingChoice) {
      return { ok: true, state: thresholds.state, events: [], pendingAction: thresholds.state.pendingChoice };
    }

    const spent = handleActionSpend(thresholds.state, thresholds.logs);
    return { ok: true, state: spent, events: [] };
  },

  [COMMAND.USE_CARD_ACTION](state, command) {
    const actor = getPlayer(state, command.playerId);
    const card = ALL_CARDS.find(item => item.id === command.cardId);
    if (!card) return fail(state, ERROR.CARD_NOT_OWNED, "そのカードは存在しません。");
    if (!(actor.playedProjects ?? []).includes(card.id)) {
      return fail(state, ERROR.CARD_NOT_OWNED, "そのカードを場に出していません。");
    }
    if (card.type !== "active") {
      return fail(state, ERROR.CARD_NOT_ACTIVE, "そのカードにアクションはありません。");
    }
    const status = getCardActionStatus(state, card);
    if (!status.playable) return fail(state, ERROR.ACTION_REFUSED, status.reason);

    const result = applyCardAction(state, card, state.logs, command.branchIndex);
    if (!result.playable) return fail(state, ERROR.ACTION_REFUSED, "その操作は実行できませんでした。");
    if (result.awaitingChoice) {
      return { ok: true, state: result.state, events: [], pendingAction: result.state.pendingChoice };
    }
    const spent = handleActionSpend(result.state, result.logs);
    return { ok: true, state: spent, events: [] };
  },

  [COMMAND.CLAIM_MILESTONE]: (state, command) =>
    spend(state, claimMilestone(state, command.milestoneId, state.logs, command.playerId), "claimed"),

  [COMMAND.FUND_AWARD]: (state, command) =>
    spend(state, fundAward(state, command.awardId, state.logs, command.playerId), "funded"),

  [COMMAND.SEND_DELEGATE]: (state, command) =>
    spend(state, sendDelegateToParty(state, command.partyId, state.logs, command.playerId), "sent"),

  [COMMAND.BUILD_COLONY]: (state, command) =>
    spend(state, buildColonyOn(state, command.tileId, state.logs, command.playerId), "built"),

  [COMMAND.TRADE]: (state, command) =>
    spend(state, tradeWith(state, command.tileId, state.logs, command.playerId), "traded"),

  [COMMAND.PASS](state, command) {
    const result = passPlayer(state, state.logs, command.playerId);
    return done(result.state, result.logs);
  },

  [COMMAND.END_TURN](state, command) {
    const result = endTurn(state, state.logs, command.playerId);
    return done(result.state, result.logs);
  },

  [COMMAND.RESOLVE_PENDING](state, command) {
    const choice = state.pendingChoice;
    if (!choice) return fail(state, ERROR.ACTION_REFUSED, "解決すべき選択がありません。");
    // Only the player the choice belongs to may answer it.
    if (choice.ownerPlayerId !== command.playerId) {
      return fail(state, ERROR.NOT_YOUR_CHOICE, "他のプレイヤーの選択です。");
    }
    const consumesAction = choice.continuation?.consumedAction ?? true;
    const result = resolvePendingChoice(state, command.optionId, state.logs, command.playerId);

    // A card that asks for a target still costs one action, charged when the
    // last question is answered. Charging earlier would double up on a card
    // that asks twice; never charging made every such card free.
    const stillChoosing = Boolean(result.state?.pendingChoice);
    if (!stillChoosing && consumesAction && result.state?.phase === "action") {
      const spent = handleActionSpend(result.state, result.logs ?? result.state.logs);
      return { ok: true, state: spent, events: [] };
    }
    return done(result.state, result.logs);
  },

  [COMMAND.SELECT_CORPORATION](state, command) {
    const next = applyCorporation(state, command.corporationId, command.playerId);
    if (next === state) return fail(state, ERROR.ACTION_REFUSED, "その企業は選べません。");
    return { ok: true, state: next, events: [] };
  },

  [COMMAND.SELECT_PRELUDES](state, command) {
    const next = applyPreludes(state, command.preludeIds ?? [], command.playerId);
    if (next === state) return fail(state, ERROR.ACTION_REFUSED, "そのPreludeは選べません。");
    return { ok: true, state: next, events: [] };
  },

  // Buying from the research offer, in setup and every generation after. The
  // server had its own copy of this and never advanced the phase with it, so
  // an online game stalled once everyone had bought.
  [COMMAND.BUY_RESEARCH](state, command) {
    const actor = getPlayer(state, command.playerId);
    const ids = command.cardIds ?? [];
    const offered = actor.researchCards ?? [];

    if (new Set(ids).size !== ids.length) {
      return fail(state, ERROR.DUPLICATE_CARD, "同じカードは1枚しか購入できません。");
    }
    if (!ids.every(id => offered.includes(id))) {
      return fail(state, ERROR.CARD_NOT_OFFERED, "提示されていないカードです。");
    }
    const cost = ids.length * RESEARCH_CARD_COST;
    if ((actor.mc ?? 0) < cost) {
      return fail(state, ERROR.CANNOT_AFFORD, "MCが不足しています。");
    }

    const next = cloneGameState(state);
    next.players = next.players.map(player =>
      player.id === command.playerId
        ? {
            ...player,
            mc: player.mc - cost,
            hand: [...player.hand, ...ids],
            researchCards: [],
            setupStep: player.setupStep === "projects" ? "complete" : player.setupStep
          }
        : player
    );
    next.discardPile = [...next.discardPile, ...offered.filter(id => !ids.includes(id))];
    next.logs = addLog(
      next.logs,
      "player",
      ids.length > 0 ? `カードを${ids.length}枚購入しました。` : "カードを購入しませんでした。",
      actor.name
    );

    // Setup only ends once every seat has bought; the research phase only
    // begins play once every seat has.
    if (state.phase === "setup") return { ok: true, state: advanceSetupTurn(next), events: [] };
    if (next.players.every(player => (player.researchCards ?? []).length === 0)) {
      next.phase = "action";
      next.currentPlayerId = next.firstPlayerId ?? next.turnOrder[0];
      next.logs = addLog(next.logs, "system", "全員の購入が完了しました。アクションフェーズを開始します。");
    }
    return { ok: true, state: next, events: [] };
  },

  [COMMAND.DRAFT_PICK](state, command) {
    const next = draftPick(state, command.cardId, command.playerId);
    if (next === state) return fail(state, ERROR.ACTION_REFUSED, "そのカードは選べません。");
    return { ok: true, state: next, events: [] };
  }
};

export function executeGameCommand(state, command) {
  const handler = HANDLERS[command?.type];
  if (!handler) return fail(state, ERROR.UNKNOWN_COMMAND, "不明な操作です。");

  const refused = checkTurn(state, command);
  if (refused) return refused;

  return handler(state, command);
}

// The commands a seat may legally issue right now. The bot picks from this, and
// a UI can use it to decide what to enable rather than re-deriving the rules.
export function getLegalCommands(state, playerId) {
  const actor = getPlayer(state, playerId);
  if (!actor) return [];
  const commands = [];

  if (state.pendingChoice?.ownerPlayerId === playerId) {
    for (const option of state.pendingChoice.options ?? []) {
      commands.push({ type: COMMAND.RESOLVE_PENDING, playerId, optionId: option.id });
    }
    return commands;
  }

  if (state.phase !== "action" || state.currentPlayerId !== playerId) return commands;

  for (const cardId of actor.hand ?? []) {
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!card) continue;
    if (!getCardPlayableStatus(card, state, 0, 0).playable) continue;
    if ((actor.mc ?? 0) < getCardPaymentCost(card, state, 0, 0)) continue;
    commands.push({ type: COMMAND.PLAY_CARD, playerId, cardId });
  }

  for (const cardId of actor.playedProjects ?? []) {
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!card || card.type !== "active") continue;
    if (!getCardActionStatus(state, card).playable) continue;
    commands.push({ type: COMMAND.USE_CARD_ACTION, playerId, cardId });
  }

  commands.push({ type: COMMAND.PASS, playerId });
  return commands;
}
