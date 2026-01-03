# Issue #20: アノテーション UI ページ実装計画

**作成日時**: 2025-12-30 23:00
**Issue**: #20 アノテーション UI ページ
**ブランチ**: `feature/#20-annotation-ui-page`

## 概要

フレーム選択とアノテーション作業の UI ページを実装する。

## 完了条件

- フレームを選択してアノテーションできる
- アノテーションを保存できる
- 前後のフレームに移動できる

## 既存実装の確認

### 存在するコンポーネント

- `AnnotationCanvas` - BBox 描画・編集機能（完成）
- `BoundingBox` - BBox コンポーネント（完成）
- `DrawingLayer` - 描画レイヤー（完成）
- `LabelSelectDialog` - ラベル選択ダイアログ（完成）
- `AnnotationToolbar` - ツールバー（完成）
- `HelpDialog` - ヘルプダイアログ（完成）

### 不足している機能

- フレームナビゲーション（前後移動）
- フレームサムネイル一覧
- ラベルサイドバー（クイック選択用）
- 保存機能（API 連携）
- 自動保存

## 実装ファイル一覧

### 新規作成

| ファイル | 説明 |
|----------|------|
| `frontend/src/lib/api/annotations.ts` | アノテーション API クライアント |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/components/frame-navigator.tsx` | 前後移動ナビゲーター |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/components/frame-strip.tsx` | サムネイル一覧 |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/components/label-sidebar.tsx` | ラベルサイドバー |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/components/save-indicator.tsx` | 保存状態インジケーター |

### 修正

| ファイル | 説明 |
|----------|------|
| `frontend/src/types/annotation.ts` | 一括保存用型追加 |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/actions.ts` | アノテーション取得・保存 Server Actions |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/annotation-client.tsx` | 保存機能・UI 統合 |
| `frontend/src/app/(protected)/projects/[id]/videos/[videoId]/frames/[frameId]/page.tsx` | フレーム一覧取得・レイアウト変更 |

## API 仕様

### アノテーション一覧取得

```
GET /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations
```

### アノテーション一括保存

```
PUT /api/v1/projects/{project_id}/videos/{video_id}/frames/{frame_id}/annotations
Body: { annotations: [...] }
```

## 実装順序

### Step 1: API クライアント・型定義

1. `frontend/src/lib/api/annotations.ts` - getAnnotations, bulkSaveAnnotations
2. `frontend/src/types/annotation.ts` - AnnotationBulkSaveItem 追加

### Step 2: Server Actions 追加

3. `actions.ts` に追加:
   - `fetchAnnotations()` - アノテーション一覧取得
   - `saveAnnotationsAction()` - 一括保存
   - `fetchAllFrames()` - 全フレーム一覧取得

### Step 3: UI コンポーネント

4. `frame-navigator.tsx` - 前/次ボタン
5. `frame-strip.tsx` - サムネイルストリップ
6. `label-sidebar.tsx` - ラベル選択パネル
7. `save-indicator.tsx` - 保存状態表示

### Step 4: 統合

8. `annotation-client.tsx` の改修:
   - 初期アノテーション読み込み
   - 保存機能追加
   - 自動保存 (debounce)
   - コンポーネント統合

9. `page.tsx` の改修:
   - フレーム一覧の取得
   - レイアウト変更

## UI レイアウト

```
+------------------------------------------------------------------+
| Header (パンくず + 戻るボタン)                                      |
+------------------------------------------------------------------+
| FrameNavigator (< フレーム 5 / 100 >) | SaveIndicator              |
+------------------------------------------------------------------+
| FrameStrip (サムネイル一覧 - 横スクロール)                          |
+----------------------------+-------------------------------------+
|                            |                                     |
|      AnnotationCanvas      |          LabelSidebar               |
|                            |                                     |
|                            |  - person [#FF0000]                 |
|                            |  - car    [#00FF00]                 |
|                            |  - ...                              |
|                            |                                     |
+----------------------------+-------------------------------------+
```

## キーボードショートカット

| キー | 機能 |
|------|------|
| ← | 前のフレーム |
| → | 次のフレーム |
| Ctrl+S | 保存 |
| V | 選択モード |
| D/R | 描画モード |

## 注意事項

- 座標は正規化座標 (0-1) で保存
- キャンバス表示時はピクセル座標に変換
- 保存時は再度正規化座標に変換
- 自動保存は 2 秒のデバウンス
