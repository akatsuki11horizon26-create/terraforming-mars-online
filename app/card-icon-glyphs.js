// What each of upstream's icon types looks like here.
//
// Emoji rather than an SVG sprite: the board, the global track and the tags are
// already drawn this way, and a card mixing the two would look like two games.
// The cost is real -- emoji metrics vary by platform -- so each sits in a
// fixed-width box in the stylesheet rather than flowing with the text.
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
