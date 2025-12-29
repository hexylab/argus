# Issue #13: フレーム抽出 Worker

## 概要

アップロードされた映像からフレームを抽出する Celery Worker を実装する。
映像アップロード完了後、Worker がバックグラウンドでフレーム抽出を行い、S3 に保存・DB に登録する。

## 既存リソース

- `backend/app/models/frame.py` - Frame, FrameCreate, FrameUpdate モデル（実装済み）
- `backend/app/models/video.py` - Video, VideoStatus モデル（実装済み）
- `backend/app/crud/video.py` - Video CRUD 操作（実装済み）
- `backend/app/core/storage.py` - S3 クライアント（実装済み）
- `docker/docker-compose.dev.yml` - celery-worker サービス（定義済み）

## 作成ファイル一覧

| ファイル | 説明 |
|----------|------|
| `backend/app/celery.py` | Celery アプリケーション設定 |
| `backend/app/tasks/__init__.py` | タスクパッケージ |
| `backend/app/tasks/frame_extraction.py` | フレーム抽出タスク |
| `backend/app/crud/frame.py` | Frame CRUD 操作 |
| `backend/tests/test_tasks/__init__.py` | テストパッケージ |
| `backend/tests/test_tasks/test_frame_extraction.py` | タスクテスト |
| `backend/tests/test_crud/test_frame.py` | CRUD テスト |

## 処理フロー

```
1. API: POST /videos/{id}/complete 受信
2. API: Video ステータスを "processing" に更新
3. API: Celery タスク投入 (extract_frames.delay(video_id, project_id))
4. Worker: S3 から映像ダウンロード
5. Worker: FFmpeg でフレーム抽出（1秒間隔）
6. Worker: 各フレームを S3 にアップロード
7. Worker: サムネイル生成（リサイズ）
8. Worker: フレーム情報を DB に登録
9. Worker: Video ステータスを "ready" に更新
   (エラー時は "failed" + error_message)
```

## 実装手順

### Step 1: 依存関係追加

`backend/pyproject.toml` に追加:
```toml
dependencies = [
    ...
    "celery[redis]>=5.4.0",
    "ffmpeg-python>=0.2.0",
    "Pillow>=10.0.0",
]
```

### Step 2: Celery アプリケーション作成

`backend/app/celery.py`:
```python
from celery import Celery
from app.core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "argus",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.frame_extraction"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)
```

### Step 3: Frame CRUD 作成

`backend/app/crud/frame.py`:
```python
# 関数:
# - create_frame(client, data) - 新規作成
# - create_frames_bulk(client, frames) - 一括作成
# - get_frame(client, frame_id, video_id) - ID で取得
# - get_frames(client, video_id, skip, limit) - 一覧取得
# - delete_frames_by_video(client, video_id) - 動画のフレーム全削除

# 例外:
# - FrameNotFoundError
```

### Step 4: フレーム抽出タスク作成

`backend/app/tasks/frame_extraction.py`:
```python
@celery_app.task(bind=True, max_retries=3)
def extract_frames(self, video_id: str, project_id: str) -> dict:
    """
    1. S3 から映像を一時ファイルにダウンロード
    2. ffmpeg-python で 1 秒ごとにフレーム抽出
    3. Pillow でサムネイル生成 (320x180)
    4. S3 にアップロード
    5. DB にフレーム情報を一括登録
    6. Video ステータスを更新
    """
```

S3 キー構造:
- フレーム: `projects/{project_id}/videos/{video_id}/frames/{frame_number:06d}.jpg`
- サムネイル: `projects/{project_id}/videos/{video_id}/thumbnails/{frame_number:06d}.jpg`

### Step 5: Storage モジュール拡張

`backend/app/core/storage.py` に追加:
```python
def download_object(s3_key: str, local_path: Path) -> None:
    """S3 オブジェクトをローカルにダウンロード"""

def upload_object(local_path: Path, s3_key: str, content_type: str) -> None:
    """ローカルファイルを S3 にアップロード"""
```

### Step 6: Videos API 更新

`backend/app/api/v1/videos.py` の `complete_upload` を更新:
```python
@router.post("/{video_id}/complete")
async def complete_upload(...):
    # ステータスを "processing" に更新
    # extract_frames.delay(video_id, project_id) を呼び出し
```

### Step 7: __init__.py 更新

- `backend/app/crud/__init__.py` に frame 関数を追加
- `backend/app/tasks/__init__.py` を作成

### Step 8: Dockerfile 更新

FFmpeg インストールを追加:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
```

### Step 9: テスト作成

- タスクテスト: Celery タスクのモック実行
- CRUD テスト: Supabase クライアントのモック
- FFmpeg/Pillow のモック

### Step 10: 動作確認

```bash
make lint-docker && make test-docker
```

## 完了条件

- [ ] Celery Worker が起動できる
- [ ] 映像からフレームが抽出される
- [ ] フレームとサムネイルが S3 に保存される
- [ ] フレーム情報が DB に登録される
- [ ] エラー時に適切にステータスが更新される
- [ ] `make test-docker` 全テストパス
- [ ] `make lint-docker` エラーなし

## 参照

- `backend/app/crud/video.py` - CRUD パターン
- `backend/app/core/storage.py` - S3 操作
- `backend/app/models/frame.py` - Frame モデル
- `docs/design/02_infrastructure.md` - フレーム抽出フロー
