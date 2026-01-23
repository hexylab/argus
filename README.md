# Argus

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Backend CI](https://github.com/hexylab/argus/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/hexylab/argus/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/hexylab/argus/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/hexylab/argus/actions/workflows/frontend-ci.yml)

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

映像AIモデルの学習データ生成を自動化するプラットフォーム

## 概要

Argusは、映像からの物体検出モデル作成を効率化するWebアプリケーションです。映像のアップロードからアノテーション、データセットのエクスポートまでをワンストップで提供します。

## 主な機能

### 映像管理
- 映像ファイルのアップロードと自動フレーム抽出
- サムネイル自動生成
- 映像メタデータ（解像度、FPS、フレーム数）の自動取得

### アノテーション
- Webブラウザ上でのバウンディングボックス編集
- ラベル管理（カラーコーディング対応）
- キーボードショートカットによる効率的な作業

### 自動アノテーション
- SAM 3（Segment Anything Model 3）を使用したテキストプロンプトベースの自動物体検出
- 信頼度スコアによる品質管理
- IoU重複検出による結果の最適化
- レビューキューによる効率的な確認作業

### セマンティック検索
- SigLIP 2による画像・テキストの意味的検索
- 自然言語クエリで特定のオブジェクトを含むフレームを発見
- pgvectorを使用した高速ベクトル検索

### データセットエクスポート
- COCO形式でのエクスポート
- YOLO形式でのエクスポート
- 学習用データセットの即時生成

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Konva.js |
| Backend | FastAPI, Python 3.12, Celery |
| Database | PostgreSQL (Supabase), pgvector |
| Storage | AWS S3 / MinIO |
| ML/AI | SigLIP 2, SAM 3 |
| Infrastructure | Docker Compose |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                  (Next.js 15 + TypeScript)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     Backend API                              │
│                       (FastAPI)                              │
└──────┬──────────────────┬───────────────────────────────────┘
       │                  │
┌──────▼──────┐   ┌───────▼───────┐   ┌─────────────────────┐
│   Celery    │   │   PostgreSQL  │   │    S3 / MinIO       │
│   Workers   │   │   (Supabase)  │   │    (Storage)        │
└──────┬──────┘   │   + pgvector  │   └─────────────────────┘
       │          └───────────────┘
┌──────▼──────────────────────────┐
│         GPU Workers             │
│  ┌─────────┐    ┌─────────────┐ │
│  │ SigLIP 2│    │    SAM 3    │ │
│  │ (検索)  │    │(自動アノテ) │ │
│  └─────────┘    └─────────────┘ │
└─────────────────────────────────┘
```

## セットアップ

### 必要要件

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- NVIDIA GPU (自動アノテーション・検索機能使用時)

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/hexylab/argus.git
cd argus
```

2. 環境変数を設定
```bash
cp docker/.env.example docker/.env
# .envファイルを編集して必要な値を設定
```

3. Supabaseを起動
```bash
make supabase-start
```

4. 開発環境を起動
```bash
make dev
```

5. ブラウザでアクセス
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Supabase Studio: http://localhost:54333

### GPU Workerの起動（オプション）

自動アノテーションやセマンティック検索を使用する場合：

```bash
# SigLIP Worker（検索用）
make start-siglip-worker

# SAM3 Worker（自動アノテーション用）
make start-sam3-worker
```

## 開発

### コマンド一覧

```bash
# 開発サーバー起動
make dev

# Lint実行
make lint-docker

# テスト実行
make test-docker

# CI（Lint + Test）
make ci-docker

# Supabase操作
make supabase-start
make supabase-stop
make supabase-status
```

### ディレクトリ構成

```
argus/
├── backend/           # FastAPI + Celery
│   ├── app/
│   │   ├── api/       # REST APIエンドポイント
│   │   ├── crud/      # データベース操作
│   │   ├── models/    # Pydanticモデル
│   │   ├── tasks/     # Celeryタスク
│   │   └── core/      # コアユーティリティ
│   └── tests/
├── frontend/          # Next.js 15
│   ├── src/
│   │   ├── app/       # App Router
│   │   ├── components/
│   │   └── lib/
│   └── public/
├── docker/            # Docker Compose設定
├── supabase/          # Supabase設定・マイグレーション
└── docs/              # ドキュメント
```

## 使い方

### 基本的なワークフロー

1. **プロジェクト作成**: ダッシュボードから新規プロジェクトを作成
2. **映像アップロード**: 映像ファイルをドラッグ&ドロップでアップロード
3. **フレーム確認**: 自動抽出されたフレームを確認
4. **アノテーション**: 手動でバウンディングボックスを作成、またはテキストプロンプトで自動アノテーション
5. **レビュー**: 自動アノテーション結果を確認・修正
6. **エクスポート**: COCO/YOLO形式でデータセットをダウンロード

### 自動アノテーション

1. 検索ページでテキストクエリを入力（例：「person」「car」）
2. 該当するフレームが自動検索される
3. 検索結果から自動アノテーションを実行
4. レビューページで結果を確認・承認

### セマンティック検索

検索ページで自然言語クエリを入力すると、意味的に類似したフレームが表示されます。

例：
- 「a person walking」
- 「red car on the street」
- 「computer on desk」

## コントリビューション

プルリクエストや Issue の報告を歓迎します。

[![GitHub issues](https://img.shields.io/github/issues/hexylab/argus)](https://github.com/hexylab/argus/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/hexylab/argus)](https://github.com/hexylab/argus/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/hexylab/argus)](https://github.com/hexylab/argus/commits/main)

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。
