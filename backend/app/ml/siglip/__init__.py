"""SigLIP 2 integration for image/text embedding extraction.

This module provides:
- Cosine similarity calculation (CPU-compatible)
- Similar frame search functionality (CPU-compatible)

For embedding extraction (GPU Worker only), import directly:
    from app.ml.siglip.embeddings import (
        extract_image_embeddings,
        extract_text_embeddings,
    )

Usage:
    from app.ml.siglip import (
        cosine_similarity,
        find_similar_frames,
    )

Note:
    Embedding functions require torch and are only available in GPU Worker.
    Similarity functions work on CPU without torch dependency.
"""

from app.ml.siglip.similarity import (
    cosine_similarity,
    find_similar_frames,
)

__all__ = [
    "cosine_similarity",
    "find_similar_frames",
]
