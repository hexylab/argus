# クイックレビューでのBBox編集機能 (#81)

## 概要
クイックレビューモーダルにBBox編集機能を追加する。現在は確認・承認・削除のみだが、モーダル内で直接BBoxの位置調整やラベル変更が可能になる。

## 現状分析

### 既存コンポーネント
- `QuickReviewModal`: CSSベースのBBox表示のみ
- `AnnotationCanvas`: Konvaベースの完全な編集機能
- `BoundingBox`: ドラッグ・リサイズ可能なKonva BBox
- `useAnnotationHistory`: undo/redo履歴管理フック

### 利用可能なAPI
- `saveAnnotationsAction`: フレーム単位でアノテーションを一括保存
- `bulkApproveAnnotations`: 承認
- `bulkDeleteAnnotations`: 削除

## 実装方針

### 1. 軽量BBox編集コンポーネント作成
**ファイル**: `frontend/src/app/(protected)/projects/[id]/review/components/quick-review-edit-canvas.tsx`

- 単一BBox編集に特化したKonvaキャンバス
- AnnotationCanvasの軽量版
- ドラッグ移動・4隅リサイズ対応
- 矢印キーによる微調整（1px / Shift+10px）

### 2. QuickReviewModalの拡張
**ファイル**: `frontend/src/app/(protected)/projects/[id]/review/components/quick-review-modal.tsx`

- `isEditing` 状態を追加
- 編集モード時は軽量キャンバスを表示
- キーボードショートカット拡張

### 3. APIとアクション追加
**ファイル**: `frontend/src/app/(protected)/projects/[id]/review/actions.ts`

- `updateAnnotation`: 単一アノテーションの座標・ラベル更新

## 実装詳細

### キーボードショートカット
| キー | 通常モード | 編集モード |
|------|-----------|-----------|
| E | 編集モード開始 | - |
| Escape | モーダル閉じる | 編集モード終了（変更破棄） |
| Enter / A | 承認 | 保存して編集終了 |
| ← → ↑ ↓ | ナビゲーション | BBox微調整 (1px) |
| Shift + 矢印 | - | BBox微調整 (10px) |
| L | - | ラベル変更ダイアログ |
| Ctrl+Z | - | Undo |
| Ctrl+Y | - | Redo |

### 編集モードUI
- 「編集」ボタンをアクションバーに追加
- 編集中はKonvaキャンバスでBBoxを表示
- 編集完了後に自動保存

## ファイル変更一覧

### 新規作成
- `frontend/src/app/(protected)/projects/[id]/review/components/quick-review-edit-canvas.tsx`

### 修正
- `frontend/src/app/(protected)/projects/[id]/review/components/quick-review-modal.tsx`
- `frontend/src/app/(protected)/projects/[id]/review/actions.ts`
- `frontend/src/app/(protected)/projects/[id]/review/review-client.tsx`
- `frontend/src/types/annotation-review.ts`

## テスト
- lint-frontend-docker でlintチェック
- test-frontend-docker でテスト実行
