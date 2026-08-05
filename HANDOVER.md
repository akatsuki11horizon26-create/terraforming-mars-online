# 引き継ぎ書

最終更新: 2026-08-05 / コミット `e3246d8`

---

## 1. これは何か

Terraforming Mars の非公式Web実装。公式ルール準拠を目指している。

**公開先は2つ。同じソースから別ビルドを出している。**

| 公開先 | URL | 内容 |
|---|---|---|
| GitHub Pages | https://akatsuki11horizon26-create.github.io/terraforming-mars-online/ | ソロ・ロボット戦専用（サーバーなし） |
| Cloudflare Workers | https://mars-frontier.gameofai.workers.dev | 上記＋オンライン対戦 |

ソロ版は `NEXT_PUBLIC_SOLO_ONLY=1` でビルドされ、`ONLINE_ENABLED` が false になる。
**サーバーが存在しないので、ソロ版のUIはエンジンを直接呼ぶ。** これは設計上の意図であり、
「UIはルールを持たない」原則とは両立する（呼び出すだけで、ルールは持たない）。

### 技術構成

- Next.js 16.2.6 / React 19.2.6 / vinext / Vite 8 / TypeScript 5.9.3
- Cloudflare Workers + Durable Objects（1部屋1DO）、WebSocket
- テスト: `node --test`、235件
- CI: GitHub Actions（lint / 型 / テスト / 全拡張プレイテスト / 5マップ）

---

## 2. 最重要: 進行中の改修

**「アクション実行経路の一本化」を実施中。全8フェーズ中、7つ完了。**

### 背景

同じ「カードをプレイする」処理が4箇所に別実装で存在していた。
そのため片方だけ直したバグが何度も再発した（配置ボーナス二重加算、TR加算漏れ、
ロボットの海洋二重加算など、実際に4件踏んでいる）。

### 現在の構造

```
オンライン: UI ──command──> Durable Object ──> executeGameCommand
ソロ:      UI ────────────command────────────> executeGameCommand
Bot:       ────────────────command────────────> executeGameCommand
```

**`app/game-command.js` が唯一の状態変更入口。** ここが引き受けているもの:

- 手番検証（コマンドが名乗る席からのものか）
- 所持検証（手札にあるか、場に出しているか）
- **アクション消費**（成功時のみ1回。選択を伴う場合は最後の選択時に1回）
- 企業トリガーとパラメータ閾値ボーナス

### 完了済み

| # | 項目 |
|---|---|
| 1 | 選択完了時のアクション消費 |
| 2 | カードプレイ後の共通処理（企業トリガー・閾値ボーナス） |
| 3 | 研究購入のコマンド化（`BUY_RESEARCH`） |
| 4 | オンライン盤面をサーバーstateで描画 |
| 5 | 標準プロジェクト8種のコマンド化 |
| 6 | オンライン支払い情報の送信（建材・チタン、不正値クランプ） |
| 8 | CI + 統合テスト |

### 残作業

**項目7が部分完了。** `app/page.tsx` の直接変更が残っている:

```
.mc  ±=   9箇所
.tr  ±=   2箇所
Prod ±=   3箇所
```

残っているのは主に **企業アクション**（Ecoline等）と **最終得点画面**。
移行前は TR 9箇所・生産量 20箇所だったので、大半は済んでいる。

**次にやるなら**: `handleCorporationAction` をコマンド層へ。
`COMMAND.CORPORATION_ACTION` を新設し、`app/game-command.js` に実装する。

---

## 3. このコードベースで繰り返し踏んだ罠

### 3.1 非列挙アクセサ（最重要）

`state.mc` は `players[currentPlayerId].mc` を指すアクセサ。**`Object.defineProperty` で
`enumerable: false` として張られている。**

```js
const next = { ...state };   // ← アクセサが消える。事故の最大の原因
```

正しくは `cloneGameState(state)` を使う。`viewForPlayer` でもこれを踏んで、
オンラインの全クライアントが「手番の人の手札」を読む状態になっていた。

**将来的には廃止して `players[id]` 明示に移行すべき**（sol の助言）。
ただし移行するなら、ロード境界で一度だけ変換し、
`state.mc ?? players[id].mc` のような恒久フォールバックは作らないこと。

### 3.2 テストが乱数を読んでいる

**5回以上これで痛い目を見ている。** 症状は「3〜4回に1回落ちる」。

原因のパターン:

- **企業がランダム** — 6社が初期建材生産1、4社が初期電力生産1、
  Ecolineは初期植物3を持つ。「生産量が1になる」と書くと落ちる
- **植民地タイルがランダム** — タイルごとに交易報酬の通貨が違う。
  Luna は M€ を払うので、支払い9MCと相殺されて総額が変わる
- **ヘルパーが毎回別のゲームを配る** — `seed()` を2回呼んで比較すると、
  違うタイル・違う企業を比べることになる

**対策: 絶対値ではなく差分で測る。1つのゲームを作って `cloneGameState` で分岐させる。**

```js
// 悪い例
assert.equal(after.energyProd, 1);

// 良い例
assert.equal(after.energyProd, before.energyProd + 1);
```

### 3.3 `npm test` はビルドを挟む

`npm test` は `npm run build` を実行してからテストする。
ビルド中に走ると古い成果物を読んで落ちることがある。

**1回の失敗では判断しない。3回連続で確認すること。**

また `static-dist/index.html` を読むテストが2件ある。
ローカルには過去のビルドが残っていて通るが、CIには無い。
CIには `npm run build:static` を入れてある。

### 3.4 「成功を返すが何もしない」

エラーを出さず条件が偽になるだけのコードが複数あった。

- `applyCardAction` が `cardId` を渡さず、資源が置かれない
- `getCardPlayableStatus` は「コストと条件」の判定で、**所持は見ない**。
  手札0枚でも428枚中272枚が `playable: true` を返す

**アクションが成功を返しても、状態が変わったか実測すること。**

---

## 4. 主要ファイル

| ファイル | 役割 |
|---|---|
| `app/game-command.js` | **唯一の状態変更入口**。ここにルールを追加する |
| `app/game-logic.js` | エンジン本体（約3000行）。カード効果・盤面・フェーズ |
| `app/page.tsx` | UI。ルールを持たない（移行途中） |
| `worker/room.ts` | Durable Object。認証・配信・永続化。ルールを持たない |
| `app/bot-player.js` | ボットAI。合法手を選ぶだけ |
| `app/player-state.js` | アクセサ互換層（3.1参照） |
| `app/net-protocol.js` | 通信形式と `viewForPlayer`（プライバシーフィルタ） |
| `app/draft.js` | ドラフト制 |
| `app/alternate-boards.js` | 4マップの盤面データ（生成物） |
| `app/board-milestones.js` | マップ別の称号・褒賞 |
| `app/card-art.data.js` | 428枚のカードアート（生成物、689KB） |

### 生成スクリプト

```
scripts/generate-boards.mjs        4マップ盤面（リファレンス実装から移植）
scripts/generate-japanese-text.mjs カード名・効果の日本語
scripts/build-card-art.mjs         SVGアートの検証とバンドル
scripts/build-art-briefs.mjs       アート生成用の指示文
scripts/check-card-art.mjs         主題が中央にあるかの機械検査
scripts/playtest.mjs               完全なゲームを回して不変条件を検査
```

---

## 5. 実装済みの主な機能

- **カード428枚**（基本・Colonies・Prelude・Prelude2・Promo・Turmoil・Venus）
  - 全カード日本語名。Venus は「金星」表記で統一
  - 未実装効果 **0枚**（テストで検証。1枚でもあれば落ちる）
- **カードアート428枚**（SVG、Codex生成）
- **5マップ**（タルシス・ヘラス・エリシウム・ユートピア平原・アマゾニス平原）
  - 各マップ固有の称号5種・褒賞5種
  - ヘラス南極（6MC払って海洋タイル）
- **ドラフト制**（ロビーで選択。初期10枚も対象。世代ごとに向きが反転）
- **ロボット戦**（3難易度。合法手を列挙して評価）
- **オンライン対戦**（部屋コード、5拡張＋5マップ選択）

---

## 6. 未確認・既知の課題

### 6.1 実機確認をしていない

**このセッションを通じて、ブラウザで一度も動作確認していない。**
テスト235件・CI・プレイテストは通っているが、実際の操作感は未確認。

特に未確認なのは:
- 今回コマンド層に載せ替えた標準プロジェクト・カードプレイの操作感
- オンライン対戦の通しプレイ（2端末必要）
- カットイン演出やアニメーション

### 6.2 未対応のユーザー要望

過去に依頼されて未着手のもの:

1. **アクションカードの効果テキスト**に「トークン何個で勝利点」の記載がない
2. **異なる種類のアクションカードは各1回ずつ**使える制限（現在は全体で1回）
3. **購入フェーズでシンボル集計・手札を見たい**
4. **タイトルからの開始時に拡張選択画面**
5. **金星拡張オフ時に金星カードを混ぜない**
6. **気温・酸素・海洋上昇時のカットイン演出**（画面中央に「-30→-28」等を1秒表示）
7. **配置時の「〇〇が配置できます」の透明度**を上げる（配置先が見えない）

### 6.3 外部監査で指摘され未検証の項目

61件の監査を受け、うち実測で確認できたものは修正済み。
**未検証のまま残っている主なもの**:

- World Government Terraforming（Venus使用時の太陽系フェイズ）が未実装
- 植民地トラックが世代終了時に上昇しない
- Turmoilの世界的イベントがログ表示だけで効果が発動しない
- 有料代表者（予備から5MC）が無料で送れる
- Prelude ソロが14世代のまま（公式は12世代）
- イベントカードのタグが解決後も数えられる
- Prelude カードのタグが数えられていない

**修正前に必ず実測で再現すること。** 監査の指摘は精度が高かったが、
既に修正済みのものや、私の実装ミスと重複するものも含まれていた。

---

## 7. 開発の進め方

### コマンド

```bash
npm test                 # ビルド + 235テスト
npm run lint             # ESLint
npx tsc --noEmit -p tsconfig.json | grep '^app/'   # 型（worker/ の既存エラーは無視）
node scripts/playtest.mjs --games=20 --players=2 --colonies --turmoil
npm run deploy           # Workers へデプロイ
git push origin main     # Pages は Actions が自動ビルド
```

### ルールを追加・修正するとき

**必ず `app/game-command.js` に実装する。** 以下は禁止:

```
オンラインだけ修正 / ロボットだけ例外処理 / page.tsx だけボーナス追加
```

UI・サーバー・ボットは「何をしたいか」を送るだけ。
「それが可能か」「何が起きるか」を決めるのはエンジンだけ。

### 外部AIの利用

このプロジェクトでは以下を使った:

- **Codex**（`mcp__codex__codex_ask`）: カードアート428枚のSVG生成、
  カード名381枚の翻訳、PDF解析。ファイル書き込みができる
- **sol**（`ask_codex.ps1 -Model gpt-5.6-sol -Effort high`）: 設計相談。
  **`-Effort` が正しいフラグ名**（`-ReasoningEffort` は存在しない）。
  プロンプトが長いとタイムアウトするので、質問を3点程度に絞る
- **agy**: 今回は繰り返しエラーで落ちたため使えなかった

---

## 8. 参考資料の場所

```
C:\Users\takkun\Downloads\MARS拡張ルール\     公式ルールブックPDF 10冊
C:\Users\takkun\Downloads\TM_RULEBOOK_JPN-reprint2018w_全文書き起こし.txt
```

**PDFからのテキスト抽出には注意が要る。** フォントが数字を独自コードに
割り当てているため、素朴に抽出すると `5 cards` が `ffl cards` に化ける。
ToUnicode CMap を解析する必要がある（`scratchpad/pdfx.py` に実装済み）。

盤面データは**画像認識ではなくリファレンス実装から移植した**。
`github.com/terraforming-mars/terraforming-mars` の `src/server/boards/*Board.ts` を
curl で取得できる。既存のタルシス盤面と1行ずつ一致することを確認済みで、
この経路は信頼できる。
