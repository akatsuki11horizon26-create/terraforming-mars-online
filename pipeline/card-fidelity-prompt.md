あなたは実装担当。作業ディレクトリは現在のプロジェクト。

必ず最初に `pipeline/card-fidelity-spec.md` と `pipeline/card-fidelity-rubric.md` を読むこと。
仕様外の拡張や架空のカード効果を追加しないこと。既存の厳密ソロルール、静的ビルド、公開用ワークフローを壊さないこと。

`C:\Users\takkun\AppData\Local\Temp\tm-reference` はカード効果照合用の読み取り専用参照であり、そこへ書き込まないこと。原作の長文テキストや画像をコピーせず、カードID、数値、タグ、短い日本語要約、共通操作へ落とし込むこと。

実装対象は、基本セットの実在プロジェクト20枚、基本セット13企業（Beginner Corporationを含む）、Prelude追加5企業、Prelude 1の35Prelude。企業・Preludeのセットアップ選択を追加し、効果を共通操作で解決すること。現在の20枚仮カード、仮の研究フェーズ、仮の企業なし状態を置き換えること。

変更後に `npm test`、`npm run lint`、`npm run build` を実行すること。
変更点、検証結果、未対応事項を `pipeline/card-fidelity-result.md` に書くこと。stdoutの説明だけで完了にしないこと。
