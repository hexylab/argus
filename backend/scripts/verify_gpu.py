#!/usr/bin/env python3
"""GPU 環境動作確認スクリプト.

Usage:
    # Docker 経由
    make verify-gpu

    # 直接実行
    uv run python scripts/verify_gpu.py
"""

from __future__ import annotations

import sys


def check_cuda() -> bool:
    """CUDA の確認."""
    try:
        import torch

        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"CUDA version: {torch.version.cuda}")
            print(f"cuDNN version: {torch.backends.cudnn.version()}")
            print(f"GPU count: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                print(f"  GPU {i}: {props.name}")
                print(f"    - Memory: {props.total_memory / 1024**3:.1f} GB")
                print(f"    - Compute capability: {props.major}.{props.minor}")
            return True
        print("CUDA is not available")
        return False
    except ImportError:
        print("PyTorch not installed")
        return False


def check_transformers() -> bool:
    """Transformers の確認."""
    try:
        import transformers

        print(f"Transformers version: {transformers.__version__}")
        return True
    except ImportError:
        print("Transformers not installed")
        return False


def check_siglip() -> bool:
    """SigLIP 2 モデルの確認 (ロードはしない)."""
    try:
        from transformers import AutoModel, AutoProcessor

        # Check that the classes are available (not None)
        assert AutoModel is not None
        assert AutoProcessor is not None

        print("SigLIP 2 dependencies available")
        print("  - AutoModel: OK")
        print("  - AutoProcessor: OK")
        # Note: 実際のモデルロードは時間がかかるのでスキップ
        return True
    except ImportError as e:
        print(f"SigLIP 2 dependencies missing: {e}")
        return False


def main() -> int:
    """メイン処理."""
    print("=" * 60)
    print("GPU Environment Verification")
    print("=" * 60)

    results: list[tuple[str, bool]] = []

    print("\n[1/3] Checking CUDA...")
    print("-" * 40)
    results.append(("CUDA", check_cuda()))

    print("\n[2/3] Checking Transformers...")
    print("-" * 40)
    results.append(("Transformers", check_transformers()))

    print("\n[3/3] Checking SigLIP 2 dependencies...")
    print("-" * 40)
    results.append(("SigLIP 2", check_siglip()))

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "OK" if passed else "FAIL"
        icon = "[x]" if passed else "[ ]"
        print(f"  {icon} {name}: {status}")
        if not passed:
            all_passed = False

    if all_passed:
        print("\nAll checks passed!")
        return 0
    else:
        print("\nSome checks failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
