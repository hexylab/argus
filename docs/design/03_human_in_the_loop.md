# Argus - Human-in-the-Loop 設計

## 概要

AIエージェントが自律的に処理を進めつつ、重要な判断ポイントでユーザーに確認を求めることで、効率と品質を両立する。

## 設計原則

1. **最小限の介入**: ユーザーに確認するのは本当に必要な場合のみ
2. **明確な選択肢**: 曖昧な質問ではなく、具体的な選択肢を提示
3. **非同期対応**: ユーザーが即座に応答しなくても処理を中断しない
4. **学習機能**: ユーザーの判断パターンを学習し、将来的に自動化

## 全体フロー

```mermaid
flowchart TB
    subgraph Workflow["ワークフロー全体"]
        Start([ユーザー依頼]) --> Parse[要求解析]
        Parse --> HITL1{要件確認<br/>必要?}

        HITL1 -->|Yes| Review1[/"📋 要件確認<br/>HITL"/]
        HITL1 -->|No| Scout
        Review1 --> Scout[映像探索]

        Scout --> HITL2{データ確認<br/>必要?}
        HITL2 -->|Yes| Review2[/"📋 データ確認<br/>HITL"/]
        HITL2 -->|No| Annotate
        Review2 --> Annotate[自動アノテーション]

        Annotate --> HITL3{低信頼度<br/>あり?}
        HITL3 -->|Yes| Review3[/"📋 アノテーション確認<br/>HITL"/]
        HITL3 -->|No| Train
        Review3 --> Train[モデル学習]

        Train --> Evaluate[評価]
        Evaluate --> HITL4{結果確認}
        HITL4 --> Review4[/"📋 結果確認<br/>HITL"/]

        Review4 --> Decision{ユーザー判断}
        Decision -->|完了| Finish([モデル配信])
        Decision -->|改善| Annotate
        Decision -->|データ追加| Scout
    end

    style Review1 fill:#fff3cd
    style Review2 fill:#fff3cd
    style Review3 fill:#fff3cd
    style Review4 fill:#fff3cd
```

## 確認ポイント詳細

### 1. 要件確認 (Requirements Clarification)

```mermaid
stateDiagram-v2
    [*] --> 要求受信
    要求受信 --> 解析中: Supervisor Agent
    解析中 --> 確認必要: 曖昧な点あり
    解析中 --> 続行: 明確
    確認必要 --> ユーザー待機: 質問送信
    ユーザー待機 --> 続行: 回答受信
    続行 --> [*]
```

**タイミング**: プロジェクト開始時

**目的**: ユーザーの意図を正確に理解する

**確認内容**:
- 検出対象の確認（例: "person" = 作業者？）
- 撮影環境の確認（工場ライン / デスク上 / 倉庫）
- 精度優先度（速度優先 / 精度優先 / バランス型）

### 2. データ確認 (Data Review)

**タイミング**: Scout Agentが候補映像を発見した後

**目的**: 適切なデータが選択されているか確認

**確認内容**:
- サンプル画像のプレビュー
- ラベル別の枚数集計
- 不足しているラベルの警告
- アクション選択（続行 / データ追加 / ラベル除外）

### 3. アノテーション確認 (Annotation Review)

**タイミング**: SAM 3 による自動アノテーションで信頼度が低いものがある場合

**目的**: アノテーション品質の担保

**確認内容**:
- 総アノテーション数と自動承認数
- 信頼度の低い画像のレビューUI
- バウンディングボックスの修正ツール
- ラベル変更・削除オプション

### 4. 学習結果確認 (Training Results Review)

**タイミング**: モデル学習完了後

**目的**: モデル品質の最終確認と次のアクション決定

**確認内容**:
- 全体 mAP と クラス別 AP
- 成功例・失敗例のサンプル
- AIによる改善提案
- 次のアクション選択

## 通知・待機メカニズム

```mermaid
sequenceDiagram
    participant Agent as Agent
    participant DB as Supabase
    participant WS as WebSocket
    participant Email as Email Service
    participant User as ユーザー

    Agent->>DB: 確認依頼を保存
    Agent->>WS: リアルタイム通知

    alt ユーザーがオンライン
        WS-->>User: 即時通知
        User->>DB: 回答を保存
        DB-->>Agent: 処理再開
    else ユーザーがオフライン
        Note over Agent,Email: 5分待機
        Agent->>Email: メール通知送信
        Email-->>User: メール受信
        User->>DB: 回答を保存
        DB-->>Agent: 処理再開
    end
```

### リアルタイム通知 (WebSocket)

```typescript
// Frontend
const { data } = useSubscription('review_requests', {
  filter: `project_id=eq.${projectId}`
});

useEffect(() => {
  if (data?.type === 'annotation_review') {
    showNotification('アノテーション確認が必要です');
  }
}, [data]);
```

### 非同期通知 (Email)

```python
# Backend
async def request_user_review(project_id: str, review_type: str):
    # 1. DBに確認依頼を保存
    await supabase.table('review_requests').insert({
        'project_id': project_id,
        'type': review_type,
        'status': 'pending'
    }).execute()

    # 2. WebSocketで通知
    await broadcast_to_project(project_id, {
        'type': 'review_requested',
        'review_type': review_type
    })

    # 3. 5分後にまだ未対応ならメール送信
    await schedule_email_notification(
        project_id=project_id,
        delay_minutes=5,
        subject='Argus: 確認が必要です'
    )
```

### ワークフロー待機 (Temporal)

```mermaid
stateDiagram-v2
    [*] --> 自動アノテーション
    自動アノテーション --> 確認依頼送信
    確認依頼送信 --> ユーザー待機: 最大7日

    state ユーザー待機 {
        [*] --> Pending
        Pending --> Responded: 回答受信
        Pending --> Timeout: 7日経過
    }

    ユーザー待機 --> 学習続行: approved
    ユーザー待機 --> データ追加待機: needs_more_data
    ユーザー待機 --> タイムアウト処理: timeout

    学習続行 --> [*]
    データ追加待機 --> 自動アノテーション: データ追加完了
```

```python
# workflow.py
@workflow.defn
class TrainingWorkflow:
    @workflow.run
    async def run(self, project_id: str):
        # ... 自動アノテーション完了 ...

        # Human-in-the-Loop: ユーザー確認を待機
        review_result = await workflow.execute_activity(
            request_annotation_review,
            args=[project_id],
            start_to_close_timeout=timedelta(days=7)  # 最大7日待機
        )

        if review_result.action == 'approved':
            # 学習を続行
            await workflow.execute_activity(train_model, ...)
        elif review_result.action == 'needs_more_data':
            # データ追加を待機
            await workflow.wait_condition(
                lambda: self.additional_data_uploaded
            )
```

## 確認スキップ条件

```mermaid
flowchart TD
    subgraph Skip["確認スキップ判定"]
        Check[確認タイプ判定]

        Check --> Req{要件確認}
        Req -->|過去に同様のプロジェクト| SkipReq[スキップ]
        Req -->|初回| DoReq[確認実行]

        Check --> Data{データ確認}
        Data -->|全ラベル > 100枚| SkipData[スキップ]
        Data -->|不足あり| DoData[確認実行]

        Check --> Ann{アノテーション確認}
        Ann -->|全て信頼度 > 0.95| SkipAnn[スキップ]
        Ann -->|低信頼度あり| DoAnn[確認実行]

        Check --> Result{結果確認}
        Result -->|全クラス AP > 目標値| SkipResult[スキップ]
        Result -->|未達あり| DoResult[確認実行]
    end
```

| 確認タイプ | スキップ条件 |
|-----------|-------------|
| 要件確認 | 過去に同様のプロジェクトを作成済み |
| データ確認 | 全ラベルで十分なデータ量がある (>100枚) |
| アノテーション確認 | 信頼度が全て0.95以上 |
| 結果確認 | 全クラスのAPが目標値以上 |

```python
async def should_skip_review(project_id: str, review_type: str) -> bool:
    project = await get_project(project_id)
    user_prefs = await get_user_preferences(project.owner_id)

    if review_type == 'annotation':
        low_confidence = await count_low_confidence_annotations(project_id)
        return low_confidence == 0 and user_prefs.auto_approve_high_confidence

    # ... 他の条件 ...
```

## ユーザー学習機能

```mermaid
flowchart LR
    subgraph Learning["ユーザー判断学習"]
        Decision[ユーザー判断] --> Record[判断を記録]
        Record --> DB[(user_decisions)]

        NewReview[新しい確認依頼] --> Predict[過去の判断から予測]
        DB --> Predict
        Predict --> Suggest[推奨アクションを表示]
    end
```

```python
# ユーザーの判断を記録
async def record_user_decision(
    user_id: str,
    review_type: str,
    context: dict,
    decision: str
):
    await supabase.table('user_decisions').insert({
        'user_id': user_id,
        'review_type': review_type,
        'context': context,
        'decision': decision,
        'created_at': datetime.utcnow()
    }).execute()

# 過去の判断パターンから予測
async def predict_user_decision(
    user_id: str,
    review_type: str,
    context: dict
) -> tuple[str, float]:  # (予測, 信頼度)
    similar_decisions = await find_similar_decisions(user_id, context)

    if len(similar_decisions) >= 5:
        most_common = Counter(d.decision for d in similar_decisions).most_common(1)[0]
        confidence = most_common[1] / len(similar_decisions)
        return most_common[0], confidence

    return None, 0.0
```
