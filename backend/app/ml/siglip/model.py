"""SigLIP 2 model loader with singleton pattern.

This module provides lazy loading of SigLIP 2 model and processor.
The model is only loaded when first accessed, which allows the code
to be imported without GPU dependencies in non-GPU environments.

The singleton pattern ensures the model is loaded only once per process.
"""

from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.core.config import get_settings

if TYPE_CHECKING:
    from transformers import PreTrainedModel, ProcessorMixin


@lru_cache(maxsize=1)
def get_siglip_model() -> "PreTrainedModel":
    """Get cached SigLIP 2 model instance.

    Returns:
        PreTrainedModel: The loaded and configured model (Siglip2Model).

    Note:
        This function should only be called in GPU Worker context.
        The model is loaded lazily and cached for subsequent calls.
        AutoModel is used to automatically load the correct model class
        (Siglip2Model for SigLIP 2 checkpoints).
    """
    from transformers import AutoModel

    settings = get_settings()

    model: Any = AutoModel.from_pretrained(settings.siglip_model_name)
    model.to(settings.siglip_device)
    model.eval()

    return model


@lru_cache(maxsize=1)
def get_siglip_processor() -> "ProcessorMixin":
    """Get cached SigLIP 2 processor instance.

    Returns:
        ProcessorMixin: The loaded processor for image/text preprocessing
        (Siglip2Processor for SigLIP 2 checkpoints).

    Note:
        This function should only be called in GPU Worker context.
        The processor is loaded lazily and cached for subsequent calls.
        AutoProcessor is used to automatically load the correct processor class.
    """
    from transformers import AutoProcessor

    settings = get_settings()

    return AutoProcessor.from_pretrained(settings.siglip_model_name)
