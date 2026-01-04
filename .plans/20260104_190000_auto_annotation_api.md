# Issue #64: 自動アノテーション API 実装計画

**作成日時**: 2026-01-04
**Issue**: #64 自動アノテーション API
**ブランチ**: `feature/#64-auto-annotation-api`

## 概要

フレームとラベルを指定して自動アノテーションを実行する API エンドポイントを実装する。

## 完了条件

- [ ] 自動アノテーション実行エンドポイント
- [ ] 信頼度スコア付きレスポンス
- [ ] 一括処理対応
- [ ] 進捗確認エンドポイント
- [ ] ユニットテスト

## API 仕様

### 1. 自動アノテーション実行

```
POST /api/v1/projects/{project_id}/auto-annotate
```

**リクエスト:**
```json
{
  "frame_ids": ["uuid1", "uuid2", ...],
  "label_id": "uuid",
  "options": {
    "min_confidence": 0.5
  }
}
```

**レスポンス:**
```json
{
  "task_id": "celery-task-uuid",
  "status": "pending",
  "total_frames": 50
}
```

### 2. 進捗確認

```
GET /api/v1/projects/{project_id}/auto-annotate/{task_id}
```

**レスポンス:**
```json
{
  "task_id": "celery-task-uuid",
  "status": "SUCCESS",
  "result": {
    "frame_count": 50,
    "annotation_count": 120,
    "failed_count": 0,
    "status": "success"
  }
}
```

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `backend/app/api/v1/auto_annotation.py` | 自動アノテーション API エンドポイント |
| `backend/tests/test_api/test_auto_annotation.py` | API ユニットテスト |

### 修正

| ファイル | 説明 |
|----------|------|
| `backend/app/api/v1/__init__.py` | ルーター追加 |
| `backend/app/main.py` | ルーター登録 |
| `backend/app/celery.py` | auto_annotation タスク追加 |

## 実装詳細

### 1. API エンドポイント

```python
router = APIRouter(
    prefix="/projects/{project_id}/auto-annotate",
    tags=["auto-annotation"]
)

@router.post("", response_model=AutoAnnotateResponse)
async def start_auto_annotation(
    project_id: UUID,
    data: AutoAnnotateRequest,
    auth: Auth,
) -> AutoAnnotateResponse:
    """自動アノテーションを開始"""
    # 1. プロジェクト所有権確認
    # 2. ラベル存在確認
    # 3. Celery タスクをキュー
    # 4. タスク ID を返却

@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    project_id: UUID,
    task_id: str,
    auth: Auth,
) -> TaskStatusResponse:
    """タスクの進捗状況を取得"""
    # Celery AsyncResult で状態を取得
```

### 2. Pydantic モデル

```python
class AutoAnnotateOptions(BaseModel):
    min_confidence: float = Field(0.5, ge=0.0, le=1.0)

class AutoAnnotateRequest(BaseModel):
    frame_ids: list[UUID] = Field(..., min_length=1)
    label_id: UUID
    options: AutoAnnotateOptions | None = None

class AutoAnnotateResponse(BaseModel):
    task_id: str
    status: str
    total_frames: int

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: dict[str, Any] | None = None
```

## 実装順序

1. **Step 1**: Celery 設定に auto_annotation を追加
2. **Step 2**: API エンドポイント実装
3. **Step 3**: ルーター登録
4. **Step 4**: ユニットテスト作成
5. **Step 5**: lint/test 実行
6. **Step 6**: PR 作成

## 参照

- `app/api/v1/videos.py` - 既存 API パターン
- `app/tasks/auto_annotation.py` - 自動アノテーションタスク
