---
type: Plan
title: 図形ゲーム「ずけいたんけん」実装計画
description: 承認済みの図形ゲーム仕様を、幾何判定・教材・画面・統合検証の4フェーズで実装する。
tags: [learning-games, geometry-games, implementation]
status: draft
generated: { by: planning-session/v1, at: '2026-10-15T14:57:46+09:00' }
verified:
  - { by: plan_reviewer/gpt-6-astra, at: '2026-10-15T14:58:17+09:00' }
sources:
  - id: specification
    resource: ../specs/geometry-games.md
    title: 図形ゲーム「ずけいたんけん」初版仕様（人による承認済み）
  - id: progress-contract
    resource: ../../src/shared/progress/README.md
    title: Progress and interaction contracts
  - id: existing-monsters
    resource: ../../src/apps/monsters/index.tsx
    title: 九九モンスターの進行・結果・収集実装
  - id: existing-catalog
    resource: ../../src/shared/progress/catalog.ts
    title: 完了記録カタログと検証
  - id: existing-browser-tests
    resource: ../../tests/e2e/suite.e2e.ts
    title: 共通のブラウザー回帰検証
---

# 目的と範囲

[承認済み仕様](../specs/geometry-games.md)のG1〜G11を実装する。既存の広場に「ずけいたんけん」を追加し、基本編30問・応用編15問、全9ステージ、9枚の発見カードを遊べる状態にする。

仕様は2026-10-15にユーザーが「承認」と明示し、`status: stable`、`verified.by: human:user`になった。本Planは実装前のため`draft`を保つ。仕様変更が必要になった場合は、ユーザーの判断なしにPlan側で要求を弱めない。

# 根拠と現状

- React 19・TypeScript・Vite、Bun、Vitest、Playwrightの既存構成を使う。`package.json`のバージョンと`bun.lock`を維持し、依存追加は前提にしない。
- `src/App.tsx`はハッシュルートの固定辞書、`src/pages/Home.tsx`は4ゲームのカードを持つ。追加先は`#/geometry`。
- `src/apps/monsters/index.tsx`に選択・回答・結果・収集、`src/shared/interaction/guard.ts`に古いイベントと連打を抑えるガードがある。
- `src/shared/progress/catalog.ts`の現行42エントリーは、ゲーム・モード・ステージ・問題数の一致を要求する。追加後は51エントリー。
- 保存形式はバージョン1、`history`は直近50回、報酬区分は`monster`・`stamp`・`treasure`。新しい報酬区分は作らず、図形カードを`treasure`へ加える。
- `src/apps/kanji/index.tsx`の宝物件数は`treasure:g`という前方一致を使う。`treasure:geometry...`では混入するため、図形は`treasure:shape-...`にする。
- 既存のユニットテストと`tests/e2e/suite.e2e.ts`はカタログ42件を固定で確認している。単に件数を書き換えず、既存42件の維持と追加9件の教材との対応を確認する。
- リポジトリ内の`.agents`・`.codex`は空。planning-sessionの契約はグローバルスキルから読み、OKF v0.2は`/home/kmatsu/.agents/skills/create-rules/references/OKF_SPEC.md`を読了。実装時は利用可能なimplementation-sessionスキルの契約を読む。

# 前提・制約・対象外

- ユーザー向けの画面・教材・README・検証記録は日本語。実装者向けのAPI仕様・コメントは英語でよい。
- 基本編の正解は移動と回転で一致する同形同寸。相似だけでは正解にせず、反転だけで一致する候補も正解にしない。
- 応用編の範囲は6題材のみ。三角形の種類の条件が重なる場合も仕様どおり数える。範囲外の三角形は、数える対象以外や組み合わせからできるものも除外する。
- 教材は固定45問。実行時の問題生成、学習履歴の送信、サーバー、認証、公開作業は対象外。
- 全図形を音声だけで解く代替問題は対象外。操作・フィードバック・説明はキーボードと読み上げに配慮する。
- 関係のない作業ツリーの変更を保全する。計画段階ではアプリ実装、依存更新、コミット、デプロイを行わない。

# Feature Contract

## 成果と利用者

小学2〜3年生を中心に、図形を見比べて学び、指定の種類を数える5つ目のゲームを提供する。

## 観察可能な保証

| 契約 | 保証 | 仕様の受け入れ条件 |
| --- | --- | --- |
| F1 | 6つの基本ステージ・3つの応用ステージ、各5問、全45問を選んで最後まで遊べる | G1, G2, G4, G5 |
| F2 | 回転した同形同寸だけが一致し、描画時にも大きさの差を維持する | G2, G3 |
| F3 | 正解前は答えを明かさず、全問で正解後の解説を経由する | G3, G6, G7 |
| F4 | 全輪郭の数え上げと範囲外三角形の不在を検証し、2×2格子は正方形5つになる | G4, G5, G11 |
| F5 | 全問正解後、最後の解説から結果に進むときだけ1回完了する。再挑戦は初回正解に数えない | G7, G8 |
| F6 | 旧保存データを維持し、図形の9カードと漢字の9宝物を混同しない | G8, G9 |
| F7 | 3画面幅、キーボード、連打・長押し、保存不可を検証し、既存4ゲームの回帰を通す | G9〜G11 |

既存のルート、42件のステージ・報酬ID、保存キーと形式、計算の自己ベスト、保護者向けリセットの意味を維持する。

# Execution Graph

```text
P1: T1（幾何判定） → T2（輪郭検証）
    T3（ステージ・保存契約）
             ↓
P2: T4（基本教材） → T5（応用教材）
             ↓
P3: T6（共通描画） → T7（共通進行・基本編） → T8（応用編）
             ↓
P4: T9（広場・保存の統合確認） → T10（全体検証・文書）
```

静的な依存は下記のTask Contractsを正とする。Phase完了は独立検証を経た`validated`のみ。実装状態はExecution Stateに記録する。

# Ordered Phases と Phase Contracts

## P1: 幾何判定と保存の契約

- 目的：描画に依存しない図形モデル、厳密な照合、輪郭の独立検証、9ステージの記録契約を用意する。
- 入力：承認済み仕様、既存progress・interaction契約。
- Tasks：T1、T2、T3。
- 内部完成条件：同形同寸、包含分類、線分の連結・交点、全輪郭列挙、範囲外三角形の検出が既知解のテストで検証される。旧保存データが維持され、追加9件の完了を受け付ける。
- 出力：`src/apps/geometry/domain/{types,geometry,enumerate,validate}.ts`とテスト、`src/shared/progress/geometryCatalog.ts`、既存progressの拡張。
- 後続への保証：下記「実装インターフェース」と固定IDを提供する。教材は`validateMatchQuestion`・`validateCountQuestion`で検証でき、画面実装はカタログのステージIDを用いて完了できる。
- 利用側：P2の教材、P3の進行・描画、P4の統合検証。
- 統合検証：`bun run typecheck`、`bun run test -- src/apps/geometry/domain src/shared/progress`。アプリに入口はまだ追加しない。

## P2: 全45問の教材と確認可能な正解

- 目的：基本30問・応用15問を固定教材としてそろえる。
- 入力：P1の型・分類・照合・全輪郭検証、9ステージカタログ。
- Tasks：T4、T5。
- 内部完成条件：ID重複がなく各ステージ5問、各基本問の正解が1つ。応用の全輪郭が一致し、範囲外三角形がなく、6種類・難易度・0個・回転・包含関係を満たす。
- 出力：`src/apps/geometry/data/{match,count,index}.ts`、`src/apps/geometry/domain/content.test.ts`、教材確認記録の下書き`docs/reviews/geometry-content.md`。
- 後続への保証：`getGeometryStage(stageId)`で固定順の5問、`GEOMETRY_STAGES`で9ステージを取得できる。問題には採点・描画・解説に必要な情報が欠けずに含まれる。
- 利用側：P3の両モード、P4の全問ブラウザー確認。
- 統合検証：`bun run typecheck`、`bun run test -- src/apps/geometry`。P2時点で座標と定義を照合し、実表示の全問確認はP4で完了する。

## P3: 両モードの画面と解説

- 目的：全ステージを選択から回答・解説・結果・カード帳まで動作させる。
- 入力：P1のモデル・カタログ、P2の教材、既存GameLayout・Feedback・NumberInput・guard・useProgress。
- Tasks：T6、T7、T8。
- 内部完成条件：描画の共通尺度、4択と個数回答、誤答と再挑戦、正解後の解説、全問完了後の記録・カード帳が連動する。単独の開発用確認だけで実装完了とせず、P4で公開ルートを通して統合検証する。
- 出力：`src/apps/geometry/index.tsx`、`components/*.tsx`、`styles.css`、`domain/session.ts`とテスト。
- 後続への保証：デフォルトexportのゲームコンポーネントを`#/geometry`に登録できる。画面は内部stateで切り替わり、アンマウント・再読み込みでは選択に戻る。アプリ内部はテスト目的の新ルートや正解露出のUIを追加しない。
- 利用側：P4のホーム・ルートとブラウザーテスト。
- 統合検証：`bun run typecheck`、`bun run test -- src/apps/geometry src/shared/interaction`、`bun run build`。

## P4: 広場への追加と受け入れ確認

- 目的：5つ目の入口を公開し、全45問の表示、保存互換性、既存4ゲームの回帰を確認して文書化する。
- 入力：P1〜P3の全成果、既存E2E・README・検証記録。
- Tasks：T9、T10。
- 内部完成条件：G1〜G11の証拠がそろい、全テストとビルドが成功。実施した確認と制限を区別して報告する。
- 出力：ホームとルート、E2E・教材確認用スクリーンショット、README・progress契約と日本語検証記録。
- 後続への保証：新セッションの最終評価者が仕様の各G項目をコード・テスト結果・教材記録に追跡できる。
- 利用側：最終評価・利用者。
- 統合検証：`bun run typecheck`、`bun run test`、`bun run test:e2e`、`bun run build`。E2Eは既存の本番プレビュー設定を使う。

# 実装インターフェース

## 図形モデルと数値

- `ShapeKind`は`circle | square | rectangle | equilateral | isosceles | right-triangle`。分類結果は1つのラベルではなく該当する種類の集合とする。
- `Point`は有限な`x, y`。基本図形は`Circle { center, radius }`または`Polygon { vertices }`で表し、拡大・回転・移動は同じモデル上で行う。正解の種類ラベルだけで合同と判定しない。
- 幾何比較は`EPS = 1e-6`、数値比較は`abs(a-b) <= EPS * max(1, abs(a), abs(b))`を基準とし、座標は小さい教材単位で制限する。許容差と退化判定は英語のdomain READMEまたはAPIコメントに記す。目視で同じに見えるほど近い不正解は作らない。
- `isSameSizeAndShape(a, b)`は移動・回転による一致を判定する。円は半径、凸多角形は頂点の対応と長さ・向きの整合を確認する。頂点列の開始位置・列挙順の違いは図形そのものの反転と混同しない。
- 見本と候補は共通`viewBox`と同一の正方形枠・アスペクト比を使う。図形ごとのbounding boxに自動フィットしない。重ね合わせ用の回転・移動も合同判定の対応情報から得る。

## 応用図と独立検証

- `CountDiagram`は直線分一覧と、任意の独立した円一覧を持つ。座標・IDは描画と検証で共通に使う。応用図は原則32線分以下・交点込み36頂点以下とし、超過時は教材を簡素にする。要求を満たせない場合はリプランし、無制限列挙へ黙って変更しない。
- 全線分の端点・交点と、同一直線上の重なりを正規化する。2点間の辺が複数の連続線分に分かれていても、区間の和が穴なく覆えば辺として認める。欠けがあれば認めない。
- `enumeratePolygons(diagram)`は端点・交点の候補から、非退化の三角形と凸四角形を列挙し、辺が図の線で完全に覆われるものだけを返す。同一直線上の中間点は角として扱わず、頂点の巡回開始や逆順で輪郭を重複登録しない。内部の線は外周の成立を妨げない。
- `classifyShape`は辺長・直角を使い、正三角形を二等辺三角形にも、正方形を長方形にも、直角二等辺三角形を両方にも分類する。
- `validateCountQuestion`は全三角形について対象3種類の少なくとも1つに属することを確認する。指定された種類に一致する全輪郭と円の集合を、手作成した`solutions`の集合に突き合わせる。単に`answer === solutions.length`だけを確認する方法は禁止。
- 円は正半径・重複なしで、他の輪郭と接触・交差しない独立した図として検証する。数える対象が円の問題でも三角形の範囲外チェックを省略しない。
- 既知解の独立した小図、包含・分割・交点・欠けた辺・重複の反例で検証器自体をテストする。正方形2×2格子は正方形5・長方形9（正方形を含む）を期待値とする。

## 固定ステージ・保存ID

`src/shared/progress/geometryCatalog.ts`にReact・教材・ゲームコンポーネントへ依存しない9ステージのmanifestを置く。既存のカタログと教材がこれを参照し、カタログから教材への循環依存を作らない。

| appId | modeId | stageId | reward ID | 問題数 |
| --- | --- | --- | --- | ---: |
| geometry | geometry-match | geometry:match-circle | treasure:shape-match-circle | 5 |
| geometry | geometry-match | geometry:match-square | treasure:shape-match-square | 5 |
| geometry | geometry-match | geometry:match-rectangle | treasure:shape-match-rectangle | 5 |
| geometry | geometry-match | geometry:match-equilateral | treasure:shape-match-equilateral | 5 |
| geometry | geometry-match | geometry:match-isosceles | treasure:shape-match-isosceles | 5 |
| geometry | geometry-match | geometry:match-right-triangle | treasure:shape-match-right-triangle | 5 |
| geometry | geometry-count | geometry:count-intro | treasure:shape-count-intro | 5 |
| geometry | geometry-count | geometry:count-composite | treasure:shape-count-composite | 5 |
| geometry | geometry-count | geometry:count-mixed | treasure:shape-count-mixed | 5 |

各entryのreward kindは`treasure`。既存42entryの後ろに追加する。`AppId`・`ModeId`を拡張し、`RewardKind`とstorageのキー構造・バージョンは維持する。カード帳はmanifestの報酬IDとの完全一致で獲得数を数える。

## 問題と進行

- 共通：`id`、`stageId`、`mode`、`hint`、`explanation`。基本問は見本・4候補と正解ID、応用問は`targetKind`・図・全正解輪郭・内訳を持つ。IDの例は`geometry:match-square:q01`。
- `GEOMETRY_STAGES`と`getGeometryStage(stageId)`がmanifest順のステージと固定5問を提供する。存在しないIDで開始せず選択画面に留まる。
- 進行は`select → instructions → answer → explanation → answer … → result`と`book`。選択未完了・不正入力では採点しない。誤答ではその問の初回正解資格を失い、同じ問を再試行する。
- 正解では必ず解説へ入り、回答編集をロックする。解説の輪郭切り替えは進行・採点に影響させない。最後の解説から結果へ進む操作でだけ`completeSession`を呼ぶ。
- セッションIDは開始時に1つ発行する。`createSubmissionGuard`を使い、問ごとの回答と解説の次へに別ID・tokenを持たせる。誤答時だけ再armし、正解後は再armしない。ネイティブEnterとclickの二重発火、`event.repeat`、過去画面のcallbackも検証する。
- `domain/session.ts`はReactから独立した状態遷移・初回正答数・完了可否を持つ。UI側の同期ガードと完了済みrefで同一イベント系列の重複完了を防ぐ。進行の責任を2か所で別実装しない。

# Task Contracts

## T1: 図形モデル・分類・回転照合

- state: validated
- owning Phase: P1
- dependencies: none
- 所有範囲：`src/apps/geometry/domain/types.ts`、`geometry.ts`、`geometry.test.ts`、必要なら`domain/README.md`。
- 最小文脈：仕様の基本編・6題材・包含関係、上記図形モデル。既存UI・保存の変更はしない。
- 成果：型、有限値・退化の検証、図形分類、移動・回転だけでの合同判定と解説用対応情報。
- 完成条件：回転・移動・頂点の巡回と逆順列挙で不変、拡大縮小・縦横比変更・反転のみで一致する非対称図は不一致。円の半径と包含分類を正しく扱う。
- 検証：`bun run test -- src/apps/geometry/domain/geometry.test.ts`、`bun run typecheck`。テストの期待値は既知の図と変換から与え、同じ関数で作らない。
- 保全：既存4ゲームの型・振る舞いと、依存関係。

## T2: 全輪郭の列挙と教材検証API

- state: validated
- owning Phase: P1
- dependencies: T1
- 所有範囲：`domain/enumerate.ts`、`validate.ts`、`enumerate.test.ts`、`validate.test.ts`、T1型の必要最小限の追記。
- 最小文脈：応用編の数える規則、範囲外三角形禁止、P1の型と数値比較。
- 成果：線分区間の被覆、交点と全輪郭の列挙、`validateMatchQuestion`・`validateCountQuestion`、分かるエラーID。
- 完成条件：2×2格子の5正方形・9長方形、辺分割と共有辺、内部線、交点、穴・重複・退化を検証する。対象外の非二等辺・非直角三角形が他の解の内部にある場合も拒否する。正解輪郭の欠落・余分・重複と基本問の複数正解を拒否する。
- 検証：`bun run test -- src/apps/geometry/domain`、`bun run typecheck`。誤ったsolutions、図の線の追加・欠損、targetKindの変更で検証が失敗する反例を含める。
- 保全：T1の照合条件、範囲外の三角形を黙って除外して正解数だけ合わせない。

## T3: 9ステージの保存契約と既存データ互換性

- state: validated
- owning Phase: P1
- dependencies: none
- 所有範囲：`src/shared/progress/{geometryCatalog,types,catalog,progress.test}.ts`、`src/shared/progress/README.md`。storage/reducerの変更は必要性がある場合だけで、形式は変えない。
- 最小文脈：固定ID表、既存42件、カタログ検証とstorage契約、漢字の`treasure:g`前方一致。
- 成果：manifestとカタログ9件、AppId・ModeId拡張、保存互換性テスト、英語のprogress契約更新。
- 完成条件：旧version 1データ（全4アプリの履歴・各報酬・自己ベスト）が値を失わず読み込める。9種の完了、再クリア、同一session重複、無効mode/count、直近50件を検証。宝物区分の追加キーはない。
- 検証：`bun run test -- src/shared/progress`、`bun run typecheck`。旧42件のID・属性を固定の期待値で保持し、全体51件を確認する。
- 保全：保存キー・バージョン、未知バージョンの非自動書き込み、漢字・計算等の既存記録。

## T4: 基本編30問と図形の説明

- state: validated
- owning Phase: P2
- dependencies: T1, T2, T3
- 所有範囲：`data/match.ts`、`data/index.ts`の基本部分、`domain/content.test.ts`の基本部分、`docs/reviews/geometry-content.md`の基本30問。
- 最小文脈：P1 API、基本編の6×5・4択・共通尺度・回転と大きさ条件、manifest。
- 成果：30問の見本・4候補・正解ID・ヒント・特徴解説、ステージ取得API。
- 完成条件：全問で正解1つと大きさだけ違う不正解が存在し、円以外の全ステージに回転した正解がある。長方形の見本は非正方形、二等辺の見本は非正三角形。正解位置に偏らず、全候補が共通枠に収まる。教材記録に各ID・確認した特徴・照合結果を書く。
- 検証：`bun run test -- src/apps/geometry/domain/content.test.ts`、`bun run typecheck`。正解IDの存在だけでなくP1の幾何照合で4候補を確かめる。目視確認はP4で追記する。
- 保全：基本編の大きさ違いを自動フィットで消さないデータ尺度。

## T5: 応用編15問と全輪郭の正解

- state: validated
- owning Phase: P2
- dependencies: T1, T2, T3, T4（取得API・共通検証ファイルを引き継ぐ）
- 所有範囲：`data/count.ts`、`data/index.ts`の応用部分、`domain/content.test.ts`の応用部分、教材確認記録の応用15問。
- 最小文脈：応用の3難易度・6題材・包含関係・対象外三角形禁止・0〜20、P1全輪郭検証。
- 成果：15問の図・targetKind・手作成solutions・内訳・ヒント、全9ステージの取得API。
- 完成条件：全6題材の指定問題、各ステージの四角形系と三角形系、2×2格子、0個、回転、合成、混在を網羅する。長方形と正方形、二等辺と正三角形、直角二等辺の重なりを教材全体で実際に扱い、説明する。全問の正解集合が独立列挙と一致し、全三角形が許可範囲内。内訳は重複のないsolutionsの区分に対応する。
- 検証：`bun run test -- src/apps/geometry`、`bun run typecheck`。カード説明・ステージ5問・IDとカタログの一対一対応も確かめる。
- 保全：範囲外三角形を不正解用の図形としても使わない。列挙器に合わせて解を削るだけで済ませない。

## T6: 共通尺度のSVG描画と解説部品

- state: validated
- owning Phase: P3
- dependencies: T1, T4, T5
- 所有範囲：`src/apps/geometry/components/{ShapeFigure,MatchExplanation,CountDiagram,CountExplanation}.tsx`、`styles.css`の図形・解説部分。
- 最小文脈：図形モデルと正解輪郭、375・768・1280px、仕様の共通尺度・静止画の重ね合わせ・輪郭番号。
- 成果：見本と候補の共通枠、回転と移動を揃えた重ね合わせ、辺・角の説明、応用の番号付き輪郭と前後ボタン。
- 完成条件：共通viewBoxと枠で物理的な尺度が一致し、伸縮・切れがない。正解前のラベルに答えを含めない。0個で前後操作を出さず、1個以上では全solutionsを確認できる。色だけに頼らず、動きを減らす設定を尊重する。
- 検証：`bun run typecheck`、`bun run build`。実表示・ボタン操作はT10のE2Eで確認し、描画実装をなぞるだけのユニットテストは作らない。
- 保全：図形ごとの自動フィットやCSSでの別々の伸縮を入れない。

## T7: 共通進行・基本編・結果とカード帳

- state: validated
- owning Phase: P3
- dependencies: T2, T3, T4, T5, T6
- 所有範囲：`domain/session.ts`・`session.test.ts`、`index.tsx`、必要な共通画面部品と`styles.css`の画面部分。
- 最小文脈：進行契約、manifest、既存useProgress・SubmissionGuard・Feedback、基本問題と解説。
- 成果：9ステージ選択と説明、基本編の回答・再挑戦・解説、両モード共通のsession遷移、結果・再練習・カード帳。応用の回答部品の接続はT8で完成させる。
- 完成条件：未選択では採点せず、正解後の編集を防ぐ。誤答は初回点を失い、正解後は解説へ、最終解説から結果へ進むときにだけ完了を1回記録する。カードをmanifestの完全一致で数え、所有済みだけ説明を再表示する。やめる・アンマウントで未完了を記録しない。
- 検証：`bun run test -- src/apps/geometry/domain/session.test.ts src/shared/interaction`、`bun run typecheck`。遷移テストは不正入力、誤答後正解、最終解説の前後、古いイベント、二重完了を含める。
- 保全：completion recordのquestionCountは5、firstCorrectCountは0〜5。ゲームのUIに正解取得用のテスト専用機能を追加しない。

## T8: 応用編の入力・採点・輪郭解説の接続

- state: validated
- owning Phase: P3
- dependencies: T5, T6, T7
- 所有範囲：`components/CountQuestion.tsx`、`index.tsx`と`styles.css`の応用接続部分、必要なsessionテスト。
- 最小文脈：共通session、応用データ、NumberInput・parseIntegerInput、CountExplanation。
- 成果：6種類を明示する問題文、数字入力と画面内数字ボタン、誤答ヒント、正解後の全輪郭の解説。
- 完成条件：未入力と0を区別し、負数・小数・非数字は採点しない。型として正しい整数の誤答は初回点を失う。誤答時の答え非公開、正解後の解説、最後の解説を経た共通完了処理に接続する。輪郭の前後操作は問題番号や点数を変えない。
- 検証：`bun run test -- src/apps/geometry src/shared/interaction`、`bun run typecheck`、`bun run build`。実機入力相当の操作はT10で確認する。
- 保全：基本編の大きさ条件、応用編の大きさ・向きに関係なく数える条件を画面で混同しない。

## T9: ホーム・ルートと保存共存の統合

- state: validated
- owning Phase: P4
- dependencies: T3, T7, T8
- 所有範囲：`src/App.tsx`、`src/pages/Home.tsx`、`tests/e2e/suite.e2e.ts`、`tests/e2e/geometry.e2e.ts`のナビゲーション・保存部分、必要な`helpers.ts`の補助。
- 最小文脈：デフォルトexport、51件カタログ、漢字のIDフィルター、既存4ゲームのルートと保存仕様。
- 成果：5枚目の入口と`#/geometry`、ブラウザー戻る・直リンク、既存42件＋追加9件の整合検証、旧新記録の共存テスト。
- 完成条件：旧version 1データを入れて図形を完了・再読み込みしても旧履歴・収集・自己ベストが残る。漢字の宝物件数は増えず、ホーム総数は増える。図形途中の再読み込みは選択に戻り、カードは増えない。保存不可でも完了まで遊べ、未知バージョンは上書きしない。全記録リセットは図形も含めアプリキーだけ消す。
- 検証：`bun run typecheck`、`bun run test -- src/shared/progress`、`bun run test:e2e -- tests/e2e/geometry.e2e.ts tests/e2e/persistence.e2e.ts tests/e2e/suite.e2e.ts`。
- 保全：既存カタログの順序・属性、既存4ゲームへの導線。漢字実装の変更は必要が判明した場合だけにし、ID規則で混入を避ける。

## T10: 全45問・操作・表示の受け入れ検証と文書

- state: validated
- owning Phase: P4
- dependencies: T1〜T9
- 所有範囲：`tests/e2e/geometry.e2e.ts`の全問・操作部分、`geometry-accessibility.e2e.ts`、`geometry-content.e2e.ts`、必要なhelpers、`README.md`、`docs/reviews/{geometry-content,geometry-validation}.md`と専用artifacts。
- 最小文脈：仕様G1〜G11、既存Playwright本番プレビュー、9ステージ・全教材、保存テスト。
- 成果：受け入れE2E、日本語の教材・検証記録、遊び方と問題追加時の注意のREADME更新。
- 完成条件：全45問を実際の画面から回答し、毎問の解説と5問目の完了を確認する。各問の見本・候補または図・解説を保存して全問目視確認を記録する。375・768・1280pxで基本・応用・結果・帳面を確認し、各画面幅で全基本問の枠尺度・比率・はみ出しを自動確認する。
- 操作条件：誤答後の正解で4/5、全初回正解で5/5。空欄・不正入力は点数に影響せず、0個に回答できる。回答・次へ・最終完了の連打、Enter長押し、古い入力で飛ばさない。全正解輪郭の前後、0個の非表示、キーボードのみの完走、フォーカス、44px、reduced-motion、正解前のラベル非露出を確認する。
- 検証：`bun run typecheck`、`bun run test`、`bun run test:e2e`、`bun run build`。ブラウザーが未準備なら`bunx playwright install chromium`で準備し、不足依存・未実施は正直に記録する。既存のテスト条件を緩めて通さない。
- 保全：テストだけで教材の正解を再定義しない。E2Eの入力用には同梱データをimportしてよいが、教材の正しさはT2・T5の独立列挙と目視で担保する。

# Validation strategy

| 層 | 主な証拠 | 対応 |
| --- | --- | --- |
| 幾何 | 既知解と変換・反例のVitest | G2, G4, G5 |
| 教材 | 全45問の構造、合同の一意性、全輪郭集合、禁止三角形、内訳 | G2, G4, G5, G11 |
| 進行 | invalid入力・再挑戦・解説・最終完了・古いイベントの状態遷移 | G7, G8 |
| 保存 | 旧データ・9新ステージ・重複・50件・不可・未知版・リセット | G8, G9 |
| 実ブラウザー | 全問・9ステージ、両モードと帳面、3画面幅・キーボード・長押し | G1, G3, G6〜G10 |
| 教材目視 | 各IDの図と解説、3画面幅の代表表示、全基本問の寸法確認 | G3, G11 |
| 全体回帰 | 既存4ゲームのE2E、全Vitest、型検査、ビルド | G9〜G11 |

テストの期待値を同じ判定関数から作らず、教材の正解ID・個数だけを検証する循環を避ける。実行結果は実装段階で記録し、計画時点では成功したと記載しない。

# 移行・互換性・切り戻し・運用

- 保存の移行処理は不要。旧version 1の構造に新しいカタログ値を許可する追加で、旧データを初回起動時に書き換えない。
- 新しい完了記録から旧アプリへの逆互換性は保証しない。旧コードへ戻すと保存全体をcorruptとして扱うため、公開後の切り戻しは新カタログ・検証を残して図形の入口だけ止める方法を優先し、記録の削除や暗黙のダウングレードはしない。
- ローカル実装の取り消しは対象ファイルの差分を確認し、ベースラインに戻す。ユーザーの無関係な変更を含む全体resetをしない。per-phaseのコミットは後述モード決定後にimplementation-sessionの規則で行う。
- 問題を追加・修正したら、ID・5問構成・カタログ・正解輪郭・説明・内容検証・全問の表示記録を一緒に確認する。実行時の列挙器を学習者の入力待ち中に毎回動かす必要はなく、正解は検証済みの同梱データを使う。
- ネットワーク公開・デプロイは行わない。既存の静的ビルドと本番プレビューで完了する。

# リスクと対処

| リスク | 対処・判断のタイミング |
| --- | --- |
| 全輪郭の列挙漏れ | P1で交点・分割辺・重複・欠けの反例を先に検証し、P2で手作成解集合と照合する |
| 範囲外の三角形が複合図にできる | 全三角形を列挙してP2で拒否する。必要なら図を簡素にし、仕様の禁止を緩めない |
| 正三角形の座標と浮動小数 | 共通許容差と適度な座標範囲、既知の正三角形・境界反例をテストする |
| 同形同寸が描画時に崩れる | 同じ枠・viewBox・比率と、全基本問の3画面幅検証を必須にする |
| 照合で頂点順と鏡映を混同する | 頂点列の逆順だけの同形と、物理的に鏡映した非対称な図の反例を別々にテストする |
| 漢字側の収集数へ混入 | `treasure:shape-`を使い、両ゲームを完了した保存データで数と帳面を検証する |
| 画面をまたぐ連打で最終解説を飛ばす | answerとadvanceのtokenを分け、同期ガードと最終説明前後のE2Eで確認する |
| 全問検証が長い | データ検証とUI検証を分担し、45問の完走は固定教材で決定的に実行する。必要に応じテスト単位のtimeoutだけを根拠付きで調整する |

# Decision Log

| 日時 | 項目 | 判断・理由 | 判断者 |
| --- | --- | --- | --- |
| 2026-10-15T14:02:24+09:00 | 仕様 | 基本6題材・応用も同範囲の修正版をユーザーが承認 | human:user |
| 2026-10-15T14:03:14+09:00 | 分割 | P=4、T=10。幾何・保存契約、教材、画面、統合の順に独立して検証する | planning-session/v1 |
| 2026-10-15T14:03:14+09:00 | mode提案 | P>=4の基準からper-phaseを推奨。教材の検証で得る知見を次Phaseへ残し、ブラウザー確認と数学の文脈を分ける。ユーザーの決定待ち | planning-session/v1 |
| 2026-10-15T14:03:14+09:00 | 保存区分 | version 1とtreasureを維持し、漢字の前方一致に当たらないshape接頭辞を採用 | planning-session/v1 |
| 2026-10-15T14:54:47+09:00 | session-mode決定 | per-phase。P=4、T=10、P>=4の基準とPhaseごとの契約・教材検証の引き継ぎを理由に推奨し、ユーザーが「per-phaseで」と決定。各Phaseの必須ローカルコミットと各実装セッション開始時のクリーンな作業ツリー要件を説明済み | human:user |
| 2026-10-15T15:30:03+09:00 | session-mode確認 | 明示指定のper-phaseでP1を開始。作業ツリーはクリーン、baselineはnone。各Phase検証PASS後にローカルコミットする | human:user / implementation-session |

| 2026-10-15T15:59:25+09:00 | session-mode再開確認 | 明示指定のper-phaseでP2を再開。Decision Log・P1 Handoffを読了し、クリーンな作業ツリーとbaseline noneを確認 | human:user / implementation-session |

| 2026-10-15T16:30:07+09:00 | session-mode再開確認 | 明示指定のper-phaseでP3を再開。Decision Log・最新P2 Handoff読了、作業ツリーはクリーン、baseline noneを確認 | human:user / implementation-session |

| 2026-10-16T07:24:54+09:00 | session-mode再開確認 | 明示指定のper-phaseでP4を再開。Decision Log・最新P3 Handoff読了、作業ツリーはクリーン、baseline none | human:user / implementation-session |

# Plan Change Log

| 日時 | 種別 | 内容・影響 | 根拠 |
| --- | --- | --- | --- |
| 2026-10-15T14:03:14+09:00 | INITIAL | 4フェーズ・10タスクの初稿。仕様のG1〜G11と対応 | 承認済みPRDとリポジトリ調査 |
| 2026-10-15T14:57:46+09:00 | CLARIFICATION | Execution GraphのT4 / T5をT4 → T5へ修正し、既存のT5依存関係と一致させた。Task Contracts・範囲・構成・フェーズ数とタスク数の変更はない | plan_reviewerの軽微な指摘 |
| 2026-10-15T15:30:03+09:00 | EXECUTION_UPDATE | 事前ゲート通過。P1、T1、T3をin_progressに変更。既存変更なし | git status --shortは空、現行PlanレビューPASSとstable仕様の人による確認を確認 |
| 2026-10-15T15:35:06+09:00 | EXECUTION_UPDATE | T1・T3を独立検証PASSでvalidated、依存解除したT2をin_progressに変更。T3のテスト用tuple型エラーを修正（同一原因1回）。T1合同変換は非対称図形・逆順頂点に実変換して独立確認 | geometry.test.ts 5件、progress.test.ts 11件、型検査PASS。T1の頂点対応は一時実行で確認、回帰テストへの固定は未実施 |
| 2026-10-15T15:39:23+09:00 | EXECUTION_UPDATE | T2を独立検証PASSでvalidated。P1全Taskの実装と独立検証が完了しPhase統合検証へ進む | domain 3ファイル11件・progress 11件・型検査PASS。禁止三角形の内部包含ケースを一時実行しcount.out_of_scope_triangleを確認 |
| 2026-10-15T15:41:07+09:00 | EXECUTION_UPDATE | P1検証でFAIL_LOCAL。180度回転後の微小負値がcanonical keyで負のゼロになり、同じ手作成解と不一致。T2を修正のため再開 | 統合型検査・22テストはPASSだがPhase独立反例でcount.solution_set_mismatch。同一原因1回として記録 |
| 2026-10-15T15:43:21+09:00 | EXECUTION_UPDATE | T2補正をfresh task_validatorがPASS。位置を維持したEPS比較を輪郭の重複排除と解集合照合で共用、固定小数文字列を廃止。T2をvalidatedに戻しP1を再検証 | π回転・丸め境界の回帰を追加。domain12件・型検査PASS。同一原因カウンタは1を維持 |

| 2026-10-15T15:45:33+09:00 | EXECUTION_UPDATE | P1再検証PASSでvalidated。P2の依存を解除し、per-phase境界で停止。意味内容の計画変更なし | bun run typecheck PASS、domain+progress 4ファイル23件PASS。独立実行でvertexMap・内部禁止三角形・36頂点上限・円接触と分離もPASS |

| 2026-10-15T15:59:25+09:00 | EXECUTION_UPDATE | P1境界コミット0b6c11dを記録しP2・T4をin_progressに変更。P1のattemptsを維持 | stable仕様・現行PlanレビューPASS・前回Handoff・クリーン状態を確認。ローカルOKF規約は欠落のためPlanに記載されたグローバル同一規約を読了 |

| 2026-10-15T16:04:11+09:00 | EXECUTION_UPDATE | T4実装完了、implementedに変更してfresh task_validatorへ委譲 | 基本30問・取得API・教材記録・内容2テストを追加。実装者の型検査と指定テストPASS |

| 2026-10-15T16:05:40+09:00 | EXECUTION_UPDATE | T4独立検証PASSでvalidated、依存解除したT5をin_progressに変更 | fresh task_validatorが基本30問の合同一意性・分類・枠・説明・取得APIを確認。内容2テストと型検査PASS |

| 2026-10-15T16:11:21+09:00 | EXECUTION_UPDATE | T5実装完了、implementedに変更して独立検証へ | 応用15問・9ステージAPI・教材確認記録を追加。実装者はgeometry15テスト・型検査PASS。途中レビューで複合図の連結、格子の辺、解集合、円の正数と0個を修正 |

| 2026-10-15T16:12:50+09:00 | EXECUTION_UPDATE | T5独立検証FAIL、局所修正のため再開 | geometry15テスト・型検査はPASSだが、正解前ヒントの個数露出、包含条件のヒント不足、intro:q03教材記録の内訳誤記を検出。各同一原因1回 |

| 2026-10-15T16:14:59+09:00 | EXECUTION_UPDATE | T5局所補正完了、implementedに戻してfresh task_validatorで再検証 | 個数ヒントを除去、包含条件を開始説明・ヒント・解説に補充、教材記録を訂正。カタログ対応と45ID一意性を追加、geometry15テスト・型検査PASS |

| 2026-10-15T16:16:17+09:00 | EXECUTION_UPDATE | T5再検証PASSでvalidated。P2全TaskがvalidatedとなりPhase統合検証へ | fresh task_validatorでgeometry4ファイル15テスト・型検査PASS。個数ヒント・包含説明・教材記録の補正を確認。各attemptsは1を維持 |

| 2026-10-15T16:18:48+09:00 | EXECUTION_UPDATE | P2検証FAIL_LOCAL、T5を再開。T5-overlap-rule-copyを2に更新 | Phase検証の型検査・geometry15テスト・全30問の独立変換・15問の手作業個数照合はPASS。composite:q03/q05・mixed:q02/q04のヒントに直角二等辺の包含規則が不足 |

| 2026-10-15T16:20:09+09:00 | EXECUTION_UPDATE | P2指摘の4ヒントを補正しT5をimplementedに変更 | 直角二等辺を対象種別として数える規則を明示。包含に該当する全7問のヒント回帰を追加。実装者のgeometry15テスト・型検査PASS |

| 2026-10-15T16:21:53+09:00 | EXECUTION_UPDATE | T5最終局所補正をfresh task_validatorがPASS、validatedに戻しP2再検証へ | 全7問の包含ヒント・個数非公開・15問の手作業期待個数を確認、geometry15テスト・型検査PASS。過去の未コミット版差分は確認不能のため現在の全解集合照合で検証 |

| 2026-10-15T16:24:31+09:00 | EXECUTION_UPDATE | P2再検証PASSでvalidated。P3の依存解除、per-phase境界で停止 | 型検査・geometry4ファイル15テストPASS。別計算で基本30/30合同、手作業で応用15/15個数・内訳一致。全7問の包含ヒントを確認、意味内容のPlan変更なし |

| 2026-10-15T16:30:07+09:00 | EXECUTION_UPDATE | P2境界コミットf96f6f9を記録しP3・T6をin_progressに変更。既存attemptsを保持 | stable仕様・現行PlanレビューPASS・最新Handoffを確認。ローカルOKF規約欠落のためPlan記載のグローバル同一規約を全文読了 |

| 2026-10-15T16:33:30+09:00 | EXECUTION_UPDATE | T6実装完了、implementedとして独立検証へ | 4描画・解説部品とCSS、実装者の型検査・ビルドPASS。線・辺角印・円半径・重ね合わせ方向を実装レビューで調整 |

| 2026-10-15T16:35:06+09:00 | EXECUTION_UPDATE | T6独立検証PASSでvalidated、T7をin_progressに変更 | fresh task_validatorの型検査・ビルドPASS。共通枠・重ね合わせ・辺角表示・輪郭切替・0個・ラベルを確認。実表示はP4、等幅コンテナ接続はT7 |

| 2026-10-15T16:42:48+09:00 | EXECUTION_UPDATE | T7実装完了、implementedとして独立検証へ | 指定session/interaction10テスト・型検査PASS。古いrunテストの固定ID fixtureを補正（同一原因1回）。補助ブラウザー確認のdev応答はタイムアウト、調査中 |

| 2026-10-15T16:43:52+09:00 | EXECUTION_UPDATE | T7独立検証PASSでvalidated、T8をin_progressに変更 | fresh task_validatorでsession/interaction10件・型検査PASS。補助devブラウザーは起動直後の応答遅延解消後マウント成功、375pxで5枠112pxの等幅を確認 |

| 2026-10-15T16:47:32+09:00 | EXECUTION_UPDATE | T8実装完了、implementedとして独立検証へ | 実装者のgeometry/interaction27テスト・型検査・ビルドPASS。基本編のfresh mount補助実操作で誤答後4/5・全問解説経由を確認。編集中HMRの状態は検証対象外 |

| 2026-10-15T16:50:01+09:00 | EXECUTION_UPDATE | T8独立検証PASSでvalidated、P3 Phase統合検証へ | fresh task_validatorのgeometry/interaction6ファイル27テスト・型検査・ビルドPASS。補助ブラウザーの応用5問・負数拒否・0個・輪郭2/2・5/5結果、基本誤答4/5、代表枠3幅等寸を確認 |

| 2026-10-15T16:52:18+09:00 | EXECUTION_UPDATE | P3検証FAIL_LOCAL、T6を局所補正のため再開 | 型検査・geometry/interaction27テスト・ビルド・全9ステージ純粋遷移はPASS。円解説の半径1.2に対し縦線0.85と同長印の誤り。T6-circle-radius-diagramを1として記録 |

| 2026-10-15T16:53:36+09:00 | EXECUTION_UPDATE | T6円解説を局所補正、implementedとしてfresh Task検証へ | 2本とも半径1.2に合わせ同長印を中点へ移動。実装者の型検査・ビルドPASS |

| 2026-10-15T16:55:01+09:00 | EXECUTION_UPDATE | T6円解説補正をfresh task_validatorがPASS、validatedに戻しP3再検証へ | 半径1.2と中点0.6の一致を独立確認、型検査・ビルドPASS。T6-circle-radius-diagramは1を維持 |

| 2026-10-15T16:57:40+09:00 | EXECUTION_UPDATE | P3再検証FAIL_LOCAL、T7カード特徴表示の局所補正を開始 | 円解説補正・型検査・27テスト・ビルド・9ステージ遷移はPASS。基本カードの短文だけでは特徴説明不足、既存stage.descriptionを所有済み帳面・結果へ表示する。T7-card-feature-copyを1で記録 |

| 2026-10-15T16:58:25+09:00 | EXECUTION_UPDATE | T7基本カード特徴表示を補正、implementedとしてfresh Task検証へ | 所有済み基本カードの帳面・結果へstage.descriptionを追加、短文を維持。未所有説明非表示・応用振り返りを保全。実装者型検査PASS |

| 2026-10-15T16:59:47+09:00 | EXECUTION_UPDATE | T7基本カード補正をfresh task_validatorがPASS、validatedに戻しP3再検証へ | 所有済み基本6カードに特徴表示、未所有の説明非表示、応用振り返り保全を確認。型検査・session/interaction12テストPASS。T7-card-feature-copyは1を維持 |

| 2026-10-15T17:02:52+09:00 | EXECUTION_UPDATE | P3最終再検証PASSでvalidated、P4依存解除。per-phase境界で停止 | 型検査・geometry/interaction6ファイル27テスト・ビルド・diff検査PASS。独立9ステージ45解説・誤答4/5・無効入力・再練習/放棄・9報酬IDを確認。意味内容のPlan変更なし |

| 2026-10-16T07:24:54+09:00 | EXECUTION_UPDATE | P3境界コミット94c1c7203a17a3478e276a3b037664d6dc963fc3を記録、P4・T9をin_progressに変更。既存attemptsを保持 | stable仕様・現行PlanレビューPASS・最新Handoff・クリーン状態を確認。ローカル規約欠落につきPlan記載のグローバルOKF規約を読了 |

| 2026-10-16T07:30:01+09:00 | EXECUTION_UPDATE | T9実装途中に環境再起動。型検査・progress11件はPASS、E2Eは中断し未完了。実装担当をfresh invocationで再開 | 残存previewを終了。geometry.e2eの一部失敗成果物あり、成功と見なさず原因と全必須確認を再実施する |

| 2026-10-16T07:30:24+09:00 | EXECUTION_UPDATE | T9中断E2Eで曖昧な見出しlocatorと再読込後ルート期待値の誤りを確認、各同一原因1として記録 | 失敗error-contextを確認。UIの仕様を変えずテストを補正し、fresh implementerで必須確認を再実施 |

| 2026-10-16T07:33:44+09:00 | EXECUTION_UPDATE | T9補正後E2Eでdirect-linkの最終見出しassertionに修正漏れ、同一原因カウンタを2に更新 | 保存関連6ケースはPASS。ナビゲーション全assertionを再点検し、必須E2Eを再実施する |

| 2026-10-16T07:40:59+09:00 | EXECUTION_UPDATE | T9実装完了、implementedとしてfresh task_validatorへ | 型検査・progress11件PASS。指定E2Eは22成功/1見出し指定失敗、補正後その1件がPASS。途中の再起動・初回失敗も保持。ローカル公開導線・保存形式変更なしの共存テストを追加 |

| 2026-10-16T07:42:59+09:00 | EXECUTION_UPDATE | T9独立検証PASSでvalidated、T10をin_progressに変更 | fresh task_validatorが実diffと23件初回ログ・補正ログを照合し、geometry7件を独立再実行して全PASS。E2E型検査・ビルドもPASS、保存共存・導線契約を確認 |

| 2026-10-16T07:47:43+09:00 | EXECUTION_UPDATE | T10で円輪郭の強調CSS競合を検出、T6を局所補正のため再開 | 実stylesheetをChromiumで確認し、selected circleの塗り・線色・太さが通常circleと同じ。polygonのみ強調が適用。CSS優先順位の局所補正とT10実画面回帰を行う。計画の意味変更なし |

| 2026-10-16T07:48:25+09:00 | EXECUTION_UPDATE | T6円強調CSS補正をimplementedとしてfresh Task検証へ | 円に限定した強調セレクターを追加、実装者のChromium computed-styleで選択円とpolygonの黄色塗り・茶線・0.14線幅の一致、通常円との違いを確認 |

| 2026-10-16T07:49:24+09:00 | EXECUTION_UPDATE | T6円強調補正をfresh task_validatorがPASS、validatedに戻しT10検証を継続 | 独立Chromium fixtureで選択円・polygonの強調一致と通常円の保全を確認。型検査・ビルドPASS。実画面intro:q05回帰はT10で検証。カウンタ1を維持 |

| 2026-10-16T07:54:09+09:00 | EXECUTION_UPDATE | 全45問の問題・解説と応用全輪郭のエージェント目視を完了、重大な表示不具合none | manifest対応PNGから9ステージ別一覧を作り原寸確認。基本30問の寸法差・輪郭・辺角印・説明、応用15問の手作業個数列と全選択輪郭を照合。人による承認ではない。正式Task検証・全体回帰は継続中 |

| 2026-10-16T07:59:37+09:00 | EXECUTION_UPDATE | T10予備実行で全45問・基本30問×3幅・保存/主要操作はPASS、長押しテストのキー対象に誤りを検出 | textboxの次Tabが数字ボタンへ進んだため回答が送信されず失敗。テスト手順を補正し再確認、製品実装の仕様変更なし。T10-held-enter-targetを1で保持 |

| 2026-10-16T08:01:25+09:00 | EXECUTION_UPDATE | T10の完了済み予備16件実行は14成功/2失敗。ヒントのrole期待値を補正し再実行 | 長押しのキー対象誤りに加え、誤答ヒントはstatusでなくnote。製品仕様を変えずテストを補正。初回探索実行は成功12件を観測したが終了サマリ未取得として制限を記録 |

| 2026-10-16T08:03:12+09:00 | EXECUTION_UPDATE | T10の実ダブルクリックで最終結果が選択へ飛ぶ製品不具合、T7を局所補正のため再開 | 最終advanceの2回目nativeclickが切替後の結果ボタンへ届く。error-contextでselector遷移を確認。回答/advanceの旧callbackガードだけでは別要素への実クリックを防げない。テストを弱めずUI境界で補正する |

| 2026-10-16T08:05:20+09:00 | EXECUTION_UPDATE | T7画面境界クリック補正をimplementedとしてfresh Task検証へ | nativeclickの初回画面IDを保持し、画面変更後のdetail>1だけcaptureで抑止。同一画面の数字・輪郭操作とdetail0のキーボードを維持。実装者の該当E2E1件・型検査PASS |

| 2026-10-16T08:07:33+09:00 | EXECUTION_UPDATE | T7画面境界クリック補正をfresh task_validatorがPASS、validatedに戻しT10の最終全体検証へ | 独立E2E5件で数字11・輪郭1→3→1・キーボード・再試行・最終結果の二重クリックを確認。型検査・ビルド・diff検査PASS。rootの全Vitest11ファイル58件もPASS。カウンタ1保持 |

| 2026-10-16T08:22:01+09:00 | EXECUTION_UPDATE | T10実装完了、implementedとしてfresh Task検証へ | 最終全体E2E59/59（12.1分、図形17件含む）、型検査・全Vitest58/58・ビルドPASS。専用134PNG・45ID manifest・HTML一覧・結果summary JSONと日本語文書を保存。予備失敗と中断・終了不明も明示 |

| 2026-10-16T08:24:00+09:00 | EXECUTION_UPDATE | T10独立検証PASSでvalidated、P4全Task完了としてPhase統合検証へ | fresh task_validatorが実ファイル・全体ログ・45ID/116参照画像/134PNG/manifest SHAを照合。独立内容3テスト・Playwright6件もPASS。G1〜G11証拠、未解決none（実機/他ブラウザーは範囲外） |

| 2026-10-16T08:26:25+09:00 | EXECUTION_UPDATE | P4 Phase独立検証PASSでvalidated、per-phase境界コミットとFinal Evaluationへ | fresh phase_validatorがF1〜F7/G1〜G11を確認。独立7ファイル38テスト・実E2E11件・本番ビルド・diff検査PASS。全体58unit/59E2Eログと45ID/134PNG/manifest SHAも照合。未解決none |

# Execution State

- session-mode: per-phase
- baseline: none
- phases:

| Phase | state | commit | attempts |
| --- | --- | --- | --- |
| P1 | validated | 0b6c11d14d49485c49eea9bcd025842bd1c14f4a | {T3-test-tuple-type: 1, T2-contour-tolerance-key: 1} |
| P2 | validated | f96f6f92d47826edcfa1dcbdcfffb12e82f25a96 | {T5-answer-hint-leak: 1, T5-overlap-rule-copy: 2, T5-review-record-mismatch: 1} |
| P3 | validated | 94c1c7203a17a3478e276a3b037664d6dc963fc3 | {T7-stale-run-test-fixture: 1, T6-circle-radius-diagram: 1, T7-card-feature-copy: 1} |
| P4 | validated | 次のEXECUTION_UPDATEで記録（本Handoffを含むPhaseコミット） | {T9-ambiguous-heading: 2, T9-reload-route-expectation: 1, T6-circle-highlight-specificity: 1, T10-held-enter-target: 1, T10-hint-feedback-role: 1, T7-cross-screen-native-doubleclick: 1} |

## Task Validation Evidence（P1）

| Task | 実装・独立検証 | 実行結果と証拠 |
| --- | --- | --- |
| T1 | implementer → fresh task_validator: PASS | `bun run test -- src/apps/geometry/domain/geometry.test.ts` 5件PASS。分類・合同・退化・鏡映を検証。非対称図形を回転・移動し頂点を逆順にした対象へ、返された変換とvertexMapを実適用して一致を独立確認。型検査PASSはT3の独立検証結果を共有 |
| T2 | implementer → fresh task_validator: PASS | `bun run test -- src/apps/geometry/domain` 3ファイル11件PASS、`bun run typecheck` PASS。2×2格子5正方形・9長方形、分割辺・交点・欠け・解集合変更を検証。他の正解輪郭の内部にある禁止三角形を一時実行し拒否を確認 |
| T3 | implementer → fresh task_validator: PASS | `bun run test -- src/shared/progress` 11件PASS、`bun run typecheck` PASS。旧42件のID・属性・順序と追加9件を固定期待値で確認。旧4アプリ保存、再クリア・重複session・無効mode/count・50件保持と再読込を検証 |

- 修正履歴：T3のテストfixtureのtuple推論による型エラーを1回修正。再クリアテスト強化時の履歴期待値も18件に修正し、最終チェックはPASS。
- 検証の限界：非対称図形のvertexMap適用と禁止三角形の内部包含は独立した一時実行で確認しており、コミット対象テストには未固定。教材・画面・E2Eの受け入れ確認はP2〜P4で実施する。

- T2補正検証：fresh task_validator PASS。`sameBoundary` / `sameSolution`で位置を保ったEPS比較を用い、巡回・逆順と浮動小数誤差を許容する。π回転と丸め境界の回帰追加後、domain12件・型検査PASS。補正検証中の一時コマンドに構文エラー1回があり、証拠に用いず、ファイル変更なし。

## Task Validation Evidence（P2）

| Task | 実装・独立検証 | 実行結果と証拠 |
| --- | --- | --- |
| T4 | implementer → fresh task_validator: PASS | `bun run test -- src/apps/geometry/domain/content.test.ts` 2件PASS、`bun run typecheck` PASS。30問・4択・合同一意性・大きさ違い・回転・分類・共通枠・説明・取得APIを確認。実表示確認はP4。 |
| T5 | implementer補正 → fresh task_validator: PASS | `bun run test -- src/apps/geometry` 4ファイル15件PASS、`bun run typecheck` PASS。15問の全輪郭・禁止三角形・6題材・3難易度・円の正数/0・包含条件・回転・9ステージとカタログ・45IDを確認。初回FAILの個数露出・包含ヒント・教材記録を修正し再検証PASS。実表示はP4。 |

- P2局所補正の最終Task検証：Phase検証で不足した4問の包含ヒントを補充し、全7問の必須包含ヒントを回帰確認。fresh task_validator PASS、geometry15テスト・型検査PASS。手作業個数列は `1,0,1,2,1 / 5,3,2,2,2 / 1,2,1,2,1`。T5-overlap-rule-copyは2を維持。

## Task Validation Evidence（P3）

| Task | 実装・独立検証 | 実行結果と証拠 |
| --- | --- | --- |
| T6 | implementer → fresh task_validator: PASS | 型検査・ビルドPASS。共通[-6,6]枠、候補から見本への合同重ね合わせ、辺・直角・半径の図示、番号付き輪郭、0個の操作非表示、44px・reduced-motionを確認。 |
| T7 | implementer → fresh task_validator: PASS | session/interaction2ファイル10テスト・型検査PASS。9ステージ・説明、初回正答0〜5、誤答再試行、最終解説後だけ完了、古い問/run/token、重複、放棄、報酬ID完全一致を確認。古いrunテストfixtureの固定IDを1回修正。 |
| T8 | implementer → fresh task_validator: PASS | geometry/interaction6ファイル27テスト・型検査・ビルドPASS。6種類の問題文、NumberInputと整数検証、無効入力と0、共通採点・解説・完了への接続を確認。 |

- 補助ブラウザー確認：公開ルートを追加せず、Vite開発サーバー上でGeometryをProgressProvider内に一時マウント。基本circleステージは誤答後に正解し、全5解説を経て4/5。応用introは負数を拒否した後、数字ボタンとEnterで5問に回答し全解説を経て5/5。q02は輪郭操作0、q04は2/2まで切替。完了3履歴（square5/5、circle4/5、intro5/5）と報酬を確認。
- 補助表示：代表square問の見本+4候補は375pxで全て112×112、768/1280pxで全て192×192、共通viewBox、横はみ出しなし。375pxの画面を目視。全30問の3幅確認・全45問目視はP4。
- 補助確認の限界：初回dev起動はHTTP応答が遅延しタイムアウト。待機後は応答正常。一時ハーネスのReactモジュールdefault exportとstorage envelope参照を訂正。編集中HMRで状態が変わった操作は証拠にせず、fresh mountで再実施。公開ルート・本番プレビューE2E・全体回帰・保存不可と旧データ共存はP4で行う。

- T6局所補正の最終Task検証：P3で指摘された円の解説図を2本とも半径1.2、同長印を中点0.6へ修正。fresh task_validatorの独立確認・型検査・ビルドPASS。Phase初回FAIL_LOCALと同一原因カウンタ1を保持。

- T7局所補正の最終Task検証：所有済み基本カードの帳面・結果に既存stage.descriptionの特徴説明を追加、cardDescriptionを維持。fresh task_validatorが条件・基本6種類・未所有非表示・応用不変を確認しPASS。型検査・session/interaction12件PASS。Phase再検証FAIL_LOCALと同一原因カウンタ1を保持。

- P3最終Phase検証：fresh phase_validator PASS。`bun run typecheck`、`bun run test -- src/apps/geometry src/shared/interaction`（6ファイル27件）、`bun run build`、`git diff --check`は全てPASS。独立一時実行で9ステージ・45解説・誤答後4/5・不正入力無変更・再練習/放棄リセット・9報酬ID完全一致を確認。円の半径・カード特徴の2指摘は解消、未解決none。

## Task Validation Evidence（P4）

| Task | 実装・独立検証 | 実行結果と証拠 |
| --- | --- | --- |
| T9 | implementer補正 → fresh task_validator: PASS | 型検査・progress11件PASS。指定E2E初回22成功/1失敗、見出し指定補正後に該当1件PASS。独立validatorがgeometry7件を再実行してPASS。旧42件+9件・旧4ゲーム履歴/報酬/自己ベスト・漢字分離・途中再読込・未知版非上書き・保存不可・リセットを確認。 |
| T10 | implementer → fresh task_validator: PASS | 型検査・全Vitest11ファイル58件・全E2E59件・ビルドPASS。独立validatorが内容3テスト・実E2E6件を再実行しPASS。全45問・応用全26輪郭・代表18枚のエージェント目視、全基本30問×3幅、保存/連打/入力/キー操作を確認。45IDと134PNG・manifest SHAの整合PASS。 |

- P4で発見したT6局所補正：円のselected輪郭に限定したCSS優先順位を追加。fresh task_validatorの独立Chromium computed-style・型検査・ビルドPASS。T10の実画面intro:q05強調回帰も全体実行でPASS。
- P4で発見したT7局所補正：初回nativeclickの画面IDと比較し、画面変更後の連続クリックだけ抑止。fresh task_validatorの実E2E5件・型検査・本番ビルドPASS。数字11入力・輪郭1→3→1・キーボード・再試行4/5・最終結果維持を確認。
- 全45問の目視：主エージェントが375pxの問題・解説90枚と応用全26輪郭、3画面幅の代表18枚を確認。特徴印・重ね合わせ・個数/内訳・全輪郭・表示の重大不具合none。元画像134枚、45ID対応manifestとHTML一覧を専用artifactsへ保存。ユーザー/人による承認を意味しない。

# Phase Handoff

<!-- Appended by implementation-session after each Phase is validated; append-only.
     Entry format: see "Phase Handoff" in the applicable implementation-session references/execution-protocol.md. -->

## Handoff: P1 — 2026-10-15T15:45:33+09:00

- Decisions: P1のT1〜T3を実装・独立検証し、Phase再検証PASS。許容差と輪郭キーの不一致を局所補正。計画の意味内容と仕様の変更はnone。session-modeはper-phase、開始時baselineはnone。
- Interfaces: `domain/types.ts`にShape / ShapeKind / CountDiagram / MatchQuestion / CountQuestion。線分は`{id,start:{id,point},end:{id,point}}`、円は`{id,center,radius}`。基本問はmode=`match`、example / candidates（id,shape） / answerId。応用問はmode=`count`、targetKind / diagram / solutions（polygon vertices またはcircleId） / breakdown（id,label,countの配列）。`geometry.ts`にclassifyShape / isSameSizeAndShape / getCongruenceTransform（source→targetのrotation,translation,vertexMap）。`enumerate.ts`にenumeratePolygons / sameBoundary / sameSolution、`validate.ts`にvalidateMatchQuestion / validateCountQuestion。manifestは`shared/progress/geometryCatalog.ts`のGEOMETRY_CATALOG（9件、教材・Reactに非依存）。
- Constraints discovered: EPS=1e-6、座標絶対値・円半径上限1000、凸多角形3〜32頂点。CountDiagramは32線分・交点込み36頂点以下。安定IDは同じ座標を参照し、同じ端点IDの座標競合は拒否。輪郭の同一性は位置を保つEPS比較で、合同判定を使わない。固定小数文字列では負のゼロ・丸め境界が一致を壊すため使用しない。エラーはDiagramError / QuestionValidationErrorのidで識別。
- Open risks: 非対称vertexMap実適用・内部禁止三角形・円接触等は独立実行済みだが一部はコミット対象の回帰テストに未固定。P2教材・P4統合で再確認。教材全45問・画面・保存共存の実ブラウザー確認は未実施。
- Deferred: P2=T4/T5の固定教材と内容検証、P3=画面・進行、P4=公開ルート・E2E・教材目視。none以外の延期は計画どおり。
- Validation notes: `bun run typecheck` PASS。`bun run test -- src/apps/geometry/domain src/shared/progress` 4ファイル23件PASS。独立反例のπ回転と丸め境界は回帰追加済み。P2で型検査とgeometry関連テストを再実行。全体テスト・ビルド・E2EはP1の必須確認に含まれず未実施。作業中に現れたbash.exe.stackdumpは成果物に含めない。
- Commit: 本エントリーを含むP1境界コミットを直後に作成。ハッシュは次回開始時のEXECUTION_UPDATEでgit履歴から記録し、amendしない。

## Handoff: P2 — 2026-10-15T16:24:31+09:00

- Decisions: T4・T5を実装、独立Task検証とPhase再検証PASS。session-modeはper-phase、baselineはnone。T5の正解前個数ヒント・包含規則不足・教材記録を局所補正。仕様と計画の意味内容の変更はnone。
- Interfaces: `data/match.ts`の`MATCH_QUESTIONS`（30問）と`MATCH_VIEWBOX={minX:-6,maxX:6,minY:-6,maxY:6}`、`data/count.ts`の`COUNT_QUESTIONS`（15問）。`data/index.ts`の`GEOMETRY_STAGES`はmanifest順の9件、`getGeometryStage(stageId)`は該当ステージまたはundefined。`GeometryStage`は`MatchStage | CountStage`の判別共用体でmode=`match`/`count`に応じたquestions（固定順5問）を返す。共通キーはid/title/description/cardDescription。descriptionには応用の包含規則があるためP3の開始説明に反映する。
- Constraints discovered: 基本の見本と候補は全て同じ[-6,6]座標枠で描画し、個別の自動フィットをしない。円以外の正誤候補とも回転がある。候補IDは正誤を示さないoption形式。応用図は負座標（共有辺の上下正三角形）を含む。円の正解はcircleId参照でintro:q05、0個はintro:q02。正解数・breakdown・explanationは正解前に表示せず、hintだけを誤答時に使う。包含に該当する全7問はhintにも規則を明示する。
- Open risks: 実表示での共通尺度・小画面のサイズ差の読み取り・全45問目視・アクセシビリティ・保存共存のブラウザー検証は未実施、P3/P4で確認。混在ステージは単純な対角線付き正方形を複数問で使うが承認済みの構造要件は満たす。P1の独立一時検証の一部は引き続き未固定。その他の未解決不具合はnone。
- Deferred: P3=T6/T7/T8の描画・進行・入力・解説、P4=T9/T10の入口・全問実操作・教材目視・保存互換性・全体回帰。全体テスト・ビルド・E2E・Final Evaluationは計画どおり後続へ。
- Validation notes: `bun run typecheck` PASS、`bun run test -- src/apps/geometry` 4ファイル15テストPASS。独立Phase検証の別実装の点集合・回転計算で基本30/30一致、応用15問の手作業の個数・内訳照合15/15一致（`1,0,1,2,1 / 5,3,2,2,2 / 1,2,1,2,1`）。T5初回Task FAILとP2初回FAIL_LOCALは補正し再検証PASS、attemptsは`T5-answer-hint-leak:1, T5-overlap-rule-copy:2, T5-review-record-mismatch:1`を維持。P1の既存domain/progress変更なし。P3では型検査・geometry/interactionテスト・ビルドを行う。
- Commit: 本エントリーを含むP2境界コミットを直後に作成。ハッシュは次回開始時のEXECUTION_UPDATEでgit履歴から記録し、amendしない。

## Handoff: P3 — 2026-10-15T17:02:52+09:00

- Decisions: T6・T7・T8を実装し、独立Task検証・Phase最終再検証PASS。session-modeはper-phase、baseline none。Phase検証で円の半径図と所有済み基本カードの特徴表示を局所補正。仕様・計画の意味内容の変更はnone。P1・P2の教材と保存契約は変更なし。
- Interfaces: `src/apps/geometry/index.tsx`のdefault export `Geometry`をP4で`#/geometry`へ登録する。`domain/session.ts`の`initialSession` / `transitionSession` / `canRecordCompletion`が純粋な進行・初回点・完了資格を管理。submit/advanceはsessionIdとquestionIdを要求する。`ShapeFigure({shape,label,className?})`、`MatchExplanation({question,shapeKind,stageDescription?})`、`CountDiagram({question,solutionIndex?,showSolutions?})`、`CountExplanation({question})`、`CountQuestionView({question,locked,value,feedback,headingRef?,onChange,onSubmit})`はnamed export。ゲームindexがstyles.cssを読み込む。未登録ルートや正解露出用機能の追加はnone。
- Constraints discovered: 見本・候補の共通viewBoxは[-6,6]、実問のSVG枠は375pxで112px・768/1280pxで192px。補助確認は代表問のみ、全問はP4。入力は`parseIntegerInput`、NumberInputのmaxLengthは3。ガードはsessionId・問題ID・answer/advance別に生成し、renderで試行tokenを捕捉、誤答時だけrearmする。guard更新で再renderし、refだけ更新して古いtokenを残さない。画面/問題遷移はh2へfocusし、Enterのネイティブ二重発火とrepeatを抑止。基本カードの特徴は所有済みにだけstage.descriptionも表示する。公開ルート未登録のため本番ビルドでの実際のGeometryバンドルと公開導線はP4で確認する。
- Open risks: 公開ルート・本番プレビュー・全45問目視・全基本30問の3幅尺度・キーボード完走/連打/長押し・reduced-motion・保存不可/旧記録共存・既存4ゲーム回帰はP4の受け入れ検証が必要。基本図形の小画面でのサイズ差の読み取りを全問確認する。P1の一部独立一時反例は未固定のまま。その他の未解決不具合はnone。
- Deferred: P4=T9のホーム・ルートと保存共存、T10の全問E2E・教材目視・文書更新・全体回帰。Final EvaluationはP4後。計画外の延期はnone。
- Validation notes: 最終独立Phase検証で型検査・geometry/interaction27テスト・ビルド・diff検査PASS、9ステージ45解説の純粋遷移と再練習・放棄・9報酬IDを確認。補助fresh dev mountで基本誤答4/5・応用5/5・負数拒否・0個操作なし・輪郭2/2・代表3幅等寸・保存を確認。dev初回遅延と一時ハーネスの修正は証拠欄参照。検証ブラウザーとdevサーバーは終了済み。P4で全体typecheck/test/test:e2e/buildを実行する。attemptsはT7-stale-run-test-fixture:1、T6-circle-radius-diagram:1、T7-card-feature-copy:1を保持。
- Commit: 本エントリーを含むP3境界コミットを直後に作成。ハッシュは次回開始時のEXECUTION_UPDATEでgit履歴から記録し、amendしない。

## Handoff: P4 — 2026-10-16T08:26:25+09:00

- Decisions: T9・T10を実装し独立Task/Phase検証PASS。P4で発見した円輪郭強調CSS（T6）と画面変更後のnative連続クリック（T7）を局所補正し、それぞれfresh Task検証PASS。session-modeはper-phase、baseline none。仕様・計画の意味内容の変更none。
- Interfaces: ホーム5枚目から`#/geometry`へ既存Geometry default exportを登録。既存42件+図形9件のカタログ、保存キー/形式version 1を維持。`docs/reviews/artifacts/geometry/manifest.json`が全45IDの問題/解説/輪郭画像へ対応し、contact-sheet.htmlで一覧、validation-summary.jsonで検証結果を追跡できる。
- Constraints discovered: SVGの円基本セレクターに対して選択円の強調セレクターを明示する。native二重クリックは切替後の別ボタンへ届くため、初回クリックの画面IDと比較し変更後のdetail>1だけcaptureで抑止する。同一画面の数字11や輪郭1→3→1とdetail0のキーボード操作を保全。元画像134枚は専用artifacts、既存レポート/旧画像の自動差分は成果物から除外。
- Open risks: 承認済み範囲内の未解決none。ローカルPlaywright Chromiumでの確認に限り、実機/他ブラウザー/公開環境は未確認。目視はエージェントで、人によるレビューではない。P1一部の一時反例は恒久的な単体回帰に未固定（過去Handoff参照）。Final Evaluationで評価する。
- Deferred: Final Evaluationのみを直後に実施。追加Phaseや計画外の延期none。デプロイ・push・公開は対象外で未実施。
- Validation notes: 最新ソースで型検査・全Vitest11ファイル58件・全E2E59件（12.1分、失敗/skip0）・ビルドPASS。fresh T10 validatorは内容3テスト・E2E6件・画像参照/ハッシュを独立確認。fresh Phase validatorは7ファイル38テスト・E2E11件・本番ビルド・diff検査PASS。全45問/26輪郭/代表18枚の目視で重大表示不具合none。予備失敗・中断・終了不明は検証記録とsummaryに保持。attemptsはExecution Stateの値を維持。
- Commit: 本エントリーを含むP4境界コミットを直後に作成。ハッシュは次のEXECUTION_UPDATEで記録し、amendしない。

# Final Evaluation

- 現在：Planはdraft。P1〜P4の全PhaseとT1〜T10の全Taskはvalidated。P4 Phase検証はPASS、Final Evaluationは直後に実施する。
- 実装の最終差分：P1は幾何モデル・合同/包含分類・全輪郭検証と旧保存/9ステージ契約、P2は固定45問と教材記録、P3は描画・進行・両モード/解説/結果/カード帳、P4はホーム5枚目・`#/geometry`・受け入れE2E・README/検証記録・134PNG/manifest/HTML/summaryを追加。P4で円の輪郭強調CSS優先順位と画面境界のnative連続クリックを局所補正した。
- 計画の意味内容の変更：none。安定した仕様の変更：none。現行の意味内容の版はgenerated.at: 2026-10-15T14:57:46+09:00で、plan_reviewer/gpt-6-astraが2026-10-15T14:58:17+09:00にPASS。実装時の変更は既存契約を満たす局所補正とEXECUTION_UPDATEのみ。
- 最終全体確認：`bun run typecheck` PASS、`bun run test` 11ファイル58/58 PASS、`bun run test:e2e` Chromium59/59（12.1分、失敗0・skip0、図形17件を含む）PASS、`bun run build` Vite71モジュールPASS。T10のfresh task_validatorは内容3テスト・実E2E6件を独立再実行してPASS。T6/T7の補正もfresh Task検証PASS。
- 教材の受け入れ証拠：基本30問×375/768/1280pxの共通尺度/比率/描画範囲/横はみ出しを自動確認。全45問を実画面から回答し毎問/最後の解説を経由。主エージェントが問題/解説90枚・全26輪郭・代表18枚を目視し重大表示不具合none。これは人によるレビューではない。
- 保持された証跡：[教材確認](../reviews/geometry-content.md)、[検証記録](../reviews/geometry-validation.md)、[45問manifest](../reviews/artifacts/geometry/manifest.json)、[画像一覧](../reviews/artifacts/geometry/contact-sheet.html)、[最終結果summary](../reviews/artifacts/geometry/validation-summary.json)。一時ログは`/tmp/geometry-final-{typecheck,e2e,build}.log`と`/tmp/geometry-p4-unit.log`。予備実行の失敗/中断/終了不明を検証記録とsummaryに明示。
- 既知の未解決事項：承認済み範囲内ではnone。実ブラウザー確認はローカルPlaywright Chromiumで、実機・他ブラウザー・公開環境・完全非視覚代替・複数タブ同時更新は保証対象外。独立一時検証の一部はP1 Handoff記載のとおり恒久的な単体回帰テストに未固定だが、幾何/教材テストと全問確認は成功。
- 運用：保存キー/形式version 1を維持し移行不要。旧4ゲームの記録・報酬・自己ベストと共存。入口を止める切り戻しでは新カタログ/検証を保持し、旧コードで新データを削除/暗黙ダウングレードしない。デプロイ・外部通信・公開・pushは対象外で未実施。per-phaseのP4ローカルコミットはPhase PASS後に行う。

- P4独立Phase検証：F1〜F7/G1〜G11と最終評価へ渡す証拠の追跡性はPASS。独立38 unit/11 E2E・ビルド・diff検査成功。未解決の統合不具合/契約違反none。
