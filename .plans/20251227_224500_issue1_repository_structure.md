# Issue #1: リポジトリ初期構造とモノレポ設定

## 現状分析

既存ファイル:
- `.claude/` - Claude Code 設定
- `.git/` - Git リポジトリ
- `.plans/` - Plan Mode 計画
- `CLAUDE.md` - 開発ガイドライン
- `README.md` - 空ファイル
- `docs/design/` - 設計ドキュメント (6ファイル)

## 実装計画

### 1. ディレクトリ構造の作成

```
argus/
├── .github/
│   └── workflows/       # CI ワークフロー (Issue #2, #3 で実装)
├── backend/
│   ├── app/
│   │   └── __init__.py  # パッケージ初期化
│   └── tests/
│       └── __init__.py
├── frontend/
│   └── src/             # Next.js ソース (Issue #3 で初期化)
├── docker/              # Docker Compose 設定 (Issue #4 で実装)
├── docs/design/         # 既存
├── .plans/              # 既存
├── .gitignore           # 新規作成
├── README.md            # 更新
├── Makefile             # 新規作成
└── CLAUDE.md            # 既存
```

### 2. .gitignore の作成

Python + Node.js + 共通設定:
- Python: `__pycache__`, `.venv`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`
- Node.js: `node_modules`, `.next`, `.turbo`
- 共通: `.env`, `.env.local`, `*.log`, `.DS_Store`

### 3. README.md の作成

内容:
- プロジェクト概要
- 技術スタック
- ディレクトリ構成
- 開発環境セットアップ手順 (簡易)

### 4. Makefile の作成

コマンド:
- `make help` - ヘルプ表示
- `make setup` - 初期セットアップ
- `make up` - Docker Compose 起動 (Issue #4 以降で実装)
- `make down` - Docker Compose 停止
- `make lint` - Linter 実行
- `make test` - テスト実行

## ファイル一覧

| ファイル | 操作 | 行数目安 |
|---------|------|---------|
| `.github/workflows/.gitkeep` | 作成 | 0 |
| `backend/app/__init__.py` | 作成 | 1 |
| `backend/tests/__init__.py` | 作成 | 1 |
| `frontend/src/.gitkeep` | 作成 | 0 |
| `docker/.gitkeep` | 作成 | 0 |
| `.gitignore` | 作成 | ~50 |
| `README.md` | 更新 | ~60 |
| `Makefile` | 作成 | ~40 |

**合計**: 8ファイル, ~150行

## テスト計画

- ディレクトリ構造が正しく作成されていることを確認
- `.gitignore` が機能することを確認 (テスト用ファイル作成→無視確認)
- `make help` が正常に動作することを確認

## 完了条件

- [x] 計画策定
- [ ] ディレクトリ構造の作成
- [ ] `.gitignore` の作成・テスト
- [ ] `README.md` の作成
- [ ] `Makefile` の作成・テスト
