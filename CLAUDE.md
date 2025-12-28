# Argus - 開発ガイドライン

## プロジェクト概要

映像AIモデルの学習データ生成から学習までを自動化するSaaS。

- **Backend**: Python (FastAPI, Celery)
- **Frontend**: TypeScript (Next.js 15)
- **DB**: PostgreSQL (Supabase)
- **Storage**: S3 / MinIO

## 開発プロセス

### 1. Issue からタスク開始

```bash
# ブランチ作成 (Issue番号を含める)
git checkout -b feature/#1-repository-structure
```

### 2. Plan Mode で計画策定

- 実装内容とテストを含めた計画を作成
- **必ず `docs/design/` 配下の設計ドキュメントを読み込んでから計画すること**
  - 特にインフラ構成、DB スキーマ、アーキテクチャに関わる実装は設計との整合性を確認
- 既存の実装・テスト・ドキュメントを読み込んでから計画
- 不明点があればユーザーに確認してから実装開始
- **計画は `.plans/YYYYMMDD_HHMMSS_計画名.md` に保存**

### 3. 実装とローカルテスト

Docker 内で CI 相当のテストを実行してから PR 発行:

```bash
# Backend (Python)
cd backend
docker compose run --rm api ruff check .
docker compose run --rm api ruff format --check .
docker compose run --rm api mypy .
docker compose run --rm api pytest

# Frontend (TypeScript)
cd frontend
docker compose run --rm web pnpm lint
docker compose run --rm web pnpm format:check
docker compose run --rm web pnpm typecheck
docker compose run --rm web pnpm test
```

### 4. PR 発行とマージ

- PR 説明に `Closes #<Issue番号>` を含める
- CI が全て PASS していることを確認
- 大きな変更は差分をレビューしてからマージ

## コミット規約

Conventional Commits を使用:

```
feat: 新機能
fix: バグ修正
chore: 設定・ビルド関連
docs: ドキュメント
test: テスト追加・修正
refactor: リファクタリング
```

## ディレクトリ構成

```
argus/
├── backend/          # FastAPI + Celery
├── frontend/         # Next.js 15
├── docker/           # Docker Compose
├── docs/design/      # 設計ドキュメント
├── .plans/           # Plan Mode 計画 (日時付き)
└── .github/workflows # CI
```

## GitHub 運用

- **Labels**: `backend`, `frontend`, `infra` (3種類のみ)
- **Milestone**: `Phase 1: MVP` でフェーズ管理
- **依存関係**: Issue リンクで表現

## 参照ドキュメント

- `docs/design/00_project_overview.md` - プロジェクト概要
- `docs/design/01_architecture.md` - アーキテクチャ
- `docs/design/05_database_schema.md` - DB スキーマ
- GitHub Issues - タスク一覧と依存関係
