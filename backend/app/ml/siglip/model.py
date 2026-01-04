"""SigLIP 2 model loader with singleton pattern.

This module provides lazy loading of SigLIP 2 model and processor.
The model is only loaded when first accessed, which allows the code
to be imported without GPU dependencies in non-GPU environments.

The singleton pattern ensures the model is loaded only once per process.
"""

from functools import lru_cache
from typing import TYPE_CHECKING

from app.core.config import get_settings

if TYPE_CHECKING:
    from transformers import SiglipModel, SiglipProcessor


@lru_cache(maxsize=1)
def get_siglip_model() -> "SiglipModel":
    """Get cached SigLIP 2 model instance.

    Returns:
        SiglipModel: The loaded and configured model.

    Note:
        This function should only be called in GPU Worker context.
        The model is loaded lazily and cached for subsequent calls.
    """
    from transformers import SiglipModel

    settings = get_settings()

    model = SiglipModel.from_pretrained(settings.siglip_model_name)
    model.to(settings.siglip_device)
    model.eval()

    return model


@lru_cache(maxsize=1)
def get_siglip_processor() -> "SiglipProcessor":
    """Get cached SigLIP 2 processor instance.

    Returns:
        SiglipProcessor: The loaded processor for image/text preprocessing.

    Note:
        This function should only be called in GPU Worker context.
        The processor is loaded lazily and cached for subsequent calls.
    """
    from transformers import SiglipProcessor

    settings = get_settings()

    return SiglipProcessor.from_pretrained(settings.siglip_model_name)
