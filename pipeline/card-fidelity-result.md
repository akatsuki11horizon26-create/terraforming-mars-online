# カード忠実度実装結果

## 実装済み

- 基本セットの実在プロジェクト20枚へカードプールを置換した。
- 基本セット13企業（Beginner Corporationを含む）とPrelude追加5企業、Prelude 1の35枚を登録した。
- 企業2枚から1枚、初期プロジェクト10枚の購入、Prelude 4枚から2枚の順にセットアップするよう変更した。
- Prelude内の任意支払い、初期資源・生産、タイル配置、温度・酸素・海洋、ドロー、タグ条件、コスト割引、アクションカードを共通効果処理へ接続した。
- 複数海洋カード、Search for Lifeの科学資源、Capitalの隣接海洋VP、企業の代表的な初期・反復効果を処理するようにした。
- 古い保存データは`rulesVersion`不一致として破棄し、新状態へ移行する。

## 検証

- `npm test`: 21 tests passed
- `npm run lint`: passed
- `npm run build`: passed
- `npx tsc --noEmit`: アプリコード以外の既存Cloudflare型定義不足のみ残る（`cloudflare:workers`、`Fetcher`、`D1Database`）。

## 対象範囲

カードデータは基本セット全208枚ではなく、現在のソロUIで配布する20枚を原作カードへ置換したもの。Prelude 1の35枚と企業18枚は全件登録している。残りの基本プロジェクトカードを追加する場合は、同じ効果操作へ照合して拡張する。
