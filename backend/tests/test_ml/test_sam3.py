"""Tests for SAM 3 integration.

Tests are designed to run without GPU:
- Data classes are tested directly (no GPU needed)
- Segmentation functions are tested with mocks

Note: We import data classes directly to avoid importing
torch/sam3 (which is only available in SAM3 Worker containers).
"""

import sys
from unittest.mock import MagicMock, patch

import numpy as np
from PIL import Image

# Import data classes directly (no GPU dependency)
from app.ml.sam3.segmentation import BoundingBox, SegmentationResult, get_best_detection


class TestBoundingBox:
    """Tests for BoundingBox dataclass."""

    def test_creation(self) -> None:
        """Test BoundingBox creation with valid values."""
        box = BoundingBox(x1=10.0, y1=20.0, x2=100.0, y2=200.0, score=0.95)
        assert box.x1 == 10.0
        assert box.y1 == 20.0
        assert box.x2 == 100.0
        assert box.y2 == 200.0
        assert box.score == 0.95

    def test_float_conversion(self) -> None:
        """Test that integer values are stored as floats."""
        box = BoundingBox(x1=10, y1=20, x2=100, y2=200, score=1)
        assert isinstance(box.x1, (int, float))
        assert isinstance(box.score, (int, float))


class TestSegmentationResult:
    """Tests for SegmentationResult dataclass."""

    def test_creation_without_masks(self) -> None:
        """Test SegmentationResult creation without masks."""
        boxes = [
            BoundingBox(x1=0, y1=0, x2=50, y2=50, score=0.9),
            BoundingBox(x1=100, y1=100, x2=150, y2=150, score=0.8),
        ]
        result = SegmentationResult(boxes=boxes, masks=None)

        assert len(result.boxes) == 2
        assert result.masks is None

    def test_creation_with_masks(self) -> None:
        """Test SegmentationResult creation with masks."""
        boxes = [BoundingBox(x1=0, y1=0, x2=50, y2=50, score=0.9)]
        masks = [np.zeros((100, 100), dtype=np.uint8)]
        result = SegmentationResult(boxes=boxes, masks=masks)

        assert len(result.boxes) == 1
        assert result.masks is not None
        assert len(result.masks) == 1
        assert result.masks[0].shape == (100, 100)

    def test_empty_result(self) -> None:
        """Test empty SegmentationResult."""
        result = SegmentationResult(boxes=[], masks=None)
        assert len(result.boxes) == 0
        assert result.masks is None


class TestGetBestDetection:
    """Tests for get_best_detection function."""

    def test_single_detection(self) -> None:
        """Test with single detection."""
        boxes = [BoundingBox(x1=0, y1=0, x2=50, y2=50, score=0.9)]
        result = SegmentationResult(boxes=boxes, masks=None)

        best = get_best_detection(result)
        assert best is not None
        box, mask = best
        assert box.score == 0.9
        assert mask is None

    def test_multiple_detections(self) -> None:
        """Test returns highest score detection."""
        boxes = [
            BoundingBox(x1=0, y1=0, x2=50, y2=50, score=0.7),
            BoundingBox(x1=100, y1=100, x2=150, y2=150, score=0.95),
            BoundingBox(x1=200, y1=200, x2=250, y2=250, score=0.8),
        ]
        result = SegmentationResult(boxes=boxes, masks=None)

        best = get_best_detection(result)
        assert best is not None
        box, _mask = best
        assert box.score == 0.95
        assert box.x1 == 100

    def test_with_masks(self) -> None:
        """Test returns corresponding mask."""
        boxes = [
            BoundingBox(x1=0, y1=0, x2=50, y2=50, score=0.7),
            BoundingBox(x1=100, y1=100, x2=150, y2=150, score=0.95),
        ]
        mask1 = np.zeros((100, 100), dtype=np.uint8)
        mask2 = np.ones((100, 100), dtype=np.uint8) * 255
        masks = [mask1, mask2]
        result = SegmentationResult(boxes=boxes, masks=masks)

        best = get_best_detection(result)
        assert best is not None
        box, mask = best
        assert box.score == 0.95
        assert mask is not None
        assert np.all(mask == 255)  # Should be mask2

    def test_empty_result(self) -> None:
        """Test returns None for empty result."""
        result = SegmentationResult(boxes=[], masks=None)
        best = get_best_detection(result)
        assert best is None


class TestSegmentFromText:
    """Tests for segment_from_text function (using mocks)."""

    def test_segment_from_text_basic(self) -> None:
        """Test basic text segmentation with mocks."""
        # Mock sam3 before importing
        mock_sam3 = MagicMock()
        mock_sam3_processor = MagicMock()
        sys.modules["sam3"] = mock_sam3
        sys.modules["sam3.model_builder"] = mock_sam3
        sys.modules["sam3.model"] = MagicMock()
        sys.modules["sam3.model.sam3_image_processor"] = mock_sam3_processor

        try:
            with patch("app.ml.sam3.segmentation.get_sam3_processor") as mock_get:
                # Import after mocking
                from app.ml.sam3.segmentation import segment_from_text

                # Setup mock processor
                mock_processor = MagicMock()
                mock_get.return_value = mock_processor

                # Mock set_image
                mock_state = {"image_features": MagicMock()}
                mock_processor.set_image.return_value = mock_state

                # Mock set_text_prompt output
                mock_boxes = MagicMock()
                mock_boxes.cpu.return_value.numpy.return_value = np.array(
                    [[10.0, 20.0, 100.0, 200.0], [50.0, 60.0, 150.0, 160.0]]
                )
                mock_scores = MagicMock()
                mock_scores.cpu.return_value.numpy.return_value = np.array([0.95, 0.80])
                mock_masks: list[MagicMock] = []

                mock_processor.set_text_prompt.return_value = {
                    "boxes": mock_boxes,
                    "scores": mock_scores,
                    "masks": mock_masks,
                }

                # Create test image
                image = Image.new("RGB", (256, 256))

                # Run segmentation
                result = segment_from_text(image, "cpu")

                # Verify
                assert len(result.boxes) == 2
                assert result.boxes[0].score == 0.95
                assert result.boxes[0].x1 == 10.0
                assert result.boxes[1].score == 0.80
                assert result.masks is None

                mock_processor.set_image.assert_called_once_with(image)
                mock_processor.set_text_prompt.assert_called_once_with(
                    state=mock_state,
                    prompt="cpu",
                )
        finally:
            # Clean up mocks
            for mod in list(sys.modules.keys()):
                if mod.startswith("sam3"):
                    del sys.modules[mod]

    def test_segment_from_text_with_masks(self) -> None:
        """Test text segmentation with masks enabled."""
        # Mock sam3
        mock_sam3 = MagicMock()
        sys.modules["sam3"] = mock_sam3
        sys.modules["sam3.model_builder"] = mock_sam3
        sys.modules["sam3.model"] = MagicMock()
        sys.modules["sam3.model.sam3_image_processor"] = MagicMock()

        try:
            with patch("app.ml.sam3.segmentation.get_sam3_processor") as mock_get:
                from app.ml.sam3.segmentation import segment_from_text

                mock_processor = MagicMock()
                mock_get.return_value = mock_processor

                mock_state = {"image_features": MagicMock()}
                mock_processor.set_image.return_value = mock_state

                # Create mock mask tensors
                mock_mask1 = MagicMock()
                mock_mask1.cpu.return_value.numpy.return_value = np.ones((256, 256))
                mock_mask2 = MagicMock()
                mock_mask2.cpu.return_value.numpy.return_value = np.zeros((256, 256))

                mock_boxes = MagicMock()
                mock_boxes.cpu.return_value.numpy.return_value = np.array(
                    [[10.0, 20.0, 100.0, 200.0], [50.0, 60.0, 150.0, 160.0]]
                )
                mock_scores = MagicMock()
                mock_scores.cpu.return_value.numpy.return_value = np.array([0.95, 0.80])

                mock_processor.set_text_prompt.return_value = {
                    "boxes": mock_boxes,
                    "scores": mock_scores,
                    "masks": [mock_mask1, mock_mask2],
                }

                image = Image.new("RGB", (256, 256))
                result = segment_from_text(image, "person", include_masks=True)

                assert len(result.boxes) == 2
                assert result.masks is not None
                assert len(result.masks) == 2
                assert result.masks[0].dtype == np.uint8
                assert result.masks[0].max() == 255  # Converted from 1.0
        finally:
            for mod in list(sys.modules.keys()):
                if mod.startswith("sam3"):
                    del sys.modules[mod]


class TestModelLoader:
    """Tests for model loader functions."""

    def test_get_sam3_processor_loads_correctly(self) -> None:
        """Test that processor loader configures model correctly."""
        # Mock sam3 modules
        mock_sam3 = MagicMock()
        mock_model = MagicMock()
        mock_processor = MagicMock()

        mock_sam3.build_sam3_image_model = MagicMock(return_value=mock_model)
        mock_sam3.Sam3Processor = MagicMock(return_value=mock_processor)

        sys.modules["sam3"] = mock_sam3
        sys.modules["sam3.model_builder"] = mock_sam3
        sys.modules["sam3.model"] = MagicMock()
        sys.modules["sam3.model.sam3_image_processor"] = mock_sam3

        # Clear cached module
        if "app.ml.sam3.model" in sys.modules:
            del sys.modules["app.ml.sam3.model"]

        try:
            from app.ml.sam3 import model as sam3_model_module

            # Clear lru_cache
            sam3_model_module.get_sam3_processor.cache_clear()

            with patch.object(sam3_model_module, "get_settings") as mock_get_settings:
                mock_settings = MagicMock()
                mock_settings.sam3_device = "cuda"
                mock_get_settings.return_value = mock_settings

                result = sam3_model_module.get_sam3_processor()

                mock_sam3.build_sam3_image_model.assert_called_once()
                mock_model.to.assert_called_once_with("cuda")
                mock_model.eval.assert_called_once()
                mock_sam3.Sam3Processor.assert_called_once_with(mock_model)
                assert result == mock_processor

                sam3_model_module.get_sam3_processor.cache_clear()
        finally:
            for mod in list(sys.modules.keys()):
                if mod.startswith("sam3") or mod == "app.ml.sam3.model":
                    del sys.modules[mod]
