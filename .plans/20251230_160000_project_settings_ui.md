# Issue #25: プロジェクト詳細・設定 UI 実装計画

**作成日時**: 2025-12-30 16:00
**Issue**: #25 プロジェクト詳細・設定 UI
**ブランチ**: `feature/#25-project-settings-ui`

## 概要

プロジェクト設定ページを実装し、ラベル管理・プロジェクト編集・削除機能を提供する。

## 完了条件

- プロジェクト設定ページからプロジェクト名・説明を編集できる
- ラベルを追加・編集・削除できる
- プロジェクトを削除できる（確認ダイアログ付き）

## 現状分析

### 既存実装
- `projects/[id]/page.tsx` - プロジェクト詳細（映像一覧）表示済み
- Backend API - Projects / Labels の CRUD 完備
- Frontend API - `getProject`, `getProjects`, `createProject`, `getLabels` のみ

### 不足している機能
- Frontend API: `updateProject`, `deleteProject`, `createLabel`, `updateLabel`, `deleteLabel`
- 設定ページ UI
- ラベル管理コンポーネント

## 実装ファイル一覧

### 新規作成

| ファイル | 説明 |
|----------|------|
| `frontend/src/components/ui/tabs.tsx` | shadcn/ui Tabs コンポーネント |
| `frontend/src/components/ui/alert-dialog.tsx` | shadcn/ui AlertDialog コンポーネント |
| `frontend/src/app/(protected)/projects/[id]/settings/page.tsx` | 設定ページ |
| `frontend/src/app/(protected)/projects/[id]/settings/actions.ts` | 設定用 Server Actions |
| `frontend/src/app/(protected)/projects/[id]/settings/components/project-info-form.tsx` | プロジェクト情報編集フォーム |
| `frontend/src/app/(protected)/projects/[id]/settings/components/label-manager.tsx` | ラベル管理セクション |
| `frontend/src/app/(protected)/projects/[id]/settings/components/label-item.tsx` | ラベル行（編集・削除ボタン付き） |
| `frontend/src/app/(protected)/projects/[id]/settings/components/create-label-dialog.tsx` | ラベル作成ダイアログ |
| `frontend/src/app/(protected)/projects/[id]/settings/components/delete-project-dialog.tsx` | プロジェクト削除確認ダイアログ |

### 修正

| ファイル | 説明 |
|----------|------|
| `frontend/src/lib/api/projects.ts` | `updateProject`, `deleteProject` 追加 |
| `frontend/src/lib/api/labels.ts` | `createLabel`, `updateLabel`, `deleteLabel` 追加 |
| `frontend/src/types/label.ts` | `LabelUpdate` 型追加 |
| `frontend/src/app/(protected)/projects/[id]/page.tsx` | 設定ページへのリンク追加 |

## 実装順序

### Step 1: UI コンポーネント追加

```bash
cd frontend
pnpm dlx shadcn@latest add tabs alert-dialog
```

### Step 2: 型定義・API クライアント拡張

1. `types/label.ts` に `LabelUpdate` 追加
2. `lib/api/projects.ts` に `updateProject`, `deleteProject` 追加
3. `lib/api/labels.ts` に `createLabel`, `updateLabel`, `deleteLabel` 追加

### Step 3: 設定ページ基盤

4. `settings/actions.ts` - Server Actions 作成
5. `settings/page.tsx` - 設定ページ作成

### Step 4: プロジェクト編集機能

6. `settings/components/project-info-form.tsx` - 名前・説明編集フォーム
7. `settings/components/delete-project-dialog.tsx` - 削除確認ダイアログ

### Step 5: ラベル管理機能

8. `settings/components/label-item.tsx` - ラベル行コンポーネント
9. `settings/components/create-label-dialog.tsx` - ラベル作成ダイアログ
10. `settings/components/label-manager.tsx` - ラベル管理セクション

### Step 6: 統合・リンク追加

11. `projects/[id]/page.tsx` に設定リンク追加
12. 動作確認・テスト

## API クライアント追加

### projects.ts

```typescript
export async function updateProject(
  accessToken: string,
  projectId: string,
  data: ProjectUpdate
): Promise<Project> {
  return apiClient<Project>(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(data),
  });
}

export async function deleteProject(
  accessToken: string,
  projectId: string
): Promise<void> {
  return apiClient<void>(`/api/v1/projects/${projectId}`, {
    method: "DELETE",
    accessToken,
  });
}
```

### labels.ts

```typescript
export async function createLabel(
  accessToken: string,
  projectId: string,
  data: LabelCreate
): Promise<Label> {
  return apiClient<Label>(`/api/v1/projects/${projectId}/labels`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });
}

export async function updateLabel(
  accessToken: string,
  projectId: string,
  labelId: string,
  data: LabelUpdate
): Promise<Label> {
  return apiClient<Label>(`/api/v1/projects/${projectId}/labels/${labelId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(data),
  });
}

export async function deleteLabel(
  accessToken: string,
  projectId: string,
  labelId: string
): Promise<void> {
  return apiClient<void>(`/api/v1/projects/${projectId}/labels/${labelId}`, {
    method: "DELETE",
    accessToken,
  });
}
```

## Server Actions

```typescript
// settings/actions.ts
export async function updateProjectAction(
  projectId: string,
  data: { name?: string; description?: string | null }
): Promise<{ project?: Project; error?: string }>

export async function deleteProjectAction(
  projectId: string
): Promise<{ success?: boolean; error?: string }>

export async function fetchLabels(
  projectId: string
): Promise<{ labels?: Label[]; error?: string }>

export async function createLabelAction(
  projectId: string,
  data: { name: string; color: string; description?: string }
): Promise<{ label?: Label; error?: string }>

export async function updateLabelAction(
  projectId: string,
  labelId: string,
  data: { name?: string; color?: string; description?: string | null }
): Promise<{ label?: Label; error?: string }>

export async function deleteLabelAction(
  projectId: string,
  labelId: string
): Promise<{ success?: boolean; error?: string }>
```

## UI 設計

### 設定ページ構成

```
/projects/[id]/settings
├── ヘッダー（パンくずリスト）
├── プロジェクト情報セクション
│   ├── プロジェクト名（編集可能）
│   ├── 説明（編集可能）
│   └── 保存ボタン
├── ラベル管理セクション
│   ├── ラベル一覧
│   │   └── ラベル行（色・名前・説明・編集・削除）
│   └── ラベル追加ボタン
└── 危険ゾーン
    └── プロジェクト削除ボタン
```

### ラベル管理 UI

- インライン編集 or ダイアログ形式
- 色選択はカラーピッカー（input type="color"）
- 削除時は確認ダイアログ

## 注意事項

- `revalidatePath` でキャッシュを適切に更新
- 削除操作は確認ダイアログ必須
- エラーメッセージは日本語で統一
- プロジェクト削除後はダッシュボードにリダイレクト
