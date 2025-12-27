# Argus - システムアーキテクチャ

## 全体構成図

```mermaid
flowchart TB
    subgraph UI["User Interface"]
        Chat["Chat Interface<br/>(依頼・質問応答)"]
        Review["Review Queue<br/>(確認待ちタスク)"]
        Dashboard["Dashboard<br/>(進捗・モデル管理)"]
    end

    subgraph Orchestration["Agent Orchestration Layer"]
        Supervisor["Supervisor Agent<br/>(LLM)"]
        Scout["Scout Agent<br/>映像探索"]
        Annotator["Annotator Agent<br/>ラベル付け"]
        Trainer["Trainer Agent<br/>学習実行"]
        Evaluator["Evaluator Agent<br/>精度評価"]

        Supervisor --> Scout
        Supervisor --> Annotator
        Supervisor --> Trainer
        Supervisor --> Evaluator
    end

    subgraph Workflow["Workflow Engine"]
        Temporal["Temporal<br/>長時間実行・状態永続化"]
    end

    subgraph Services["ML Services"]
        VideoSearch["Video Search<br/>(SigLIP 2)"]
        AnnotationEngine["Annotation Engine<br/>(SAM 3)"]
        TrainingPipeline["Training Pipeline<br/>(YOLOX等)"]
        ModelRegistry["Model Registry<br/>(MLflow)"]
        Notification["Notification<br/>Service"]
    end

    UI --> Orchestration
    Orchestration --> Workflow
    Workflow --> Services
```

## レイヤー詳細

### 1. User Interface Layer

| コンポーネント | 役割 | 技術 |
|--------------|------|------|
| Chat Interface | 自然言語でのモデル作成依頼、AIからの質問応答 | Next.js + WebSocket |
| Review Queue | AIが判断に迷った箇所の確認依頼一覧 | Next.js |
| Dashboard | プロジェクト管理、進捗確認、モデル一覧 | Next.js |
| Annotation UI | 手動修正用のバウンディングボックス編集 | Konva.js (react-konva) |

### 2. Agent Orchestration Layer

AIエージェントがユーザー要求を解釈し、タスクを自律的に実行する層。

```mermaid
flowchart LR
    subgraph Agents["Agent Orchestration"]
        direction TB
        Supervisor["Supervisor Agent<br/>全体統括・品質判断"]

        subgraph Specialists["Specialist Agents"]
            Scout["Scout<br/>映像探索"]
            Annotator["Annotator<br/>ラベル付け"]
            Trainer["Trainer<br/>学習実行"]
            Evaluator["Evaluator<br/>精度評価"]
        end

        Supervisor --> Specialists
    end

    User["ユーザー"] <--> Supervisor
    Specialists --> Services["ML Services"]
```

#### Supervisor Agent
- **役割**: 全体の統括、タスク分解、品質判断
- **技術**: LiteLLM + Claude Sonnet 4.5 (デフォルト、他モデルに切り替え可能)
- **責務**:
  - ユーザー要求の解釈・明確化
  - 各専門エージェントへのタスク委譲
  - Human-in-the-Loop の判断（いつユーザーに確認するか）
  - 最終品質の評価

#### Scout Agent
- **役割**: 映像データからターゲットオブジェクトを含むシーンを探索
- **技術**: SigLIP 2 + pgvector
- **入力**: ラベルリスト（例: "person", "cpu", "hdd"）
- **出力**: 該当フレームの候補リスト + 信頼度スコア

#### Annotator Agent
- **役割**: 自動アノテーション生成
- **技術**: SAM 3 (Segment Anything Model 3)
- **入力**: フレーム画像 + テキストプロンプト（ラベル）
- **出力**: バウンディングボックス + セグメントマスク
- **特徴**: テキストプロンプトで全インスタンスを一括検出（Grounding DINO不要）

#### Trainer Agent
- **役割**: モデル学習の実行
- **技術**: YOLOX, YOLOv11, RT-DETR 等（プラガブル設計）
- **入力**: アノテーション済みデータセット
- **出力**: 学習済みモデル + 学習曲線

#### Evaluator Agent
- **役割**: モデル精度の評価・分析
- **技術**: COCO評価メトリクス
- **入力**: 学習済みモデル + テストデータ
- **出力**: mAP、クラス別精度、改善提案

### 3. Workflow Engine Layer

長時間実行されるワークフローを管理し、障害時の復旧を保証する。

- **技術**: Temporal
- **責務**:
  - ワークフロー状態の永続化
  - Human-in-the-Loop での待機（数時間〜数日）
  - リトライ・エラーハンドリング
  - ワークフロー可視化

### 4. ML Services Layer

| サービス | 役割 | 技術 |
|---------|------|------|
| Video Search | セマンティック検索 | SigLIP 2 + pgvector |
| Annotation Engine | 自動ラベリング | SAM 3 |
| Training Pipeline | モデル学習 | YOLOX / YOLOv11 / RT-DETR (プラガブル) |
| Model Registry | モデルバージョン管理 | MLflow |
| Notification Service | ユーザーへの通知 | WebSocket + Email |

## データフロー

### 典型的なワークフロー

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant Sup as Supervisor Agent
    participant Scout as Scout Agent
    participant Ann as Annotator Agent
    participant Train as Trainer Agent
    participant Eval as Evaluator Agent

    User->>Sup: 「person, cpu, hdd で<br/>YOLOXモデルを作成」

    Note over Sup: 要求解析
    Sup->>User: 「工場ラインでの撮影ですか？」
    User->>Sup: 「はい」

    Sup->>Scout: 映像探索依頼
    Scout-->>Sup: 847フレーム発見

    Sup->>User: 「memoryの映像が少ないです」
    User->>Sup: 「このまま続行」

    Sup->>Ann: 自動アノテーション依頼
    Ann-->>Sup: 完了（信頼度低32枚）

    Sup->>User: 「32枚の確認をお願いします」
    User->>Sup: 修正完了

    Sup->>Train: 学習実行依頼
    Train-->>Sup: 学習完了

    Sup->>Eval: 評価依頼
    Eval-->>Sup: mAP: 0.72

    Sup->>User: 「結果: mAP 0.72<br/>memoryの精度が低いです」
    User->>Sup: 「完了とする」

    Sup->>User: 学習済みモデル配信
```

## モデル拡張アーキテクチャ

### Training Pipeline の抽象化

```mermaid
classDiagram
    class BaseTrainer {
        <<abstract>>
        +prepare_dataset(annotations, output_dir)
        +train(dataset_path, config)
        +evaluate(model_path, test_data)
        +export(model_path, format)
    }

    class YOLOXTrainer {
        +prepare_dataset() COCO形式
        +train() MMDetection
    }

    class UltralyticsTrainer {
        -model_type: str
        +prepare_dataset() YOLO形式
        +train() Ultralytics
    }

    class RTDETRTrainer {
        +prepare_dataset() COCO形式
        +train() Ultralytics
    }

    BaseTrainer <|-- YOLOXTrainer
    BaseTrainer <|-- UltralyticsTrainer
    BaseTrainer <|-- RTDETRTrainer

    note for UltralyticsTrainer "YOLOv8, YOLOv11 対応"
```

### 対応モデル一覧

| カテゴリ | モデル | 特徴 | 優先度 |
|---------|-------|------|-------|
| **物体検出** | YOLOX | バランス型、初期実装 | Phase 3 |
| | YOLOv11 | 最新、高速、使いやすい | Phase 5 |
| | RT-DETR | Transformer、高精度 | Phase 5 |
| **セグメンテーション** | YOLOv11-seg | 高速 | 将来 |
| | Mask2Former | SOTA精度 | 将来 |
| **姿勢推定** | YOLOv11-pose | 高速 | 将来 |

### Annotation Engine の抽象化

```mermaid
classDiagram
    class AnnotationEngine {
        <<abstract>>
        +annotate(image, labels) list~Annotation~
    }

    class SAM3Engine {
        +annotate() テキストプロンプト対応
    }

    class GroundedSAM2Engine {
        +annotate() Grounding DINO + SAM 2
    }

    AnnotationEngine <|-- SAM3Engine
    AnnotationEngine <|-- GroundedSAM2Engine

    note for SAM3Engine "推奨: 1モデルで完結"
    note for GroundedSAM2Engine "フォールバック用"
```

## 技術スタック一覧

| カテゴリ | 技術 | 選定理由 |
|---------|------|---------|
| Frontend | Next.js 14 (App Router) | SSR、API Routes、React Server Components |
| Canvas操作 | Konva.js (react-konva) | React統合、レイヤー分離によるパフォーマンス |
| Backend API | FastAPI | 非同期対応、型安全、ML統合が容易 |
| Agent Framework | LangGraph | 複雑なステートマシン、HITL対応 |
| Workflow Engine | Temporal | 長時間実行、障害復旧 |
| LLM Gateway | LiteLLM | マルチプロバイダー対応、セルフホスト可能 |
| LLM (デフォルト) | Claude Sonnet 4.5 | 複雑な判断、日本語対応 |
| 映像検索 | SigLIP 2 + pgvector | 2025年SOTA、多言語対応、高効率 |
| 自動アノテーション | SAM 3 | テキストプロンプト対応、高精度 |
| 学習フレームワーク | YOLOX / YOLOv11 / RT-DETR | プラガブル設計で拡張可能 |
| Model Registry | MLflow | バージョン管理、比較 |
| 認証 | Supabase Auth | OAuth、Magic Link対応 |
| Database | Supabase (PostgreSQL) | RLS、リアルタイム |
| Object Storage | S3 (+ MinIO for local) | スケーラブル |
| Message Queue | Redis (Celery) | 軽量スタート |
| Container | Docker / ECS / EKS | スケーラビリティ |
