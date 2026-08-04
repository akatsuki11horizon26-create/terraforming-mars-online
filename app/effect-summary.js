// Some catalog entries describe only part of what the card does — Birds reads
// "Action: add an animal" and never mentions the plant production it costs its
// victim. The engine applies the full spec either way, so the printed text is
// reconstructed from that spec rather than trusted.

const RESOURCE_LABELS = {
  megacredits: "MC",
  mc: "MC",
  steel: "建材",
  titanium: "チタン",
  plants: "植物",
  energy: "電力",
  heat: "熱"
};

const GLOBAL_LABELS = {
  temperature: "気温",
  oxygen: "酸素",
  venus: "金星",
  oceans: "海洋"
};

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function productionPhrase(production) {
  const parts = Object.entries(production ?? {})
    .filter(([, value]) => typeof value === "number" && value !== 0)
    .map(([resource, value]) => `${RESOURCE_LABELS[resource] ?? resource}生産量${signed(value)}`);
  return parts.length > 0 ? parts.join("、") : null;
}

// Each entry returns the sentence the card's own text should have contained.
const CLAUSES = [
  behavior => productionPhrase(behavior.production),
  behavior => {
    const spec = behavior.decreaseAnyProduction;
    if (!spec?.type) return null;
    const label = RESOURCE_LABELS[spec.type] ?? spec.type;
    return `任意のプレイヤーの${label}生産量を${spec.count}下げる`;
  },
  behavior => {
    const spec = behavior.addResourcesToAnyCard;
    if (!spec) return null;
    const list = Array.isArray(spec) ? spec : [spec];
    return list
      .map(entry => `他のカード1枚に${entry.type ?? "資源"}を${entry.count ?? 1}個置く`)
      .join("、");
  },
  behavior => {
    const value = behavior.tr;
    return typeof value === "number" && value !== 0 ? `TR${signed(value)}` : null;
  },
  behavior => {
    const parts = Object.entries(behavior.global ?? {})
      .filter(([, value]) => typeof value === "number" && value !== 0)
      .map(([key, value]) => `${GLOBAL_LABELS[key] ?? key}${signed(value)}段階`);
    return parts.length > 0 ? parts.join("、") : null;
  },
  behavior => {
    const value = behavior.drawCard;
    return typeof value === "number" && value > 0 ? `カードを${value}枚引く` : null;
  }
];

// Words that mean a clause is already covered, so it is not repeated.
const MENTIONS = {
  production: /生産/,
  decreaseAnyProduction: /生産/,
  addResourcesToAnyCard: /置く|追加/,
  tr: /TR|地球化/,
  global: /気温|酸素|海洋|金星/,
  drawCard: /引く|ドロー/
};

const CLAUSE_KEYS = ["production", "decreaseAnyProduction", "addResourcesToAnyCard", "tr", "global", "drawCard"];

// Returns the card's effect text with any missing clause appended, or the
// original text when it already covers the spec.
export function completeEffectText(card) {
  const behavior = card?.effectSpec?.behavior;
  const original = String(card?.effectText ?? "").trim();
  if (!behavior) return original;

  const additions = [];
  CLAUSE_KEYS.forEach((key, index) => {
    if (behavior[key] === undefined) return;
    if (MENTIONS[key]?.test(original)) return;
    const clause = CLAUSES[index](behavior);
    if (clause) additions.push(clause);
  });

  if (additions.length === 0) return original;
  const suffix = `${additions.join("、")}。`;
  return original ? `${suffix}${original}` : suffix;
}
