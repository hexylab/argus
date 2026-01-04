# Issue #66: アノテーションレビュー機能

**作成日時**: 2026-01-04
**Issue**: #66 アノテーションレビュー機能
**ブランチ**: `feature/#66-annotation-review`

## 概要

自動生成されたアノテーションをレビュー・承認・削除できる機能を実装する。

## 完了条件

### Backend
- [x] プロジェクトレベルでのアノテーション取得 API（フィルタリング対応）
- [x] 一括承認 API
- [x] 一括削除 API

### Frontend
- [x] レビューページ（新規）
- [x] 信頼度・ステータスによるフィルタリング UI
- [x] 一括承認・削除 UI
- [x] 個別レビュー UI（アノテーションエディタへのリンク）
- [x] レビュー進捗表示

## 設計

### ステータス管理方針

既存の DB スキーマを活用し、シンプルに実装：

| 状態 | 条件 |
|------|------|
| 未レビュー (pending) | `source == 'auto' && reviewed == false` |
| 承認済み (approved) | `reviewed == true` |
| 却下 | 削除で対応 |

※ DB スキーマ変更は不要（既存の `reviewed` boolean を活用）

### API 設計

#### 1. プロジェクトレベルでのアノテーション取得

```
GET /api/v1/projects/{project_id}/annotations
```

Query Parameters:
- `source`: "auto" | "manual" | "imported" (optional)
- `reviewed`: boolean (optional)
- `min_confidence`: float (optional)
- `max_confidence`: float (optional)
- `label_id`: UUID (optional)
- `video_id`: UUID (optional)
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)

Response: フレーム情報を含むアノテーションリスト

#### 2. 一括承認 API

```
POST /api/v1/projects/{project_id}/annotations/bulk-approve
```

Request Body:
```json
{
  "annotation_ids": ["uuid1", "uuid2", ...]
}
```

Response:
```json
{
  "approved_count": 10,
  "errors": []
}
```

#### 3. 一括削除 API

```
DELETE /api/v1/projects/{project_id}/annotations/bulk
```

Request Body:
```json
{
  "annotation_ids": ["uuid1", "uuid2", ...]
}
```

Response:
```json
{
  "deleted_count": 5,
  "errors": []
}
```

### フロントエンド設計

#### ページ構成

```
/projects/{id}/review - レビューページ（新規）
```

#### UI レイアウト

```
┌─────────────────────────────────────────────────────┐
│ パンくず: ダッシュボード > プロジェクト名 > レビュー   │
├─────────────────────────────────────────────────────┤
│ ページヘッダー                                        │
│ - タイトル: アノテーションレビュー                      │
│ - 進捗バー: 承認済み XX / 全体 YY (ZZ%)              │
├─────────────────────────────────────────────────────┤
│ フィルター                                           │
│ [ステータス ▼] [信頼度 ▼] [ラベル ▼]                 │
├─────────────────────────────────────────────────────┤
│ アクションバー                                        │
│ 選択: N件  [一括承認] [一括削除]                      │
├─────────────────────────────────────────────────────┤
│ アノテーション一覧 (グリッド表示)                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ フレーム  │ │ フレーム  │ │ フレーム  │            │
│ │ [bbox]   │ │ [bbox]   │ │ [bbox]   │            │
│ │ 95% ✓   │ │ 72%  ?   │ │ 45%  ✗   │            │
│ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

## 実装ファイル

### Backend

| ファイル | 説明 |
|----------|------|
| `backend/app/api/v1/annotations_review.py` | レビュー用 API エンドポイント（新規） |
| `backend/app/crud/annotation.py` | 既存ファイルに関数追加 |
| `backend/app/models/annotation.py` | レスポンスモデル追加 |
| `backend/tests/api/v1/test_annotations_review.py` | API テスト（新規） |

### Frontend

| ファイル | 説明 |
|----------|------|
| `frontend/src/app/(protected)/projects/[id]/review/page.tsx` | レビューページ（新規） |
| `frontend/src/app/(protected)/projects/[id]/review/review-client.tsx` | クライアントコンポーネント（新規） |
| `frontend/src/app/(protected)/projects/[id]/review/components/` | UI コンポーネント（新規） |
| `frontend/src/app/(protected)/projects/[id]/review/actions.ts` | Server Actions（新規） |
| `frontend/src/lib/api/annotations.ts` | API クライアント拡張 |
| `frontend/src/app/(protected)/projects/[id]/page.tsx` | レビューリンク追加 |

## 実装順序

1. **Step 1**: Backend - CRUD 関数追加
2. **Step 2**: Backend - API エンドポイント実装
3. **Step 3**: Backend - テスト作成
4. **Step 4**: Frontend - API クライアント拡張
5. **Step 5**: Frontend - レビューページ実装
6. **Step 6**: Frontend - プロジェクトページにリンク追加
7. **Step 7**: CI テスト実行
8. **Step 8**: PR 作成

## 注意事項

- DB マイグレーションは不要（既存スキーマを活用）
- `reviewed_by` と `reviewed_at` は承認時に自動設定
- 却下は物理削除で対応（論理削除は Phase 2 以降で検討）
- パフォーマンス: 大量データ対応のため pagination 必須

## 参照

- 依存 Issue: #65 自動アノテーション UI（完了済み）
- 設計ドキュメント: `docs/design/03_human_in_the_loop.md`
- DB スキーマ: `docs/design/05_database_schema.md`
