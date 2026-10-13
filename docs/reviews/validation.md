# ブラウザー検証記録

更新日：2026-10-14

## 実行環境

- OS：Windows 上の `/mnt/c` ワークスペースから起動した Linux Chromium
- Node.js：v24.18.0
- Bun：v1.3.14
- `@playwright/test`：1.64.0
- Chromium：Playwright 同梱 Chromium 156.0.8078.4
- E2E サーバー：本番ビルドを `vite preview` で `127.0.0.1:4173` に配信
- Playwright の browser context はテストごとに分離し、並列ワーカー数を1に固定

## シナリオと証跡

| ID | 確認内容 | 実行先 | 結果 |
| --- | --- | --- | --- |
| B1 | ホーム、4アプリ、設定、直接URL、戻る・進む、`/#/unknown`・`/#toString`・`/#constructor`・`/#unknown` | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B2 | 九九の誤答・ヒント・再挑戦、9問完了、図鑑・再読込・再クリア・中断 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B3 | 通常・個数/金額かけ算、誤ったかご、訂正、誤答・ヒント、スタンプ・再挑戦 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B4 | 通常漢字の2・3年生、読み/使い方、5問完了・宝物帳・再読込 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B5 | よみわけの両方誤答、片方誤答、正解保持、5文完了、文単位の初回得点・専用宝物 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B6 | 3演算×10/25/100ます、0、空欄、負数、小数、文字、訂正・Enter | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B7 | 計時なし/あり、誤答訂正の不適格、演算別ベスト、途中離脱 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |
| B8 | 壊れた/不正/未知バージョン、get unavailable、quota、再読込、取消/確定リセット、他キー保持 | `tests/e2e/persistence.e2e.ts` | PASS（最終全体実行） |
| B9 | 375/768/1280幅のホーム、ゲーム、結果、収集、主要操作サイズ、100ます表の内側スクロール | `tests/e2e/accessibility.e2e.ts` | PASS（最終全体実行、画像を出力して一部を目視） |
| B10 | タッチ相当、キーボード、ラベル/フォーカス、`prefers-reduced-motion`、console/page error | `tests/e2e/accessibility.e2e.ts` | PASS（最終全体実行） |
| B11 | 九九・買い物・漢字・よみわけ・計算の連打、Enter/repeat、古い回答、完了ガード | `tests/e2e/interactions.e2e.ts` と `suite.e2e.ts` | PASS（通常漢字/よみわけは最初の進行でEnterリピートを確認。前回答の混入なし、完了記録は1回） |
| B12 | 全33カタログ行と実教材/計算条件、完了記録のモード・ステージ・問題数、報酬ID分離 | `tests/e2e/suite.e2e.ts` | PASS（最終全体実行） |

画面幅は Playwright の viewport と touch 対応 context で確認する。375/768/1280pxのホーム、よみわけ結果、計算表の画像を `tests/e2e/artifacts/` に保存した。各幅のホーム画像、375pxのよみわけ結果と計算表、768px/1280pxのホームを目視確認した。実機のタッチ操作や Chromium 以外のブラウザー互換性は未確認。

Playwright による自動確認に加えて、実行中の production preview で `agent-browser` を使い、375×900pxのよみわけ画面を確認した。2つの読み選択、正誤後の正解箇所ロック、保存前の状態、page errorがないことを確認した。証跡画像は `/tmp/manabi-resume-difference-375.png` にある。console error と pageerror はPlaywrightのB10リスナーで確認した。

## コマンド

```sh
bun run typecheck
bun run test
bun run test:e2e
```

2026-10-13の最終検証は `/tmp/manabi-validation.lock` で直列化した。最新ソースで `bun run test:e2e` は Chromium で23/23件成功（1ワーカー、4.5分）。webServerが `bun run build` と production preview を起動し、E2E TypeScript検査も先に成功した。`bun run typecheck` は成功。`bun run test` は6ファイル26/26件成功（8.71秒）。ビルドも成功し、Viteは58モジュールを処理、JSバンドルは258.61 kB（gzip 80.78 kB）となった。出力ログは `/tmp/manabi-t9-resume.log`、`/tmp/manabi-t9-typecheck.log`、`/tmp/manabi-t9-unit.log`、`/tmp/manabi-t9-build.log` にある。

保存データ検証では、進行データの報酬欄に余分なキーがある場合も不正データとして安全に扱うよう修正した。以前は余分な報酬欄が `null` のとき読み込み時に例外になるケースがあり、現在は必須3種の報酬欄だけを受け入れ、余分な欄を含むデータを破損扱いにして遊べる初期状態へ退避する。ユニットテストとE2Eでこの回帰ケースを確認した。

画面の幅・端末確認は Chromium のviewportとtouch対応contextによるもので、実機や他のブラウザーでの確認ではない。記録は1ブラウザー内のlocalStorageに限り、複数タブ間の同時書き込み競合も検証していない。

## T10：本番プレビュー引き渡し確認

2026-10-13に `bun install --frozen-lockfile` を実行し、依存関係の変更がないことを確認した。続けて `bun run build` が成功し、`dist/` に本番ビルドを生成した。READMEに記載した次のコマンドでプレビューを起動した。

```sh
bun run preview --host 127.0.0.1 --port 4186 --strictPort
```

最新の本番ビルドを `bun run preview --host 127.0.0.1 --port 4186 --strictPort` で配信し、Chromiumで `/#/`、`/#/monsters`、`/#/shopping`、`/#/kanji`、`/#/calculation`、`/#/settings` の各画面を開いて見出しを確認した。新しいブラウザーcontextで九九の1の段を画面から9問完了し、localStorageの `manabi-game-hiroba.progress` に完了履歴とモンスター報酬が1件ずつ保存され、再読み込み後も保持されること、console error/pageerrorがないことを確認した。今回の出力は `/tmp/manabi-t10-preview-smoke-final.log` にある。確認後にプレビューサーバーを停止した。

買い物クエストでは、正解後に「次へ進む」ボタンへフォーカスしたままEnterを押し続けると、キーリピートが新しい設問の送信ボタンに伝わり、空欄のまま誤答扱いになる問題を修正した。正解後の続行ボタンはEnterのリピートを抑止し、回答入力も初回Enterだけを受け付ける。修正後のChromium E2Eは、かご確定と設問続行でEnterを長押しし、次の設問が表示された後もキーを離すまで空欄のまま・誤答表示なしであることを確認。その後、通常クエスト01と個数/金額かけ算クエスト05・06を最後まで解き、各満点（2/2または3/3）、クエストごとに履歴1件とスタンプ1件を確認した。統合E2Eの該当ケースは `/tmp/manabi-t9-resume.log`、単独のネイティブEnterケースは `/tmp/manabi-t9-native-enter.log` にある。

教材内容の独立した目視・意味レビューでは、45問すべてを対象に、学年相当の語彙、文脈で答えが一意になるか、選択肢とヒントの整合を確認し、監査結果を PASS とした（詳細は `docs/reviews/learning-content.md`）。このレビューで通常漢字の3問の文脈を明確化した。2年18問目は「どんなに引っぱっても切れないほど強い」とひもを結びつけ、3年4問目は発熱時に行く病院、3年12問目は寒いときに着る服を問う文にしている。通常漢字の自動テストは各問題で設定済みの正答を選び、進行・採点・報酬を検証するもので、文脈や正答の妥当性を独立に判定するものではない。45問の意味レビューはこの自動テストとは別の確認である。

このT10確認は現行 `dist/` をローカルChromiumで配信したスモークであり、全E2Eの再実行ではない。最新ソースの型検査・ユニット26件・E2E 23件・ビルドの根拠は `/tmp/manabi-t9-typecheck.log`、`/tmp/manabi-t9-unit.log`、`/tmp/manabi-t9-resume.log`、`/tmp/manabi-t9-build.log` を使用した。ブラウザー確認はChromiumに限られ、実機のタッチ操作、他ブラウザー、公開配信は未確認。複数タブ間の同時書き込み競合も未検証。既知の保存データ追加キー回帰の確認結果は上記ユニットテストとE2Eに含まれる。

## 中断後の証跡の状態

再開時に環境の一時領域が更新され、上記 `/tmp/` の検証ログと手動画像は参照できないことを確認した。過去の実行結果は本記録と計画書の独立検証・引き継ぎ記録に保持している。`tests/e2e/artifacts/` の画像と本番ビルドは残っている。最終評価はこの状態を踏まえて再開し、保持されたPlaywright HTMLレポートから23件成功・失敗0・flaky0・スキップ0・エラーなし・1ワーカーを独立確認した。本番JSのSHA256も検証済みの値と一致している。保持レポートの抽出統計と本番ファイルのハッシュは[最終評価の証拠](artifacts/final-e2e-report-summary.json)に保存した。これは過去の実行レポートの再確認であり、テストを再実行したものではない。

## 独立最終評価

2026-10-14の最終評価は **GO**。承認仕様、全3フェーズ・10タスクの独立検証、現在の実装・45教材・保存・採点・検証コードと成果物を照合し、未解決の重大事項はないと判定した。

追加の独立ブラウザー確認では、通常の買い物クエストで実マウスのダブルクリックをかご確定・続行・数値設問の続行に行い、375pxと1280pxの両方で次の空欄が誤答にならず、最後に2/2と履歴1件・スタンプ1件が保存された。中断前に完了して直接観測した確認であり、再開時にはその一時ログが消失していることも評価に含めた。

実機・Chromium以外・複数タブ同時書き込み・公開環境の確認は承認済み範囲の対象外。ローカルで使う初版の実装・検証は完了し、公開とコミットは行っていない。
