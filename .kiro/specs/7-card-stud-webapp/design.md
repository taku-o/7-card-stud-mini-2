# Design Document: 7-card-stud-webapp

## Overview 

**Purpose:** この機能は、ブラウザ上で 7 カードスタッドポーカーを人間対 CPU の 1 対 1 形式でプレイできる Web アプリを提供し、プレイヤーがルール理解・戦略検討・娯楽として利用できる価値を提供する。  
**Users:** 主な利用者は、ポーカーに興味がある個人ユーザーであり、学習目的・暇つぶし・軽いトレーニング用途で 7 スタッドポーカーをプレイしたいユーザーである。  
**Impact:** 現状存在しないゲーム機能を新規に追加し、ブラウザ単一ページ上でカード配布・ベッティング・ショーダウン・統計表示まで完結するゲーム体験を提供する。

### Goals
- 7 カードスタッドポーカーの基本ルール（カード配布、各ストリート、ショーダウン）を Web 上で再現する。
- プレイヤーが直感的にベット/コール/フォールド操作できる UI を提供する。
- CPU が手札・ボード状況に基づいた簡易戦略で振る舞い、人間と対戦している感覚を与える。
- 単一ページ内で複数ラウンドを連続プレイできるゲームセッション体験を提供する。

### Non-Goals
- オンライン対人戦（複数人マルチプレイ、リアルタイム通信）の実装。
- チップや戦績のサーバサイド永続化、アカウント管理機能。
- 課金・広告・tip 機能など、本要件に含まれない収益化関連機能。
- 複雑な難易度調整・CPU 学習アルゴリズム（機械学習など）の導入。

## Architecture

### Architecture Pattern & Boundary Map

**Architecture Integration:**
- Selected pattern: 単一ページ構成の Web アプリケーション（フロントエンド中心、バックエンド不要または最小限）  
- Domain/feature boundaries:
  - 「ゲームドメイン層」: カード・役判定・ターン進行・ベッティングロジック
  - 「CPU 戦略層」: CPU のアクション決定ロジック
  - 「UI プレゼンテーション層」: 画面レンダリング、ユーザー入力、状態表示
- Existing patterns preserved: 本プロジェクトの標準的なフロント/ドメイン分離方針（存在する場合）に合わせ、ゲームドメインロジックを UI から分離する。
- New components rationale:
  - `GameEngine` 相当のドメインロジックコンポーネントで、カード配布〜ショーダウンまでを一括管理する。
  - `CpuStrategy` コンポーネント/モジュールで CPU のアクション判断を疎結合にし、パラメータ調整をしやすくする。
  - `GameView` コンポーネントで UI 構成要素（カード表示、アクションボタン、情報パネル）をまとめる。

### Technology Stack

| Layer              | Choice / Version | Role in Feature                                  | Notes                                  |
|--------------------|------------------|--------------------------------------------------|----------------------------------------|
| Frontend / UI      | ブラウザ (HTML/JS/TS + 任意のUIフレームワーク) | ゲーム画面表示、ユーザー入力、状態管理         | プロジェクト標準のフロント技術に従う |
| Backend / Services | なし（初期版）  | ゲームロジックはフロント内で自己完結           | 将来的拡張用のAPIは今回の範囲外       |
| Data / Storage     | ブラウザメモリのみ | ゲーム状態・統計情報の一時保持                 | リロード時にリセットされる前提       |
| Messaging / Events | なし             |                                                  |                                        |
| Infrastructure     | 静的ホスティング | 単一ページ Web アプリのホスティング            | 環境依存設定は別途ステアリング参照   |

## System Flows

### ゲーム 1 ラウンドの基本フロー（概略）

- プレイヤーが「新規ゲーム開始」ボタンを押下する。
- システムがデッキを初期化し、プレイヤーと CPU に 7 スタッドのルールに従ってカードを配布する。
- 各ストリートごとに以下を繰り返す:
  - UI が現在のカードとアクションボタン（ベット/コール/フォールドなど）を表示する。
  - プレイヤーがアクションを選択する。
  - システムが CPU のアクションを `CpuStrategy` によって決定し、ポットとスタックを更新する。
- 最終ストリート後にショーダウンを行い、手役評価モジュールでプレイヤーと CPU の役を判定する。
- 勝者・役の内容・チップ変動を表示し、統計情報（勝敗数など）を更新する。
- プレイヤーが「次のラウンド」ボタンで同一ページ内で次ラウンドを開始する。

## Requirements Traceability

| Requirement | Summary                                  | Components                               | Interfaces                  | Flows                     |
|------------|------------------------------------------|------------------------------------------|----------------------------|---------------------------|
| 1          | 7スタッドの基本ルールとターン進行        | GameEngine, HandEvaluator, GameState     | GameView ↔ GameEngine      | ラウンド基本フロー        |
| 2          | プレイヤー操作とベッティング             | GameEngine, GameState, GameView          | UI アクションハンドラ       | ベッティングサブフロー    |
| 3          | CPUプレイヤーの思考と挙動                | CpuStrategy, GameEngine                  | GameEngine ↔ CpuStrategy   | CPU 思考フロー            |
| 4          | ゲームセッション管理とUI                 | GameView, StatsTracker, GameState        | GameView 内部状態管理      | 新規ゲーム〜連続ラウンド |

## Components and Interfaces

### Domain Layer

#### GameEngine

| Field | Detail |
|-------|--------|
| Intent | 1 ラウンドのゲーム進行（カード配布、各ストリート、ショーダウン、ポット管理）を一元的に管理する。 |
| Requirements | 1, 2, 3 |

**Responsibilities & Constraints**
- デッキの初期化とシャッフルを管理する。
- プレイヤーと CPU へのカード配布を 7 カードスタッドのルールに沿って行う。
- 各ストリート開始時・終了時の状態遷移（現在ストリート、残りカード、ポット）を管理する。
- プレイヤーのアクション入力および CPU のアクション決定結果に基づき、ポット・スタックを更新する。
- 最終ストリート終了後に HandEvaluator を呼び出し、ショーダウン結果を判定する。

**Dependencies**
- Inbound: GameView からのアクション呼び出し（ユーザー操作）。
- Outbound: CpuStrategy（CPU のアクション決定）、HandEvaluator（役判定）、StatsTracker（統計更新）。

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### Service Interface（イメージ）

```typescript
interface GameEngine {
  startNewRound(config: RoundConfig): GameState;
  playerAction(action: PlayerAction): GameState;
  getCurrentState(): GameState;
}
```

- Preconditions: ラウンド開始前に `startNewRound` が呼ばれていること。
- Postconditions: 各メソッド呼び出し後、`GameState` が一貫した状態で更新されること。

#### CpuStrategy

| Field | Detail |
|-------|--------|
| Intent | CPU のアクション（ベット/コール/フォールドなど）を、手札・ボード状況・簡易パラメータに基づいて決定する。 |
| Requirements | 3 |

**Responsibilities & Constraints**
- 手札の強さ（役・ドローの可能性）、公開カード状況、ポットサイズ、ストリートなどを入力としてアクションを返す。
- ランダム性を適度に含めつつ、常に同じ行動にならないようにする。
- 「アグレッシブ/パッシブ」「タイト/ルース」などのパラメータを持ち、テストから切り替えられるようにする。

**Dependencies**
- Inbound: GameEngine から現在の `GameState` とストリート情報。
- Outbound: なし（純粋関数に近い形を想定）。

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

##### Service Interface（イメージ）

```typescript
interface CpuStrategy {
  decideAction(state: GameState, options: CpuStrategyOptions): CpuAction;
}
```

#### HandEvaluator

| Field | Detail |
|-------|--------|
| Intent | 7 カードから有効な 5 枚を選択し、ポーカー役を判定・比較可能な形式にエンコードする。 |
| Requirements | 1 |

**Responsibilities & Constraints**
- プレイヤー・CPU それぞれの 7 枚のカードから最強の 5 枚役を判定する。
- 役の強さ比較ができるスコア値を返し、同点時にはキッカー比較などのルールに従う。

**Dependencies**
- Inbound: GameEngine から渡されるカード情報。
- Outbound: なし。

**Contracts**: Service [x]

### UI Layer

#### GameView

| Field | Detail |
|-------|--------|
| Intent | ブラウザ画面上にカード、ポット、スタック、アクションボタン、統計パネルを表示し、ユーザー操作を GameEngine に橋渡しする。 |
| Requirements | 1, 2, 4 |

**Responsibilities & Constraints**
- 現在ストリート、カード、ポット、スタック、ゲーム結果、統計情報を視覚的に表示する。
- ベット/コール/フォールドなどのアクションボタンを表示し、利用可能かどうかに応じて活性/非活性を制御する。
- 「新規ゲーム開始」「次のラウンド」ボタンを提供し、単一ページ内で連続プレイを実現する。
- ブラウザリロード時に状態がリセットされることを説明文として表示する。

**Dependencies**
- Inbound: なし（ルートコンポーネントとしてマウントされる想定）。
- Outbound: GameEngine（サービス呼び出し）、StatsTracker（統計表示用データ取得）。

**Contracts**: State [x]

#### StatsTracker

| Field | Detail |
|-------|--------|
| Intent | ゲーム数、勝利数、敗北数、勝率などの簡易統計をラウンド単位で集計し、GameView に提供する。 |
| Requirements | 4 |

**Responsibilities & Constraints**
- 各ラウンド終了時に結果を記録し、累積統計を更新する。
- ブラウザリロード時には統計がリセットされる前提で動作する。

**Dependencies**
- Inbound: GameEngine からのラウンド終了イベントまたは結果情報。
- Outbound: GameView への統計データ提供。

## Data Models

### Domain Model（概要）

- Entity: `Card`（スート・ランク）
- Entity: `Hand`（プレイヤー/CPU の 7 枚カード）
- Value Object: `HandRank`（役の種類・強さ・キッカー情報）
- Entity: `GameState`（現在ストリート、ポット、スタック、ボード、配布カード、進行状態）
- Value Object: `RoundResult`（勝者、役、チップ変動）

### Logical Data Model（簡易）

- `GameState`
  - `playerStack: number`
  - `cpuStack: number`
  - `pot: number`
  - `street: enum`
  - `playerCards: Card[]`
  - `cpuCards: Card[]`
  - `roundResult?: RoundResult`

### Data Contracts & Integration

- 外部 API やストレージとのデータ連携は行わない。
- すべてのデータはブラウザメモリ内のオブジェクトとして扱う。

## Error Handling

### Error Strategy

- 想定外入力は原則として UI 上から起こらない設計とし、ドメインロジックでは内部エラー（無効な状態遷移など）を検出してログ出力する。
- UI は致命的エラー時に簡易なエラーメッセージを表示し、ラウンド再開またはページリロードを促す程度とする。

### Error Categories and Responses

- User Errors（入力エラー）: UI のボタン制御により抑止する。
- System Errors（例外）: コンソールログ出力とし、UI では「予期せぬエラーが発生しました。ゲームを再開してください。」を表示する。
- Business Logic Errors: 不正な状態遷移（例: ストリート順の破綻）は開発中に検出し修正する想定。

## Testing Strategy

- Unit Tests:
  - HandEvaluator の役判定と比較ロジック（複数のパターンテスト）。
  - CpuStrategy のアクション決定ロジック（強い/弱い手の場合の傾向確認）。
  - GameEngine の状態遷移（ストリート進行、ポット更新）のテスト。
- Integration Tests:
  - GameEngine と CpuStrategy を組み合わせた 1 ラウンド進行テスト。
  - GameEngine と StatsTracker を組み合わせた統計更新テスト。
- E2E/UI Tests:
  - ブラウザ上で「新規ゲーム開始→1 ラウンド終了→結果表示」までのパス。
  - プレイヤーがフォールドした場合に CPU 勝利として表示されること。
  - 複数ラウンド連続プレイ時に統計情報が更新されること。

