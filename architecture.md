# Workflow Performance Monitor - アーキテクチャ

## 概要

GitHub Actions ワークフローの実行時テレメトリを収集・可視化するアクション。
以下の 3 種類のデータを収集します：

- **Step Trace**: ワークフローステップの実行時間（Mermaid Gantt チャート）
- **System Metrics**: CPU、メモリ、ネットワーク、ディスク I/O（QuickChart.io グラフ）
- **Process Trace**: 実行中のプロセス情報

## ディレクトリ構造（機能ベース・縦割り）

```
src/
├── entry/                          # アクションのエントリーポイント
│   ├── main.ts                    # 起動時（pre）- 各機能を開始
│   └── post.ts                    # 終了時（post）- データ収集とレポート生成
├── features/                       # 機能モジュール
│   ├── step/                      # Step Trace機能
│   │   ├── tracer.ts              # ステップ実行時間の追跡
│   │   ├── chartGenerator.ts      # Ganttチャート生成
│   │   └── reportFormatter.ts     # レポート整形
│   ├── process/                   # Process Trace機能
│   │   ├── processTracerManager.ts     # プロセストレース管理（オーケストレーター）
│   │   ├── processTracerWorker.ts      # プロセス収集ワーカー（別プロセス）
│   │   ├── chartGenerator.ts           # Ganttチャート生成
│   │   ├── tableGenerator.ts           # テーブル生成
│   │   ├── reportFormatter.ts          # レポート整形
│   │   ├── dataRepository.ts           # データ永続化
│   │   ├── types.ts                    # 型定義
│   │   └── __tests__/                  # テスト
│   │       └── processTracerWorker.test.ts
│   └── stats/                     # System Metrics機能
│       ├── statsCollectorManager.ts     # メトリクス管理（オーケストレーター）
│       ├── statsCollectorWorker.ts      # メトリクス収集ワーカー（別プロセス）
│       ├── chartGenerator.ts            # QuickChart.io APIでグラフ生成
│       ├── reportFormatter.ts           # レポート整形
│       ├── dataRepository.ts            # データ永続化
│       ├── types.ts                     # 型定義
│       └── __tests__/                   # テスト
│           └── statsCollectorWorker.test.ts
├── config/                        # 設定管理
│   ├── loader.ts                  # 設定読み込み
│   └── types.ts                   # 設定型定義
├── utils/                         # 共通ユーティリティ
│   ├── logger.ts                  # ログ出力ラッパー
│   └── formatter.ts               # 共通フォーマッター
└── interfaces/                    # グローバル型定義
    └── index.ts                   # TypeScript型定義
```

## Worker/Manager パターン

プロセスとメトリクス収集機能は、**Worker/Manager**パターンを採用しています。

### パターン概要

```
Manager (オーケストレーター)          Worker (データ収集)
┌─────────────────────────┐         ┌──────────────────────────┐
│ processTracerManager.ts │────┐    │ processTracerWorker.ts   │
│                         │    │    │                          │
│ - ライフサイクル管理     │    │    │ - 継続的なデータ収集      │
│ - Workerプロセス起動     │spawn   │ - ファイルへの永続化      │
│ - データ読み込み         │────┘    │ - 1秒間隔でプロセス監視   │
│ - レポート生成           │         │                          │
└─────────────────────────┘         └──────────────────────────┘
         ↑                                      │
         │                                      │
         └──────────── File I/O ─────────────────┘
                  (proc-tracer-data.json)

┌─────────────────────────┐         ┌──────────────────────────┐
│ statsCollectorManager.ts│────┐    │ statsCollectorWorker.ts  │
│                         │    │    │                          │
│ - ライフサイクル管理     │    │    │ - 継続的なデータ収集      │
│ - Workerプロセス起動     │spawn   │ - ファイルへの永続化      │
│ - データ読み込み         │────┘    │ - 5秒間隔でメトリクス収集 │
│ - グラフ生成依頼         │         │                          │
└─────────────────────────┘         └──────────────────────────┘
         ↑                                      │
         │                                      │
         └──────────── File I/O ─────────────────┘
                    (stats-data.json)
```

## アーキテクチャ概要

### 実行フロー

```
┌─────────────────┐
│   main.ts       │  ← GitHub Actions "pre" フェーズ
│   (起動時)      │
└────────┬────────┘
         │
         ├─→ stepTracer.start()                    - 準備のみ
         ├─→ statsCollectorManager.start()         - spawn statsCollectorWorker
         └─→ processTracerManager.start()          - spawn processTracerWorker

         ... ワークフロー実行中 ...
         （Workerプロセスがバックグラウンドでデータ収集）

┌─────────────────┐
│   post.ts       │  ← GitHub Actions "post" フェーズ
│   (終了時)      │
└────────┬────────┘
         │
         ├─→ stepTracer.finish() + report()        - GitHub APIからステップ情報取得
         ├─→ statsCollectorManager.finish() + report() - ファイルからメトリクス読み込み
         ├─→ processTracerManager.finish() + report()  - ファイルからプロセスデータ読み込み
         │
         └─→ reportAll()  - PR コメント / Job Summary に出力
```

## 主要コンポーネント

### 1. Step Tracer (`features/step/tracer.ts`)

**役割**: GitHub Actions のステップ実行時間を可視化

- **データ源**: GitHub API（`WorkflowJobType`）
- **処理**:
  - `start()`: 何もしない（準備のみ）
  - `finish()`: 何もしない
  - `report()`: GitHub API から取得したジョブ情報から Mermaid Gantt チャートを生成
- **出力**: Mermaid Gantt chart

### 2. Process Tracer (Worker/Manager パターン)

#### processTracerManager.ts（オーケストレーター）

**役割**: プロセストレースのライフサイクル管理

- **処理**:
  - `start()`: processTracerWorker を子プロセスとして起動
  - `finish()`: Worker プロセスの終了を待機
  - `report()`: ファイルからデータ読み込み、レポート生成
- **出力**: Mermaid Gantt chart + ASCII テーブル
- **プラットフォーム**: Linux/Ubuntu のみ

#### processTracerWorker.ts（データ収集ワーカー）

**役割**: 実行中のプロセスを監視・記録

- **データ源**: `systeminformation.processes()`
- **処理**:
  - 1 秒間隔でプロセス情報を収集
  - 各プロセスの PID、名前、CPU/メモリ使用率、開始/終了時刻を記録
  - データをファイル（`proc-tracer-data.json`）に保存
- **実行**: Detached 子プロセスとして独立動作

### 3. Stats Collector (Worker/Manager パターン)

#### statsCollectorManager.ts（オーケストレーター）

**役割**: システムメトリクスのライフサイクル管理

- **処理**:
  - `start()`: statsCollectorWorker を子プロセスとして起動
  - `finish()`: Worker プロセスの終了を待機
  - `report()`: ファイルからデータ読み込み、グラフ生成
- **出力**: QuickChart.io で生成したグラフ（ダーク/ライトモード対応）

#### statsCollectorWorker.ts（データ収集ワーカー）

**役割**: システムメトリクスをリアルタイム収集

- **データ源**: `systeminformation`
- **処理**:
  - 設定間隔（デフォルト 5 秒）でメトリクス収集
  - データをヒストグラムに蓄積
  - ファイル（`stats-data.json`）に保存
- **収集するメトリクス**:
  1. **CPU**: User/System Load (%)
  2. **Memory**: Active/Available (MB)
  3. **Network I/O**: Read/Write (MB/s)
  4. **Disk I/O**: Read/Write (MB/s)
  5. **Disk Size**: Used/Available (MB)
- **実行**: Detached 子プロセスとして独立動作

### 4. Chart Generator (`features/stats/chartGenerator.ts`)

**役割**: QuickChart.io API でグラフ生成

- **入力**: ProcessedStats（時系列データ）
- **出力**: HTML の`<picture>`タグ（ダーク/ライトモード対応）
- **グラフタイプ**:
  - Line Graph: Network I/O, Disk I/O
  - Stacked Area Graph: CPU、Memory、Disk Size
- **配置理由**: stats 機能でのみ使用されるため、`features/stats/`内に配置

## ビルド構成

### Rollup 設定 (`rollup.config.mjs`)

4 つの独立したバンドルを生成：

| エントリーポイント                            | 出力                 | 用途                     |
| --------------------------------------------- | -------------------- | ------------------------ |
| `src/entry/main.ts`                           | `dist/main/index.js` | アクション起動時（pre）  |
| `src/entry/post.ts`                           | `dist/post/index.js` | アクション終了時（post） |
| `src/features/stats/statsCollectorWorker.ts`  | `dist/scw/index.js`  | メトリクス収集ワーカー   |
| `src/features/process/processTracerWorker.ts` | `dist/pcw/index.js`  | プロセス収集ワーカー     |

**重要**: Worker ファイルは各 Manager で`spawn()`により別プロセスとして起動されるため、独立したバンドルが必要。

## データフロー

### 起動時（main.ts）

```
main.ts
  ├─→ stepTracer.start()                   準備のみ
  ├─→ statsCollectorManager.start()        spawn("dist/scw/index.js")
  └─→ processTracerManager.start()         spawn("dist/pcw/index.js")
```

### 終了時（post.ts）

```
post.ts
  │
  ├─→ GitHub API → currentJob取得
  │
  ├─→ stepTracer.report(currentJob)
  │     └─→ Mermaid Ganttチャート生成
  │
  ├─→ statsCollectorManager.report(currentJob)
  │     ├─→ stats-data.json読み込み
  │     └─→ chartGenerator → QuickChart API → グラフURL
  │
  ├─→ processTracerManager.report(currentJob)
  │     ├─→ proc-tracer-data.json読み込み
  │     └─→ Gantt + テーブル生成
  │
  └─→ reportAll(content)
        ├─→ Job Summary (core.summary)
        └─→ PR Comment (octokit.rest.issues.createComment)
```

## 設定項目 (`action.yml`)

| 入力                         | デフォルト            | 説明                               |
| ---------------------------- | --------------------- | ---------------------------------- |
| `github_token`               | `${{ github.token }}` | GitHub API アクセストークン        |
| `metric_frequency`           | `5`                   | メトリクス収集間隔（秒）           |
| `proc_trace_min_duration`    | `-1`                  | プロセストレース最小実行時間（ms） |
| `proc_trace_chart_show`      | `true`                | プロセス Gantt チャート表示        |
| `proc_trace_chart_max_count` | `10`                  | チャート表示プロセス数             |
| `proc_trace_table_show`      | `false`               | プロセステーブル表示               |
| `comment_on_pr`              | `true`                | PR コメント投稿                    |
| `job_summary`                | `true`                | Job Summary 投稿                   |

## 技術スタック

- **言語**: TypeScript (strict mode)
- **ランタイム**: Node.js v24
- **ビルド**: Rollup
- **テスト**: Jest + ts-jest
- **ライブラリ**:
  - `@actions/core`: GitHub Actions API
  - `@actions/github`: GitHub REST API (Octokit)
  - `systeminformation`: システムメトリクス取得
  - QuickChart.io: グラフ生成（外部 API）
