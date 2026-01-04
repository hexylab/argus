"""SAM 3 (Segment Anything Model 3) integration for auto-annotation.

This module provides:
- Text-prompted segmentation (CPU-compatible types only)

For segmentation functions (GPU Worker only), import directly:
    from app.ml.sam3.segmentation import (
        segment_from_text,
        get_best_detection,
    )

Usage:
    from app.ml.sam3 import (
        BoundingBox,
        SegmentationResult,
    )

Note:
    Segmentation functions require torch/sam3 and are only available in SAM3 Worker.
    Type definitions work on CPU without torch dependency.
"""

from app.ml.sam3.segmentation import (
    BoundingBox,
    SegmentationResult,
)

__all__ = [
    "BoundingBox",
    "SegmentationResult",
]
