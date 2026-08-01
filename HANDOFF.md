# MARS FRONTIER 引き継ぎ書

更新日：2026-08-01

## 現在の公開状態

**公開ゲーム**：[https://akatsuki11horizon26-create.github.io/terraforming-mars-online/](https://akatsuki11horizon26-create.github.io/terraforming-mars-online/)

GitHub Pagesはログインなしで閲覧でき、ページ本体、JavaScript、カード台帳の読み込みを確認済みである。

**公開リポジトリ**：[https://github.com/akatsuki11horizon26-create/terraforming-mars-online](https://github.com/akatsuki11horizon26-create/terraforming-mars-online)

リポジトリ名は`mars-frontier`から`terraforming-mars-online`へ変更した。

旧リポジトリURLはGitHubのリダイレクトで移行される。

公開リポジトリはソースコードではなく、`static-dist`の静的成果物を置くデプロイ用リポジトリである。

**ローカルソース**：`C:\Users\takkun\Documents\mars-frontier`

ローカルソースリポジトリにはGitHubのリモートを設定していない。

カード実装の基準HEADは`8ded346 Complete expansion catalog metadata`である。

引き継ぎ書は後続コミットで追加している。

公開成果物のHEADは`f8a295e Fix renamed Pages base path`である。

## 収録カードの範囲

公式商品として扱った範囲は、基本セット、Corporate Era、Prelude、Venus Next、Colonies、Turmoil、Prelude 2、公式Promoである。

対象範囲の確認には[FryxGames公式の拡張一覧](https://fryxgames.se/product/terraforming-mars-expansion-bundle/)、[Prelude 2](https://fryxgames.se/product/terraforming-mars-prelude-2/)、[Turmoil公式ルール](https://fryxgames.se/wp-content/uploads/2023/07/TM_TURMOIL_ENG_RULESi.pdf)を使用した。

| 種別 | 枚数 |
| --- | ---: |
| プロジェクト | 428 |
| 標準プロジェクト | 10 |
| 標準アクション | 2 |
| 企業 | 49 |
| Prelude | 70 |
| Turmoilグローバルイベント | 36 |

プロジェクトの内訳は、基本208枚、Colonies49枚、Prelude系31枚、公式Promo74枚、Turmoil17枚、Venus Next49枚である。

Preludeの内訳は、Prelude35枚、Prelude 2 25枚、公式Promo10枚である。

Ares、Pathfinders、The Moon、Underworld、CEOs、コミュニティ拡張、Star Wars、Deltaなどの非公式または別作品向けモジュールは対象外である。

HellasとElysiumはカード拡張ではないため、今回のカード台帳には含めていない。

## 実装の構成

`app/full-card-catalog.js`は生成済みの全カード台帳である。

各カードは、識別子、名称、拡張名、参照元、種類、コスト、タグ、条件、効果本文、VP、効果仕様を保持する。

`app/official-content.js`は既存の日本語カード定義と生成台帳を名称でマージする。

既存の日本語定義があるカードは、日本語表示と個別実装を優先する。

`app/game-logic.js`はゲーム状態、ターン遷移、カード効果、企業効果、Prelude効果、要件判定、支払い、VP計算を担当する。

`app/page.tsx`はセットアップ、カード購入、カード表示、アクション、標準プロジェクト、金星トラック、保存データの復元を担当する。

`scripts/generate-full-card-catalog.ts`は参照実装からカード台帳を再生成するスクリプトである。

参照実装の既定パスは`C:\Users\takkun\AppData\Local\Temp\tm-reference`で、`TM_REFERENCE`環境変数で変更できる。

参照実装から自動ロードできなかった6枚は、生成スクリプト内の補完定義で保持している。

`scripts/export-static.mjs`はサーバー出力をGitHub Pages向けの静的ファイルへ変換する。

GitHub Pagesのリポジトリ名を変更した場合は、`BASE_PATH`を新しいリポジトリ名に合わせて設定する必要がある。

## 実装済みのゲーム処理

基本的なソロゲームのセットアップ、研究フェーズ、1ターン2アクション制、パス、世代終了時の生産、最終緑化を実装している。

生産、資源、温度、酸素、金星、海洋、都市、緑地、ドロー、支払い、コスト割引、条件、カード資源、動的VPを共通効果処理へ接続している。

企業の初期資源、生産、初期アクションと、Preludeの初期資源、生産、無料プレイ、任意支払いを処理している。

効果本文、コスト、タグ、条件、固定VP、拡張名は全件表示できる。

## 未実装として扱う処理

カード台帳が全件あることと、全カードの複雑な選択処理が完了していることは同じではない。

次の効果は、誤った自動適用を避けるため、未実装ログを出すか、アクションを実行不可としている。

- 任意のカードを対象にする資源配置
- 標準資源の種類を選ぶ効果
- 複数候補から効果を選ぶ処理
- Coloniesの植民地、艦隊、交易、報酬
- Turmoilの政党、影響力、代表者、世界的イベントの状態遷移
- 特殊タイル配置と対象マス選択
- 相手プレイヤーを対象にする効果

これらを完全に実装するには、カード効果の選択待ち状態とUI、Colonies状態、Turmoil状態をゲーム状態へ追加する必要がある。

## 検証結果

`npm test`は22件すべて成功している。

`npm run lint`は成功している。

`npm run build:static`は成功している。

カタログ検証では、全カードに本文、拡張名、参照元があり、生成時の本文フォールバックが残っていないことを確認している。

`npx tsc --noEmit`には、アプリ本体ではなくCloudflare型定義の不足による既存エラーが残る。

該当箇所は`db/index.ts`の`cloudflare:workers`、`worker/index.ts`の`Fetcher`と`D1Database`である。

## 変更後の確認手順

ソース変更後は、プロジェクトディレクトリで次を実行する。

```powershell
cd C:\Users\takkun\Documents\mars-frontier
npm test
npm run lint
$env:BASE_PATH = '/terraforming-mars-online'
npm run build:static
Remove-Item Env:BASE_PATH
```

カード台帳を再生成するときは、参照実装が存在することを確認してから次を実行する。

```powershell
cd C:\Users\takkun\Documents\mars-frontier
node_modules/.bin/tsx scripts/generate-full-card-catalog.ts
npm test
```

`npx --yes tsx`ではなく、プロジェクト内の`node_modules/.bin/tsx`を使う。

静的成果物は、公開リポジトリを一時ディレクトリへcloneしてから置き換える。

```powershell
$artifactWork = Join-Path ([System.IO.Path]::GetTempPath()) ("terraforming-mars-pages-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $artifactWork | Out-Null
git clone https://github.com/akatsuki11horizon26-create/terraforming-mars-online.git $artifactWork
Get-ChildItem -LiteralPath .\static-dist -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $artifactWork -Recurse -Force }
git -C $artifactWork add -A
git -C $artifactWork commit -m "Publish static build"
git -C $artifactWork push origin main
```

push後は、GitHub ActionsのPagesビルドと、次のURLの応答を確認する。

```powershell
gh run list --repo akatsuki11horizon26-create/terraforming-mars-online --limit 3
gh api repos/akatsuki11horizon26-create/terraforming-mars-online/pages --jq '{url:.html_url,status:.status}'
```

## Sitesの状態

`.openai/hosting.json`にはSitesのプロジェクトID`appgprj_6a6c1384deb48191ac3bb942012e8266`が設定されている。

最後に保存したSitesバージョンの公開処理はCloudflare APIの522で失敗した。

ChatGPTログイン不要という要件を満たす公開先は、GitHub Pagesを正とする。

Sitesを再試行する場合は、必ず`.openai/hosting.json`を読み、現在のHEADと一致するアーカイブをSitesへ保存してからowner-only公開を行う。

## 次に実装する項目

1. カード対象選択を表す選択待ち状態とUIを追加する。
2. 任意カードへの資源配置、標準資源選択、複数候補選択を接続する。
3. Coloniesの植民地、艦隊、交易、報酬をゲーム状態へ追加する。
4. Turmoilの政党、影響力、代表者、世界的イベントをゲーム状態へ追加する。
5. 特殊タイルと相手プレイヤー対象効果を個別に実装する。
6. カード本文と効果仕様の差分検出を自動化する。

## 参照資料

- [Terraforming Mars公式ルール](https://fryxgames.se/wp-content/uploads/2023/04/TMRULESFINAL.pdf)
- [Terraforming Mars公式拡張一覧](https://fryxgames.se/product/terraforming-mars-expansion-bundle/)
- [Colonies公式ルール](https://fryxgames.se/wp-content/uploads/2023/07/TM_COLONIES_ENG_RULESi.pdf)
- [Turmoil公式ルール](https://fryxgames.se/wp-content/uploads/2023/07/TM_TURMOIL_ENG_RULESi.pdf)
- [公式実装を参照したオープンソースリポジトリ](https://github.com/terraforming-mars/terraforming-mars)
