# 画像・アノテーションデータのインポート機能

## Issue

- GitHub Issue #78: 画像・アノテーションデータのインポート機能

## 概要

既存のワークフロー（動画アップロード → フレーム抽出 → アノテーション）に加え、以下のインポート機能を追加：

1. 複数画像のZIPインポート
2. COCO形式アノテーションのインポート
3. YOLO形式アノテーションのインポート

## 設計方針

### データモデルの拡張

現在の`videos`テーブルを「メディアソース」として活用し、画像セットもビデオと同様に管理する：

- `videos`テーブルに`source_type`カラムを追加: `video` | `image_set`
- 画像セットの場合、各画像を`frames`テーブルに登録（既存のフレーム管理を流用）
- アノテーションは既存の`annotations`テーブルをそのまま利用

### API設計

既存のビデオアップロードパターンを踏襲：

1. ZIPファイルのアップロードURLを取得
2. クライアントからS3に直接アップロード
3. アップロード完了通知 → Celeryタスクで非同期処理

## 実装計画

### Phase 1: Backend - モデル・スキーマ拡張

#### 1.1 Videoモデルの拡張

**ファイル:** `backend/app/models/video.py`

```python
class VideoSourceType(StrEnum):
    VIDEO = "video"
    IMAGE_SET = "image_set"

class Video(VideoBase, SupabaseModel):
    # 既存フィールド...
    source_type: VideoSourceType = VideoSourceType.VIDEO
```

#### 1.2 インポートジョブモデルの追加

**ファイル:** `backend/app/models/import_job.py`（新規）

```python
class ImportFormat(StrEnum):
    IMAGES_ONLY = "images_only"  # 画像のみ
    COCO = "coco"                # COCO形式
    YOLO = "yolo"                # YOLO形式

class ImportStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ImportJob(SupabaseModel):
    id: UUID
    project_id: UUID
    video_id: UUID | None  # 作成されたvideo（image_set）のID
    format: ImportFormat
    status: ImportStatus
    progress: float  # 0-100
    total_images: int | None
    processed_images: int | None
    total_annotations: int | None
    imported_annotations: int | None
    label_mapping: dict[str, UUID] | None  # 外部ラベル名 → 内部label_id
    error_message: str | None
    created_by: UUID
```

### Phase 2: Backend - API実装

#### 2.1 インポートAPIエンドポイント

**ファイル:** `backend/app/api/v1/imports.py`（新規）

```python
# POST /projects/{project_id}/imports/upload-url
# ZIPファイルアップロード用の署名付きURL取得
async def get_import_upload_url(
    project_id: UUID,
    request: ImportUploadUrlRequest  # format, filename
) -> ImportUploadUrlResponse

# POST /projects/{project_id}/imports/{import_job_id}/start
# アップロード完了後、インポート処理を開始
async def start_import(
    project_id: UUID,
    import_job_id: UUID,
    request: StartImportRequest  # label_mapping（オプション）
) -> ImportJob

# GET /projects/{project_id}/imports/{import_job_id}
# インポートジョブのステータス取得
async def get_import_status(
    project_id: UUID,
    import_job_id: UUID
) -> ImportJob

# POST /projects/{project_id}/imports/{import_job_id}/preview
# ZIPファイルの内容をプレビュー（ラベル一覧、画像数等）
async def preview_import(
    project_id: UUID,
    import_job_id: UUID
) -> ImportPreviewResponse
```

#### 2.2 ルーターの登録

**ファイル:** `backend/app/api/v1/__init__.py`

```python
from app.api.v1 import imports
api_router.include_router(imports.router, prefix="/projects/{project_id}/imports", tags=["imports"])
```

### Phase 3: Backend - Celeryタスク実装

#### 3.1 インポートタスク

**ファイル:** `backend/app/tasks/import_dataset.py`（新規）

```python
@celery_app.task(bind=True, max_retries=3)
def process_import(self: Task, import_job_id: str, project_id: str) -> dict[str, Any]:
    """
    インポート処理のメインタスク
    1. S3からZIPをダウンロード
    2. フォーマット検出・バリデーション
    3. 画像の処理（リサイズ、S3アップロード）
    4. アノテーションの変換・登録
    """
```

#### 3.2 フォーマットパーサー

**ファイル:** `backend/app/services/import_parsers/`（新規ディレクトリ）

- `base.py` - 基底クラス
- `coco_parser.py` - COCO形式パーサー
- `yolo_parser.py` - YOLO形式パーサー
- `images_parser.py` - 画像のみパーサー

```python
# base.py
class BaseImportParser(ABC):
    @abstractmethod
    def validate(self, zip_path: Path) -> ValidationResult:
        """ZIPファイルの構造を検証"""

    @abstractmethod
    def parse(self, zip_path: Path) -> ParseResult:
        """画像とアノテーションを抽出"""

    @abstractmethod
    def get_labels(self, zip_path: Path) -> list[str]:
        """含まれるラベル一覧を取得"""
```

### Phase 4: Frontend - UI実装

#### 4.1 インポートダイアログコンポーネント

**ファイル:** `frontend/src/app/(protected)/projects/[id]/components/import-dialog.tsx`（新規）

- ZIPファイルのドラッグ&ドロップ
- フォーマット選択（自動検出 or 手動選択）
- プレビュー表示（画像数、ラベル一覧）
- ラベルマッピングUI（既存ラベルとの紐付け）
- インポート進捗表示

#### 4.2 プロジェクトページへの統合

**ファイル:** `frontend/src/app/(protected)/projects/[id]/page.tsx`

- 「インポート」ボタンを追加
- インポートダイアログの呼び出し

#### 4.3 API関数

**ファイル:** `frontend/src/lib/api/imports.ts`（新規）

```typescript
export async function getImportUploadUrl(
  accessToken: string,
  projectId: string,
  data: { format: string; filename: string }
): Promise<ImportUploadUrlResponse>

export async function startImport(
  accessToken: string,
  projectId: string,
  importJobId: string,
  labelMapping?: Record<string, string>
): Promise<ImportJob>

export async function getImportStatus(
  accessToken: string,
  projectId: string,
  importJobId: string
): Promise<ImportJob>

export async function previewImport(
  accessToken: string,
  projectId: string,
  importJobId: string
): Promise<ImportPreviewResponse>
```

### Phase 5: データベースマイグレーション

#### 5.1 videosテーブルの拡張

```sql
ALTER TABLE videos ADD COLUMN source_type VARCHAR(50) DEFAULT 'video';
```

#### 5.2 import_jobsテーブルの作成

```sql
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress FLOAT DEFAULT 0,
    s3_key TEXT,
    total_images INTEGER,
    processed_images INTEGER,
    total_annotations INTEGER,
    imported_annotations INTEGER,
    label_mapping JSONB,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_project ON import_jobs(project_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
```

### Phase 6: テスト

#### 6.1 Backend テスト

**ファイル:** `backend/tests/api/v1/test_imports.py`（新規）

- インポートアップロードURLの取得テスト
- プレビューAPIテスト
- インポート開始テスト
- ステータス取得テスト

**ファイル:** `backend/tests/services/test_import_parsers.py`（新規）

- COCO形式パースのテスト
- YOLO形式パースのテスト
- 画像のみインポートのテスト
- エラーハンドリングのテスト

#### 6.2 Frontend テスト

**ファイル:** `frontend/src/app/(protected)/projects/[id]/components/__tests__/import-dialog.test.tsx`（新規）

- コンポーネントのレンダリングテスト
- ファイルアップロードのテスト
- プレビュー表示のテスト

## ファイル一覧

### 新規作成

| ファイル | 説明 |
|---------|------|
| `backend/app/models/import_job.py` | インポートジョブモデル |
| `backend/app/api/v1/imports.py` | インポートAPIエンドポイント |
| `backend/app/crud/import_job.py` | インポートジョブCRUD |
| `backend/app/tasks/import_dataset.py` | Celeryインポートタスク |
| `backend/app/services/import_parsers/__init__.py` | パーサーモジュール |
| `backend/app/services/import_parsers/base.py` | 基底パーサークラス |
| `backend/app/services/import_parsers/coco_parser.py` | COCOパーサー |
| `backend/app/services/import_parsers/yolo_parser.py` | YOLOパーサー |
| `backend/app/services/import_parsers/images_parser.py` | 画像のみパーサー |
| `backend/tests/api/v1/test_imports.py` | APIテスト |
| `backend/tests/services/test_import_parsers.py` | パーサーテスト |
| `frontend/src/lib/api/imports.ts` | インポートAPI関数 |
| `frontend/src/app/(protected)/projects/[id]/components/import-dialog.tsx` | インポートダイアログ |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `backend/app/models/video.py` | `source_type`フィールド追加 |
| `backend/app/models/__init__.py` | ImportJobのエクスポート追加 |
| `backend/app/api/v1/__init__.py` | importsルーターの登録 |
| `frontend/src/app/(protected)/projects/[id]/page.tsx` | インポートボタン追加 |
| `frontend/src/app/(protected)/projects/[id]/components/video-list.tsx` | source_type表示対応 |

## 実装順序

1. Backend モデル・スキーマ拡張
2. Backend CRUD実装
3. Backend API実装
4. Backend Celeryタスク・パーサー実装
5. Backend テスト
6. Frontend API関数実装
7. Frontend インポートダイアログ実装
8. Frontend テスト
9. 結合テスト

## 完了条件

- [ ] 複数画像をZIPでアップロードしてプロジェクトに追加できる
- [ ] COCO形式のデータセットをインポートできる
- [ ] YOLO形式のデータセットをインポートできる
- [ ] インポート後にアノテーションエディタで編集できる
- [ ] 全テストがパスする
