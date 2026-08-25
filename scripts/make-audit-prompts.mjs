// Writes one prompt file per batch for the card-classification audit.
//
// The audit answers a question my own regex got wrong three ways: methods
// without `public`, effects inherited from a base class, and effects declared
// only in renderData. Each batch is small enough that the model can open every
// source file rather than pattern-match across them.
//
// Usage: node scripts/make-audit-prompts.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const WORK = join(process.env.TEMP ?? "/tmp", "luna-audit");
const SOURCES = join(process.env.TEMP ?? "/tmp", "tm-card-sources");

const batches = JSON.parse(await readFile(join(WORK, "batches.json"), "utf8"));
await mkdir(WORK, { recursive: true });

const APP = "C:\\Users\\takkun\\Documents\\mars-frontier\\app";

const header = (ids, index) => `あなたはカード実装の分類監査役です。日本語で考え、成果物はJSONで出力してください。

# 成果物の書き出し先（重要）
このバッチの結果を **${join(WORK, `batch-${index}.json`)}** に
JSON配列として書き込んでください。ファイル書き込みは許可されています。
回答本文には「書き込んだ件数」だけを1行で書いてください。

# 参照するファイル
- 参照実装のソース: ${SOURCES}\\<cardId>.ts
- 我々の実装: ${APP}\\game-logic.js
- 我々の実装: ${APP}\\official-content.js
- 我々の実装: ${APP}\\pending-choice.js

# 対象カード（${ids.length}枚）
${ids.join("\n")}

# 各カードについて確認すること
参照実装のソースを**実際に開いて**、次をすべて見てください。

1. constructor の \`super({...})\` 内の \`behavior:\` / \`action:\`
2. **public の有無を問わず**すべてのメソッド
   （\`canAct()\` や \`action()\` に public が付いていない実例があります）
3. **継承元クラス**。\`extends MiningCard\` のように基底クラスへ効果がある場合があります
4. \`metadata.description\`
5. \`metadata.renderData\` 内の \`b.effect(...)\` / \`b.action(...)\` / \`b.plainText(...)\` の文字列
   （**メソッドが無くても renderData にだけ常時効果が書かれているカードがあります**）
6. \`victoryPoints\` と \`requirements\`
7. 我々の側に既に実装があるか（official-content.js の curated 定義、game-logic.js の個別処理）

# 分類（いずれか1つ）
- \`declarative\` … behavior/action ブロックがあり、データとして抽出できる
- \`imperative\` … 効果がメソッド実装にある
- \`inherited-effect\` … 効果が継承元クラスにある
- \`passive-effect-without-method\` … メソッドは無いが renderData 等に常時効果がある
- \`no-direct-effect\` … 勝利点とタグだけ。効果が無いのが正しい

**「メソッドが無い」だけで no-direct-effect にしないでください。**
継承元またはカード面に実効果がある場合は、その効果を \`reason\` に記録してください。

# 出力するJSONの形
\`\`\`json
[
  {
    "cardId": "...",
    "classification": "declarative | imperative | inherited-effect | passive-effect-without-method | no-direct-effect",
    "activationKinds": ["onPlay" | "action" | "ongoing" | "trigger" | "scoring"],
    "existingRuntimeCoverage": "full | partial | none",
    "reason": "1〜2文。何がどこにあるか",
    "evidence": [{ "file": "...", "line": 0 }],
    "confidence": "high | medium | low"
  }
]
\`\`\`

推測で埋めないでください。確認できなかった項目は confidence を下げ、reason にそう書いてください。
`;

for (let i = 0; i < batches.length; i += 1) {
  const file = join(WORK, `prompt-${i + 1}.md`);
  await writeFile(file, header(batches[i], i + 1), "utf8");
  console.log("wrote", file, `(${batches[i].length} cards)`);
}
