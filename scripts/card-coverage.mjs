// Plays every card in the catalogue and reports any that produce no observable
// change. Requirement gates are opened by running each card against several
// rigs: parameter corners for the min/max requirements, and one rig per party
// for the Turmoil ones. A card that changes nothing here is either unimplemented
// or only has a passive effect the snapshot cannot see -- check before believing
// it. Preludes and corporations are covered too, through their own entry points.
//
// Usage:
//   node scripts/card-coverage.mjs [--verbose]
import { getInitialState, getPlayer, getCardPlayableStatus, getCardResourceType, applyPreludes, applyCorporation, advanceSetupTurn } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { PRELUDES, CORPORATIONS, OFFICIAL_PROJECTS } from "../app/official-content.js";
import { NEUTRAL } from "../app/turmoil.js";

const PARTY_IDS = ["greens", "mars", "kelvinists", "reds", "scientists", "unity"];

// A board rich enough that every requirement in the catalogue can be met by one
// of the parameter corners: cities and greeneries down, colonies built, floaters
// and microbes on cards, delegates in every party, chairmanship held.
function rig({ oceans, oxygen, temperature, venus, party, noColonies, neutralTurmoil }) {
  const s = getInitialState({ playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 1 });
  s.phase = "action";
  s.currentPlayerId = "player";
  s.oceans = oceans; s.oxygen = oxygen; s.temperature = temperature; s.venus = venus;

  const cells = Object.keys(s.board);
  let i = 0;
  const stamp = (type, n, owner = "player") => {
    for (let k = 0; k < n; k++) { const key = cells[i++]; s.board[key] = { ...s.board[key], tileType: type, placedBy: owner }; }
  };
  stamp("city", 5);
  stamp("forest", 5);
  stamp("city", 2, "player2");

  const p = getPlayer(s, "player");
  p.mc = 400; p.steel = 40; p.titanium = 40; p.plants = 40; p.energy = 40; p.heat = 40;
  p.mcProd = 10; p.steelProd = 10; p.titaniumProd = 10; p.plantsProd = 10; p.energyProd = 10; p.heatProd = 10;
  p.tr = 40;

  // A tableau covering every tag, plus cards that physically hold each resource
  // type so "a card with floaters/microbes/animals" requirements are satisfied.
  const tagged = OFFICIAL_PROJECTS.filter(c => c.tags.length && c.type !== "event").slice(0, 80).map(c => c.id);
  const holders = OFFICIAL_PROJECTS.filter(c => getCardResourceType(c.id)).map(c => c.id);
  p.playedProjects = [...new Set([...tagged, ...holders])];
  p.cardResources = Object.fromEntries(holders.map(id => [id, 5]));

  // Colonies: put the player on three tiles so "you have a colony" passes.
  // Pioneer Settlement wants the opposite -- "no more than 1 colony" -- so one
  // rig leaves the tiles open and owns none of them.
  if (s.colonies) {
    const tiles = Object.keys(s.colonies.tiles).slice(0, 3);
    for (const id of tiles) {
      s.colonies.tiles[id] = {
        ...s.colonies.tiles[id],
        active: true,
        trackPosition: 3,
        colonies: noColonies ? [] : ["player"]
      };
      if (!s.colonies.tilesInPlay.includes(id)) s.colonies.tilesInPlay = [...s.colonies.tilesInPlay, id];
    }
  }

  // Turmoil: chairman, party leader, and two delegates in every party, with the
  // named one ruling so each "requires X ruling" card opens in some rig.
  if (s.turmoil) {
    // Two cards want the opposite of a board the player already controls:
    // Recruitment needs a neutral delegate to swap out, and Vote Of No
    // Confidence needs a neutral chairman to unseat. One rig leaves both.
    s.turmoil.chairman = neutralTurmoil ? NEUTRAL : "player";
    for (const id of PARTY_IDS) {
      s.turmoil.parties[id] = neutralTurmoil
        ? { delegates: ["player", NEUTRAL, NEUTRAL], leader: "player" }
        : { delegates: ["player", "player"], leader: "player" };
    }
    s.turmoil.delegateReserve = { ...s.turmoil.delegateReserve, player: 5 };
    s.turmoil.dominantParty = party;
    s.turmoil.rulingParty = party;
  }

  // Law Suit answers an attack from this generation.
  s.generationAttackLedger = [
    { attackerPlayerId: "player2", victimPlayerId: "player", generation: s.generation, amount: 3 },
    { attackerPlayerId: "player2", victimPlayerId: "player", generation: s.generation, resource: "plants", amount: 3 }
  ];
  return s;
}

const RIGS = [];
for (const party of PARTY_IDS) {
  RIGS.push({ oceans: 5, oxygen: 7, temperature: -8, venus: 12, party });
}
RIGS.push({ oceans: 0, oxygen: 0, temperature: -30, venus: 0, party: "greens" });
RIGS.push({ oceans: 9, oxygen: 14, temperature: 8, venus: 30, party: "greens" });
RIGS.push({ oceans: 0, oxygen: 14, temperature: 8, venus: 0, party: "greens" });
RIGS.push({ oceans: 9, oxygen: 0, temperature: -30, venus: 30, party: "greens" });
RIGS.push({ oceans: 5, oxygen: 7, temperature: -8, venus: 12, party: "greens", noColonies: true });
RIGS.push({ oceans: 5, oxygen: 7, temperature: -8, venus: 12, party: "greens", neutralTurmoil: true });

// `mc` moves whenever a card is paid for, and the corporation setup always
// writes a corporation id and a setup step. Counting those as "the card did
// something" is what let four corporations lose their whole starting
// production, and Vitor and Valley Trust skip their abilities, while this
// script still reported 547/547. `omit` drops the fields that move for reasons
// that have nothing to do with the card's own text.
const snap = (st, omit = {}) => { const q = getPlayer(st, "player"); return JSON.stringify([
  st.oceans, st.oxygen, st.temperature, st.venus,
  omit.mc ? null : q.mc, q.steel, q.titanium, q.plants, q.energy, q.heat, q.tr,
  q.mcProd, q.steelProd, q.titaniumProd, q.plantsProd, q.energyProd, q.heatProd,
  Object.values(st.board).filter(c => c.tileType !== "empty").length,
  // The rig plays the only card in hand, so "draw one card" lands back at a
  // hand of one and looked like nothing. Track which cards are held, not how
  // many, and the draw is visible again.
  JSON.stringify(q.cardResources ?? {}), JSON.stringify([...(q.hand ?? [])].sort()),
  Boolean(st.pendingChoice),
  JSON.stringify(st.colonies?.tiles ?? null), JSON.stringify(st.turmoil?.parties ?? null),
  // Corporations are chosen during setup, where what moves is the seat's
  // corporation and setup step rather than any resource.
  omit.seat ? null : q.corporationId ?? null,
  omit.seat ? null : q.setupStep ?? null,
  (q.researchCards ?? []).length]); };

const worked = [], nothing = [], gated = [], threw = [];
for (const card of OFFICIAL_PROJECTS) {
  let verdict = null, lastReason = null;
  for (const cfg of RIGS) {
    const s = rig(cfg);
    const p = getPlayer(s, "player");
    p.playedProjects = p.playedProjects.filter(id => id !== card.id);
    p.hand = [card.id];
    const status = getCardPlayableStatus(card, s);
    if (!status.playable) { lastReason = status.reason; continue; }
    const before = snap(s, { mc: true });
    let r;
    try { r = executeGameCommand(s, { type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id }); }
    catch (e) { verdict = ["threw", e.message.slice(0, 50)]; break; }
    if (!r.ok) { lastReason = "refused: " + (r.message ?? ""); continue; }
    verdict = before === snap(r.state, { mc: true }) ? ["nothing", ""] : ["worked", ""];
    if (verdict[0] === "worked") break;
  }
  if (!verdict) gated.push([card, lastReason]);
  else if (verdict[0] === "worked") worked.push(card);
  else if (verdict[0] === "nothing") nothing.push(card);
  else threw.push([card, verdict[1]]);
}
// Preludes resolve two at a time during setup, corporations through their own
// entry point, so neither goes through PLAY_CARD.
// A prelude with no declared behaviour cannot mask its partner's inaction.
const isInert = card => {
  const behavior = card.effectSpec?.behavior;
  return !behavior || Object.keys(behavior).length === 0;
};

const preludeResults = { worked: 0, bad: [] };
for (const prelude of PRELUDES) {
  // The partner's own effect used to be enough to call the pair "worked", so a
  // prelude that did nothing passed as long as it was dealt alongside one that
  // did. Pair every card with the same inert partner and the change that shows
  // up is the card's own.
  const partner = PRELUDES.find(item => item.id !== prelude.id && isInert(item));
  const s2 = getInitialState({ playerCount: 2, prelude: true, venus: true, colonies: true, turmoil: true, promo: true, seed: 1 });
  s2.phase = "setup";
  s2.currentPlayerId = "player";
  const p2 = getPlayer(s2, "player");
  p2.setupStep = "prelude";
  p2.preludeOptions = [prelude.id, partner.id];
  p2.mc = 200;
  const before = snap(s2);
  let after;
  try { after = applyPreludes(s2, [prelude.id, partner.id], "player"); }
  catch (e) { preludeResults.bad.push([prelude.id, "threw " + e.message.slice(0, 40)]); continue; }
  if (after === s2) { preludeResults.bad.push([prelude.id, "refused"]); continue; }
  if (before === snap(after)) preludeResults.bad.push([prelude.id, "nothing happened"]);
  else preludeResults.worked++;
}

const corpResults = { worked: 0, bad: [] };
for (const corporation of CORPORATIONS) {
  // One seat, so choosing this corporation is the last thing setup is waiting
  // for and its first action actually runs.
  const s2 = getInitialState({ playerCount: 1, venus: true, colonies: true, turmoil: true, promo: true, seed: 1 });
  s2.phase = "setup";
  s2.currentPlayerId = "player";
  getPlayer(s2, "player").corporationOptions = [corporation.id];
  const before = snap(s2, { seat: true });
  let after;
  // Several corporations do all their work in the first action -- Celestic draws
  // its floater cards there, Tharsis Republic places its city -- so choosing the
  // corporation alone is not the whole card.
  try {
    const chosen = applyCorporation(s2, corporation.id, "player");
    after = chosen.pendingChoice ? chosen : advanceSetupTurn(chosen);
  }
  catch (e) { corpResults.bad.push([corporation.id, "threw " + e.message.slice(0, 40)]); continue; }
  if (before === snap(after, { seat: true })) corpResults.bad.push([corporation.id, "nothing happened"]);
  else corpResults.worked++;
}

const broken = nothing.length + threw.length + gated.length + preludeResults.bad.length + corpResults.bad.length;
console.log(`projects     : ${worked.length}/${OFFICIAL_PROJECTS.length}`);
console.log(`preludes     : ${preludeResults.worked}/${PRELUDES.length}`);
console.log(`corporations : ${corpResults.worked}/${CORPORATIONS.length}`);
console.log(`total        : ${worked.length + preludeResults.worked + corpResults.worked}/${OFFICIAL_PROJECTS.length + PRELUDES.length + CORPORATIONS.length}`);
if (nothing.length) {
  console.log("\n=== played but nothing happened ===");
  for (const c of nothing) console.log(`  ${c.id.padEnd(44)} ${(c.effectText ?? "").slice(0, 56)}`);
}
if (threw.length) {
  console.log("\n=== threw ===");
  for (const [c, m] of threw) console.log(`  ${c.id.padEnd(44)} ${m}`);
}
if (gated.length) {
  console.log("\n=== never playable in any rig ===");
  for (const [c, r] of gated) console.log(`  ${c.id.padEnd(44)} ${String(r).slice(0, 48)}`);
}
for (const [id, why] of [...preludeResults.bad, ...corpResults.bad]) console.log(`  ${id.padEnd(44)} ${why}`);

process.exitCode = broken > 0 ? 1 : 0;
