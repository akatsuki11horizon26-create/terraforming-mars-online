// Effect specs for the 36 Turmoil global events.
//
// These are data, not parsed prose: `effectText` on the catalogue entry is the
// Japanese card text for display, and reading it back would be guesswork. Every
// event below names what to count, what it pays, and who it hits.
//
// The shapes, in the order the cards use them:
//
//   count   what to tally on each player (tags, tiles, production, cards…)
//   cap     the "max 5" the rules put on almost every count. Turmoil rules:
//           "Any Global Event that counts something [...] can only count up to a
//           maximum of 5." Events that say 上限なし omit it.
//   per     resource paid per counted item
//   influencePer  resource paid per point of influence, on top of the count
//   softenedByInfluence  losses only: influence cancels counted items first
//
// `resolve` is an escape hatch for the handful of events that move board state
// or ask a player something; they get the state and return logs.

export const GLOBAL_EVENT_EFFECTS = {
  // --- gains: count something, pay per item, pay per influence ---------------
  "global-asteroid-mining": {
    count: { tag: "Jovian" }, cap: 5, per: { titanium: 1 }, influencePer: { titanium: 1 }
  },
  "global-celebrity-leaders": {
    count: { playedEvents: true }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-homeworld-support": {
    count: { tag: "Earth" }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-interplanetary-trade": {
    count: { tag: "Space" }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-spin-off-products": {
    count: { tag: "Science" }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-venus-infrastructure": {
    count: { tag: "Venus" }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-strong-society": {
    count: { tile: "city" }, cap: 5, per: { mc: 2 }, influencePer: { mc: 2 }
  },
  "global-productivity": {
    count: { production: "steelProd" }, cap: 5, per: { steel: 1 }, influencePer: { steel: 1 }
  },
  "global-successful-organisms": {
    count: { production: "plantsProd" }, cap: 5, per: { plants: 1 }, influencePer: { plants: 1 }
  },
  "global-scientific-community": {
    // 上限なし: the hand is counted in full.
    count: { handSize: true }, per: { mc: 1 }, influencePer: { mc: 1 }
  },
  "global-jovian-tax-rights": {
    count: { colonies: true }, per: { mcProd: 1 }, influencePer: { titanium: 1 }
  },

  // --- losses: influence cancels counted items before the loss lands ---------
  "global-global-dust-storm": {
    count: { tag: "Building" }, cap: 5, per: { mc: -2 }, softenedByInfluence: true,
    also: { loseAll: "heat" }
  },
  "global-pandemic": {
    count: { tag: "Building" }, cap: 5, per: { mc: -3 }, softenedByInfluence: true
  },
  "global-solar-flare": {
    count: { tag: "Space" }, cap: 5, per: { mc: -3 }, softenedByInfluence: true
  },
  "global-miners-on-strike": {
    count: { tag: "Jovian" }, cap: 5, per: { titanium: -1 }, softenedByInfluence: true
  },
  "global-riots": {
    count: { tile: "city" }, cap: 5, per: { mc: -4 }, softenedByInfluence: true
  },
  "global-microgravity-health-problems": {
    count: { colonies: true }, cap: 5, per: { mc: -3 }, softenedByInfluence: true
  },
  "global-solarnet-shutdown": {
    count: { blueCards: true }, cap: 5, per: { mc: -3 }, softenedByInfluence: true
  },
  "global-mud-slides": {
    count: { tilesAdjacentToOcean: true }, cap: 5, per: { mc: -4 }, softenedByInfluence: true
  },

  // --- flat effects ---------------------------------------------------------
  "global-snow-cover": {
    global: { temperature: -2 }, influenceDraws: 1
  },
  "global-volcanic-eruptions": {
    global: { temperature: 2 }, influencePer: { heatProd: 1 }
  },
  "global-war-on-earth": {
    // Each point of influence cancels one step of the TR loss.
    flatTrLoss: 4
  },
  "global-eco-sabotage": {
    // Everything above 3 + influence is destroyed.
    keepUpTo: { resource: "plants", base: 3 }
  },
  "global-sabotage": {
    productionLoss: { steelProd: 1, energyProd: 1 }, influencePer: { steel: 1 }
  },
  "global-improved-energy-templates": {
    // 上限なし, and influence counts as a power tag.
    count: { tag: "Power", plusInfluence: true }, per: { energyProd: 1 }, divideBy: 2
  },
  "global-paradigm-breakdown": {
    discardFromHand: 2, influencePer: { mc: 2 }
  },
  "global-corrosive-rain": {
    loseFloatersOrMc: { floaters: 2, mc: 10 }, influenceDraws: 1
  },
  "global-diversity": {
    // Influence counts as one extra distinct tag.
    distinctTags: { threshold: 9, reward: { mc: 10 }, influenceCountsAsTag: true }
  },
  "global-generous-funding": {
    trBrackets: { above: 15, step: 5, cap: 5, per: { mc: 2 } }, influencePer: { mc: 2 }
  },
  "global-red-influence": {
    trBrackets: { above: 10, step: 5, cap: 5, per: { mc: -3 } }, influencePer: { mcProd: 1 }
  },

  // --- contests and board effects -------------------------------------------
  "global-election": {
    contest: { influencePlus: ["Building", "cityTiles"], rewards: [2, 1], soloThresholds: [10, 5] }
  },
  "global-revolution": {
    contest: {
      influencePlus: ["Earth"], rewards: [-2, -1], minimum: 1, soloThreshold: 4, soloReward: -2
    }
  },
  "global-aquifer-released-by-public-council": {
    firstPlayerPlacesOcean: true, influencePer: { plants: 1, steel: 1 }
  },
  // NOTE: influenceStandardResource is declared but not yet applied — "1 standard
  // resource per influence" lets the player pick which resource, so it needs a
  // choice per player and the engine holds one pendingChoice at a time. The
  // ocean removal is implemented.
  "global-dry-deserts": {
    firstPlayerRemovesOcean: true, influenceStandardResource: 1
  },
  // "every card" needs no choice, so these resolve immediately.
  // NOTE: influenceAddsToCards is declared but not yet applied — "1 floater on
  // a card per influence" lets the player pick which cards, so it needs a
  // choice per player. The blanket "every card" part is implemented.
  "global-cloud-societies": {
    addResourceToAll: "floater", influenceAddsToCards: "floater"
  },
  "global-sponsored-projects": {
    addResourceToCardsHoldingResources: true, influenceDraws: 1
  }
};

// The official Turmoil box holds 31 Global Event cards. The catalogue carries
// 36 because the reference implementation keeps the cross-expansion events in
// the same Turmoil manifest, each gated by a `compatibility` field. Without that
// gate a Turmoil-only game deals colony and Venus events it can never satisfy.
//
// 36 - 5 = 31, which is the component list in the rulebook.
export const GLOBAL_EVENT_COMPATIBILITY = {
  "global-jovian-tax-rights": ["colonies"],
  "global-microgravity-health-problems": ["colonies"],
  "global-cloud-societies": ["venus", "colonies"],
  "global-corrosive-rain": ["venus", "colonies"],
  "global-venus-infrastructure": ["venus"]
};

// Keeps the events a given game can actually use. `enabled` names the active
// expansions, e.g. { venus: true, colonies: false }.
export function playableGlobalEvents(events, enabled = {}) {
  return events.filter(event => {
    const needs = GLOBAL_EVENT_COMPATIBILITY[event.id];
    if (!needs) return true;
    return needs.every(expansion => enabled[expansion] === true);
  });
}

export function getGlobalEventEffect(eventId) {
  return GLOBAL_EVENT_EFFECTS[eventId] ?? null;
}

// Every event in the catalogue must have a spec, so a new card cannot quietly
// resolve to nothing the way the whole set used to.
export function missingGlobalEventEffects(events) {
  return events.filter(event => !GLOBAL_EVENT_EFFECTS[event.id]).map(event => event.id);
}
