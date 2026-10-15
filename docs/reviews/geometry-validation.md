# 図形探検の検証記録

コマンドの実行結果と、初回失敗を修正して再実行した履歴を記録する。最終実行の終了コードと件数は `artifacts/geometry/validation-summary.json` に保存する。

| 検証 | 結果 |
| --- | --- |
| 全45問を実画面で回答し各解説を確認 | 最終全E2Eで成功。各問の問題・解説と全正解輪郭を撮影し、`artifacts/geometry/manifest.json` に記録。 |
| 基本30問のSVG寸法・比率・画面幅 | 最終全E2Eで375、768、1280pxの全30問を検証。SVG寸法、viewBox、比率、描画範囲、横はみ出しを確認。成功。 |
| キーボード、入力、連打、保存と報酬 | Geometry専用E2E 17件成功。キーボードのみで基本・応用を完走し、入力境界、Enter長押し、同一画面の二重数字・輪郭操作、結果画面遷移を確認。誤答後は4/5、再クリア後もカード1枚・履歴2件。 |
| `bun run typecheck` | PASS。実行ログ: `/tmp/geometry-final-typecheck.log`。 |
| `bun run test` | PASS。Vitest 3.2.4、11ファイル58件成功。ログ: `/tmp/geometry-p4-unit.log`。 |
| `bun run test:e2e` | PASS。Playwright 1.64.0、59件成功、失敗・skipなし、12.1分。ログ: `/tmp/geometry-final-e2e.log`。 |
| `bun run build` | PASS。Vite 6.3.5で71モジュールを生成。ログ: `/tmp/geometry-final-build.log`。 |
| 実装エージェントによる教材画像レビュー | 全45問・輪郭画像と代表画面18枚を確認。詳細は[教材確認記録](geometry-content.md)。第三者によるレビューを意味しない。 |

## 再実行履歴

| 実行 | 結果 | 備考 |
| --- | --- | --- |
| 初回の草稿E2E | 中断、55件未実行 | フォーカス・経路条件の草稿修正前に停止。 |
| 早期のGeometry集中ドラフト | 未完了 | 出力上は12件成功を確認したが、実行の最終サマリーを回収できず、終了状態は未確定。 |
| Geometry集中実行2回目 | 14成功・2失敗 | 1件は誤ったARIAロール期待、1件はTabが数値ボタンに移動する想定違い。 |
| Geometry集中実行3回目 | 15成功・1失敗 | 最終結果画面が連続クリックでステージ選択へ遷移する実UI不具合。ログ: `/tmp/geometry-focused-e2e-final-bug.log`。 |
| T7修正後の独立Geometry検証 | 成功 | 5件の実UIケース、型検査、本番ビルド。 |
| T10最終全体回帰 | 59成功、失敗・skipなし | `/tmp/geometry-final-e2e.log`。所要12.1分。 |

## 実行環境と証跡

- Node.js 24.18.0、Bun 1.3.14、Playwright 1.64.0、Chromium（Playwright同梱）。
- 画像134枚、合計約3.0 MB。マニフェストSHA-256: `603d8a983b86f49462082834a840503a2b245fb0a35698bf395ce8e351c18942`。
- 各問の問題・解説・輪郭画像対応は[manifest](artifacts/geometry/manifest.json)、ステージ別一覧は[コンタクトシート](artifacts/geometry/contact-sheet.html)。

PlaywrightはローカルのChromiumと本番プレビューで実行します。実機・他ブラウザー・公開環境の検証を意味しません。
