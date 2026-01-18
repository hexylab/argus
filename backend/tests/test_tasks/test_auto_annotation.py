"""Tests for auto-annotation task."""

import io
import sys
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from PIL import Image


@pytest.fixture
def mock_sam3_module():
    """Fixture to mock the SAM3 segmentation module for tests.

    This is needed because SAM3 requires GPU and torch, which are not
    available in the test environment.
    """
    # Create mock module
    mock_module = MagicMock()

    # Store original module if it exists
    original = sys.modules.get("app.ml.sam3.segmentation")

    # Replace with mock
    sys.modules["app.ml.sam3.segmentation"] = mock_module

    yield mock_module

    # Restore original
    if original is not None:
        sys.modules["app.ml.sam3.segmentation"] = original
    else:
        sys.modules.pop("app.ml.sam3.segmentation", None)


class TestConvertBboxToNormalized:
    """Tests for coordinate conversion function."""

    def test_convert_bbox_basic(self) -> None:
        """Test basic coordinate conversion."""
        from app.tasks.auto_annotation import convert_bbox_to_normalized

        # Box in a 100x100 image at position (10, 20) with size (30, 40)
        bbox_x, bbox_y, bbox_width, bbox_height = convert_bbox_to_normalized(
            x1=10, y1=20, x2=40, y2=60, image_width=100, image_height=100
        )

        assert bbox_x == pytest.approx(0.1)
        assert bbox_y == pytest.approx(0.2)
        assert bbox_width == pytest.approx(0.3)
        assert bbox_height == pytest.approx(0.4)

    def test_convert_bbox_full_image(self) -> None:
        """Test conversion for box covering entire image."""
        from app.tasks.auto_annotation import convert_bbox_to_normalized

        bbox_x, bbox_y, bbox_width, bbox_height = convert_bbox_to_normalized(
            x1=0, y1=0, x2=640, y2=480, image_width=640, image_height=480
        )

        assert bbox_x == pytest.approx(0.0)
        assert bbox_y == pytest.approx(0.0)
        assert bbox_width == pytest.approx(1.0)
        assert bbox_height == pytest.approx(1.0)

    def test_convert_bbox_clamps_negative(self) -> None:
        """Test that negative values are clamped to 0."""
        from app.tasks.auto_annotation import convert_bbox_to_normalized

        bbox_x, bbox_y, _bbox_width, _bbox_height = convert_bbox_to_normalized(
            x1=-10, y1=-20, x2=50, y2=50, image_width=100, image_height=100
        )

        # x and y should be clamped to 0
        assert bbox_x == pytest.approx(0.0)
        assert bbox_y == pytest.approx(0.0)

    def test_convert_bbox_clamps_overflow(self) -> None:
        """Test that overflow values are clamped to valid range."""
        from app.tasks.auto_annotation import convert_bbox_to_normalized

        bbox_x, bbox_y, bbox_width, bbox_height = convert_bbox_to_normalized(
            x1=80, y1=80, x2=150, y2=150, image_width=100, image_height=100
        )

        # Width and height should be clamped so bbox stays within 0-1
        assert bbox_x == pytest.approx(0.8)
        assert bbox_y == pytest.approx(0.8)
        assert bbox_width <= 0.2 + 0.001  # Should not exceed remaining space
        assert bbox_height <= 0.2 + 0.001


class TestDownloadAndOpenImage:
    """Tests for download_and_open_image helper function."""

    @patch("app.tasks.auto_annotation.download_object_bytes")
    def test_download_and_open_image(self, mock_download: MagicMock) -> None:
        """Test downloading and opening image from S3."""
        from app.tasks.auto_annotation import download_and_open_image

        # Create a test image in memory
        test_image = Image.new("RGB", (256, 256), color="blue")
        img_bytes = io.BytesIO()
        test_image.save(img_bytes, format="JPEG")
        mock_download.return_value = img_bytes.getvalue()

        result = download_and_open_image("test/frame.jpg")

        assert isinstance(result, Image.Image)
        assert result.mode == "RGB"
        assert result.size == (256, 256)
        mock_download.assert_called_once_with("test/frame.jpg")


class TestGetFramesByIds:
    """Tests for get_frames_by_ids helper function."""

    def test_get_frames_by_ids_success(self) -> None:
        """Test fetching frames by IDs."""
        from app.tasks.auto_annotation import get_frames_by_ids

        frame_ids = [uuid4(), uuid4()]
        mock_frames = [
            {"id": str(frame_ids[0]), "s3_key": "test/frame_0.jpg"},
            {"id": str(frame_ids[1]), "s3_key": "test/frame_1.jpg"},
        ]

        mock_client = MagicMock()
        mock_client.table.return_value.select.return_value.in_.return_value.execute.return_value.data = mock_frames

        result = get_frames_by_ids(mock_client, frame_ids)

        assert len(result) == 2
        assert result[0]["id"] == str(frame_ids[0])
        mock_client.table.assert_called_once_with("frames")

    def test_get_frames_by_ids_empty(self) -> None:
        """Test fetching with empty ID list."""
        from app.tasks.auto_annotation import get_frames_by_ids

        mock_client = MagicMock()

        result = get_frames_by_ids(mock_client, [])

        assert result == []
        mock_client.table.assert_not_called()


class TestProcessFrameForAnnotation:
    """Tests for process_frame_for_annotation helper function."""

    @patch("app.tasks.auto_annotation.download_and_open_image")
    def test_process_frame_creates_annotations(
        self,
        mock_download: MagicMock,
        mock_sam3_module: MagicMock,
    ) -> None:
        """Test processing frame creates annotations."""
        from app.tasks.auto_annotation import process_frame_for_annotation

        frame_id = uuid4()
        label_id = uuid4()
        created_by = uuid4()

        # Mock image
        mock_image = MagicMock(spec=Image.Image)
        mock_image.size = (640, 480)
        mock_download.return_value = mock_image

        # Mock SAM3 result
        mock_box = MagicMock()
        mock_box.x1 = 100.0
        mock_box.y1 = 100.0
        mock_box.x2 = 200.0
        mock_box.y2 = 200.0
        mock_box.score = 0.95

        mock_result = MagicMock()
        mock_result.boxes = [mock_box]

        mock_sam3_module.segment_from_text.return_value = mock_result

        frame = {
            "id": str(frame_id),
            "s3_key": "test/frame.jpg",
        }

        annotations, skipped = process_frame_for_annotation(
            frame=frame,
            label_id=label_id,
            label_name="test object",
            created_by=created_by,
            confidence_threshold=0.5,
            iou_threshold=0.5,
            existing_bboxes=[],
        )

        assert len(annotations) == 1
        assert skipped == 0
        assert annotations[0].frame_id == frame_id
        assert annotations[0].label_id == label_id
        assert annotations[0].confidence == 0.95
        assert annotations[0].source.value == "auto"
        assert annotations[0].reviewed is False

    @patch("app.tasks.auto_annotation.download_and_open_image")
    def test_process_frame_filters_low_confidence(
        self,
        mock_download: MagicMock,
        mock_sam3_module: MagicMock,
    ) -> None:
        """Test that low confidence detections are filtered."""
        from app.tasks.auto_annotation import process_frame_for_annotation

        mock_image = MagicMock(spec=Image.Image)
        mock_image.size = (640, 480)
        mock_download.return_value = mock_image

        # Create boxes with different scores
        mock_box_high = MagicMock()
        mock_box_high.x1 = mock_box_high.y1 = 100.0
        mock_box_high.x2 = mock_box_high.y2 = 200.0
        mock_box_high.score = 0.8

        mock_box_low = MagicMock()
        mock_box_low.x1 = mock_box_low.y1 = 300.0
        mock_box_low.x2 = mock_box_low.y2 = 400.0
        mock_box_low.score = 0.3  # Below threshold

        mock_result = MagicMock()
        mock_result.boxes = [mock_box_high, mock_box_low]

        mock_sam3_module.segment_from_text.return_value = mock_result

        frame = {"id": str(uuid4()), "s3_key": "test/frame.jpg"}

        annotations, skipped = process_frame_for_annotation(
            frame=frame,
            label_id=uuid4(),
            label_name="test",
            created_by=uuid4(),
            confidence_threshold=0.5,
            iou_threshold=0.5,
            existing_bboxes=[],
        )

        # Only high confidence detection should be included
        assert len(annotations) == 1
        assert skipped == 0
        assert annotations[0].confidence == 0.8


class TestAutoAnnotateFramesTask:
    """Tests for auto_annotate_frames Celery task."""

    @patch("app.tasks.auto_annotation.bulk_create_annotations")
    @patch("app.tasks.auto_annotation.process_frame_for_annotation")
    @patch("app.tasks.auto_annotation.get_existing_annotations_for_frames")
    @patch("app.tasks.auto_annotation.get_frames_by_ids")
    @patch("app.tasks.auto_annotation.get_supabase_client")
    def test_auto_annotate_success(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
        mock_get_existing: MagicMock,
        mock_process_frame: MagicMock,
        mock_bulk_create: MagicMock,
    ) -> None:
        """Test successful auto-annotation."""
        from app.models.annotation import AnnotationCreate, AnnotationSource
        from app.tasks.auto_annotation import auto_annotate_frames

        frame_id = uuid4()
        label_id = uuid4()
        created_by = uuid4()

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_get_frames.return_value = [
            {"id": str(frame_id), "s3_key": "test/frame.jpg"}
        ]

        # Mock existing annotations (empty for this test)
        mock_get_existing.return_value = {frame_id: []}

        # Mock annotation creation
        mock_annotation = AnnotationCreate(
            frame_id=frame_id,
            label_id=label_id,
            created_by=created_by,
            bbox_x=0.1,
            bbox_y=0.1,
            bbox_width=0.2,
            bbox_height=0.2,
            confidence=0.9,
            source=AnnotationSource.AUTO,
            reviewed=False,
        )
        mock_process_frame.return_value = ([mock_annotation], 0)

        result = auto_annotate_frames.run(
            frame_ids=[str(frame_id)],
            label_id=str(label_id),
            label_name="test object",
            created_by=str(created_by),
            confidence_threshold=0.5,
            iou_threshold=0.5,
        )

        assert result["status"] == "success"
        assert result["frame_count"] == 1
        assert result["annotation_count"] == 1
        assert result["skipped_count"] == 0
        assert result["failed_count"] == 0
        mock_bulk_create.assert_called_once()

    @patch("app.tasks.auto_annotation.get_frames_by_ids")
    @patch("app.tasks.auto_annotation.get_supabase_client")
    def test_auto_annotate_no_frames(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
    ) -> None:
        """Test auto-annotation when no frames found."""
        from app.tasks.auto_annotation import auto_annotate_frames

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_get_frames.return_value = []

        result = auto_annotate_frames.run(
            frame_ids=[str(uuid4())],
            label_id=str(uuid4()),
            label_name="test",
            created_by=str(uuid4()),
        )

        assert result["status"] == "no_frames"
        assert result["frame_count"] == 0
        assert result["annotation_count"] == 0

    @patch("app.tasks.auto_annotation.bulk_create_annotations")
    @patch("app.tasks.auto_annotation.process_frame_for_annotation")
    @patch("app.tasks.auto_annotation.get_existing_annotations_for_frames")
    @patch("app.tasks.auto_annotation.get_frames_by_ids")
    @patch("app.tasks.auto_annotation.get_supabase_client")
    def test_auto_annotate_partial_failure(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
        mock_get_existing: MagicMock,
        mock_process_frame: MagicMock,
        mock_bulk_create: MagicMock,
    ) -> None:
        """Test auto-annotation with some frame processing failures."""
        from app.models.annotation import AnnotationCreate, AnnotationSource
        from app.tasks.auto_annotation import auto_annotate_frames

        frame_ids = [uuid4(), uuid4()]
        label_id = uuid4()
        created_by = uuid4()

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_get_frames.return_value = [
            {"id": str(frame_ids[0]), "s3_key": "test/frame_0.jpg"},
            {"id": str(frame_ids[1]), "s3_key": "test/frame_1.jpg"},
        ]

        # Mock existing annotations (empty for this test)
        mock_get_existing.return_value = {fid: [] for fid in frame_ids}

        # First frame succeeds, second fails
        mock_annotation = AnnotationCreate(
            frame_id=frame_ids[0],
            label_id=label_id,
            created_by=created_by,
            bbox_x=0.1,
            bbox_y=0.1,
            bbox_width=0.2,
            bbox_height=0.2,
            confidence=0.9,
            source=AnnotationSource.AUTO,
            reviewed=False,
        )
        mock_process_frame.side_effect = [([mock_annotation], 0), Exception("Failed")]

        result = auto_annotate_frames.run(
            frame_ids=[str(fid) for fid in frame_ids],
            label_id=str(label_id),
            label_name="test",
            created_by=str(created_by),
            iou_threshold=0.5,
        )

        assert result["status"] == "success"
        assert result["frame_count"] == 1
        assert result["failed_count"] == 1
        assert result["annotation_count"] == 1
        assert result["skipped_count"] == 0

    @patch("app.tasks.auto_annotation.bulk_create_annotations")
    @patch("app.tasks.auto_annotation.process_frame_for_annotation")
    @patch("app.tasks.auto_annotation.get_existing_annotations_for_frames")
    @patch("app.tasks.auto_annotation.get_frames_by_ids")
    @patch("app.tasks.auto_annotation.get_supabase_client")
    def test_auto_annotate_no_annotations_created(
        self,
        mock_get_client: MagicMock,
        mock_get_frames: MagicMock,
        mock_get_existing: MagicMock,
        mock_process_frame: MagicMock,
        mock_bulk_create: MagicMock,
    ) -> None:
        """Test when no annotations are created (all below threshold)."""
        from app.tasks.auto_annotation import auto_annotate_frames

        frame_id = uuid4()

        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_get_frames.return_value = [
            {"id": str(frame_id), "s3_key": "test/frame.jpg"}
        ]

        # Mock existing annotations (empty for this test)
        mock_get_existing.return_value = {frame_id: []}

        # No annotations created (all detections below threshold)
        mock_process_frame.return_value = ([], 0)

        result = auto_annotate_frames.run(
            frame_ids=[str(frame_id)],
            label_id=str(uuid4()),
            label_name="test",
            created_by=str(uuid4()),
            iou_threshold=0.5,
        )

        assert result["status"] == "success"
        assert result["frame_count"] == 1
        assert result["annotation_count"] == 0
        assert result["skipped_count"] == 0
        # bulk_create should not be called when no annotations
        mock_bulk_create.assert_not_called()
