# Issue #62: SAM 3 統合 - Backend 実装計画

**作成日時**: 2026-01-04
**Issue**: #62 SAM 3 統合 - Backend
**ブランチ**: `feature/#62-sam3-integration`

## 概要

SAM 3 (Segment Anything Model 3) を Backend に統合し、テキストプロンプトからバウンディングボックス・マスクを生成するサービスを実装する。

## 完了条件

- [x] SAM 3 モデル統合 (HuggingFace transformers)
- [x] テキストプロンプト → バウンディングボックス生成
- [x] 信頼度スコア算出
- [x] マスク生成オプション
- [x] ユニットテスト

## 既存インフラ確認

以下は既に準備済み:
- `docker/docker-compose.gpu.yml` - sam3-worker サービス定義
- `backend/Dockerfile.sam3` - SAM 3 用 Dockerfile (Python 3.12 + PyTorch + transformers dev)

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│ Backend (FastAPI)                                           │
│                                                             │
│  app/ml/sam3/                                              │
│  ├── __init__.py         # 公開インターフェース             │
│  ├── model.py            # モデルローダー（遅延読み込み）    │
│  └── segmentation.py     # セグメンテーション機能           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         │ (SAM3 Worker で実行時のみモデルロード)
         ▼
┌─────────────────────────────────────────────────────────────┐
│ SAM3 Worker (Celery)                                        │
│                                                             │
│  - queue: sam3                                              │
│  - テキストプロンプト → bbox/mask 生成                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 実装ファイル

### 新規作成

| ファイル | 説明 |
|----------|------|
| `backend/app/ml/sam3/__init__.py` | SAM 3 公開インターフェース |
| `backend/app/ml/sam3/model.py` | モデルローダー（シングルトン） |
| `backend/app/ml/sam3/segmentation.py` | セグメンテーションロジック |
| `backend/tests/test_ml/test_sam3.py` | SAM 3 ユニットテスト |

### 修正

| ファイル | 説明 |
|----------|------|
| `backend/app/core/config.py` | SAM 3 設定追加 |

## 実装詳細

### 1. 設定追加 (`app/core/config.py`)

```python
class Settings(BaseSettings):
    # ... 既存設定 ...

    # SAM 3
    sam3_device: str = "cuda"
```

### 2. モデルローダー (`app/ml/sam3/model.py`)

```python
from functools import lru_cache
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sam3.model.sam3_image_processor import Sam3Processor

@lru_cache(maxsize=1)
def get_sam3_processor() -> "Sam3Processor":
    """シングルトンで SAM 3 processor をロード（GPU Worker でのみ呼び出し）"""
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor

    settings = get_settings()
    model = build_sam3_image_model()
    model.to(settings.sam3_device)
    model.eval()

    return Sam3Processor(model)
```

### 3. セグメンテーション (`app/ml/sam3/segmentation.py`)

```python
from dataclasses import dataclass
import numpy as np
from PIL import Image

@dataclass
class SegmentationResult:
    """セグメンテーション結果"""
    boxes: list[tuple[float, float, float, float]]  # (x1, y1, x2, y2)
    scores: list[float]
    masks: list[np.ndarray] | None  # オプション

def segment_from_text(
    image: Image.Image,
    prompt: str,
    include_masks: bool = False,
) -> SegmentationResult:
    """テキストプロンプトからセグメンテーション"""
    processor = get_sam3_processor()

    inference_state = processor.set_image(image)
    output = processor.set_text_prompt(
        state=inference_state,
        prompt=prompt
    )

    # 結果を変換
    boxes = output["boxes"].cpu().numpy().tolist()
    scores = output["scores"].cpu().numpy().tolist()
    masks = None
    if include_masks:
        masks = [m.cpu().numpy() for m in output["masks"]]

    return SegmentationResult(boxes=boxes, scores=scores, masks=masks)
```

### 4. 公開インターフェース (`app/ml/sam3/__init__.py`)

```python
from app.ml.sam3.segmentation import (
    SegmentationResult,
    segment_from_text,
)

__all__ = [
    "SegmentationResult",
    "segment_from_text",
]
```

### 5. ユニットテスト

- 類似度計算等の CPU 処理はモック無しでテスト
- GPU 処理はモックを使用してテスト

## 実装順序

1. **Step 1**: 設定追加 (`config.py`)
2. **Step 2**: ML モジュール作成 (`app/ml/sam3/`)
3. **Step 3**: ユニットテスト作成
4. **Step 4**: lint/test 実行
5. **Step 5**: PR 作成

## 注意事項

- SAM 3 Worker でのみモデルをロードする（遅延読み込み）
- CPU Worker / Backend ではモデルをロードしない
- テストは GPU 不要（モック使用）
- Celery タスクは Issue #65 で追加予定

## 参照

- [r2s2 SAM3 実装](file:///home/hexyl/workspace/r2s2/simulator/src/mask/sam3_interactive.py)
- [SAM3 技術仕様書](file:///home/hexyl/workspace/r2s2/simulator/docs/SAM3_SAM3D_REFERENCE.md)
- SigLIP 統合実装パターン: `app/ml/siglip/`
