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
  legalCellsFor,
  placeTileAt,
  RESEARCH_CARD_COST,
  applyCorporationTriggers,
  checkParameterThresholds,
  ALL_CARDS,
  CORPORATIONS
} from "./game-logic.js";
import { buildTileChoice } from "./pending-choice.js";

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
  BUY_RESEARCH: "BUY_RESEARCH",
  STANDARD_PROJECT: "STANDARD_PROJECT",
  CORPORATION_ACTION: "CORPORATION_ACTION"
};

// A corporation's own action is a blue action: once per generation, and it
// shares the used-action list with the cards so one flag covers both.
export const CORPORATION_ACTION_ID = "@corporation-action";

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
  DUPLICATE_CARD: "DUPLICATE_CARD",
  UNKNOWN_PROJECT: "UNKNOWN_PROJECT",
  NO_LEGAL_SPACE: "NO_LEGAL_SPACE",
  NO_CORPORATION_ACTION: "NO_CORPORATION_ACTION",
  ACTION_ALREADY_USED: "ACTION_ALREADY_USED"
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

// Spending an action only means anything during the action phase. Nothing
// enforced this, so a card could be played while the research offer was still
// open — which the UI merely happened not to offer until the hand became
// visible during buying.
const ACTION_PHASE_COMMANDS = new Set([
  COMMAND.PLAY_CARD,
  COMMAND.USE_CARD_ACTION,
  COMMAND.CORPORATION_ACTION,
  COMMAND.STANDARD_PROJECT,
  COMMAND.CLAIM_MILESTONE,
  COMMAND.FUND_AWARD,
  COMMAND.SEND_DELEGATE,
  COMMAND.BUILD_COLONY,
  COMMAND.TRADE,
  COMMAND.PASS,
  COMMAND.END_TURN
]);

function checkPhase(state, command) {
  if (!ACTION_PHASE_COMMANDS.has(command.type)) return null;
  if (state.phase !== "action") {
    return fail(state, ERROR.WRONG_PHASE, "今はその操作を行えるフェーズではありません。");
  }
  return null;
}

// An open question has to be answered before anything else happens. Without
// this a player asked where to put a city could play another card first, and
// the choice would then resolve against a state it was never built from.
function checkPendingChoice(state, command) {
  const choice = state.pendingChoice;
  if (!choice) return null;
  if (command.type === COMMAND.RESOLVE_PENDING) return null;
  // The seat that owes an answer is the only one blocked; the others were not
  // going to act out of turn anyway, and setup choices resolve in parallel.
  if (choice.ownerPlayerId !== command.playerId) return null;
  return fail(state, ERROR.ACTION_REFUSED, "先に選択を解決してください。");
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


// Paying for a standard project. Helion may cover megacredits with heat; the
// two conversion projects are paid in the resource they convert.
function payProjectCost(state, playerId, project, cost, corporation) {
  const actor = getPlayer(state, playerId);
  if (project.pays === "plants" || project.pays === "heat") {
    const field = project.pays;
    state.players = state.players.map(player =>
      player.id === playerId ? { ...player, [field]: (player[field] ?? 0) - cost } : player
    );
    return 0;
  }
  const heatAvailable = corporation?.effects?.heatAsMoney ? actor.heat ?? 0 : 0;
  const heatUsed = Math.min(heatAvailable, Math.max(0, cost - (actor.mc ?? 0)));
  state.players = state.players.map(player =>
    player.id === playerId
      ? { ...player, mc: player.mc - (cost - heatUsed), heat: (player.heat ?? 0) - heatUsed }
      : player
  );
  return heatUsed;
}

// A project that places a tile asks where, unless only one space is legal.
function placeOrAsk(state, command, tileType, label, source) {
  const legal = legalCellsFor(state, tileType, command.playerId);
  if (legal.length === 0) {
    return fail(state, ERROR.NO_LEGAL_SPACE, "配置できるマスがありません。");
  }
  // A greenery raises oxygen, which may cross 8% and buy a temperature step.
  const before = { temperature: state.temperature, oxygen: state.oxygen };
  if (legal.length === 1) {
    placeTileAt(state, legal[0], tileType, command.playerId);
    return source
      ? finishAction(state, command, label, before)
      : finishProject(state, command, label, before);
  }
  const choice = buildTileChoice(
    state,
    tileType,
    {
      sourceKind: source?.kind ?? "standard-project",
      sourceId: source?.id ?? command.projectId,
      consumedAction: true,
      paid: true,
      // Settled when the space is chosen, exactly as it is when only one was
      // legal — including the line saying what was built, which otherwise only
      // appeared for projects that happened to have a single legal space.
      afterPlay: {
        temperature: before.temperature,
        oxygen: before.oxygen,
        label,
        kind: source ? "action" : "project"
      }
    },
    legal
  );
  state.pendingChoice = choice;
  state.logs = addLog(state.logs, "system", choice.prompt);
  return { ok: true, state, events: [], pendingAction: choice };
}

// Every project that resolves without asking ends the same way: report it,
// settle any threshold bonus it crossed, and spend the action.
function finishProject(state, command, label, before) {
  const actor = getPlayer(state, command.playerId);
  state.logs = addLog(state.logs, "player", `標準プロジェクト【${label}】を実行しました。`, actor?.name);
  const settled = before
    ? checkParameterThresholds(before.temperature, state.temperature, before.oxygen, state.oxygen, state, state.logs)
    : { state, logs: state.logs };
  if (settled.state.pendingChoice) {
    return { ok: true, state: settled.state, events: [], pendingAction: settled.state.pendingChoice };
  }
  const spent = handleActionSpend(settled.state, settled.logs);
  return { ok: true, state: spent, events: [] };
}

// The corporation-action counterpart of finishProject: same settle-and-spend,
// but the log line names the corporation rather than a standard project.
function finishAction(state, command, label, before) {
  const actor = getPlayer(state, command.playerId);
  state.logs = addLog(state.logs, "player", label, actor?.name);
  const settled = before
    ? checkParameterThresholds(before.temperature, state.temperature, before.oxygen, state.oxygen, state, state.logs)
    : { state, logs: state.logs };
  if (settled.state.pendingChoice) {
    return { ok: true, state: settled.state, events: [], pendingAction: settled.state.pendingChoice };
  }
  const spent = handleActionSpend(settled.state, settled.logs);
  return { ok: true, state: spent, events: [] };
}

const STANDARD_PROJECTS = {
  "power-plant": {
    label: "発電所の建設",
    // powerPlantDiscount matched no corporation, so this read as a discount
    // nobody had. Thorgate's powerDiscount is deliberately NOT used here: its
    // effect text in official-content.js is "電力タグのカードコスト-3", which
    // game-logic applies to cards carrying the Power tag, not to this project.
    cost: () => 11,
    run(state, command) {
      state.players = state.players.map(player =>
        player.id === command.playerId ? { ...player, energyProd: player.energyProd + 1 } : player
      );
      return finishProject(state, command, "発電所の建設");
    }
  },
  asteroid: {
    label: "小惑星の衝突",
    cost: () => 14,
    blocked: state => (state.temperature >= 8 ? "気温は上限に達しています。" : null),
    run(state, command) {
      const before = { temperature: state.temperature, oxygen: state.oxygen };
      raiseTemperature(state, command.playerId);
      return finishProject(state, command, "小惑星の衝突", before);
    }
  },
  aquifer: {
    label: "海洋の沈降",
    cost: () => 18,
    places: "ocean",
    blocked: state => (state.oceans >= 9 ? "海洋は上限に達しています。" : null),
    run: (state, command) => placeOrAsk(state, command, "ocean", "海洋の沈降")
  },
  greenery: {
    label: "緑化プロジェクト",
    cost: () => 23,
    places: "forest",
    run: (state, command) => placeOrAsk(state, command, "forest", "緑化プロジェクト")
  },
  city: {
    label: "都市の建設",
    cost: () => 25,
    places: "city",
    // P10「都市タイルを１枚配置し、Ｍ€の生産量を１段階上げる」— the production
    // belongs to the project, so it is paid whether or not the space was chosen.
    run(state, command) {
      state.players = state.players.map(player =>
        player.id === command.playerId ? { ...player, mcProd: (player.mcProd ?? 0) + 1 } : player
      );
      return placeOrAsk(state, command, "city", "都市の建設");
    }
  },
  "convert-plants": {
    label: "植物の緑化",
    pays: "plants",
    places: "forest",
    // greeneryPlantCost matched no corporation, so this was always 8 by
    // accident rather than by decision. It stays 8 by decision: this codebase
    // gives Ecoline its 7 plants as a once-per-generation corporation action
    // (CORPORATION_ACTIONS below), and reading plantGreeneryCost here as well
    // would hand it both a permanent discount and the action.
    cost: () => 8,
    run: (state, command) => placeOrAsk(state, command, "forest", "植物の緑化")
  },
  "convert-heat": {
    label: "熱による加熱",
    pays: "heat",
    cost: () => 8,
    blocked: state => (state.temperature >= 8 ? "気温は上限に達しています。" : null),
    run(state, command) {
      const before = { temperature: state.temperature, oxygen: state.oxygen };
      raiseTemperature(state, command.playerId);
      return finishProject(state, command, "熱による加熱", before);
    }
  },
  "sell-patents": {
    label: "パテントの売却",
    cost: () => 0,
    run(state, command) {
      const ids = command.cardIds ?? [];
      const actor = getPlayer(state, command.playerId);
      if (ids.length === 0 || !ids.every(id => actor.hand.includes(id))) {
        return fail(state, ERROR.CARD_NOT_IN_HAND, "手札にないカードは売却できません。");
      }
      // One card, named twice, used to pay twice while leaving the hand once.
      if (new Set(ids).size !== ids.length) {
        return fail(state, ERROR.DUPLICATE_CARD, "同じカードは1枚しか売却できません。");
      }
      state.players = state.players.map(player =>
        player.id === command.playerId
          ? {
              ...player,
              mc: player.mc + ids.length,
              hand: player.hand.filter(id => !ids.includes(id))
            }
          : player
      );
      state.discardPile = [...state.discardPile, ...ids];
      return finishProject(state, command, "パテントの売却");
    }
  }
};

// Two steps of temperature, and the TR that comes with each step actually taken.
function raiseTemperature(state, playerId) {
  const before = state.temperature;
  state.temperature = Math.min(8, before + 2);
  const steps = (state.temperature - before) / 2;
  if (steps > 0) {
    state.players = state.players.map(player =>
      player.id === playerId ? { ...player, tr: player.tr + steps } : player
    );
  }
}

// The three corporations that carry an action of their own. Each states what it
// costs and what it does; the handler below does the checking and the spending,
// exactly as it does for a card action.
const CORPORATION_ACTIONS = {
  "corp-ecoline": {
    label: "Ecoline: 植物7を支払い緑地を配置しました。",
    blocked: actor => ((actor.plants ?? 0) < 7 ? "植物が不足しています。" : null),
    run(state, command) {
      state.players = state.players.map(player =>
        player.id === command.playerId ? { ...player, plants: (player.plants ?? 0) - 7 } : player
      );
      const before = { temperature: state.temperature, oxygen: state.oxygen };
      const placed = placeOrAsk(state, command, "forest", "Ecoline: 植物7を支払い緑地を配置しました。", {
        kind: "corporation-action",
        id: "corp-ecoline"
      });
      // A greenery raises oxygen, so a threshold may have been crossed.
      if (placed.ok && !placed.pendingAction) {
        const settled = checkParameterThresholds(
          before.temperature,
          placed.state.temperature,
          before.oxygen,
          placed.state.oxygen,
          placed.state,
          placed.state.logs
        );
        return { ...placed, state: settled.state };
      }
      return placed;
    }
  },
  "corp-unmi": {
    label: "UNMI: MC3を支払いTRを1上げました。",
    // UNMI may only buy a TR step in a generation where it already raised one.
    blocked: actor => {
      if ((actor.tr ?? 0) <= (actor.generationStartTr ?? 0)) {
        return "この世代にまだTRが上がっていません。";
      }
      return (actor.mc ?? 0) < 3 ? "MCが不足しています。" : null;
    },
    run(state, command) {
      state.players = state.players.map(player =>
        player.id === command.playerId ? { ...player, mc: player.mc - 3, tr: player.tr + 1 } : player
      );
      return finishAction(state, command, "UNMI: MC3を支払いTRを1上げました。");
    }
  },
  "corp-robinson": {
    label: "Robinson Industries: MC4で最も低い生産量を1段階上げました。",
    blocked: actor => ((actor.mc ?? 0) < 4 ? "MCが不足しています。" : null),
    run(state, command) {
      const resources = ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"];
      const actor = getPlayer(state, command.playerId);
      const lowest = Math.min(...resources.map(resource => actor[resource] ?? 0));
      const target = resources.find(resource => (actor[resource] ?? 0) === lowest) ?? "mcProd";
      state.players = state.players.map(player =>
        player.id === command.playerId
          ? { ...player, mc: player.mc - 4, [target]: (player[target] ?? 0) + 1 }
          : player
      );
      return finishAction(state, command, `Robinson Industries: MC4で${target}を1段階上げました。`);
    }
  }
};

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

    // A client picks these, so they are clamped to what the player actually
    // holds and to whole non-negative numbers before anything is computed.
    const held = (value, stock) => {
      const asked = Math.floor(Number(value ?? 0));
      if (!Number.isFinite(asked) || asked <= 0) return 0;
      return Math.min(asked, stock ?? 0);
    };
    const steelUsed = held(command.payment?.steel, actor.steel);
    const titaniumUsed = held(command.payment?.titanium, actor.titanium);
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
            // A red event is resolved and set aside; keeping it in
            // playedProjects made its tags count for the rest of the game.
            ...(card.type === "event"
              ? { playedEvents: [...(player.playedEvents ?? []), card.id] }
              : { playedProjects: [...player.playedProjects, card.id] })
          }
        : player
    );

    const beforeTemp = paid.temperature;
    const beforeOxygen = paid.oxygen;
    const result = applyCardEffect(paid, card, paid.logs);
    // A card that needs a target parks the rest of the work in pendingChoice;
    // the action is spent once that resolves, not now. The triggers and the
    // threshold bonuses wait with it — they used to be skipped outright, so
    // Saturn Systems earned nothing from a Jovian card that asked a question.
    if (result.status === "pending") {
      const parked = result.state;
      if (parked.pendingChoice) {
        parked.pendingChoice = {
          ...parked.pendingChoice,
          continuation: {
            ...parked.pendingChoice.continuation,
            afterPlay: { cardId: card.id, temperature: beforeTemp, oxygen: beforeOxygen }
          }
        };
      }
      return { ok: true, state: parked, events: [], pendingAction: parked.pendingChoice };
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
    const afterPlay = choice.continuation?.afterPlay ?? null;
    const result = resolvePendingChoice(state, command.optionId, state.logs, command.playerId);

    let settled = result.state;
    let settledLogs = result.logs ?? settled?.logs;

    // The work a card left behind when it stopped to ask. It runs only once the
    // last question is answered, and only if the answer did not raise another.
    if (afterPlay && settled && !settled.pendingChoice) {
      // Say what was built. Without this the log recorded only "(4,-4) にタイル
      // を配置しました", so a project that asked where to build left no trace of
      // which project it was.
      if (afterPlay.label) {
        const actor = getPlayer(settled, command.playerId);
        settledLogs = addLog(
          settledLogs,
          "player",
          afterPlay.kind === "action"
            ? afterPlay.label
            : `標準プロジェクト【${afterPlay.label}】を実行しました。`,
          actor?.name
        );
        settled = cloneGameState(settled);
        settled.logs = settledLogs;
      }
      // A card played through a choice owes its triggers; a bare tile placement
      // carries no card and owes only the threshold bonuses it crossed.
      const card = afterPlay.cardId
        ? ALL_CARDS.find(item => item.id === afterPlay.cardId)
        : null;
      if (card) {
        const triggered = applyCorporationTriggers(settled, card, settledLogs);
        settled = triggered.state;
        settledLogs = triggered.logs;
      }
      // A trigger may itself ask something (Mars University); leave its
      // question standing and settle the thresholds when that one resolves.
      if (!settled.pendingChoice) {
        const thresholds = checkParameterThresholds(
          afterPlay.temperature,
          settled.temperature,
          afterPlay.oxygen,
          settled.oxygen,
          settled,
          settledLogs
        );
        settled = thresholds.state;
        settledLogs = thresholds.logs;
      }
    }

    // A card that asks for a target still costs one action, charged when the
    // last question is answered. Charging earlier would double up on a card
    // that asks twice; never charging made every such card free.
    const stillChoosing = Boolean(settled?.pendingChoice);
    if (!stillChoosing && consumesAction && settled?.phase === "action") {
      const spent = handleActionSpend(settled, settledLogs ?? settled.logs);
      return { ok: true, state: spent, events: [] };
    }
    return done(settled, settledLogs);
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
  // The eight standard projects. The UI, the server and the bot each had their
  // own copy of these, which is how the bot came to raise the ocean count twice
  // and the online build could not run them at all.
  [COMMAND.STANDARD_PROJECT](state, command) {
    const project = STANDARD_PROJECTS[command.projectId];
    if (!project) return fail(state, ERROR.UNKNOWN_PROJECT, "不明な標準プロジェクトです。");

    const actor = getPlayer(state, command.playerId);
    const corporation = CORPORATIONS.find(item => item.id === actor.corporationId);
    const cost = project.cost(state, corporation);

    if (project.pays === "plants") {
      if ((actor.plants ?? 0) < cost) return fail(state, ERROR.CANNOT_AFFORD, "植物が不足しています。");
    } else if (project.pays === "heat") {
      if ((actor.heat ?? 0) < cost) return fail(state, ERROR.CANNOT_AFFORD, "熱が不足しています。");
    } else {
      const heatAsMoney = corporation?.effects?.heatAsMoney ? actor.heat ?? 0 : 0;
      if ((actor.mc ?? 0) + heatAsMoney < cost) {
        return fail(state, ERROR.CANNOT_AFFORD, "MCが不足しています。");
      }
    }

    const blocked = project.blocked?.(state, actor);
    if (blocked) return fail(state, ERROR.ACTION_REFUSED, blocked);

    // Whether the tile has anywhere to go is settled before the money moves.
    // Checking it afterwards returned a refusal carrying a state that had
    // already been charged, so a full board cost 25 MC and built nothing.
    if (project.places) {
      const legal = legalCellsFor(state, project.places, command.playerId);
      if (legal.length === 0) {
        return fail(state, ERROR.NO_LEGAL_SPACE, "配置できるマスがありません。");
      }
    }

    const next = cloneGameState(state);
    payProjectCost(next, command.playerId, project, cost, corporation);

    // CrediCor: "基本コスト20以上のカードまたは標準プロジェクトを支払うとMC4".
    // The card half already fires in applyCorporationTriggers; this is the half
    // that only the UI used to pay, so the bot and the online build never got it.
    const rebate = corporation?.effects?.expensivePaymentBonus ?? 0;
    if (rebate > 0 && project.pays !== "plants" && project.pays !== "heat" && cost >= 20) {
      next.players = next.players.map(player =>
        player.id === command.playerId ? { ...player, mc: player.mc + rebate } : player
      );
      next.logs = addLog(next.logs, "system", `CrediCor: MC +${rebate}`);
    }

    return project.run(next, command, cost);
  },

  // A corporation's own action. The UI used to run these itself, which is why
  // it could raise Robinson's production without the engine ever seeing it.
  [COMMAND.CORPORATION_ACTION](state, command) {
    const actor = getPlayer(state, command.playerId);
    const action = CORPORATION_ACTIONS[actor.corporationId];
    if (!action) {
      return fail(state, ERROR.NO_CORPORATION_ACTION, "この企業にはアクションがありません。");
    }
    if ((actor.usedCardActions ?? []).includes(CORPORATION_ACTION_ID)) {
      return fail(state, ERROR.ACTION_ALREADY_USED, "この世代の企業アクションは使用済みです。");
    }
    const blocked = action.blocked?.(actor, state);
    if (blocked) return fail(state, ERROR.ACTION_REFUSED, blocked);

    const next = cloneGameState(state);
    // Mark it used before running, so a placement that stops to ask cannot be
    // started a second time while the question is open.
    next.players = next.players.map(player =>
      player.id === command.playerId
        ? { ...player, usedCardActions: [...(player.usedCardActions ?? []), CORPORATION_ACTION_ID] }
        : player
    );
    return action.run(next, command);
  },

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
    // "初期10枚を無料で保持する" — Beginner Corporation pays nothing for its
    // opening hand, but still pays 3 each in every later research phase. Only
    // the UI knew this, so the room and the bot charged it 3 a card at setup.
    const corporation = CORPORATIONS.find(item => item.id === actor.corporationId);
    const free = state.phase === "setup" && Boolean(corporation?.effects?.freeStartingCards);
    const cost = free ? 0 : ids.length * RESEARCH_CARD_COST;
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
      // The generation starts with everyone holding two actions again. Only
      // page.tsx did this, so a game driven through commands entered the action
      // phase with whatever was left from the previous generation — zero.
      next.players = next.players.map(player => ({
        ...player,
        actionsRemaining: 2,
        turnStep: "start"
      }));
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

  const wrongPhase = checkPhase(state, command);
  if (wrongPhase) return wrongPhase;

  const owes = checkPendingChoice(state, command);
  if (owes) return owes;

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
