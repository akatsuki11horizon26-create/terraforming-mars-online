// Checks that a card scores the number of points its spec declares, at the
// boundaries where an off-by-one shows.
//
// The other audits watch what a card does when it is played. A scoring card
// does nothing when played -- it does its work once, at the end, and a scorer
// that rounds the wrong way or reads the wrong owner's pile is invisible until
// someone counts the final score by hand.
//
// Every card is measured at 0, per-1, per and per+1 of whatever it counts.
// Those four are where the arithmetic goes wrong: a scorer that rounds up
// instead of down agrees with one that rounds down at every exact multiple, and
// the existing Space Port Colony test checked only exact multiples.
//
// The expected number is computed here from the raw victoryPointSpec, never by
// calling the scorer. An oracle that shares the implementation agrees with it
// about being wrong -- which is how the tag-counting bug survived until the
// contract audit stopped using getCardEffect.
//
// Usage: node scripts/audit-card-scoring.mjs [--list]
import { getInitialState, getPlayer, calculateScoreBreakdowns } from "../app/game-logic.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";
import { ALL_CARDS } from "../app/game-logic.js";

const rig = () => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
    player.playedProjects = [];
    player.playedEvents = [];
    player.selectedPreludeIds = [];
    player.cardResources = {};
  }
  return state;
};

// Where the card sits when it is in play. A corporation is not a project and a
// prelude is not either, and putting one in the wrong list scores it zero -- the
// exact bug this audit exists to catch, so it must not repeat it here.
const seatCard = (state, card, kind) => {
  const seat = getPlayer(state, "player");
  if (kind === "corporation") seat.corporationId = card.id;
  else if (kind === "prelude") seat.selectedPreludeIds = [card.id];
  else if (card.type === "event") seat.playedEvents = [card.id];
  else seat.playedProjects = [card.id];
};

// What the spec says the card is worth for a given count, worked out from the
// spec's own words rather than by asking the scorer.
const expectedFor = (spec, count) =>
  spec.per ? Math.floor(count / spec.per) : count * (spec.each ?? 1);

// A "per tag" card counts the tags it carries itself. Ganymede Colony scores
// one point before any other Jovian card is in play, because it is one.
const ownTags = (card, spec) =>
  spec.tag
    ? (card.tags ?? []).filter(
        tag => String(tag).toLowerCase() === String(spec.tag).toLowerCase()
      ).length
    : 0;

// The counts worth measuring: nothing, one short of a payout, exactly a payout,
// and one past it. A scorer that rounds the wrong way survives every exact
// multiple and dies at per-1.
const boundaries = spec => {
  const per = spec.per ?? 1;
  return [...new Set([0, Math.max(0, per - 1), per, per + 1])];
};

// Puts `count` of whatever a card counts in front of it. Each driver owns one
// spec shape; a shape with no driver is named in the skipped list rather than
// quietly passing. `all` shapes deliberately put half the count on the opponent,
// because that is the reading Space Port Colony got wrong and no test caught:
// the flag says every one in play, whoever owns it.
const driverFor = spec => {
  if (spec.resourcesHere !== undefined && !spec.tag && !spec.all && spec.oceans === undefined) {
    return (state, card, count) => {
      getPlayer(state, "player").cardResources = { [card.id]: count };
    };
  }

  if (spec.tag && !spec.all) {
    const wanted = String(spec.tag).toLowerCase();
    const carriers = ALL_CARDS.filter(item =>
      !item.victoryPointSpec &&
      item.type !== "event" &&
      (item.tags ?? []).filter(tag => String(tag).toLowerCase() === wanted).length === 1
    );
    if (carriers.length === 0) return null;
    return (state, card, count) => {
      const seat = getPlayer(state, "player");
      if (count > carriers.length) throw new Error(`not enough ${wanted} cards to reach ${count}`);
      seat.playedProjects = [
        ...seat.playedProjects.filter(id => id !== card.id),
        ...carriers.slice(0, count).map(item => item.id),
        ...(seat.playedProjects.includes(card.id) ? [card.id] : [])
      ];
    };
  }

  if (spec.all && spec.cities !== undefined) {
    return (state, card, count) => {
      const free = Object.values(state.board).filter(
        cell => cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor
      );
      if (free.length < count) throw new Error("not enough empty cells for the cities");
      for (let index = 0; index < count; index += 1) {
        const cell = free[index];
        state.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "city",
          placedBy: index % 2 === 0 ? "player" : "player2"
        };
      }
    };
  }

  if (spec.all && spec.colonies !== undefined) {
    return (state, card, count) => {
      const tiles = Object.keys(state.colonies.tiles);
      for (const id of tiles) state.colonies.tiles[id] = { ...state.colonies.tiles[id], colonies: [] };
      for (let index = 0; index < count; index += 1) {
        const id = tiles[index % tiles.length];
        state.colonies.tiles[id] = {
          ...state.colonies.tiles[id],
          colonies: [...state.colonies.tiles[id].colonies, index % 2 === 0 ? "player" : "player2"]
        };
      }
    };
  }

  // "One point per city beside this tile": the card goes on the board and the
  // neighbours are filled in around it. The matching ocean shape belongs only
  // to Capital, which is scored by its own rule and never reaches here, so
  // there is no ocean driver to go stale.
  if (spec.cities !== undefined && !spec.all) {
    const neighbourType = "city";
    return (state, card, count) => {
      const home = Object.values(state.board).find(
        cell => cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor
      );
      if (!home) throw new Error("no cell to place the card on");
      state.board[`${home.q},${home.r}`] = { ...home, tileType: "special", placedBy: "player" };
      getPlayer(state, "player").cardPlacements = { [card.id]: `${home.q},${home.r}` };
      const around = adjacentTo(state, home).filter(cell => cell.tileType === "empty");
      if (around.length < count) throw new Error(`only ${around.length} cells beside it`);
      for (let index = 0; index < count; index += 1) {
        const cell = around[index];
        state.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: neighbourType,
          placedBy: neighbourType === "ocean" ? null : "player2"
        };
      }
    };
  }

  return null;
};

const adjacentTo = (state, cell) =>
  [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
    .map(([dq, dr]) => state.board[`${cell.q + dq},${cell.r + dr}`])
    .filter(Boolean);

const CASES = [
  ...OFFICIAL_PROJECTS.map(card => ({ card, kind: "project" })),
  ...PRELUDES.map(card => ({ card, kind: "prelude" })),
  ...CORPORATIONS.map(card => ({ card, kind: "corporation" }))
];

const checked = [];
const skipped = [];
const wrong = [];

for (const { card, kind } of CASES) {
  const spec = card.victoryPointSpec;
  if (!spec || card.dynamicVictory || card.specialVictoryKind) {
    if (spec) skipped.push([card, "scored by its own rule, not by the spec"]);
    continue;
  }
  const drive = driverFor(spec);
  if (!drive) {
    skipped.push([card, `shape ${Object.keys(spec).sort().join("+")} has no driver`]);
    continue;
  }

  const problems = [];
  for (const count of boundaries(spec)) {
    const measure = withCard => {
      const state = rig();
      if (withCard) seatCard(state, card, kind);
      drive(state, card, count);
      return calculateScoreBreakdowns(state).player.cards;
    };
    // The gap between holding the card and not: a fixed VP icon printed on the
    // same card is in both readings and cancels out, leaving the variable half.
    const got = measure(true) - measure(false) - (card.victoryPoints ?? 0);
    // "One point per Jovian tag" counts the Jovian tag printed on the card
    // saying it, so the card scores for itself before anything else is in play.
    const want = expectedFor(spec, count + ownTags(card, spec));
    if (got !== want) {
      problems.push(`${count} resources scores ${got}, the spec says ${want}`);
    }
  }

  if (problems.length > 0) wrong.push([card, problems]);
  else checked.push(card);
}

console.log(`scoring cards measured at their boundaries: ${checked.length + wrong.length}`);
console.log(`  honoured : ${checked.length}`);
console.log(`  wrong    : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nWRONG ${card.id}  ${card.name}`);
  console.log(`   spec: ${JSON.stringify(card.victoryPointSpec)}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [card, why] of skipped) console.log(`skip ${card.id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
