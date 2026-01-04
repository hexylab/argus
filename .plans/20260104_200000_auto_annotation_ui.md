# Issue #65: 自動アノテーション UI 実装計画

**作成日時**: 2026-01-04
**Issue**: #65 自動アノテーション UI
**ブランチ**: `feature/#65-auto-annotation-ui`

## 概要

自動アノテーションを実行・確認できる UI を実装する。

## 完了条件

- [ ] 「自動アノテーション」ボタン
- [ ] ラベル選択 UI
- [ ] 進捗表示（プログレスバー）
- [ ] 結果プレビュー
- [ ] エラーハンドリング

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `frontend/src/types/auto-annotation.ts` | 自動アノテーション型定義 |
| `frontend/src/lib/api/auto-annotation.ts` | API クライアント |
| `frontend/src/app/(protected)/projects/[id]/search/components/auto-annotate-dialog.tsx` | 自動アノテーションダイアログ |

### 修正

| ファイル | 説明 |
|----------|------|
| `frontend/src/app/(protected)/projects/[id]/search/search-client.tsx` | フレーム選択機能追加 |
| `frontend/src/app/(protected)/projects/[id]/search/components/search-results.tsx` | 選択UI追加 |
| `frontend/src/app/(protected)/projects/[id]/search/actions.ts` | Server Actions追加 |

## UI フロー

1. 検索結果から複数フレームを選択（チェックボックス）
2. 「自動アノテーション」ボタンをクリック
3. ダイアログでラベル選択＆信頼度閾値設定
4. 実行ボタンで処理開始
5. 進捗表示（ポーリング）
6. 完了後、結果表示

## 実装順序

1. **Step 1**: 型定義・API クライアント作成
2. **Step 2**: Server Actions 追加
3. **Step 3**: 検索結果にフレーム選択機能追加
4. **Step 4**: 自動アノテーションダイアログ実装
5. **Step 5**: lint/test 実行
6. **Step 6**: PR 作成

## 参照

- `app/api/v1/auto_annotation.py` - Backend API
- `app/(protected)/projects/[id]/search/` - 検索ページ
