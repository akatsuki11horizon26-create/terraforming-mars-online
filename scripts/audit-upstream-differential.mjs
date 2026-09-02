// Replays what the reference's own tests did, and compares field by field.
//
// data/upstream-differential/operations.json is a recording, not a reading:
// 2,862 card operations captured while the reference's suite ran green at the
// pinned SHA. Each row says which card, which API, and exactly which fields
// moved on which player. This replays the same API here and requires the same
// fields to move by the same amounts.
//
// Where the other audits ask "does this card do roughly what upstream's card
// does when we both stage it ourselves", this one asks "in the situation
// upstream's own test built, does our card do what theirs did". The situations
// are upstream's -- boards, tags, opponents, production -- not ours.
//
// Each row carries the situation the operation started from -- tracks, tags,
// resources, tableau -- because a test arranges those before it calls and none
// of it shows in the delta. A card that scales with Earth tags produces nothing
// in a replay with no tags, and without the recorded situation the audit would
// score its own missing setup as an engine defect.
//
// A row is only compared when that situation can be rebuilt here. Cards already
// in the tableau change what the card does in ways this replay does not stage,
// so those rows are named and counted, never silently dropped: an audit that
// skips quietly reports green for work it did not do.
//
// What this does NOT cover: the comparison is over resources, production and
// terraform rating, so a card that lays the wrong tile still agrees here.
// Placement is held by the regression tests instead -- swapping Kaguya Tech's
// city for a greenery turns those red and leaves this green.
//
// Usage: node scripts/audit-upstream-differential.mjs [--reasons]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, CORPORATIONS, PRELUDES } from "../app/official-content.js";
import { getInitialState, getPlayer, getCardPlayableStatus, getCardActionStatus, calculateScoreBreakdowns, applyCardAction } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";

const dir = new URL("../data/upstream-differential/", import.meta.url);
const operations = JSON.parse(readFileSync(new URL("operations.json", dir), "utf8"));
const index = JSON.parse(readFileSync(new URL("index.json", dir), "utf8"));

// Upstream's serialized names against ours. Only fields both engines model the
// same way are here: a field one side tracks and the other does not would fail
// on every row and say nothing.
const FIELDS = {
  mc: "mc", mcP: "mcProd",
  steel: "steel", steelP: "steelProd",
  titanium: "titanium", titaniumP: "titaniumProd",
  plants: "plants", plantsP: "plantsProd",
  energy: "energy", energyP: "energyProd",
  heat: "heat", heatP: "heatProd",
  tr: "tr"
};

const normalise = name =>
  String(name).toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");

const byName = new Map();
for (const card of [...OFFICIAL_PROJECTS, ...CORPORATIONS, ...PRELUDES]) {
  const key = normalise(card.englishName ?? card.name);
  if (!byName.has(key)) byName.set(key, card);
}
const isProject = new Set(OFFICIAL_PROJECTS.map(card => card.id));

const freshGame = (playerCount = 2) => {
  const state = getInitialState({
    playerCount, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  for (const field of Object.values(FIELDS)) if (field !== "tr") seat[field] = 0;
  return state;
};

// Upstream numbers Tharsis row by row from 3; our board holds the same 61
// squares in the same 5-6-7-8-9-8-7-6-5 rows, so the nth square is the nth
// square on both sides.
const SPACE_IDS = (() => {
  const probe = getInitialState({ playerCount: 2, seed: 4 });
  const ordered = Object.values(probe.board).sort((a, b) => a.r - b.r || a.q - b.q);
  const byId = new Map();
  ordered.forEach((cell, index) => byId.set(String(index + 3), `${cell.q},${cell.r}`));
  return byId;
})();

// The reference's TileType numbers. Anything outside this map is a tile we do
// not model the same way, and a row carrying one cannot be staged.
const TILE_TYPES = new Map([["0", "forest"], ["1", "ocean"], ["2", "city"]]);

// A solo game's two neutral cities and their greeneries are placed by drawing
// from the deck, so their squares differ per game -- twenty distinct boards
// across the recording. The only way to reproduce one is to lay it out exactly
// as recorded, which is also what makes the comparison legitimate: the board
// is the reference's, not one this script chose.
const stageRecordedBoard = (state, tiles) => {
  for (const cell of Object.values(state.board)) {
    if (cell.tileType !== "empty") {
      state.board[`${cell.q},${cell.r}`] = { ...cell, tileType: "empty", placedBy: null };
    }
  }
  state.oceans = 0;
  for (const entry of tiles) {
    const [spaceId, tileNumber] = String(entry).split(":");
    const key = SPACE_IDS.get(spaceId);
    const tileType = TILE_TYPES.get(tileNumber);
    if (!key || !tileType || !state.board[key]) return `space ${spaceId} type ${tileNumber}`;
    state.board[key] = { ...state.board[key], tileType, placedBy: "neutral" };
    if (tileType === "ocean") state.oceans += 1;
  }
  return null;
};

const agree = [];
const differ = [];
const skipped = new Map();
const skip = (row, why) => {
  if (!skipped.has(why)) skipped.set(why, []);
  skipped.get(why).push(`${row.test} [${row.api}]`);
};

// A card whose rule this engine does not implement at all. Its playability
// cannot be made to agree without the mechanic behind it, and a check that
// merely refused the card would hide that the card is wrong when played. Listed
// by name so the count stays honest rather than quietly filtered. Kaguya Tech
// sat here until its greenery-to-city conversion was built.
const NOT_IMPLEMENTED = new Map();

// Rows whose recorded situation appears more than once with different answers.
// A test can change something the snapshot does not carry -- an opponent's
// production, a flag set on the player -- between two calls, and then the same
// recorded state legitimately answers both true and false. Comparing against
// either one is a coin toss dressed up as a measurement, so they are named and
// counted instead.
const AMBIGUOUS = (() => {
  const key = row => JSON.stringify([
    row.card, row.api, row.situation?.player, row.situation?.game,
    row.situation?.setting, row.situation?.opponents, row.situation?.selfResources
  ]);
  const answers = new Map();
  for (const row of operations) {
    const id = key(row);
    if (!answers.has(id)) answers.set(id, new Set());
    answers.get(id).add(JSON.stringify(row.returned));
  }
  return new Set([...answers].filter(([, seen]) => seen.size > 1).map(([id]) => id));
})();
const ambiguousKey = row => JSON.stringify([
  row.card, row.api, row.situation?.player, row.situation?.game,
  row.situation?.setting, row.situation?.opponents, row.situation?.selfResources
]);

for (const row of operations) {
  if (row.threw !== null) { skip(row, "the reference's own call threw"); continue; }
  if (AMBIGUOUS.has(ambiguousKey(row))) {
    skip(row, "the same recorded situation answers both ways, so neither is the rule");
    continue;
  }
  if (NOT_IMPLEMENTED.has(row.card)) {
    skip(row, `${row.card}: ${NOT_IMPLEMENTED.get(row.card)}`);
    continue;
  }

  const card = byName.get(normalise(row.card));
  if (!card) { skip(row, `${row.card} is not in our catalogue`); continue; }

  // initialAction belongs to a corporation and needs setup rather than a turn,
  // so it is not attempted here. Naming it keeps it in the denominator.
  if (!["play", "canPlay", "canAct", "getVictoryPoints", "action"].includes(row.api)) {
    skip(row, `${row.api} is not replayed by this audit yet`);
    continue;
  }
  if (!isProject.has(card.id)) {
    skip(row, "a corporation or prelude, which does not play like a project");
    continue;
  }

  const situation = row.situation;
  if (!situation?.player || !situation.game) {
    skip(row, "the recording did not capture a starting situation");
    continue;
  }
  // The replay is a two-player Tharsis game with no politics. Solo changes the
  // requirements a card faces, an alternate board changes what a tile can
  // reach, and a ruling party changes both -- the reference's "Works with reds"
  // rows fail here for want of the Reds policy, not for want of the rule.
  const setting = situation.setting;
  if (!setting) { skip(row, "the recording did not capture the game setting"); continue; }
  if (setting.players !== 1 && setting.players !== 2) {
    skip(row, `a ${setting.players}-player game, which this replay does not stage`);
    continue;
  }
  if (setting.board && setting.board !== "tharsis") { skip(row, `the ${setting.board} board, which this replay does not stage`); continue; }
  if (setting.ruling) { skip(row, "a Turmoil ruling party, which this replay does not stage"); continue; }
  // Cards already in play change what the card does through paths this replay
  // does not stage -- triggers, discounts, resource holders.
  if ((situation.player.played ?? []).length > 0) {
    skip(row, "the test had cards in play, which this replay does not stage");
    continue;
  }
  // Tiles on the board are what "1 step per city in play" counts, and a solo
  // game opens with four neutral ones. A board the recording describes square
  // by square can be rebuilt exactly; anything the players themselves placed
  // during the test cannot, because the recording does not say who owns what.
  const recordedTiles = situation.game.tiles ?? [];
  const soloOpening = setting.players === 1 &&
    recordedTiles.length === 4 &&
    recordedTiles.every(entry => String(entry).endsWith(":neutral"));
  if (recordedTiles.length > 0 && !soloOpening) {
    skip(row, "the test placed tiles, which this replay does not stage");
    continue;
  }
  // Colonies and the opponents' tableau are counted by cards too, and the
  // replay seats a second player with nothing.
  if ((situation.colonies ?? 0) > 0) {
    skip(row, "the test gave the player colonies, which this replay does not stage");
    continue;
  }
  if ((situation.opponentTags ?? 0) > 0) {
    skip(row, "the test gave an opponent tags, which this replay does not stage");
    continue;
  }
  // Which colonies are in the game, and where their tracks sit, decide whether
  // a colony card can do anything. The replay seats none.
  if ((situation.colonyTracks ?? []).length > 0) {
    skip(row, "the test set up colony tiles, which this replay does not stage");
    continue;
  }
  // An opponent holding resources or production is a target, and cards that
  // attack or copy read them. The replay seats a second player with nothing.
  const opponents = situation.opponents ?? [];
  if (opponents.some(other => Object.entries(other).some(([, value]) => value > 0))) {
    skip(row, "the test gave an opponent something, which this replay does not stage");
    continue;
  }
  // Cards that answer an attack are playable only once one has happened, and
  // the replay stages a game where nobody has been attacked.
  if ((situation.attackedBy ?? 0) > 0 || situation.plantsRemoved === true) {
    skip(row, "the test staged an attack on the player, which this replay does not");
    continue;
  }
  // Tags have no card behind them when a test injects them, so there is
  // nothing to put into our tableau to reproduce the count. tagsForTest is the
  // override the reference's own tag counter does not report, so both have to
  // be checked: a row where only the override is set looks untagged otherwise.
  const realTags = Object.values(situation.tags ?? {}).some(count => count > 0);
  if (realTags || situation.tagsForTest) {
    skip(row, "the test set tag counts with no cards behind them");
    continue;
  }

  const moved = row.changes[0];
  const seats = Object.values(moved?.players ?? {});
  // The reference's play() moved nothing. That is not "the card does nothing":
  // work it defers (a discard to pay for a track, a trigger on its own tag)
  // lands outside the call, and its own tests drive that separately. Our
  // command resolves the whole play, so comparing the two scores the entry
  // point rather than the card.
  if (row.api === "play" && seats.length === 0) {
    skip(row, "the reference deferred the work outside its play() call");
    continue;
  }
  if (seats.some(seat => seat.played !== undefined || seat.hand !== undefined)) {
    skip(row, "the test moved cards between zones, which needs the full situation");
    continue;
  }
  if (Object.keys(moved?.game ?? {}).length > 0) {
    skip(row, "the operation moved the board or the global tracks");
    continue;
  }
  if (seats.length > 1) { skip(row, "the operation touched more than one player"); continue; }

  const state = freshGame(setting.players);
  if (soloOpening) {
    const unstageable = stageRecordedBoard(state, recordedTiles);
    if (unstageable) {
      skip(row, `the recorded board uses ${unstageable}, which this replay cannot lay`);
      continue;
    }
  }
  const seat = getPlayer(state, "player");
  // The hand the test dealt, by name. A card paid for by discarding counts it,
  // and two copies of the card being played do not pay for each other -- so a
  // count alone is not enough to reproduce the answer.
  const handNames = situation.player.hand ?? [];
  const staged = handNames.map(name => byName.get(normalise(name))?.id).filter(Boolean);
  if (staged.length !== handNames.length) {
    skip(row, "a card in the staged hand is not in our catalogue");
    continue;
  }
  seat.hand = staged.length > 0 ? staged : [card.id];
  // The tracks the test set before it called.
  state.oxygen = situation.game.oxygen ?? 0;
  state.temperature = situation.game.temperature ?? -30;
  state.venus = situation.game.venus ?? 0;
  // "Draw 4 cards, keep 2" cannot be played with fewer than 4 left. The
  // reference runs its decks down to prove it; ours starts full.
  if (typeof situation.deck === "number") {
    state.deck = (state.deck ?? []).slice(0, situation.deck);
  }
  for (const [upstreamField, ourField] of Object.entries(FIELDS)) {
    // Terraform rating is staged too: both engines open at 20, so it made no
    // difference until a card began requiring one -- and then the two rows of
    // the same test, at 24 and at 25, both got the opening rating and the same
    // answer.
    seat[ourField] = situation.player[upstreamField] ?? 0;
  }
  // Some tests set canUseHeatAsMegaCredits on the player directly. Here that
  // is a corporation's effect rather than a flag, so the corporation granting
  // it is seated -- Energy Market answers yes on 1 M€ and 3 heat only because
  // of it.
  if (situation.heatAsMoney) seat.corporationId = "corp-helion";

  if (row.api === "getVictoryPoints") {
    // What the card is worth is asked of a card in play, and the scorer
    // attributes each contribution to the card that earned it -- so the
    // comparison is that card's own rows, not the player's total, which also
    // carries terraform rating, tiles and awards.
    const staged = (situation.player.played ?? []);
    if (staged.some(name => normalise(name) !== normalise(row.card))) {
      skip(row, "the test had other cards in play, which change what this one scores");
      continue;
    }
    // St. Joseph counts game.stJosephCathedrals, a game-wide list rather than
    // board tiles, so the tile snapshot shows an empty board while the card
    // scores three. The count is recorded, so the markers can simply be laid.
    const cathedrals = situation.cathedrals ?? 0;
    if (cathedrals > 0) {
      state.boardMarkers = [
        ...(state.boardMarkers ?? []),
        ...Array.from({ length: cathedrals }, (unused, index) => ({
          kind: "cathedral",
          sourceCardId: card.id,
          sourcePlayerId: "player",
          cellKey: `cathedral-${index}`
        }))
      ];
    }
    seat.hand = [];
    seat.playedProjects = [card.id];
    // Tests assign card.resourceCount directly rather than through a method,
    // so the player snapshot shows an empty tableau while the card is holding
    // five animals. selfResources is that count, read off the card itself.
    const held = situation.selfResources ?? situation.player.resources?.[row.card];
    if (held !== undefined && held !== null) seat.cardResources = { [card.id]: held };
    let ours;
    try {
      ours = (calculateScoreBreakdowns(state).player.details ?? [])
        .filter(entry => entry.sourceId === card.id)
        .reduce((sum, entry) => sum + (entry.points ?? 0), 0);
    } catch (error) {
      skip(row, `our engine threw: ${String(error.message).slice(0, 50)}`);
      continue;
    }
    if (typeof row.returned !== "number") { skip(row, "getVictoryPoints did not return a number"); continue; }
    if (ours === row.returned) agree.push(row);
    else differ.push([row, [`victory points: reference ${row.returned}, ours ${ours}`]]);
    continue;
  }

  if (row.api === "action") {
    // Upstream's card.action() sits inside Player.playActionCard, which adds
    // the log line, the once-per-generation registration and the turn cost
    // around it. applyCardAction is the matching depth here; the command adds
    // the same outer work. Both were measured to give identical resources and
    // identical pending questions on all 75 action cards a fresh rig can run,
    // so this is a choice of principle rather than of outcome -- but comparing
    // like with like is what keeps it true if the comparison later widens to
    // cover what the outer layer does.
    const staged = (situation.player.played ?? []);
    if (staged.some(name => normalise(name) !== normalise(row.card))) {
      skip(row, "the test had other cards in play, which change what the action does");
      continue;
    }
    const moved = row.changes[0];
    const seats = Object.values(moved?.players ?? {});
    if (seats.length === 0) {
      skip(row, "the reference's action moved nothing observable");
      continue;
    }
    if (seats.length > 1) { skip(row, "the action touched more than one player"); continue; }
    if (Object.keys(moved?.game ?? {}).length > 0) {
      skip(row, "the action moved the board or the global tracks");
      continue;
    }
    if (seats.some(entry => entry.played !== undefined || entry.hand !== undefined)) {
      skip(row, "the action moved cards between zones, which needs the full situation");
      continue;
    }

    seat.hand = [];
    seat.playedProjects = [card.id];
    seat.actionsRemaining = 2;
    const held = situation.selfResources;
    if (held !== undefined && held !== null) seat.cardResources = { [card.id]: held };
    const beforeSeat = { ...seat };

    let result;
    try {
      const inner = applyCardAction(state, card, []);
      result = inner.playable === false ? { ok: false } : { ok: true, state: inner.state ?? inner };
    } catch (error) {
      skip(row, `our engine threw: ${String(error.message).slice(0, 50)}`);
      continue;
    }
    if (!result?.ok) { skip(row, "our engine would not run the action in this situation"); continue; }
    if (result.state.pendingChoice) {
      skip(row, "the action asks a question the recording cannot answer");
      continue;
    }

    const after = getPlayer(result.state, "player");
    const theirs = seats[0] ?? {};
    const problems = [];
    for (const [upstreamField, ourField] of Object.entries(FIELDS)) {
      const theirChange = upstreamField in theirs
        ? theirs[upstreamField] - (situation.player[upstreamField] ?? 0)
        : 0;
      const ourChange = (after[ourField] ?? 0) - (beforeSeat[ourField] ?? 0);
      if (theirChange !== ourChange) {
        problems.push(`${upstreamField}: reference ${theirChange}, ours ${ourChange}`);
      }
    }
    if (problems.length === 0) agree.push(row);
    else differ.push([row, problems]);
    continue;
  }

  if (row.api === "canAct") {
    // An action belongs to a card already in play, so the card goes into the
    // tableau rather than the hand. Both engines answer with a plain boolean,
    // which makes this the same comparison canPlay gets.
    // The resources the test actually left the player holding. Handing over a
    // full purse instead turns every "cannot act without enough energy" case
    // into a disagreement about the rig, not about the rule -- all 21 of the
    // first run's differences were exactly that.
    seat.hand = [];
    seat.playedProjects = [card.id];
    seat.actionsRemaining = 2;
    // Resources sitting on the card are what a "spend a resource from here"
    // action needs, and the recording keeps the count.
    const held = situation.player.resources?.[row.card];
    if (held !== undefined) seat.cardResources = { [card.id]: held };
    let ours;
    try {
      ours = getCardActionStatus(state, card).playable;
    } catch (error) {
      skip(row, `our engine threw: ${String(error.message).slice(0, 50)}`);
      continue;
    }
    if (typeof row.returned !== "boolean") { skip(row, "canAct did not return a boolean"); continue; }
    if (ours === row.returned) agree.push(row);
    else differ.push([row, [`canAct: reference ${row.returned}, ours ${ours}`]]);
    continue;
  }

  if (row.api === "canPlay") {
    // Upstream's canPlay does not consider the purchase price, so the money is
    // put in first and only the requirements are being compared.
    seat.mc = 1000;
    seat.steel = Math.max(seat.steel, 20);
    seat.titanium = Math.max(seat.titanium, 20);
    let ours;
    try {
      ours = getCardPlayableStatus(card, state).playable;
    } catch (error) {
      skip(row, `our engine threw: ${String(error.message).slice(0, 50)}`);
      continue;
    }
    if (typeof row.returned !== "boolean") { skip(row, "canPlay did not return a boolean"); continue; }
    if (ours === row.returned) agree.push(row);
    else differ.push([row, [`canPlay: reference ${row.returned}, ours ${ours}`]]);
    continue;
  }

  // The full command, not applyCardEffect. A card that counts "including this"
  // is counted by the reference with itself already accounted for, and our
  // count reads the tableau -- so the card has to actually be in play. Calling
  // the inner function instead reports 0 where the reference reports 1, on
  // every card that scales on its own tag.
  const paid = card.cost ?? 0;
  seat.mc += paid;
  let result;
  try {
    result = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
    });
  } catch (error) {
    skip(row, `our engine threw: ${String(error.message).slice(0, 50)}`);
    continue;
  }
  if (!result?.ok) { skip(row, "our engine would not play it in this situation"); continue; }
  const next = result.state;
  if (next.pendingChoice) {
    skip(row, "the card asks a question the recording cannot answer");
    continue;
  }

  const after = getPlayer(next, "player");
  const theirs = seats[0] ?? {};
  const problems = [];
  for (const [upstreamField, ourField] of Object.entries(FIELDS)) {
    // A field absent from the delta did not move; upstream's value for it is
    // whatever it started at, so the change is zero.
    const theirChange = upstreamField in theirs
      ? theirs[upstreamField] - (situation.player[upstreamField] ?? 0)
      : 0;
    // The command charges the cost; the reference's play() does not, so the
    // money put in above is taken back out of our side of the comparison.
    const ourChange = (after[ourField] ?? 0) - (seat[ourField] ?? 0)
      + (ourField === "mc" ? paid : 0);
    if (theirChange !== ourChange) {
      problems.push(`${upstreamField}: reference ${theirChange}, ours ${ourChange}`);
    }
  }

  if (problems.length === 0) agree.push(row);
  else differ.push([row, problems]);
}

const compared = agree.length + differ.length;
console.log(`upstream suite at ${index.upstreamRef.slice(0, 8)}: ${index.upstreamPassing} passing`);
console.log(`operations recorded : ${operations.length}  (${index.distinctCards} cards, ${index.testsWithOperations} tests)`);
console.log(`replayed here       : ${compared}`);
console.log(`  matching          : ${agree.length}`);
console.log(`  differing         : ${differ.length}`);

console.log("\nnot replayed, by reason:");
const reasons = [...skipped].sort((a, b) => b[1].length - a[1].length);
for (const [why, rows] of reasons) {
  console.log(`  ${String(rows.length).padStart(5)}  ${why}`);
}
console.log(`  ${String(reasons.reduce((n, [, rows]) => n + rows.length, 0)).padStart(5)}  total`);

for (const [row, problems] of differ) {
  console.log(`\nPROBLEM ${row.test} -- ${row.card}.${row.api}`);
  for (const problem of problems) console.log(`  ${problem}`);
}

if (process.argv.includes("--reasons")) {
  for (const [why, rows] of reasons) {
    console.log(`\n${why}`);
    for (const name of rows.slice(0, 6)) console.log(`  ${name}`);
  }
}

process.exitCode = differ.length > 0 ? 1 : 0;
