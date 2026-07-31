import {readdir, writeFile} from "node:fs/promises";
import {extname, join, relative} from "node:path";
import {pathToFileURL} from "node:url";

const referenceRoot = process.env.TM_REFERENCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-reference";
const cardsRoot = join(referenceRoot, "src/server/cards");
const target = process.env.CARD_CATALOG_OUTPUT ?? "app/full-card-catalog.js";
const modules = [
  ["base", ["base", "corporation"]],
  ["prelude", ["prelude"]],
  ["prelude2", ["prelude2"]],
  ["venus", ["venusNext"]],
  ["colonies", ["colonies"]],
  ["turmoil", ["turmoil"]],
  ["promo", ["promo"]],
] as const;

const tagNames: Record<string, string> = {
  animal: "Animal",
  building: "Building",
  city: "City",
  earth: "Earth",
  event: "Event",
  jovian: "Jovian",
  microbe: "Microbe",
  moon: "Moon",
  plant: "Plant",
  power: "Power",
  science: "Science",
  space: "Space",
  venus: "Venus",
  wild: "Wild",
};

const fallbackDescriptions: Record<string, string> = {
  "Business Contacts": "Look at the top 4 cards from the deck. Take 2 of them into hand and discard the other 2.",
  "Invention Contest": "Look at the top 3 cards from the deck. Take 1 of them into hand and discard the other two.",
  "Protected Habitats": "Opponents may not remove your plants, animals, or microbes.",
  "Trans-Neptune Probe": "1 VP.",
  "Summit Logistics": "Gain 1 M€ per planet tag and colony you have. Draw 2 cards.",
  "Project Inspection": "Use a card action that has been used this generation.",
  "Public Plans": "Reveal any number of other cards from your hand. Gain 1 M€ for each revealed card.",
};

const seen = new WeakSet<object>();

function clean(value: unknown): unknown {
  if (value === undefined || typeof value === "function") return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) return value.map(clean).filter((item) => item !== undefined);
  const result: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, child]) => {
    const cleaned = clean(child);
    if (cleaned !== undefined) result[key] = cleaned;
  });
  return result;
}

async function filesIn(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(file));
    else if (extname(entry.name) === ".ts") result.push(file);
  }
  return result.sort();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((tag) => tagNames[String(tag).toLowerCase()] ?? String(tag));
}

function renderedText(value: unknown, result: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.length > 8 && /^(Effect|Action|Requires|When|Increase|Decrease|Raise|Place|Add|Remove|Gain|Spend|Pay|Draw|You start|Look|Opponents|Reveal|Use)/i.test(value)) result.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => renderedText(item, result));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => renderedText(item, result));
  }
  return [...new Set(result)];
}

function cardFromProperties(properties: any, expansion: string, source: string) {
  if (!properties?.name || !properties?.type) return undefined;
  const requirements = clean(properties.requirements ?? []);
  const descriptionValue = properties.metadata?.description ?? properties.description ?? "";
  const description = typeof descriptionValue === "string" ? descriptionValue : descriptionValue?.text ?? "";
  const renderDescription = renderedText(properties.metadata?.renderData).join(" ");
  const effectSpec = clean({
    behavior: properties.behavior,
    action: properties.action,
    globalParameterRequirementBonus: properties.globalParameterRequirementBonus,
    cardDiscount: properties.cardDiscount,
    tr: properties.tr,
    startingMegaCredits: properties.startingMegaCredits,
    initialActionText: properties.initialActionText,
  });
  const name = String(properties.name);
  const behavior = properties.behavior ?? {};
  const stock = behavior.stock && typeof behavior.stock === "object" ? behavior.stock : {};
  const starting = properties.type === "corporation" ? {
    mc: properties.startingMegaCredits ?? 0,
    ...Object.fromEntries(Object.entries(stock).filter(([key]) => ["steel", "titanium", "plants", "energy", "heat"].includes(key))),
    production: behavior.production ?? {},
  } : undefined;
  const placementType = properties.behavior?.ocean !== undefined ? "ocean" : properties.behavior?.city !== undefined ? "city" : properties.behavior?.greenery !== undefined ? "forest" : undefined;
  const placementCount = placementType ? properties.behavior?.[placementType === "forest" ? "greenery" : placementType]?.count ?? 1 : undefined;
  return {
    id: `card-${expansion}-${slug(name)}`,
    name,
    expansion,
    source: relative(referenceRoot, source).replaceAll("\\", "/"),
    type: properties.type,
    cost: properties.cost ?? null,
    tags: tags(properties.tags),
    requirements,
    reqText: requirements && (requirements as any[]).length > 0 ? JSON.stringify(requirements) : "なし",
    effectText: description || renderDescription || fallbackDescriptions[name] || "効果本文は参照カードのアイコン表記を使用します。",
    victoryPoints: typeof properties.victoryPoints === "number" ? properties.victoryPoints : (typeof properties.metadata?.victoryPoints === "number" ? properties.metadata.victoryPoints : 0),
    ...(properties.victoryPoints && typeof properties.victoryPoints === "object" ? {victoryPointSpec: clean(properties.victoryPoints)} : {}),
    effectSpec: effectSpec ?? {},
    ...(placementType ? {placementType, placementCount} : {}),
    ...(starting ? {starting} : {}),
  };
}

async function loadCards(expansion: string, directories: readonly string[]) {
  const result: any[] = [];
  for (const directory of directories) {
    for (const file of await filesIn(join(cardsRoot, directory))) {
      if (file.includes("Manifest") || /(?:^|[\\/])I[A-Z][^\\/]*\.ts$/.test(file)) continue;
      try {
        const module: any = await import(pathToFileURL(file).href);
        for (const exported of Object.values(module.default ?? module)) {
          if (typeof exported !== "function") continue;
          try {
            const instance: any = new (exported as any)();
            const card = cardFromProperties(instance.properties, expansion, file);
            if (card) result.push(card);
          } catch {
          }
        }
      } catch {
      }
    }
  }
  return result;
}

async function loadGlobalEvents() {
  const result: any[] = [];
  const directory = join(referenceRoot, "src/server/turmoil/globalEvents");
  for (const file of await filesIn(directory)) {
    if (file.endsWith("GlobalEvent.ts") || file.endsWith("IGlobalEvent.ts") || file.includes("Dealer")) continue;
    try {
      const module: any = await import(pathToFileURL(file).href);
      for (const exported of Object.values(module.default ?? module)) {
        if (typeof exported !== "function") continue;
        try {
          const instance: any = new (exported as any)();
          if (!instance.name) continue;
          result.push({
            id: `global-${slug(String(instance.name))}`,
            name: String(instance.name),
            expansion: "turmoil",
            source: relative(referenceRoot, file).replaceAll("\\", "/"),
            revealedDelegate: instance.revealedDelegate,
            currentDelegate: instance.currentDelegate,
            effectText: instance.description ?? "",
          });
        } catch {
        }
      }
    } catch {
    }
  }
  return result;
}

const all: any[] = [];
for (const [expansion, directories] of modules) all.push(...await loadCards(expansion, directories));
try {
  const standardManifests: any = await import(pathToFileURL(join(cardsRoot, "StandardCardManifests.ts")).href);
  const corpEraNames = new Set(Object.keys(standardManifests.default.CORP_ERA_CARD_MANIFEST.projectCards));
  all.forEach((card) => {
    if (corpEraNames.has(card.name)) card.expansion = "corporate-era";
  });
} catch {
}
const missingSelfReplicatingRobots = all.every((card) => card.name !== "Self-replicating Robots");
if (missingSelfReplicatingRobots) {
  all.push({
    id: "card-promo-self-replicating-robots",
    name: "Self-replicating Robots",
    expansion: "promo",
    source: "src/server/cards/promo/SelfReplicatingRobots.ts",
    type: "active",
    cost: 7,
    tags: ["Science"],
    requirements: [{tag: "science", count: 2}],
    reqText: JSON.stringify([{tag: "science", count: 2}]),
    effectText: "Requires 2 science tags. Reveal and place a SPACE OR BUILDING card here from hand, and place 2 resources on it, OR double the resources on a card here.",
    victoryPoints: 0,
    effectSpec: {},
  });
}
const byName = new Map<string, any>();
all.forEach((card) => {
  if (!byName.has(card.name)) byName.set(card.name, card);
});
const unique = [...byName.values()].sort((a, b) => a.id.localeCompare(b.id));
const projects = unique.filter((card) => ["automated", "active", "event"].includes(card.type));
const standardProjects = unique.filter((card) => card.type === "standard_project");
const standardActions = unique.filter((card) => card.type === "standard_action");
const corporations = unique.filter((card) => card.type === "corporation");
const preludes = unique.filter((card) => card.type === "prelude");
const globalEvents = await loadGlobalEvents();
const output = `export const FULL_PROJECTS = ${JSON.stringify(projects, null, 2)};\n\nexport const FULL_STANDARD_PROJECTS = ${JSON.stringify(standardProjects, null, 2)};\n\nexport const FULL_STANDARD_ACTIONS = ${JSON.stringify(standardActions, null, 2)};\n\nexport const FULL_CORPORATIONS = ${JSON.stringify(corporations, null, 2)};\n\nexport const FULL_PRELUDES = ${JSON.stringify(preludes, null, 2)};\n\nexport const FULL_GLOBAL_EVENTS = ${JSON.stringify(globalEvents, null, 2)};\n\nexport const FULL_CATALOG_COUNTS = ${JSON.stringify({projects: projects.length, standardProjects: standardProjects.length, standardActions: standardActions.length, corporations: corporations.length, preludes: preludes.length, globalEvents: globalEvents.length}, null, 2)};\n`;
await writeFile(target, output, "utf8");
console.log(JSON.stringify({target, projects: projects.length, standardProjects: standardProjects.length, standardActions: standardActions.length, corporations: corporations.length, preludes: preludes.length, globalEvents: globalEvents.length, unique: unique.length}, null, 2));
