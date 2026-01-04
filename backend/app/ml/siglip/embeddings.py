"""SigLIP 2 embedding extraction functions.

This module provides functions to extract embeddings from images and text
using the SigLIP 2 model.
"""

import numpy as np
import torch
from numpy.typing import NDArray
from PIL import Image

from app.ml.siglip.model import get_siglip_model, get_siglip_processor


def _normalize_embeddings(embeddings: NDArray[np.float32]) -> NDArray[np.float32]:
    """L2 normalize embeddings.

    Args:
        embeddings: Embeddings array of shape (N, D).

    Returns:
        L2 normalized embeddings.
    """
    norms: NDArray[np.float32] = np.linalg.norm(embeddings, axis=1, keepdims=True)
    # Avoid division by zero
    norms = np.maximum(norms, 1e-8)
    normalized: NDArray[np.float32] = embeddings / norms
    return normalized


def extract_image_embeddings(images: list[Image.Image]) -> NDArray[np.float32]:
    """Extract embeddings from images using SigLIP 2.

    Args:
        images: List of PIL Image objects to extract embeddings from.

    Returns:
        NDArray of shape (N, embedding_dim) containing L2 normalized embeddings.

    Example:
        >>> from PIL import Image
        >>> images = [Image.open("frame1.jpg"), Image.open("frame2.jpg")]
        >>> embeddings = extract_image_embeddings(images)
        >>> embeddings.shape
        (2, 768)
    """
    model = get_siglip_model()
    processor = get_siglip_processor()

    inputs = processor(images=images, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        embeddings = model.get_image_features(**inputs)

    result: NDArray[np.float32] = embeddings.cpu().numpy().astype(np.float32)
    return _normalize_embeddings(result)


def extract_text_embeddings(texts: list[str]) -> NDArray[np.float32]:
    """Extract embeddings from texts using SigLIP 2.

    Args:
        texts: List of text strings to extract embeddings from.

    Returns:
        NDArray of shape (N, embedding_dim) containing L2 normalized embeddings.

    Example:
        >>> texts = ["a photo of a cat", "a photo of a dog"]
        >>> embeddings = extract_text_embeddings(texts)
        >>> embeddings.shape
        (2, 768)
    """
    model = get_siglip_model()
    processor = get_siglip_processor()

    inputs = processor(text=texts, return_tensors="pt", padding=True)
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        embeddings = model.get_text_features(**inputs)

    result: NDArray[np.float32] = embeddings.cpu().numpy().astype(np.float32)
    return _normalize_embeddings(result)
