"""Tests for SigLIP 2 integration.

Tests are designed to run without GPU:
- Similarity functions are tested directly (no GPU needed)
- Embedding functions are tested with mocks

Note: We import directly from the similarity module to avoid importing
torch (which is only available in GPU Worker containers).
"""

import sys
from unittest.mock import MagicMock, patch

import numpy as np
from PIL import Image

# Import similarity module directly (no torch dependency)
from app.ml.siglip.similarity import cosine_similarity, find_similar_frames


class TestCosineSimilarity:
    """Tests for cosine_similarity function."""

    def test_identical_vectors(self) -> None:
        """Identical vectors should have similarity of 1.0."""
        a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        b = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        result = cosine_similarity(a, b)
        assert np.isclose(result, 1.0)

    def test_orthogonal_vectors(self) -> None:
        """Orthogonal vectors should have similarity of 0.0."""
        a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        b = np.array([0.0, 1.0, 0.0], dtype=np.float32)
        result = cosine_similarity(a, b)
        assert np.isclose(result, 0.0)

    def test_opposite_vectors(self) -> None:
        """Opposite vectors should have similarity of -1.0."""
        a = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        b = np.array([-1.0, 0.0, 0.0], dtype=np.float32)
        result = cosine_similarity(a, b)
        assert np.isclose(result, -1.0)

    def test_batch_1d_2d(self) -> None:
        """Test 1D query against 2D batch."""
        query = np.array([1.0, 0.0], dtype=np.float32)
        batch = np.array([[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0]], dtype=np.float32)
        result = cosine_similarity(query, batch)
        expected = np.array([1.0, 0.0, -1.0], dtype=np.float32)
        np.testing.assert_allclose(result, expected, rtol=1e-5)

    def test_batch_2d_2d(self) -> None:
        """Test 2D batch against 2D batch."""
        a = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
        b = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
        result = cosine_similarity(a, b)
        expected = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
        np.testing.assert_allclose(result, expected, rtol=1e-5)

    def test_normalized_output(self) -> None:
        """Result should be between -1 and 1."""
        rng = np.random.default_rng(42)
        a = rng.random((10, 128)).astype(np.float32)
        b = rng.random((10, 128)).astype(np.float32)
        result = cosine_similarity(a, b)
        assert np.all(result >= -1.0 - 1e-6)
        assert np.all(result <= 1.0 + 1e-6)


class TestFindSimilarFrames:
    """Tests for find_similar_frames function."""

    def test_basic_search(self) -> None:
        """Test basic similar frame search."""
        query = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        frames = np.array(
            [
                [1.0, 0.0, 0.0],  # Most similar (index 0)
                [0.7071, 0.7071, 0.0],  # Second (index 1)
                [0.0, 1.0, 0.0],  # Orthogonal (index 2)
            ],
            dtype=np.float32,
        )
        results = find_similar_frames(query, frames, top_k=2)

        assert len(results) == 2
        assert results[0][0] == 0  # Index 0 is most similar
        assert np.isclose(results[0][1], 1.0)  # Similarity is 1.0
        assert results[1][0] == 1  # Index 1 is second
        assert results[0][1] > results[1][1]  # Scores are descending

    def test_top_k_limit(self) -> None:
        """Test that top_k limits results correctly."""
        query = np.array([1.0, 0.0], dtype=np.float32)
        frames = np.array(
            [[1.0, 0.0], [0.9, 0.1], [0.8, 0.2], [0.7, 0.3], [0.6, 0.4]],
            dtype=np.float32,
        )
        results = find_similar_frames(query, frames, top_k=3)
        assert len(results) == 3

    def test_top_k_exceeds_frames(self) -> None:
        """Test when top_k exceeds number of frames."""
        query = np.array([1.0, 0.0], dtype=np.float32)
        frames = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
        results = find_similar_frames(query, frames, top_k=10)
        assert len(results) == 2  # Should return all frames

    def test_result_format(self) -> None:
        """Test that results are (index, score) tuples."""
        query = np.array([1.0, 0.0], dtype=np.float32)
        frames = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
        results = find_similar_frames(query, frames, top_k=1)

        assert len(results) == 1
        assert isinstance(results[0], tuple)
        assert isinstance(results[0][0], int)
        assert isinstance(results[0][1], float)


class TestEmbeddings:
    """Tests for embedding extraction functions (using mocks).

    These tests require mocking torch before importing the embeddings module.
    """

    def test_extract_image_embeddings(self) -> None:
        """Test image embedding extraction with mocks."""
        # Mock torch before importing embeddings
        mock_torch = MagicMock()
        mock_torch.no_grad.return_value.__enter__ = MagicMock()
        mock_torch.no_grad.return_value.__exit__ = MagicMock()
        sys.modules["torch"] = mock_torch

        try:
            with (
                patch("app.ml.siglip.embeddings.get_siglip_model") as mock_get_model,
                patch(
                    "app.ml.siglip.embeddings.get_siglip_processor"
                ) as mock_get_processor,
            ):
                # Import after mocking
                from app.ml.siglip.embeddings import extract_image_embeddings

                # Setup mock model
                mock_model = MagicMock()
                mock_model.device = "cpu"
                mock_embeddings = MagicMock()
                mock_embeddings.cpu.return_value.numpy.return_value = np.random.randn(
                    2, 768
                ).astype(np.float32)
                mock_model.get_image_features.return_value = mock_embeddings
                mock_get_model.return_value = mock_model

                # Setup mock processor
                mock_processor = MagicMock()
                mock_processor.return_value = {"pixel_values": MagicMock()}
                mock_get_processor.return_value = mock_processor

                # Create test images
                images = [Image.new("RGB", (256, 256)) for _ in range(2)]

                # Extract embeddings
                embeddings = extract_image_embeddings(images)

                # Verify
                assert embeddings.shape == (2, 768)
                assert embeddings.dtype == np.float32
                mock_get_model.assert_called_once()
                mock_get_processor.assert_called_once()
        finally:
            # Clean up mock
            if "torch" in sys.modules and isinstance(sys.modules["torch"], MagicMock):
                del sys.modules["torch"]
            # Clear cached modules
            modules_to_remove = [
                k for k in sys.modules if k.startswith("app.ml.siglip.embeddings")
            ]
            for mod in modules_to_remove:
                del sys.modules[mod]

    def test_extract_text_embeddings(self) -> None:
        """Test text embedding extraction with mocks."""
        # Mock torch before importing embeddings
        mock_torch = MagicMock()
        mock_torch.no_grad.return_value.__enter__ = MagicMock()
        mock_torch.no_grad.return_value.__exit__ = MagicMock()
        sys.modules["torch"] = mock_torch

        try:
            with (
                patch("app.ml.siglip.embeddings.get_siglip_model") as mock_get_model,
                patch(
                    "app.ml.siglip.embeddings.get_siglip_processor"
                ) as mock_get_processor,
            ):
                # Import after mocking
                from app.ml.siglip.embeddings import extract_text_embeddings

                # Setup mock model
                mock_model = MagicMock()
                mock_model.device = "cpu"
                mock_embeddings = MagicMock()
                mock_embeddings.cpu.return_value.numpy.return_value = np.random.randn(
                    2, 768
                ).astype(np.float32)
                mock_model.get_text_features.return_value = mock_embeddings
                mock_get_model.return_value = mock_model

                # Setup mock processor
                mock_processor = MagicMock()
                mock_processor.return_value = {"input_ids": MagicMock()}
                mock_get_processor.return_value = mock_processor

                # Create test texts
                texts = ["a photo of a cat", "a photo of a dog"]

                # Extract embeddings
                embeddings = extract_text_embeddings(texts)

                # Verify
                assert embeddings.shape == (2, 768)
                assert embeddings.dtype == np.float32
                mock_get_model.assert_called_once()
                mock_get_processor.assert_called_once()
        finally:
            # Clean up mock
            if "torch" in sys.modules and isinstance(sys.modules["torch"], MagicMock):
                del sys.modules["torch"]
            # Clear cached modules
            modules_to_remove = [
                k for k in sys.modules if k.startswith("app.ml.siglip.embeddings")
            ]
            for mod in modules_to_remove:
                del sys.modules[mod]


class TestModelLoader:
    """Tests for model loader functions."""

    def test_get_siglip_model_loads_correctly(self) -> None:
        """Test that model loader configures model correctly."""
        # Mock transformers module before importing model
        mock_transformers = MagicMock()
        mock_model = MagicMock()
        mock_transformers.AutoModel.from_pretrained.return_value = mock_model
        sys.modules["transformers"] = mock_transformers

        # Clear cached modules before test
        if "app.ml.siglip.model" in sys.modules:
            del sys.modules["app.ml.siglip.model"]

        try:
            # Import after mocking transformers
            from app.ml.siglip import model as siglip_model_module

            # Clear lru_cache
            siglip_model_module.get_siglip_model.cache_clear()

            with patch.object(siglip_model_module, "get_settings") as mock_get_settings:
                # Setup mocks
                mock_settings = MagicMock()
                mock_settings.siglip_model_name = "google/siglip2-base-patch16-256"
                mock_settings.siglip_device = "cpu"
                mock_get_settings.return_value = mock_settings

                # Call the function
                result = siglip_model_module.get_siglip_model()

                # Verify
                mock_transformers.AutoModel.from_pretrained.assert_called_once_with(
                    "google/siglip2-base-patch16-256"
                )
                mock_model.to.assert_called_once_with("cpu")
                mock_model.eval.assert_called_once()
                assert result == mock_model

                # Clear cache after test
                siglip_model_module.get_siglip_model.cache_clear()
        finally:
            # Clean up mock
            if "transformers" in sys.modules and isinstance(
                sys.modules["transformers"], MagicMock
            ):
                del sys.modules["transformers"]
            if "app.ml.siglip.model" in sys.modules:
                del sys.modules["app.ml.siglip.model"]

    def test_get_siglip_processor_loads_correctly(self) -> None:
        """Test that processor loader works correctly."""
        # Mock transformers module before importing model
        mock_transformers = MagicMock()
        mock_processor = MagicMock()
        mock_transformers.AutoProcessor.from_pretrained.return_value = mock_processor
        sys.modules["transformers"] = mock_transformers

        # Clear cached modules before test
        if "app.ml.siglip.model" in sys.modules:
            del sys.modules["app.ml.siglip.model"]

        try:
            # Import after mocking transformers
            from app.ml.siglip import model as siglip_model_module

            # Clear lru_cache
            siglip_model_module.get_siglip_processor.cache_clear()

            with patch.object(siglip_model_module, "get_settings") as mock_get_settings:
                # Setup mocks
                mock_settings = MagicMock()
                mock_settings.siglip_model_name = "google/siglip2-base-patch16-256"
                mock_get_settings.return_value = mock_settings

                # Call the function
                result = siglip_model_module.get_siglip_processor()

                # Verify
                mock_transformers.AutoProcessor.from_pretrained.assert_called_once_with(
                    "google/siglip2-base-patch16-256"
                )
                assert result == mock_processor

                # Clear cache after test
                siglip_model_module.get_siglip_processor.cache_clear()
        finally:
            # Clean up mock
            if "transformers" in sys.modules and isinstance(
                sys.modules["transformers"], MagicMock
            ):
                del sys.modules["transformers"]
            if "app.ml.siglip.model" in sys.modules:
                del sys.modules["app.ml.siglip.model"]
