"""SAM 3 model loader with singleton pattern.

This module provides lazy loading of SAM 3 (Segment Anything Model 3).
The model is only loaded when first accessed, which allows the code
to be imported without GPU dependencies in non-GPU environments.

The singleton pattern ensures the model is loaded only once per process.
"""

from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.core.config import get_settings

if TYPE_CHECKING:
    from sam3.model.sam3_image_processor import Sam3Processor


@lru_cache(maxsize=1)
def get_sam3_processor() -> "Sam3Processor":
    """Get cached SAM 3 processor instance.

    Returns:
        Sam3Processor: The loaded processor with underlying model.

    Note:
        This function should only be called in SAM3 Worker context.
        The model is loaded lazily and cached for subsequent calls.
    """
    from sam3.model.sam3_image_processor import Sam3Processor
    from sam3.model_builder import build_sam3_image_model

    settings = get_settings()

    model: Any = build_sam3_image_model()
    model.to(settings.sam3_device)
    model.eval()

    return Sam3Processor(model)
