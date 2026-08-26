// Writes the prompts that turn imperative card implementations into semantic
// contracts: what fires, what it reads, what it writes, what it asks the player.
//
// These cards keep their effect in TypeScript methods, so there is nothing to
// extract. The useful output is a description precise enough to implement from,
// plus an honest statement of which engine capability is missing -- inventing
// effectSpec keys the engine does not read would produce cards that look
// implemented and do nothing, which is the failure this whole audit exists to
// find.
//
// Usage: node scripts/make-contract-prompts.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const WORK = join(process.env.TEMP ?? "/tmp", "luna-contracts");
const SOURCES = join(process.env.TEMP ?? "/tmp", "tm-card-sources");
const APP = "C:\\Users\\takkun\\Documents\\mars-frontier\\app";

const audit = JSON.parse(
  await readFile(join(process.cwd(), "docs", "card-model-audit.json"), "utf8")
);

const targets = audit
  .filter(entry => entry.classification === "imperative")
  .filter(entry => entry.coverage !== "full")
  .filter(entry => entry.activation === "onPlay")
  .map(entry => entry.cardId);

await mkdir(WORK, { recursive: true });

const BATCH = 5;
const batches = [];
for (let i = 0; i < targets.length; i += BATCH) batches.push(targets.slice(i, i + BATCH));

const prompt = (ids, index) => `あなたは命令的TypeScriptカードを意味仕様へ変換する設計役です。日本語で考え、成果物はJSONで出力してください。

# 成果物の書き出し先
**${join(WORK, `contract-${index}.json`)}** に JSON配列として書き込んでください。
ファイル書き込みは許可されています。回答本文には書き込んだ件数だけを1行で書いてください。

# 参照するファイル
- 参照実装のソース: ${SOURCES}\\<cardId>.ts
- 我々のエンジン: ${APP}\\game-logic.js（特に normalizeBehavior と applyEffect）
- 選択の仕組み: ${APP}\\pending-choice.js
- カード定義: ${APP}\\official-content.js

# 対象カード（${ids.length}枚）
${ids.join("\n")}

# やること
各カードの **メソッド本体を読んで**、次を抽出してください。
カード面の英文だけで補わないこと。根拠は必ずメソッドの中身にしてください。

- **発火時点**: プレイ時か、条件付きか
- **実行可能条件**: bespokeCanPlay が何を確認しているか
- **読む状態**: 盤面、他プレイヤー、自分のタブロー、グローバルパラメータ
- **書く状態**: 何がどれだけ変わるか
- **プレイヤーへの質問**: 対象選択、任意量、OR分岐があるか
- **支払い**: 何を払うか
- **他プレイヤーへの影響**: あるか

# 最重要
- **存在しない effectSpec キーを発明しないでください。**
  \`normalizeBehavior\` が読むキーだけが「既存機構で表現できる」ものです。
  表現できない場合は \`requiresEngineCapability\` に**何が足りないか**を書いてください。
- 既に official-content.js や game-logic.js に実装がある場合は \`existingImplementation\` に書く
- 推測は confidence を下げ、理由を書く

# 出力するJSONの形
\`\`\`json
[
  {
    "cardId": "...",
    "activation": "onPlay",
    "guards": ["プレイ可能条件"],
    "reads": ["読む状態"],
    "writes": ["書く状態"],
    "choices": ["プレイヤーに聞くこと"],
    "payments": ["支払い"],
    "affectsOpponents": true,
    "expressibleAsEffectSpec": { },
    "requiresEngineCapability": ["足りない機構"],
    "recommendedImplementation": "existing-effectSpec | extend-common-hook | explicit-card-handler",
    "existingImplementation": "... または null",
    "testCases": [{ "given": "...", "when": "...", "then": "..." }],
    "evidence": [{ "file": "...", "line": 0, "method": "..." }],
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
