# Issue #59: 特徴ベクトル抽出 Worker

**作成日時**: 2026-01-04
**Issue**: #59 特徴ベクトル抽出 Worker
**ブランチ**: `feature/#59-embedding-extraction-worker`

## 概要

フレーム抽出完了後に自動で SigLIP 2 を使って特徴ベクトルを抽出する Celery Worker を実装する。

## 完了条件

- [x] フレーム抽出後に特徴ベクトル抽出タスクを実行
- [x] Celery タスクとして実装
- [x] バッチ処理対応（複数フレームを効率的に処理）
- [x] 進捗状況の管理
- [x] エラーハンドリング
- [x] ユニットテスト

## 設計

### アーキテクチャ

```
映像アップロード
    ↓
フレーム抽出 Worker (CPU, queue: default)
    ↓ (完了時にタスクをキューイング)
特徴ベクトル抽出 Worker (GPU, queue: siglip)
    ↓
pgvector に保存
```

### タスクフロー

1. **extract_frames** タスク完了時に `extract_embeddings` をキューイング
2. **extract_embeddings** タスク:
   - フレーム一覧を取得
   - S3 から画像をダウンロード (バッチ単位)
   - SigLIP 2 でエンベディング抽出
   - DB の frames テーブルを更新

### バッチ処理

```python
BATCH_SIZE = 8  # GPU メモリに応じて調整

for batch in batched(frames, BATCH_SIZE):
    images = [download_image(f.s3_key) for f in batch]
    embeddings = extract_image_embeddings(images)
    for frame, embedding in zip(batch, embeddings):
        update_frame_embedding(client, frame.id, embedding)
```

### キュー設計

| Worker | Queue | 用途 |
|--------|-------|------|
| celery-worker | default | CPU タスク (フレーム抽出) |
| siglip-worker | siglip | GPU タスク (エンベディング抽出) |

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `backend/app/tasks/embedding_extraction.py` | エンベディング抽出タスク |
| `backend/tests/test_tasks/test_embedding_extraction.py` | ユニットテスト |

### 修正

| ファイル | 説明 |
|----------|------|
| `backend/app/celery.py` | タスクモジュール追加 |
| `backend/app/tasks/frame_extraction.py` | 完了時にエンベディング抽出をキューイング |

## 実装詳細

### 1. エンベディング抽出タスク

```python
@celery_app.task(bind=True, queue="siglip")
def extract_embeddings(
    self: Task,
    video_id: str,
    project_id: str,
) -> dict[str, Any]:
    """
    フレームからエンベディングを抽出して保存。

    GPU Worker (siglip-worker) で実行される。
    """
    # 1. フレーム一覧を取得
    frames = get_frames(client, video_uuid)

    # 2. バッチ処理
    for batch in batched(frames, BATCH_SIZE):
        # 2a. S3 から画像をダウンロード
        images = [download_and_open_image(f.s3_key) for f in batch]

        # 2b. エンベディング抽出
        embeddings = extract_image_embeddings(images)

        # 2c. DB 更新
        for frame, embedding in zip(batch, embeddings):
            update_frame_embedding(client, frame.id, embedding)

    return {"video_id": video_id, "frame_count": len(frames)}
```

### 2. フレーム抽出タスクからの連携

```python
# frame_extraction.py の extract_frames タスク完了時
from app.tasks.embedding_extraction import extract_embeddings

# タスク完了後にエンベディング抽出をキューイング
extract_embeddings.delay(video_id, project_id)
```

### 3. celery.py の更新

```python
celery_app = Celery(
    "argus",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.frame_extraction",
        "app.tasks.embedding_extraction",  # 追加
    ],
)
```

## 実装順序

1. **Step 1**: 計画策定
2. **Step 2**: エンベディング抽出タスク実装
3. **Step 3**: フレーム抽出タスクからの連携
4. **Step 4**: ユニットテスト作成
5. **Step 5**: lint/test 実行
6. **Step 6**: PR 作成

## 注意事項

- GPU Worker (siglip-worker) でのみ実行される
- CPU Worker では torch/transformers が利用不可
- テストはモック使用 (GPU 不要)
- バッチサイズは VRAM に応じて調整可能

## 参照

- `app/ml/siglip/embeddings.py` - SigLIP 2 エンベディング抽出
- `app/crud/frame.py` - update_frame_embedding
- `docker/docker-compose.gpu.yml` - siglip-worker 設定
