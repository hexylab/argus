# BBox 編集の柔軟化 - 縦横独立リサイズ

## Issue #80

## 現状分析

`BoundingBox.tsx`の現在の実装：
- Transformerは4点（コーナーのみ）のアンカーを使用
- `keepRatio`プロパティが未設定（デフォルトはfalse）
- リサイズ中の寸法表示なし

## 実装計画

### 1. 8点ハンドルの追加
- `enabledAnchors`を8点に拡張（4コーナー + 4エッジ）
- 既存: `["top-left", "top-right", "bottom-left", "bottom-right"]`
- 変更後: `["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]`

### 2. Shift+ドラッグでアスペクト比固定
- Shiftキーの状態を追跡するstate追加
- `window`のkeydown/keyupイベントでShift状態を監視
- `keepRatio`をShiftキー状態に連動

### 3. リアルタイム寸法表示
- リサイズ中（`isTransforming`状態）に寸法を表示
- BBoxの右下に寸法ラベルを表示（例: "320 × 240"）

### 変更ファイル
- `frontend/src/components/annotation/BoundingBox.tsx`

## テスト
- `make lint-frontend-docker`
- `make test-frontend-docker`
