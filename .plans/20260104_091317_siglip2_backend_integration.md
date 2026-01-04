# Issue #57: SigLIP 2 統合 - Backend 実装計画

**作成日時**: 2026-01-04
**Issue**: #57 SigLIP 2 統合 - Backend
**ブランチ**: `feature/#57-siglip2-integration`

## 概要

SigLIP 2 モデルを Backend に統合し、画像/テキストの特徴ベクトル抽出サービスを実装する。

## 完了条件

- [x] SigLIP 2 モデル統合 (Hugging Face transformers)
- [x] 画像特徴ベクトル抽出サービス
- [x] テキスト特徴ベクトル抽出サービス
- [x] ベクトル類似度計算ロジック
- [x] ユニットテスト

## 設計

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Backend (FastAPI)                                           │
│                                                             │
│  app/ml/siglip/                                            │
│  ├── __init__.py         # 公開インターフェース             │
│  ├── model.py            # モデルローダー（遅延読み込み）    │
│  ├── embeddings.py       # 特徴抽出ロジック                 │
│  └── similarity.py       # 類似度計算                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         │ (GPU Worker で実行時のみモデルロード)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ SigLIP Worker (Celery)                                      │
│                                                             │
│  - queue: siglip                                            │
│  - 画像バッチ処理                                           │
│  - 特徴ベクトル → DB/pgvector 保存                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### モデル選定

| モデル | パラメータ | VRAM | 用途 |
|-------|-----------|------|-----|
| `google/siglip2-base-patch16-256` | 86M | ~2GB | 開発/テスト |
| `google/siglip2-so400m-patch14-384` | 400M | ~4GB | **本番推奨** |

→ 環境変数 `SIGLIP_MODEL_NAME` で切り替え可能

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `backend/app/ml/__init__.py` | ML モジュール初期化 |
| `backend/app/ml/siglip/__init__.py` | SigLIP 公開インターフェース (CPU互換関数のみ) |
| `backend/app/ml/siglip/model.py` | モデルローダー（シングルトン） |
| `backend/app/ml/siglip/embeddings.py` | 特徴抽出ロジック (GPU Worker専用) |
| `backend/app/ml/siglip/similarity.py` | 類似度計算 (CPU互換) |
| `backend/tests/test_ml/__init__.py` | テストモジュール |
| `backend/tests/test_ml/test_siglip.py` | SigLIP ユニットテスト |

### 修正

| ファイル | 説明 |
|----------|------|
| `backend/app/core/config.py` | SigLIP 設定追加 |
| `backend/pyproject.toml` | numpy 依存追加 |

## 実装詳細

### 1. 設定追加 (`app/core/config.py`)

```python
class Settings(BaseSettings):
    # ... 既存設定 ...

    # SigLIP (GPU Worker only)
    siglip_model_name: str = "google/siglip2-base-patch16-256"
    siglip_device: str = "cuda"
```

### 2. モジュール分離設計

CPU/GPU環境で動作を分離:
- `similarity.py`: CPU互換（torch不要）
- `embeddings.py`, `model.py`: GPU Worker専用（torch/transformers必要）

`__init__.py` はCPU互換関数のみエクスポート:
```python
from app.ml.siglip.similarity import (
    cosine_similarity,
    find_similar_frames,
)

__all__ = [
    "cosine_similarity",
    "find_similar_frames",
]
```

GPU Worker では直接インポート:
```python
from app.ml.siglip.embeddings import extract_image_embeddings
```

### 3. テスト設計

- 類似度計算: GPU不要、直接テスト
- 埋め込み抽出: torch/transformersをモックしてテスト
- モデルローダー: transformersをモックしてテスト

## 実装順序

1. **Step 1**: 設定追加 (`config.py`) ✅
2. **Step 2**: ML モジュール作成 (`app/ml/siglip/`) ✅
3. **Step 3**: ユニットテスト作成 ✅
4. **Step 4**: lint/test 実行 ✅
5. **Step 5**: PR 作成

## 注意事項

- GPU Worker でのみモデルをロードする（遅延読み込み）
- CPU Worker / Backend ではモデルをロードしない
- テストは GPU 不要（モック使用）
- Issue #59 で Celery タスクを追加予定（本 Issue では対象外）

## 参照

- [HuggingFace Blog - SigLIP 2](https://huggingface.co/blog/siglip2)
- [HuggingFace Docs](https://huggingface.co/docs/transformers/en/model_doc/siglip)
- Phase 2 計画: `.plans/00_phase2_ai_assist_overview.md`
