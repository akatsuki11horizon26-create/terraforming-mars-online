// Writes the prompts that turn the reference implementation's declarative
// blocks into effectSpec entries for the cards whose spec came out empty.
//
// These fourteen are the only ones whose effect is data rather than TypeScript,
// so they are the only ones extraction can reach. Extraction alone is not
// enough: several use keys the engine does not read yet, so each answer has to
// say which capability is missing rather than pretend the card will work.
//
// Usage: node scripts/make-declarative-prompts.mjs
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WORK = join(process.env.TEMP ?? "/tmp", "luna-decl");
const SOURCES = join(process.env.TEMP ?? "/tmp", "tm-card-sources");
const APP = "C:\\Users\\takkun\\Documents\\mars-frontier\\app";

const batches = JSON.parse(await readFile(join(WORK, "batches.json"), "utf8"));

const prompt = (ids, index) => `あなたはカード効果データの抽出役です。日本語で考え、成果物はJSONで出力してください。

# 成果物の書き出し先
このバッチの結果を **${join(WORK, `decl-${index}.json`)}** に JSON配列として書き込んでください。
ファイル書き込みは許可されています。回答本文には書き込んだ件数だけを1行で書いてください。

# 参照するファイル
- 参照実装のソース: ${SOURCES}\\<cardId>.ts
- 我々のスキーマ定義: ${APP}\\game-logic.js の normalizeBehavior
- 既存の記述例: ${APP}\\official-content.js
- 日本語データ: C:\\Users\\takkun\\Documents\\mars-frontier\\scripts\\japanese-effects.data.js

# 対象カード（${ids.length}枚）
${ids.join("\n")}

# やること
各カードのソースを開き、constructor の \`super({...})\` から
**behavior / action / cardDiscount / globalParameterRequirementBonus だけ**を読み、
参照実装と同じ構造の effectSpec を作ってください。

## 定数の変換規則
- \`Tag.MICROBE\` → \`"microbe"\`（タグは小文字）
- \`CardResource.MICROBE\` → \`"Microbe"\`（カード資源は先頭大文字）
- \`CardResource.ANIMAL\` → \`"Animal"\`、\`FLOATER\` → \`"Floater"\`、\`ASTEROID\` → \`"Asteroid"\`
- \`all\`（Options の識別子）→ \`true\`
- \`'all'\`（文字列）→ \`"all"\` のまま
- \`{}\` は「1回」「1枚」を表すマーカーなので **空オブジェクトのまま保持**する
- \`{count: 2}\` を数値へ潰さない。\`per\` \`each\` \`autoSelect\` も保持する

## 厳守すること
- **推測でキーを足さない。** ソースに書かれていないものは書かない
- 未解決の式を黙って落とさない。読めなければ confidence を low にして理由を書く
- **抽出できたことと、我々のエンジンで動くことは別**。
  \`normalizeBehavior\` が読まないキーを使っている場合は \`missingCapabilities\` に列挙する
  （例: \`removeResourcesFromAnyCard\`、\`eventsPlayed\`、\`canUseSteel\`、\`canUseTitanium\`、
  \`firstPlayerPlaces\` は現在どれも未対応）
- 既に official-content.js に手書き実装があるカードは \`existingOverride\` に書く
- 日本語効果文が japanese-effects.data.js にあるか確認し、無ければ \`suggestedJapanese\` に案を書く
  （metadata.description は条件文だけのことがあるので、renderData の
  \`b.action(...)\` / \`b.effect(...)\` の文字列も併せて読むこと）

# 出力するJSONの形
\`\`\`json
[
  {
    "cardId": "...",
    "source": "src/server/cards/...",
    "effectSpec": { },
    "englishEffectText": "description と renderData を併せた完全な効果文",
    "existingJapanese": "... または null",
    "suggestedJapanese": "... または null",
    "engineCompatibility": "full | partial | none",
    "missingCapabilities": ["normalizeBehavior が読まないキー名"],
    "existingOverride": "official-content.js の該当行 または null",
    "evidence": [{ "file": "...", "line": 0 }],
    "confidence": "high | medium | low"
  }
]
\`\`\`
`;

for (let i = 0; i < batches.length; i += 1) {
  const file = join(WORK, `prompt-${i + 1}.md`);
  await writeFile(file, prompt(batches[i], i + 1), "utf8");
  console.log("wrote", file, `(${batches[i].length} cards)`);
}
