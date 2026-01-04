"""Similarity calculation functions for embeddings.

This module provides cosine similarity calculation and similar frame search
functionality that works with any embedding vectors (not GPU-dependent).
"""

from typing import cast

import numpy as np
from numpy.typing import NDArray


def cosine_similarity(
    a: NDArray[np.float32], b: NDArray[np.float32]
) -> float | NDArray[np.float32]:
    """Calculate cosine similarity between embedding vectors.

    Args:
        a: First embedding array of shape (N, D) or (D,).
        b: Second embedding array of shape (M, D) or (D,).

    Returns:
        Similarity scores:
        - If both are 1D: scalar float
        - If one is 1D, other is 2D: shape (N,) or (M,)
        - If both are 2D: shape (N, M)

    Example:
        >>> a = np.array([1.0, 0.0, 0.0])
        >>> b = np.array([1.0, 0.0, 0.0])
        >>> cosine_similarity(a, b)
        1.0

        >>> a = np.array([[1.0, 0.0], [0.0, 1.0]])
        >>> b = np.array([[1.0, 0.0]])
        >>> cosine_similarity(a, b)
        array([[1.], [0.]])
    """
    a_squeezed = np.atleast_2d(a)
    b_squeezed = np.atleast_2d(b)

    a_norm = a_squeezed / np.linalg.norm(a_squeezed, axis=-1, keepdims=True)
    b_norm = b_squeezed / np.linalg.norm(b_squeezed, axis=-1, keepdims=True)

    similarity = np.dot(a_norm, b_norm.T)

    if a.ndim == 1 and b.ndim == 1:
        return cast(float, similarity.item())
    if a.ndim == 1:
        return cast(NDArray[np.float32], similarity.squeeze(0))
    if b.ndim == 1:
        return cast(NDArray[np.float32], similarity.squeeze(-1))

    return cast(NDArray[np.float32], similarity.astype(np.float32))


def find_similar_frames(
    query_embedding: NDArray[np.float32],
    frame_embeddings: NDArray[np.float32],
    top_k: int = 10,
) -> list[tuple[int, float]]:
    """Find frames most similar to a query embedding.

    Args:
        query_embedding: Query embedding of shape (D,).
        frame_embeddings: Frame embeddings of shape (N, D).
        top_k: Number of top similar frames to return.

    Returns:
        List of (frame_index, similarity_score) tuples, sorted by
        similarity in descending order.

    Example:
        >>> query = np.array([1.0, 0.0, 0.0])
        >>> frames = np.array([
        ...     [1.0, 0.0, 0.0],  # Most similar
        ...     [0.7, 0.7, 0.0],  # Second
        ...     [0.0, 1.0, 0.0],  # Orthogonal
        ... ])
        >>> find_similar_frames(query, frames, top_k=2)
        [(0, 1.0), (1, 0.7071...)]
    """
    similarities = cosine_similarity(query_embedding, frame_embeddings)

    if isinstance(similarities, np.ndarray):
        similarities = similarities.flatten()
    else:
        similarities = np.array([similarities])

    top_k = min(top_k, len(similarities))
    top_indices = np.argsort(similarities)[::-1][:top_k]

    return [(int(idx), float(similarities[idx])) for idx in top_indices]
