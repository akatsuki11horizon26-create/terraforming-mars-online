// What each of upstream's icon types looks like here.
//
// These identifiers are rendered as shared SVG symbols by GameSymbols.
//
// It is a plain module so the audit can check every icon the data names has a
// glyph here; a row with one symbol silently missing reads as a different card.
export const CARD_ICON_GLYPHS = {
  megacredits: "€", steel: "🔩", titanium: "🛰", plants: "🌱", energy: "⚡",
  heat: "🔥", cards: "🃏", tr: "TR", oceans: "🌊", oxygen: "O₂",
  temperature: "🌡", venus: "♀", city: "🏙", greenery: "🌲",
  colonies: "🛖", colony_tile: "🛖", trade: "⇄", trade_fleet: "⛵",
  trade_discount: "⇄", resource: "◆", tag: "🏷", wild: "★",
  empty_tag: "◻", diverse_tag: "❖", no_tags: "∅", delegates: "👤",
  influence: "◉", party_leaders: "👑", chairman: "🎩", nomads: "⛺",
  empty_tile: "⬡", "city-or-special-tile": "🏙", self_replicating: "🤖",
  cathedral: "⛪", community: "🏘", prelude: "▶", corporation: "🏢",
  award: "🏆", vp: "★", multiplier_white: "×",
  ignore_global_requirements: "⊘", one: "1", special_tile: "⬢"
};

// A tag icon and a card-resource icon each carry which one they mean, so they
// are drawn as the specific thing rather than a generic "a tag": a card asking
// for three Plant tags and one asking for three Science tags print differently.
export const CARD_TAG_GLYPHS = {
  earth: "🌍", animal: "🐾", plant: "🌱", microbe: "🦠",
  space: "🚀", event: "→", building: "🏗", science: "🔬",
  power: "⚡", jovian: "🪐", venus: "♀", city: "🏙"
};

export const CARD_RESOURCE_GLYPHS = {
  Microbe: "🦠", Animal: "🐾", Science: "🔬", Fighter: "⚔",
  Floater: "🎈", Camp: "⛺", Director: "👔", Asteroid: "☄",
  Graphene: "◇", Disease: "☣", "Hydroelectric resource": "💧",
  Preservation: "🛡"
};
