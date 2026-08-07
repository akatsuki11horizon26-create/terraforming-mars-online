# 引き継ぎ書

最終更新: 2026-08-07 / ブランチ `turmoil-solar-phase-audit` / テスト343件

**PR #1（特殊VP・Virus・Special Permit）は open のまま。** 今回の Turmoil /
Solar Phase の修正は別ブランチに積んである。履歴を混ぜないため分けてある。

このファイルは**着任した人が最初に読むもの**。
章の順序は「知らないと事故る順」で、作業の時系列ではない。

- **§1** これは何か
- **§2 このコードベース特有の罠** — ここを読まずに触ると壊す
- **§3** アーキテクチャの原則
- **§4** ファイル地図
- **§5** 実装済みの機能
- **§6 未対応・未確認の一覧** — 次にやること
- **§7** 開発の進め方
- **§8** 参考資料

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
- テスト: `node --test`、343件
- CI: GitHub Actions（lint / 型 / テスト / 全拡張プレイテスト / 5マップ）
- セーブ: `rulesVersion: 5`。v3・v4は読み込み時に自動移行

---

## 2. このコードベース特有の罠

**ここが一番大事。** 以下はすべて実際に踏んで、時間を溶かしたもの。

### 2.1 非列挙アクセサ（最重要）

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

**派生する罠**: `state.plants` のような単数形アクセサは*行動主*を指す。
「任意のプレイヤーの植物を除去」をこれで書くと**自分を攻撃する**（§2.5 の実例）。

### 2.2 テストが乱数を読んでいる

**このセッションだけで4回踏んだ。** 症状は「数回に1回落ちる」。

原因は3層あり、対策も3段階になる。

| 乱数源 | 症状 | 対策 |
|---|---|---|
| 企業がランダム（13社） | 初期資源・生産量が毎回違う | 差分で測る |
| **企業効果が値そのものを変える** | 差分でも落ちる | `corporationId` を固定 |
| 植民地タイルがランダム | 交易の**収入**が毎回違う | 初期値だけ違う2本の差を取る |
| **世界的イベントがランダム** | 開始時の dominant party が毎回違う | `globalEventOrder` で配りを固定 |

最後の1つは 2026-08-07 に足された経路。セットアップが引いた2枚のイベントが
中立代表者を配置し、それが開始時の dominant party を決めるため、
**盤面がシャッフル依存になった**。これで既存テスト5本が乱数を読む状態になり、
実行ごとに落ちる組み合わせが変わった。

`getInitialState({ globalEventOrder: [...] })` で配りを固定できる。
`tests/turmoil.test.mjs` の `pinnedTurmoilState()` がその形。
**Turmoil のテストで dominance を読むなら必ず固定すること。**
固定すると kelvinists に中立2個が乗った状態から始まるので、
「ある政党を優勢にする」には**3個**必要になる（空の政党を使うなら別）。

```js
// 悪い例 — 企業を引くたびに変わる
assert.equal(after.energyProd, 1);

// 良い例 — 差分
assert.equal(after.energyProd, before.energyProd + 1);

// 差分でも足りない例 — Beginnerを引くと研究が無料になる
state.players = state.players.map(p =>
  p.id === buyer ? { ...p, corporationId: "corp-teractor" } : p
);
```

**「支払い後の残高」は価格ではない。** Callisto は交易報酬に電力2を払うので
`5 - 3 + 2 = 4`。収入を伴う操作では、初期値だけが違う2本を比べれば収入が相殺される。

**「1ゲームを fork すれば固定」も嘘のことがある。** `getInitialState` を毎回呼ぶ
ヘルパーは、fork してもタイル自体が毎回違う。

> **ローカルで数回通っても「直った」証拠にならない。**
> 落ちる確率を見積もってから試行回数を決めること。
> 13社中1社なら約8%。6連続成功はただの運で、実際にCIでだけ落ちた。

### 2.3 「成功を返すが何もしない」

エラーを出さず、条件が偽になるだけのコードが繰り返し出てくる。

- `applyCardAction` が `cardId` を渡さず、資源が置かれない
- `getCardPlayableStatus` は「コストと条件」の判定で、**所持を見ない**。
  手札0枚でも428枚中272枚が `playable: true` を返す
- `computeScore` は該当カードを見つけられなければ**黙って加算しない**

**得点計算は特にこの性質が強い。** 実際に4枚が0点になっていたが、
例外もログも出ていなかった。**合計点だけ見ても妥当な値に見える。**

> カードを1枚ずつ「置いた場合と置かない場合の差」で測らないと発見できない。
> 「テストが通っている」も「例外が出ない」も、この種のバグの証拠にはならない。

### 2.4 「二重に見える」と「二重に動く」は別

同じ効果が2箇所にあるのを見つけたとき、**実測と到達性の両方**を確かめる。

実例: `placeTileAt` が Tharsis に mcProd+1/MC+3 を払っており、`page.tsx` にも
同じブロックがあった。実測すれば「二重取りになる」。しかし到達性を調べると
`placementMode.type` は `"forest"` 固定で、`type === "city"` になる経路が無かった。

- 実測だけで消す → 生きたコードを削る危険
- 到達性だけで消す → 死んだコードを残す

### 2.5 攻撃カードは対象を「選ばせる」必要がある

「任意のプレイヤーから〜」は、**必ず pending choice を経由**する。
直接適用すると単数形アクセサ経由で行動主に当たる（§2.1）。

実装は共通経路にまとまっている:

| 種別 | choice kind | ledgerの種別 |
|---|---|---|
| 資源の除去 | `resource-attack` | `resource-removal` |
| 資源の奪取 | `resource-steal` | `resource-removal` |
| カード上の資源の除去 | `resource-steal`（`targetCardId` 付き） | `resource-removal` |
| 生産量の低下 | `production-attack` | `production-decrease` |

**ソロは例外。** 相手がいないので直接適用する。
`players.length > 1` で分岐しており、これを外すと**ソロで二重適用**になる。

**ただし `resource-steal` にはこの分岐が無い。** ソロでも choice を出す。
相手の手持ちを狙う選択肢は候補0になって自然に消えるが、
Virus の動物のように**自分のカードが正当な対象になる**効果は
ソロでも選択が必要だからで、これは意図的。ここに `players.length > 1` を
足すと**ソロで Virus が何もしなくなる**。

実際に減った場合だけ `generationAttackLedger` に記録される。
自己攻撃・対象資源0・任意効果の辞退では記録しない（Law Suit の対象判定に使うため）。

### 2.6 `npm test` はビルドを挟む

`npm test` は `npm run build` を実行してからテストする。
ビルド中に走ると古い成果物を読んで落ちることがある。

**1回の失敗では判断しない。3回連続で確認すること。**

`static-dist/index.html` を読むテストが2件ある。ローカルには過去のビルドが
残っていて通るが、CIには無い。CIには `npm run build:static` を入れてある。

### 2.7 効果スペックはキーのホワイトリスト

`normalizeBehavior` は既知のキーだけを拾う。**未知のキーは黙って捨てられる。**

新しい挙動を足すときは:

- `card.effectSpec.behavior` に書く → normalize を通る（キーの追加が必要）
- `card.effect` に書く → **normalize を素通りする**（`getCardEffect` の1行目）

St. Joseph の `buildCathedral` は後者を使っている。
Flooding は `{tr:{oceans:1}}` という誰も読まない形で書かれていて、
**海洋を1枚も置いていなかった**。

### 2.8 カード資源の種別は別ファイルにある

**カタログ本体に `resourceType` は入っていない。** 動物・微生物・フローターなど
「カードの上に乗る資源」の種別は `app/card-resource-types.js`（72枚、生成物）にある。
リファレンス実装の `resourceType` 宣言から
`scripts/generate-card-resource-types.mjs` が吸い出したもの。

```js
collectResourceTargets(state, "animal", ALL_CARDS, {
  mustHaveResources: true,
  getResourceType: getCardResourceType   // ← これを渡さないと1枚も見つからない
});
```

**`getResourceType` を渡し忘れると、例外ではなく「対象0枚」になる**（§2.3の類型）。
`collectResourceTargets` は `card.resourceType` を先に見て、無ければこの関数に訊く。
両方空振りすると黙って候補から外れる。

置く方向（`addResourcesToAnyCard`）と取り除く方向（Virus）で同じ関数を使う。
Microbe / Science / Floater / Asteroid なども同じ経路で書ける。

**カードの上の資源とプレイヤーの手持ちは別物。** `resource-steal` の選択肢は
`targetCardId` があればカード上の資源、無ければ手持ちを指す。分岐を消すと
Virus が相手の植物を消す側に落ちる。

---

## 3. アーキテクチャの原則

**`app/game-command.js` が唯一の状態変更入口。**

```
オンライン: UI ──command──> Durable Object ──> executeGameCommand
ソロ:      UI ────────────command────────────> executeGameCommand
Bot:       ────────────────command────────────> executeGameCommand
```

ここが引き受けているもの:

- 手番検証・フェーズ検証・所持検証
- **アクション消費**（成功時のみ1回。選択を伴う場合は最後の選択時に1回）
- 企業トリガーとパラメータ閾値ボーナス（`afterPlay` continuation）
- pending choice がある間の他操作のブロック

### ルールを追加・修正するとき

**必ずコマンド層かエンジンに実装する。** 以下は禁止:

```
オンラインだけ修正 / ロボットだけ例外処理 / page.tsx だけボーナス追加
```

UI・サーバー・ボットは「何をしたいか」を送るだけ。
「それが可能か」「何が起きるか」を決めるのはエンジンだけ。

この原則を破った結果として、同じ「カードをプレイする」処理が4箇所に
別実装で存在し、片方だけ直したバグが繰り返し再発していた（配置ボーナス二重加算、
TR加算漏れ、ロボットの海洋二重加算など実際に4件）。**移行は完了している。**

### 得点計算は二段構成

`app/scoring.js` が、**ゲーム全体から寄与を生成してからプレイヤーごとに合算する**。

```js
buildScoreContributions(state, options)  // 全寄与を一度に生成
calculateScoreBreakdowns(state)          // プレイヤーIDごとの内訳
computeScore(state, playerId)            // 既存呼び出し互換のラッパー
```

この形でないと「**他人に点を与えるカード**」が原理的に書けない
（Law Suit は相手に−1VP、Vermin は全員に−VP）。

- `points` は負数を許可。**合計は0で丸めない**
- 得点を受ける人物は必ず `targetPlayerId` で指定する
- カード所有者と得点対象者は分離されている

### タグを数えるとき

**`countActiveTags(state, playerId, tag)` を使う。** 数えるのは:

```
企業タグ ＋ 場に残る緑・青カード ＋ 選択済みPrelude
```

赤イベントは解決済みなので**数えない**（`playedEvents` へ移る）。
以前は逆で、イベントのタグが永続し、Preludeのタグは無視されていた。

**ただしイベントの「枚数」を数えるものは別。** Legendマイルストーン（イベント5枚以上）は
`playedEvents` と `playedProjects` の**両方**を読む。旧セーブはイベントが
`playedProjects` に残ったままだからで、片方だけ読むと過去のセーブで0枚になる。

### UIに残る直接変更

```
.mc  ±=   0箇所
.tr  ±=   1箇所   （最終緑化でTRを戻す1行）
Prod ±=   0箇所
```

残る `.tr` 1箇所は、`placeTile` が上げたTRを最終緑化フェーズで戻すもの。
engine が「最終緑化ではTRも酸素も動かない」を知らないための後始末。
engine 側に寄せるのが本筋だが未実施。

---

## 4. 主要ファイル

| ファイル | 役割 |
|---|---|
| `app/game-command.js` | **唯一の状態変更入口**。ここにルールを追加する |
| `app/game-logic.js` | エンジン本体（約3000行）。カード効果・盤面・フェーズ |
| `app/scoring.js` | 得点計算。寄与生成と集計（§3） |
| `app/pending-choice.js` | 選択肢の組み立て。`continuation` は明示列挙 |
| `app/official-content.js` | カタログへの上書き。生成物を直接編集しないための層 |
| `app/page.tsx` | UI。ルールを持たない |
| `worker/room.ts` | Durable Object。認証・配信・永続化。ルールを持たない |
| `app/bot-player.js` | ボットAI。合法手を列挙して得点差で評価 |
| `app/player-state.js` | アクセサ互換層（§2.1） |
| `app/save-migration.js` | セーブ移行。`CURRENT_RULES_VERSION = 5` |
| `app/net-protocol.js` | 通信形式と `viewForPlayer`（プライバシーフィルタ） |
| `app/board-milestones.js` | マップ別の称号・褒賞 |
| `app/global-events.js` | 世界的イベント36枚の効果スペック（宣言的。§6.3に未対応8枚） |
| `app/full-card-catalog.js` | **生成物。直接編集しない**（`official-content.js` 経由） |
| `app/card-resource-types.js` | **生成物**。カード上の資源種別72枚（§2.8） |
| `app/card-art.data.js` | 428枚のカードアート（生成物、689KB） |

### 生成スクリプト

```
scripts/generate-boards.mjs        4マップ盤面（リファレンス実装から移植）
scripts/generate-japanese-text.mjs カード名・効果の日本語
scripts/build-card-art.mjs         SVGアートの検証とバンドル
scripts/check-card-art.mjs         主題が中央にあるかの機械検査
scripts/generate-card-resource-types.mjs  カード上の資源種別（§2.8）
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
- **ドラフト制**（ロビーで選択。初期10枚も対象。世代ごとに向きが反転）
- **ロボット戦**（3難易度。得点差で評価）
- **オンライン対戦**（部屋コード、5拡張＋5マップ選択）
- **特殊得点カード3枚**（Law Suit / Vermin / St. Joseph）— 得点・効果とも完全実装
- **攻撃カード7枚**（Hired Raiders / Sabotage / Virus / Air Raid /
  Special Permit / Comet for Venus / Flooding）— 対象選択と履歴記録
  - Virus は「任意のカードから動物2」「任意のプレイヤーから植物5」の
    **両分岐とも実装済み**。1つのダイアログに両方が並ぶ（§2.8）
  - Special Permit はグリーン与党を立てた実プレイ経路でテスト済み
- **Solar Phase**（公式の順序で1本化）
  1. Game End Check → 2. World Government Terraforming（Venus有効時）
  → 3. Colony production（交易船返却＋全トラック+1）→ 4. Turmoil
- **Turmoil の世界的イベント36枚**（`app/global-events.js` の宣言的スペック）
  - 影響力を数え、「数えるものは最大5」の上限を持つ
  - 損失は影響力で軽減してから適用する
  - **`effectText` を文字列解析しない。** 表示用の日本語であり、
    そこから挙動を復元するのは推測になる
  - `missingGlobalEventEffects` が空であることをテストで担保。
    スペックの無いカードを足すと落ちる

---

## 6. 未対応・未確認の一覧

**ここが次にやること。**

### 6.1 ブラウザで一度も動作確認していない（最優先）

**テスト343件・CI・プレイテストはすべて通っているが、実機はほぼ未確認。**
型・lint・ビルドはどれも見た目を検証しない。

**2026-08-07 の時点で Chrome 拡張は接続できる。** 過去のセッションでこの項目が
先送りされ続けた原因（拡張が繋がらない）は解消している。
`npm run dev` → `localhost:3000` でタイトル画面が正しく描画されることまでは確認済み。
**その先（ソロ開始以降）は未確認。** 下の表がそのまま残っている。

確認すべきもの:

| 対象 | 見るべきこと |
|---|---|
| タイトル → ソロ | 拡張選択パネルを経て開始できるか |
| タイル配置 | 合法マスが光り、クリックで置けるか。バナーが操作を遮らないか |
| カットイン | 中央に出て1秒で消えるか。盤面クリックを妨げないか |
| 購入フェーズ | 手札が見えるか（プレイは `WRONG_PHASE` で拒否済み） |
| 企業アクション | Ecoline / UNMI / Robinson のボタンが出て発火するか |
| 特許売却 | モードに入れるか |
| **pending choice 中** | 「先に選択を解決してください」が**操作不能に見えないか** |
| 特殊VP3枚 | カード面バッジが `-1` / `特殊` / `1` と出るか |
| 攻撃カード | 対象選択ダイアログが出るか |
| 最終得点画面 | 内訳が合計と一致し、負の値も表示されるか |
| **オンライン全般** | **テストで担保できていない**。2端末で企業選択・Prelude・研究購入 |

#### 特殊カードの手動確認手順

エンジン側はテスト済み。以下は**画面に出るか**だけを見るためのもので、
値が合っているかはテストが担保している。すべて2人ソロ相当の卓で足りる。

1. **Law Suit** — 相手に攻撃カードを撃たせてから Law Suit をプレイする。
   対象選択に「今世代に自分から奪った人だけ」が並ぶか。
   選ぶと MC が最大3移動し、相手の得点が −1 されるか。
   *誰にも攻撃されていない世代では対象が0人になり、カードが出せないのが正しい。*
2. **Vermin** — 都市を置くたびに Vermin に動物が乗るか。
   二択アクションの両方が押せて、選んだ側だけが起きるか。
3. **St. Joseph** — 都市を選ぶダイアログが出るか。
   選んだ都市に大聖堂が描かれ、同じ都市が二度選べないか。
4. **特殊VPのカード面** — Law Suit `-1` / Vermin `特殊` / St. Joseph `1` の
   バッジが**カード表面**に出るか。
5. **最終得点内訳** — 負の VP が `-1` と表示され、合計と内訳が一致するか。
   **0で丸められていないこと**を必ず見る（丸めるのは実際にあったバグ）。
6. **オンラインの秘匿** — 2端末で、片方の pending choice の選択肢と手札が
   **もう片方の画面・DevTools のネットワークタブどちらにも出ない**こと。
   `viewForPlayer` のフィルタは過去に破れている（§2.1）ので、
   画面だけでなく**受信 JSON を直接見る**。
7. **Virus** — 動物を乗せたカードが場にあるとき、
   「動物2」と「植物5」が**同じ1つのダイアログに並ぶ**か。
   動物が1個しかないカードは「動物 1」と表示されるか。

### 6.2 未実装・未検証のルール

2026-08-07 の再監査で、この表にあった項目はすべて公式ルールブックと突き合わせて
**修正済み**。以下は当時の指摘と結果の対応。

| 項目 | 結果 |
|---|---|
| World Government Terraforming（Venus） | 実装済み（Solar phase step 2） |
| 植民地トラックが世代終了時に上昇しない | 確定バグ→修正（`advanceColonyProduction`） |
| Turmoil の世界的イベントが効果を発動しない | 確定バグ→36枚すべて実装 |
| 有料代表者（予備から5MC）が無料で送れる | 確定バグ→修正 |
| Prelude ソロの世代数 | **12世代に修正**（出典が見つかった、下記） |

再監査で新たに見つかり、あわせて直したもの:

- **旧与党のボーナスが支払われていた**。`runTurmoilPhase` は `advanceTurmoil` の
  *前* にボーナスを払っていた（変数名も `outgoing`）。公式は 3a で与党交代 →
  3b で**新**与党のボーナス
- **与党になった政党の代表者が盤上に残っていた**。leader 1個しか除去せず、
  次世代の dominance と influence が狂う
- **Party Leader の同数処理**。`computePartyLeader` が現職を受け取らず、配列順で
  先にいる方へ交代していた。配列順と現職が一致する並びでは素通りするので、
  テストは `["A","B","B","A"]` の並びでないと検出できない
- **世界的イベントの初期配置**。3枚目を current に配っていたが、公式は
  Coming と Distant のみ（"no CURRENT Global Event to execute the first generation"）

**Prelude ソロ12世代**: 前任者は「出典が取れない」として保留していたが、
出典は手元にあった。`Downloads/MARS拡張ルール/TM_RULEBOOK_JPN_図形原状保持版.pdf`
は**ファイル名に反して『プレリュード』のルール説明書 第5刷**である
（内部名 `_PRELUDE_RULES JPN reprint 202412.indd`）。p.3 に

> 『プレリュード』を使った１人プレイ
> １人ゲームに『プレリュード』を導入する場合、**12 世代**が終了するまでに、
> テラフォーミングを完了させてください。

とある。同ページの「地球化指数ソロ」にも
「期限は14世代（ただしプレリュード・カードを導入していれば12世代）」と重ねて書かれている。
数字はページ画像を3倍に拡大して目視確認済み（§8 の数字化けの件があるため）。

> **ファイル名から中身を推定して除外しない。** この1件は
> 「TM_RULEBOOK_JPN」という名前を基本セットのものと読んで開かなかったために、
> 監査2回ぶん保留され続けた。

なお同ページには未実装の**「地球化指数ソロ」バリエーション**
（全パラメータではなく TR63 以上、標準プロジェクト「緩衝ガスの導入」16MC）もある。

**Special Permit は実プレイ経路でテスト済み。** `createTurmoilState` で Turmoil を
立てて `rulingParty` を差し替えれば、通常のコマンド経路で最後まで通せる。
Turmoil 無し・別与党・グリーン与党の3通りで拒否理由まで確認してある
（`createTurmoilState` は既定でグリーンが与党なので、テストは意図を明示するため
与党を明示的に設定している）。

### 6.3 設計上の借り

- **最終緑化のTR巻き戻し**（§3）をエンジンへ寄せる
- **非列挙アクセサの廃止**（§2.1）
- `p-capital` と `card-base-capital` の重複エントリ。
  現在は後者が配られないため実害が無いが、**汎用分岐とハードコードの両方が存在する**。
  触るときは二重計上に注意
- **WGT の対象をプレイヤーに選ばせていない。** 公式は第1プレイヤーが
  「未達成のグローバルパラメータを1段階上げる**か海洋を1枚置く**」を選ぶ。
  現状は金星→気温→酸素の順で自動選択し、海洋は選択肢に入れていない。
  `triggerProduction` の中で走るため選択を待てず、海洋は配置先の指定が要るため。
  **UI側で選択を挟む形にするのが本筋**（エンジンの修正ではない）
- **世界的イベント36枚のうち8枚は、まだ影響力ぶんの支払いしか効かない。**
  スペックは `app/global-events.js` に宣言してあるが、リゾルバがキーを読んでいない。
  選択・配置・他プレイヤーとの比較を伴うため、`pendingChoice` 経由にする必要がある。

  | イベント | 未対応のキー |
  |---|---|
  | Paradigm Breakdown | `discardFromHand`（手札2枚を捨てる） |
  | Corrosive Rain | `loseFloatersOrMc`（フローター2かMC10の二択） |
  | Election / Revolution | `contest`（全員の数を比べて順位で TR 増減） |
  | Aquifer Released by Public Council | `firstPlayerPlacesOcean` |
  | Dry Deserts | `firstPlayerRemovesOcean`, `influenceStandardResource` |
  | Cloud Societies | `addResourceToAll`, `influenceAddsToCards` |
  | Sponsored Projects | `addResourceToCardsHoldingResources` |

  **数え方**: `GLOBAL_EVENT_EFFECTS` の各スペックのキーのうち、
  `game-logic.js` の `applyGlobalEventEffect` が読むキー集合に無いものを列挙すれば出る。
  減らしたらこの表も直すこと

---

## 7. 開発の進め方

### コマンド

```bash
npm test                 # ビルド + 325テスト
npm run lint             # ESLint
npx tsc --noEmit -p tsconfig.json | grep '^app/'   # 型（worker/ の既存エラーは無視）
node scripts/playtest.mjs --games=20 --players=2 --colonies --turmoil
npm run dev              # localhost:3000
npm run deploy           # Workers へデプロイ
git push origin main     # Pages は Actions が自動ビルド
```

### 作業の型

このセッションで有効だった手順:

1. **指摘を鵜呑みにせず、現HEADで実測する。**
   一時スクリプトで状態の前後差分を取る。コード読解では
   「`ok=false` なのに state が汚れている」種類のバグを見落とす
2. **修正前に、その挙動を再現するテストを書く。**
   修正後に通ることと、**修正前に落ちること**の両方を確認する
   （`git stash` で戻して確認できる）
3. **フルスイートを3回連続**（§2.6）
4. プレイテストを全拡張構成で回す

外部監査は3回受けた。指摘の精度は高かったが、
**現HEADでは既に直っていたもの、文言が不正確なもの、
そのまま従うと新しいバグを作るものが混ざっていた。**
1件は「ボットも直接呼んでいる」という指摘で、従うと二重消費になるところだった。
一方で「攻撃カードの修正が Law Suit の前提」という指摘は、
**単独で最も重いバグ**（自分を攻撃する10枚）を掘り当てた。

**数の決め打ちも疑う。** 「6枚」と指定された攻撃カードは、
機械的に抽出すると7枚で、指定に含まれていた1枚は攻撃カードですらなかった。

### 外部AIの利用

- **Codex**（`mcp__codex__codex_ask`）: カードアート428枚のSVG生成、
  カード名381枚の翻訳、PDF解析。ファイル書き込みができる
- **sol**（`ask_codex.ps1 -Model gpt-5.6-sol -Effort high`）: 設計相談。
  **`-Effort` が正しいフラグ名**（`-ReasoningEffort` は存在しない）。
  プロンプトが長いとタイムアウトするので、質問を3点程度に絞る

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

---

## 付録: 2026-08-07 の再監査で直したもの

公式ルールブックと突き合わせて `CONFIRMED BUG` と判定したものだけを直した。

| コミット | 内容 |
|---|---|
| `1567100` | Preludeソロ12世代 / 植民地トラック上昇 / Party Leader同数 / 有料代表者5MC |
| `3adfef4` | **旧与党のボーナスが支払われていた** / 与党の代表者が盤上に残っていた |
| `4f353aa` | World Government Terraforming（Venus、Solar phase step 2）を実装 |
| `e8e519c` | 世界的イベントの初期配置（current に3枚目を配っていた）と中立代表者の配置 |
| `2161484` | 世界的イベント36枚の効果を実装（それまではログ1行だけ） |

**監査で却下したもの**: `computeDominantParty` の同数処理は
公式の "or clockwise in case of tie" と一致しており `ALREADY CORRECT`。
Party Leader の同数処理は指摘自体は正しかったが、
**「配列の先頭が選ばれる」という説明は不正確**で、
配列順と現職が一致する並びでは再現しない（§2.2）。

---

## 付録2: それ以前のセッションで直したもの

参照用。**詳細は各コミットメッセージにある。**

| コミット | 内容 |
|---|---|
| `c054678`〜`3e79b84` | アクション実行経路の一本化（全8フェーズ） |
| `e0167c7` | 到達不能な配置分岐を削除（164行減） |
| `3e83f27` | Prelude の得点が入らない／交易テストのフレーキー |
| `f743c2f` | `all: true` の2枚（Immigration Shuttles / Space Port Colony）が0点 |
| `9a79be1` | 動的VPカード38枚中17枚がカード面に `?` と表示 |
| `b6fc34a` | 得点計算を寄与ベースへ。負の得点・他人への加点が書ける形に |
| `cf376d5` | **攻撃カードが自分を攻撃していた**（10枚）。生産量攻撃の消失 |
| `a3822c0` | イベントのタグが永続／Preludeのタグが数えられない |
| `614ab38` | Vitor が動的VPに反応しない／Botがアクションを消費しない／内訳と合計の不一致 |
| `4df3866` | 特殊VP3枚の効果、攻撃カード7枚のモデル化 |
| `dad7643` | 特殊VP3枚のカード面表示 |
| （最新） | Virus の動物2個分岐／Special Permit の実プレイ経路テスト |
