# Issue #63: 自動アノテーション Worker 実装計画

**作成日時**: 2026-01-04
**Issue**: #63 自動アノテーション Worker
**ブランチ**: `feature/#63-auto-annotation-worker`

## 概要

SAM 3 を使用してフレームに自動でバウンディングボックスを生成する Celery Worker を実装する。

## 完了条件

- [ ] Celery タスクとして実装
- [ ] バッチ処理対応（複数フレームを効率的に処理）
- [ ] エラーハンドリング（失敗時のリトライ）
- [ ] 進捗状況の管理
- [ ] ユニットテスト

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Backend API (Future Issue)                                   │
│                                                             │
│  POST /api/v1/videos/{video_id}/auto-annotate               │
│  - frame_ids: list[UUID]                                    │
│  - label_id: UUID                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         │ Celery Task
         ▼
┌─────────────────────────────────────────────────────────────┐
│ SAM3 Worker (Celery)                                        │
│                                                             │
│  app/tasks/auto_annotation.py                               │
│  - auto_annotate_frames タスク                              │
│  - バッチ処理（複数フレーム）                                │
│  - SAM3 で物体検出 → Annotation 作成                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Database (Supabase)                                         │
│                                                             │
│  annotations テーブル                                        │
│  - source: 'auto'                                           │
│  - confidence: SAM3 score                                   │
│  - reviewed: false                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `backend/app/tasks/auto_annotation.py` | 自動アノテーション Celery タスク |
| `backend/tests/test_tasks/test_auto_annotation.py` | ユニットテスト |

## 実装詳細

### 1. Celery タスク (`app/tasks/auto_annotation.py`)

```python
@celery_app.task(bind=True, queue="sam3", max_retries=3, default_retry_delay=120)
def auto_annotate_frames(
    self: Task,
    frame_ids: list[str],
    label_id: str,
    label_name: str,
    created_by: str,
    confidence_threshold: float = 0.5,
) -> dict[str, Any]:
    """
    フレームに対して SAM3 で自動アノテーションを実行する。

    Args:
        frame_ids: アノテーション対象のフレーム ID リスト
        label_id: 適用するラベル ID
        label_name: SAM3 プロンプトとして使用するラベル名
        created_by: 作成者ユーザー ID
        confidence_threshold: 信頼度閾値（これ以下は無視）

    Returns:
        実行結果のサマリー
    """
```

### 2. 座標変換

SAM3 の出力（絶対座標）を DB のフォーマット（正規化座標）に変換:

```python
def convert_bbox_to_normalized(
    box: BoundingBox,
    image_width: int,
    image_height: int,
) -> tuple[float, float, float, float]:
    """
    絶対座標 (x1, y1, x2, y2) を正規化座標 (x, y, width, height) に変換。

    Returns:
        (bbox_x, bbox_y, bbox_width, bbox_height) - 全て 0-1 の範囲
    """
    bbox_x = box.x1 / image_width
    bbox_y = box.y1 / image_height
    bbox_width = (box.x2 - box.x1) / image_width
    bbox_height = (box.y2 - box.y1) / image_height
    return (bbox_x, bbox_y, bbox_width, bbox_height)
```

### 3. 処理フロー

1. frame_ids から Frame 情報を取得
2. 各フレームについて:
   - S3 から画像をダウンロード
   - SAM3 で `label_name` をプロンプトとしてセグメンテーション
   - 信頼度閾値以上の検出結果を AnnotationCreate に変換
   - bulk_create_annotations で DB に保存
3. 結果サマリーを返却

### 4. ユニットテスト

- SAM3 はモックを使用
- 座標変換ロジックは実際にテスト
- エラーハンドリングのテスト

## 実装順序

1. **Step 1**: Celery タスク実装 (`auto_annotation.py`)
2. **Step 2**: ユニットテスト作成
3. **Step 3**: lint/test 実行
4. **Step 4**: PR 作成

## 注意事項

- SAM3 Worker でのみ実行（queue="sam3"）
- 既存のアノテーションは削除せず追加のみ
- source=AUTO で作成（手動とは区別）
- reviewed=False で作成（レビュー待ち状態）
- API エンドポイントは Issue #70 で別途追加予定

## 参照

- `app/tasks/embedding_extraction.py` - Celery タスクパターン
- `app/ml/sam3/segmentation.py` - SAM3 セグメンテーション
- `app/crud/annotation.py` - アノテーション CRUD
