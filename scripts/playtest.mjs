// Plays complete games against the engine and reports anything that looks wrong.
// Intended for automated debugging: it drives the same APIs the UI calls, so a
// crash or rule violation here is a real bug, not a harness artefact.
//
// Usage:
//   node scripts/playtest.mjs [--games=20] [--players=1] [--turmoil] [--colonies] [--draft] [--seed=N]
import {
  getInitialState,
  applyCorporation,
  draftPick,
  applyPreludes,
  getPreludeCost,
  PRELUDES,
  completeSetupPurchase,
  cloneGameState,
  getCardActionStatus,
  getCardPlayableStatus,
  getCardPaymentCost,
  resolvePendingChoice,
  handleActionSpend,
  triggerProduction,
  computeScore,
  claimMilestone,
  fundAward,
  getMilestoneStatus,
  getAwardStatus,
  sendDelegateToParty,
  buildColonyOn,
  tradeWith,
  canBuildColony,
  canTrade,
  MILESTONES,
  AWARDS,
  PARTIES,
  ALL_CARDS,
  selectSoloColonies
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  })
);

const GAMES = Number(args.games ?? 20);
const PLAYERS = Number(args.players ?? 1);
const USE_TURMOIL = Boolean(args.turmoil);
const USE_COLONIES = Boolean(args.colonies);
const USE_PRELUDE = Boolean(args.prelude);
const USE_VENUS = Boolean(args.venus);
const USE_PROMO = Boolean(args.promo);
// Drafting replaces the dealt hand with a pass-and-pick round, so setup takes a
// different path entirely. It needs more than one player to mean anything.
const USE_DRAFT = Boolean(args.draft);
const BOARD = args.board ? String(args.board) : undefined;
const MAX_STEPS = 4000;

const issues = [];
function report(kind, detail, context = {}) {
  issues.push({ kind, detail, ...context });
}

// Invariants that must hold after every single step of every game.
function checkInvariants(state, where) {
  for (const player of state.players) {
    for (const field of ["mc", "steel", "titanium", "plants", "energy", "heat"]) {
      const value = player[field];
      if (!Number.isFinite(value)) {
        report("non-finite-resource", `${player.id}.${field} = ${value}`, { where });
      } else if (value < 0 && field !== "mc") {
        report("negative-resource", `${player.id}.${field} = ${value}`, { where });
      } else if (field === "mc" && value < 0) {
        // The rulebook floors a generation's MC income at zero, so going into
        // the red can only come from overspending — a real defect.
        report("negative-resource", `${player.id}.mc = ${value}`, { where });
      }
    }
    if (!Number.isFinite(player.tr) || player.tr < 0) {
      report("bad-tr", `${player.id}.tr = ${player.tr}`, { where });
      // Once TR is corrupt every later check repeats it; repair so the run keeps
      // exercising the rest of the engine instead of drowning in one fault.
      player.tr = 14;
    }
  }

  if (state.oceans > 9) report("too-many-oceans", `oceans = ${state.oceans}`, { where });
  if (state.oxygen > 14) report("oxygen-over-max", `oxygen = ${state.oxygen}`, { where });
  if (state.temperature > 8) report("temperature-over-max", `temp = ${state.temperature}`, { where });
  if (state.temperature % 2 !== 0) report("temperature-off-grid", `temp = ${state.temperature}`, { where });

  const oceanTiles = Object.values(state.board).filter(cell => cell.tileType === "ocean").length;
  if (oceanTiles !== state.oceans) {
    report("ocean-count-mismatch", `board has ${oceanTiles}, counter says ${state.oceans}`, { where });
  }
  // Artificial Lake places an ocean on a space NOT reserved for ocean, so an
  // ocean on land is legal exactly as often as that card has been played. More
  // than that means something placed an ocean where it should not have.
  const artificialLakes = (state.players ?? []).reduce(
    (sum, player) =>
      sum + (player.playedProjects ?? []).filter(id => id === "card-base-artificial-lake").length,
    0
  );
  const oceansOnLand = Object.values(state.board).filter(
    cell => cell.tileType === "ocean" && !cell.isOceanOnly
  );
  if (oceansOnLand.length > artificialLakes) {
    report(
      "ocean-on-land",
      `${oceansOnLand.length} on land but only ${artificialLakes} Artificial Lake(s) played`,
      { where }
    );
  }
  for (const cell of Object.values(state.board)) {
    if (cell.tileType !== "empty" && cell.tileType !== "ocean" && cell.placedBy === null) {
      report("unowned-tile", `${cell.q},${cell.r} ${cell.tileType}`, { where });
    }
  }

  if ((state.claimedMilestones ?? []).length > 3) report("too-many-milestones", "", { where });
  if ((state.fundedAwards ?? []).length > 3) report("too-many-awards", "", { where });

  if (state.colonies) {
    for (const tile of Object.values(state.colonies.tiles)) {
      if (tile.colonies.length > 3) {
        report("colony-overfull", `${tile.id} has ${tile.colonies.length}`, { where });
      }
      if (new Set(tile.colonies).size !== tile.colonies.length) {
        // Research Colony and Space Port Colony explicitly allow a second
        // colony on a tile you already occupy, so a duplicate is only a bug
        // when neither of those cards is on the table.
        const duplicateAllowed = (state.players ?? []).some(player =>
          (player.playedProjects ?? []).some(id =>
            id === "card-colonies-research-colony" || id === "card-colonies-space-port-colony"
          )
        );
        if (!duplicateAllowed) report("duplicate-colony", `${tile.id}`, { where });
      }
      if (tile.trackPosition < 0 || tile.trackPosition > 6) {
        report("track-out-of-range", `${tile.id} = ${tile.trackPosition}`, { where });
      }
    }
  }
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

// Deterministic PRNG so a failing game can be replayed from its seed.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Research: 3 MC per card kept. Without this the player never has a hand and
// the whole game degenerates into passing.
const RESEARCH_CARD_COST = 3;

function buyResearchCards(state, playerId, rng, where) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.researchCards.length === 0) return;

  const affordable = Math.floor(player.mc / RESEARCH_CARD_COST);
  const wanted = Math.min(affordable, player.researchCards.length, 1 + Math.floor(rng() * 4));
  const bought = player.researchCards.slice(0, wanted);
  const passed = player.researchCards.slice(wanted);

  state.players = state.players.map(p =>
    p.id === playerId
      ? {
          ...p,
          mc: p.mc - bought.length * RESEARCH_CARD_COST,
          hand: [...p.hand, ...bought],
          researchCards: []
        }
      : p
  );
  state.discardPile = [...state.discardPile, ...passed];

  // BUY_RESEARCH is what moves a generation from research into action, and this
  // buys by hand, so the transition has to happen here too. Without it the
  // whole game ran in the research phase and every command was refused --
  // which is why no standard project was ever bought and the temperature
  // track never left -30.
  if (state.phase === "research" && state.players.every(p => (p.researchCards ?? []).length === 0)) {
    state.phase = "action";
    state.currentPlayerId = state.firstPlayerId ?? state.turnOrder[0];
    state.players = state.players.map(p => ({ ...p, actionsRemaining: 2, passed: false }));
  }
  checkInvariants(state, where);
}

function resolveAnyPending(state, logs, rng, where) {
  let current = { state, logs };
  let guard = 0;
  while (current.state.pendingChoice) {
    if (++guard > 60) {
      report("pending-choice-loop", `${current.state.pendingChoice.kind} never resolved`, { where });
      break;
    }
    const choice = current.state.pendingChoice;
    if (choice.options.length === 0) {
      report("pending-choice-no-options", `${choice.kind} offered nothing`, { where });
      current.state.pendingChoice = null;
      break;
    }
    const option = pick(choice.options, rng);
    const next = resolvePendingChoice(current.state, option.id, current.logs, choice.ownerPlayerId);
    if (next.state.pendingChoice === choice) {
      report("pending-choice-stuck", `${choice.kind} unchanged after resolve`, { where });
      break;
    }
    current = { state: next.state, logs: next.logs };
    checkInvariants(current.state, `${where}/resolve:${choice.kind}`);
  }
  return current;
}

function playGame(seed) {
  const rng = makeRng(seed);
  let state = getInitialState({
    playerCount: PLAYERS,
    board: BOARD,
    // Without this the deck shuffled itself and the seed only drove the move
    // picker, so a failing run could not be replayed from the seed it printed.
    seed,
    turmoil: USE_TURMOIL,
    colonies: USE_COLONIES,
    prelude: USE_PRELUDE,
    venus: USE_VENUS,
    promo: USE_PROMO,
    draft: USE_DRAFT
  });
  let logs = state.logs;
  const where = `seed:${seed}`;
  checkInvariants(state, `${where}/initial`);

  // Setup follows the real flow: the engine hands the seat between players, so
  // drive whoever it says is up rather than looping over the roster ourselves.
  let setupGuard = 0;
  // Setup is corporation, then the starting-hand purchase, then preludes, then
  // the corporation's first action -- each a separate step per player, and any
  // of them can raise a question. 40 was tight enough that a five-player game
  // with preludes ran out of iterations before it was done.
  while (state.phase === "setup" && setupGuard++ < 120) {
    // Preludes and corporation first actions can ask a question during setup --
    // Eccentric Sponsor and Valley Trust both do. Leaving it unanswered stalls
    // the whole setup, which read as "nothing left to choose".
    if (state.pendingChoice) {
      const choice = state.pendingChoice;
      const option = choice.options?.[Math.floor(rng() * choice.options.length)];
      if (!option) {
        report("setup-choice-empty", `${choice.kind} offered nothing`, { where });
        break;
      }
      const answered = resolvePendingChoice(state, option.id, state.logs, choice.ownerPlayerId);
      if (answered.state.pendingChoice === choice) {
        report("setup-choice-refused", `${choice.kind} would not resolve`, { where });
        break;
      }
      state = answered.state;
      checkInvariants(state, `${where}/setup-choice:${choice.kind}`);
      continue;
    }
    const seat = state.players.find(p => p.id === state.currentPlayerId);
    if (!seat) {
      report("setup-lost-seat", `${state.currentPlayerId} is not a player`, { where });
      break;
    }
    // Solo Colonies deals four tiles and keeps three; without answering this
    // the game would run with no colonies at all.
    if ((state.colonies?.offeredTileIds ?? []).length > 0) {
      const offered = [...state.colonies.offeredTileIds];
      const keep = [];
      while (keep.length < 3 && offered.length > 0) {
        keep.push(offered.splice(Math.floor(rng() * offered.length), 1)[0]);
      }
      const chosen = selectSoloColonies(state.colonies, keep);
      state = cloneGameState(state);
      state.colonies = chosen.colonies;
      checkInvariants(state, `${where}/solo-colonies`);
      continue;
    }
    // With drafting on the opening ten cards are passed around instead of
    // dealt, so nobody has a hand to buy from until every pick is in.
    if (state.draft) {
      let picks = 0;
      while (state.draft && picks++ < 200) {
        const holder = state.turnOrder.find(id => (state.draft.queues[id] ?? []).length > 0);
        if (holder === undefined) break;
        const queue = state.draft.queues[holder];
        const cardId = queue[Math.floor(rng() * queue.length)];
        const after = draftPick(state, cardId, holder);
        if (after === state) {
          report("draft-refused", `${holder} could not pick ${cardId}`, { where });
          break;
        }
        state = after;
        checkInvariants(state, `${where}/draft:${holder}`);
      }
      if (state.draft) report("draft-never-finished", `still drafting after ${picks} picks`, { where });
      continue;
    }
    // A corporation whose first action asks something -- Vitor's award,
    // Arcadian Communities' community -- parks setup on that question, and the
    // loop below has no other way past it.
    if (state.pendingChoice) {
      const resolved = resolveAnyPending(state, state.logs, rng, `${where}/setup-choice`);
      if (resolved.state === state) {
        report("setup-choice-stuck", `${state.pendingChoice.kind} blocked setup`, { where });
        break;
      }
      state = resolved.state;
      checkInvariants(state, `${where}/setup-choice`);
      continue;
    }
    if (seat.corporationOptions.length > 0) {
      const corporationId = pick(seat.corporationOptions, rng);
      state = applyCorporation(state, corporationId);
      checkInvariants(state, `${where}/corp:${corporationId}`);
      continue;
    }
    // setupStep stays "projects" after the purchase is done, so buying has to be
    // gated on there being something left to buy or the loop never advances.
    if ((seat.researchCards?.length ?? 0) > 0) {
      // Buy a random slice of the ten dealt cards, as a player would -- but the
      // starting hand is now bought before preludes are paid for, so spending
      // everything here can leave a cheap corporation unable to afford them.
      const preludeReserve = (seat.preludeOptions?.length ?? 0) >= 2
        ? seat.preludeOptions.slice(0, 2).reduce(
            (sum, id) => sum + getPreludeCost(PRELUDES.find(item => item.id === id) ?? {}),
            0
          )
        : 0;
      const spendable = Math.max(0, seat.mc - preludeReserve);
      const affordable = Math.min(seat.researchCards.length, Math.floor(spendable / 3));
      const count = affordable > 0 ? Math.floor(rng() * (affordable + 1)) : 0;
      const buying = seat.researchCards.slice(0, count);
      let bought = cloneGameState(state);
      bought.hand = [...(seat.hand ?? []), ...buying];
      bought.mc -= count * 3;
      state = completeSetupPurchase(bought);
      checkInvariants(state, `${where}/buy:${seat.id}:${count}`);
      continue;
    }
    if (seat.preludeOptions.length >= 2 && seat.selectedPreludeIds.length === 0) {
      // A player picks two they can pay for. Taking the first two regardless
      // meant the engine refused the pair and setup could not move on, which is
      // a bot that cannot count rather than a rule the engine got wrong.
      const affordablePair = (() => {
        const options = seat.preludeOptions;
        for (let i = 0; i < options.length; i++) {
          for (let j = i + 1; j < options.length; j++) {
            const cost = [options[i], options[j]].reduce(
              (sum, id) => sum + getPreludeCost(PRELUDES.find(item => item.id === id) ?? {}),
              0
            );
            if (cost <= seat.mc) return [options[i], options[j]];
          }
        }
        return options.slice(0, 2);
      })();
      state = applyPreludes(state, affordablePair);
      checkInvariants(state, `${where}/prelude:${seat.id}`);
      continue;
    }
    report("setup-stuck", `${seat.id} has nothing left to choose`, { where });
    break;
  }
  if (state.phase === "setup") {
    report("setup-never-finished", `phase still setup after ${setupGuard} steps`, { where });
    state.phase = "action";
  }
  for (const p of [...state.players]) {
    buyResearchCards(state, p.id, rng, `${where}/research`);
  }

  let steps = 0;
  while (!state.isGameOver && state.phase !== "game_over" && steps < MAX_STEPS) {
    steps += 1;
    const before = JSON.stringify({ gen: state.generation, phase: state.phase });

    const resolved = resolveAnyPending(state, logs, rng, where);
    state = resolved.state;
    logs = resolved.logs;

    // Drafting happens every generation, not only at setup. Only the setup
    // routine played the picks out, so with --draft every game sat in the
    // research phase from generation 2 onwards and ran to the generation cap
    // without ever terraforming -- 100% of drafted games, 0% of the others.
    if (state.draft) {
      let picks = 0;
      while (state.draft && picks++ < 200) {
        const holder = state.turnOrder.find(id => (state.draft.queues[id] ?? []).length > 0);
        if (holder === undefined) break;
        const queue = state.draft.queues[holder];
        const cardId = queue[Math.floor(rng() * queue.length)];
        const after = draftPick(state, cardId, holder);
        if (after === state) {
          report("draft-refused", `${holder} could not pick ${cardId}`, { where });
          break;
        }
        state = after;
        checkInvariants(state, `${where}/draft:gen${state.generation}:${holder}`);
      }
      if (state.draft) report("draft-never-finished", `still drafting after ${picks} picks`, { where });
      continue;
    }
    // The picks become each player's research hand, which they then buy from.
    if (state.phase === "research" && state.players.some(p => (p.researchCards ?? []).length > 0)) {
      for (const p of [...state.players]) buyResearchCards(state, p.id, rng, `${where}/research:gen${state.generation}`);
      continue;
    }

    // A multiplayer game takes longer than a solo one to terraform, and a bot
    // that plays at random longer still. Stopping at 40 meant the end game --
    // final greenery, scoring, the winner -- was never once reached.
    if (state.phase === "final_greenery") break;
    // Running out of generations is not a finished game. Saying nothing about it
    // and then scoring the unfinished state reported "完走" for a game that
    // never ended.
    if (state.generation > 80) {
      report(
        "generation-limit",
        `gen ${state.generation} with oceans=${state.oceans}/9 oxygen=${state.oxygen}/14 temp=${state.temperature}/8`,
        { where }
      );
      break;
    }

    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (!player) {
      report("missing-current-player", `${state.currentPlayerId}`, { where });
      break;
    }

    // Choose an action at random from what the engine says is legal.
    const moves = [];

    for (const cardId of player.hand) {
      const card = ALL_CARDS.find(c => c.id === cardId);
      if (!card) continue;
      const status = getCardPlayableStatus(card, state, 0, 0);
      const cost = getCardPaymentCost(card, state, 0, 0);
      if (status.playable && player.mc >= cost) moves.push({ kind: "play", card, cost });
    }

    for (const cardId of player.playedProjects) {
      const card = ALL_CARDS.find(c => c.id === cardId);
      if (!card) continue;
      if (getCardActionStatus(state, card).playable) moves.push({ kind: "action", card });
    }

    for (const milestone of MILESTONES) {
      if (getMilestoneStatus(state, milestone.id, player.id).claimable) {
        moves.push({ kind: "milestone", id: milestone.id });
      }
    }
    for (const award of AWARDS) {
      if (getAwardStatus(state, award.id, player.id).fundable) {
        moves.push({ kind: "award", id: award.id });
      }
    }
    if (state.turmoil) {
      for (const party of PARTIES) {
        if (state.turmoil.lobby.includes(player.id)) {
          moves.push({ kind: "delegate", id: party.id });
        }
      }
    }
    if (state.colonies) {
      for (const tileId of state.colonies.tilesInPlay) {
        if (canBuildColony(state.colonies, tileId, player.id).ok) {
          moves.push({ kind: "colony", id: tileId });
        }
        if (canTrade(state.colonies, tileId, player.id).ok) {
          moves.push({ kind: "trade", id: tileId });
        }
      }
    }

    // Standard projects were missing entirely, which is why a multiplayer game
    // never finished: nothing bought a temperature step, so the track sat near
    // -30 while the generations ran out. They go through the command layer,
    // which also exercises a path the rest of this loop skips.
    for (const projectId of ["asteroid", "aquifer", "greenery", "city", "power-plant"]) {
      const probe = executeGameCommand(cloneGameState(state), {
        type: COMMAND.STANDARD_PROJECT,
        playerId: player.id,
        projectId
      });
      if (probe.ok) moves.push({ kind: "standard", id: projectId });
    }

    if (moves.length === 0 || rng() < 0.25) {
      // Pass: end the generation.
      const produced = triggerProduction(state, logs);
      state = produced;
      logs = produced.logs;
      checkInvariants(state, `${where}/production:gen${state.generation}`);
      // A new generation deals research cards; buy some or the hand runs dry.
      for (const p of [...state.players]) {
        buyResearchCards(state, p.id, rng, `${where}/research:gen${state.generation}`);
      }
      continue;
    }

    // Terraforming moves are what end the game, so weight them: picking purely
    // at random left the temperature track barely moving. Once only one
    // parameter is short, aim at that one -- otherwise a base-only game can
    // spend twenty generations buying the two that are already finished.
    const wanted = new Set();
    if (state.oceans < 9) wanted.add("aquifer");
    if (state.oxygen < 14) wanted.add("greenery");
    if (state.temperature < 8) wanted.add("asteroid");
    const closing = moves.filter(entry => entry.kind === "standard" && wanted.has(entry.id));
    const terraforming = moves.filter(entry => entry.kind === "standard");
    const move = closing.length > 0 && rng() < 0.6
      ? pick(closing, rng)
      : terraforming.length > 0 && rng() < 0.5
        ? pick(terraforming, rng)
        : pick(moves, rng);
    try {
      if (move.kind === "standard") {
        const done = executeGameCommand(state, {
          type: COMMAND.STANDARD_PROJECT,
          playerId: player.id,
          projectId: move.id
        });
        if (done.ok) {
          state = done.state;
          logs = state.logs ?? logs;
        }
      } else if (move.kind === "play") {
        // Through the command a player uses, not by hand. Deducting the cost,
        // pulling the card from hand, applying its effect and only then adding
        // it to playedProjects is a different order from the real one -- a card
        // that counts its own tag reads short that way -- and none of the
        // command layer's own work happens at all.
        const played = executeGameCommand(state, {
          type: COMMAND.PLAY_CARD, playerId: player.id, cardId: move.card.id
        });
        if (!played?.ok) {
          report("play-refused", `${move.card.id}: ${played?.error ?? "no reason given"}`, { where });
        } else {
          state = played.state;
          logs = state.logs ?? logs;
        }
      } else if (move.kind === "action") {
        const used = executeGameCommand(state, {
          type: COMMAND.USE_CARD_ACTION, playerId: player.id, cardId: move.card.id, card: move.card
        });
        if (!used?.ok) {
          report("action-refused", `${move.card.id}: ${used?.error ?? "no reason given"}`, { where });
        } else {
          state = used.state;
          logs = state.logs ?? logs;
        }
      } else if (move.kind === "milestone") {
        const result = claimMilestone(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "award") {
        const result = fundAward(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "delegate") {
        const result = sendDelegateToParty(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "colony") {
        const result = buildColonyOn(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "trade") {
        const result = tradeWith(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      }
    } catch (error) {
      report("exception", `${move.kind} ${move.card?.name ?? move.id}: ${error.message}`, {
        where,
        stack: String(error.stack).split("\n").slice(0, 3).join(" | ")
      });
      break;
    }

    checkInvariants(state, `${where}/${move.kind}`);

    const spent = handleActionSpend(state, logs);
    state = spent;
    logs = spent.logs;

    if (JSON.stringify({ gen: state.generation, phase: state.phase }) === before && steps >= MAX_STEPS - 1) {
      report("no-progress", "state stopped advancing", { where });
    }
  }

  if (steps >= MAX_STEPS) report("step-limit", `hit ${MAX_STEPS} steps`, { where });

  // The final greenery phase, the scoring and the winner were never once run in
  // a multiplayer game: the loop broke out the moment the phase began. Drive it
  // to the end so those paths are exercised.
  // A player who hoarded plants converts a greenery for every eight of them, so
  // the ceiling is what everyone is holding rather than a flat number.
  const conversions = state.players.reduce((sum, p) => sum + Math.ceil((p.plants ?? 0) / 8), 0);
  const endLimit = conversions + state.players.length * 4;
  let endGuard = 0;
  while (state.phase === "final_greenery" && endGuard++ < endLimit) {
    const resolved = resolveAnyPending(state, logs, rng, `${where}/final-greenery`);
    state = resolved.state;
    logs = resolved.logs;
    if (state.phase !== "final_greenery") break;

    const seat = state.players.find(p => p.id === state.currentPlayerId);
    const converting = executeGameCommand(cloneGameState(state), {
      type: COMMAND.CONVERT_FINAL_GREENERY,
      playerId: seat?.id
    });
    // Convert while it is affordable, then hand the seat on.
    const next = converting.ok
      ? converting
      : executeGameCommand(state, { type: COMMAND.FINISH_FINAL_GREENERY, playerId: seat?.id });
    if (!next.ok) {
      report("final-greenery-stuck", `${seat?.id} could neither convert nor finish`, { where });
      break;
    }
    state = next.state;
    logs = state.logs ?? logs;
    checkInvariants(state, `${where}/final-greenery`);
  }
  if (state.phase === "final_greenery") {
    report("final-greenery-never-finished", `still converting after ${endGuard} of ${endLimit} steps`, { where });
  }

  const scores = state.players.map(p => ({ id: p.id, score: computeScore(state, p.id) }));
  for (const entry of scores) {
    if (!Number.isFinite(entry.score)) {
      const p = state.players.find(x => x.id === entry.id);
      const fields = ["tr","mc","steel","titanium","plants","energy","heat"]
        .map(f => `${f}=${p[f]}`).join(" ");
      const badRes = Object.entries(p.cardResources ?? {})
        .filter(([, v]) => !Number.isFinite(v)).map(([k, v]) => `${k}=${v}`);
      report("non-finite-score",
        `${entry.id} scored ${entry.score} | ${fields} | badCardResources=[${badRes.join(",")}] | played=${p.playedProjects.length}`,
        { where });
    }
  }

  return { generation: state.generation, steps, scores, phase: state.phase };
}

const summaries = [];
for (let i = 0; i < GAMES; i++) {
  const seed = Number(args.seed ?? 1) + i * 7919;
  try {
    summaries.push(playGame(seed));
  } catch (error) {
    report("harness-crash", error.message, {
      where: `seed:${seed}`,
      stack: String(error.stack).split("\n").slice(0, 4).join(" | ")
    });
  }
}

const mode = `${PLAYERS}人${USE_TURMOIL ? "+Turmoil" : ""}${USE_COLONIES ? "+Colonies" : ""}${USE_PRELUDE ? "+Prelude" : ""}${USE_VENUS ? "+Venus" : ""}${USE_PROMO ? "+Promo" : ""}${USE_DRAFT ? "+Draft" : ""}`;
console.log(`=== ${GAMES}ゲーム完走 (${mode}) ===`);
const gens = summaries.map(s => s.generation);
console.log(
  `世代: 最小${Math.min(...gens)} 最大${Math.max(...gens)} 平均${(gens.reduce((a, b) => a + b, 0) / gens.length).toFixed(1)}`
);
const allScores = summaries.flatMap(s => s.scores.map(x => x.score));
console.log(
  `得点: 最小${Math.min(...allScores)} 最大${Math.max(...allScores)} 平均${(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)}`
);

const grouped = new Map();
for (const issue of issues.filter(i => !i.benign)) {
  const key = issue.kind;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(issue);
}

const real = issues.filter(issue => !issue.benign);
const benign = issues.filter(issue => issue.benign);
if (benign.length > 0) {
  console.log(`\n(参考) ルール通りだが目を引く事象: ${benign.length}件`);
  const kinds = new Set(benign.map(issue => issue.kind));
  for (const kind of kinds) {
    console.log(`  ${kind}: ${benign.filter(i => i.kind === kind).length}件`);
  }
}

console.log(`\n=== 検出された問題: ${real.length}件 (${new Set(real.map(i => i.kind)).size}種類) ===`);
for (const [kind, list] of [...grouped].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${kind}] ${list.length}件`);
  for (const issue of list.slice(0, 4)) {
    console.log(`  ${issue.where ?? ""} ${issue.detail}`);
    if (issue.stack) console.log(`    ${issue.stack}`);
  }
}
if (real.length === 0) console.log("問題なし。");

// The seed now drives the deal as well as the move picker, so a failing game is
// replayable on its own. Print the command rather than making the reader work
// out which offset produced it.
if (real.length > 0) {
  const flags = [
    `--players=${PLAYERS}`,
    USE_PRELUDE ? "--prelude" : "",
    USE_VENUS ? "--venus" : "",
    USE_COLONIES ? "--colonies" : "",
    USE_TURMOIL ? "--turmoil" : "",
    USE_PROMO ? "--promo" : "",
    USE_DRAFT ? "--draft" : ""
  ].filter(Boolean).join(" ");
  const seeds = [...new Set(real.map(issue => String(issue.where ?? "").match(/seed:(\d+)/)?.[1]).filter(Boolean))];
  console.log("\n=== 再現方法 ===");
  for (const seed of seeds.slice(0, 5)) {
    console.log(`  node scripts/playtest.mjs --games=1 ${flags} --seed=${seed}`);
  }
}

process.exitCode = real.length > 0 ? 1 : 0;
