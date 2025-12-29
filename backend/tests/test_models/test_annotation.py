"""Tests for Annotation models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.annotation import (
    Annotation,
    AnnotationCreate,
    AnnotationSource,
    AnnotationUpdate,
    BoundingBox,
)


class TestAnnotationSource:
    """Tests for AnnotationSource enum."""

    def test_values(self) -> None:
        """Test enum values."""
        assert AnnotationSource.MANUAL.value == "manual"
        assert AnnotationSource.AUTO.value == "auto"
        assert AnnotationSource.IMPORTED.value == "imported"


class TestBoundingBox:
    """Tests for BoundingBox model."""

    def test_valid_bbox(self) -> None:
        """Test valid bounding box."""
        bbox = BoundingBox(x=0.1, y=0.2, width=0.5, height=0.3)
        assert bbox.x == 0.1
        assert bbox.width == 0.5

    def test_out_of_range_x(self) -> None:
        """Test x coordinate must be 0-1."""
        with pytest.raises(ValidationError):
            BoundingBox(x=1.5, y=0.2, width=0.5, height=0.3)

    def test_out_of_range_negative(self) -> None:
        """Test coordinates must not be negative."""
        with pytest.raises(ValidationError):
            BoundingBox(x=-0.1, y=0.2, width=0.5, height=0.3)

    def test_zero_width(self) -> None:
        """Test width must be positive."""
        with pytest.raises(ValidationError):
            BoundingBox(x=0.1, y=0.2, width=0, height=0.3)

    def test_zero_height(self) -> None:
        """Test height must be positive."""
        with pytest.raises(ValidationError):
            BoundingBox(x=0.1, y=0.2, width=0.5, height=0)


class TestAnnotation:
    """Tests for Annotation model."""

    def test_full_annotation(self) -> None:
        """Test Annotation with all fields."""
        now = datetime.now(tz=UTC)
        user_id = uuid4()
        annotation = Annotation(
            id=uuid4(),
            frame_id=uuid4(),
            label_id=uuid4(),
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.3,
            bbox_height=0.4,
            segmentation=[[0.1, 0.2, 0.3, 0.4, 0.5, 0.6]],
            confidence=0.95,
            source=AnnotationSource.AUTO,
            reviewed=True,
            reviewed_by=user_id,
            reviewed_at=now,
            created_by=user_id,
            created_at=now,
            updated_at=now,
        )
        assert annotation.confidence == 0.95
        assert annotation.source == AnnotationSource.AUTO

    def test_minimal_annotation(self) -> None:
        """Test Annotation with minimal fields."""
        now = datetime.now(tz=UTC)
        annotation = Annotation(
            id=uuid4(),
            frame_id=uuid4(),
            label_id=uuid4(),
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.3,
            bbox_height=0.4,
            segmentation=None,
            confidence=None,
            source=AnnotationSource.MANUAL,
            reviewed=False,
            reviewed_by=None,
            reviewed_at=None,
            created_by=uuid4(),
            created_at=now,
            updated_at=now,
        )
        assert annotation.source == AnnotationSource.MANUAL
        assert annotation.reviewed is False

    def test_bbox_property(self) -> None:
        """Test bbox property returns BoundingBox."""
        now = datetime.now(tz=UTC)
        annotation = Annotation(
            id=uuid4(),
            frame_id=uuid4(),
            label_id=uuid4(),
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.3,
            bbox_height=0.4,
            segmentation=None,
            confidence=None,
            source=AnnotationSource.MANUAL,
            reviewed=False,
            reviewed_by=None,
            reviewed_at=None,
            created_by=uuid4(),
            created_at=now,
            updated_at=now,
        )
        bbox = annotation.bbox
        assert isinstance(bbox, BoundingBox)
        assert bbox.x == 0.1
        assert bbox.width == 0.3


class TestAnnotationCreate:
    """Tests for AnnotationCreate schema."""

    def test_minimal_create(self) -> None:
        """Test minimal create."""
        create = AnnotationCreate(
            frame_id=uuid4(),
            label_id=uuid4(),
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.3,
            bbox_height=0.4,
            segmentation=None,
            confidence=None,
            source=AnnotationSource.MANUAL,
            reviewed=False,
            created_by=uuid4(),
        )
        assert create.source == AnnotationSource.MANUAL

    def test_full_create(self) -> None:
        """Test full create."""
        create = AnnotationCreate(
            frame_id=uuid4(),
            label_id=uuid4(),
            bbox_x=0.1,
            bbox_y=0.2,
            bbox_width=0.3,
            bbox_height=0.4,
            segmentation=[[0.1, 0.2, 0.3, 0.4]],
            confidence=0.85,
            source=AnnotationSource.AUTO,
            created_by=uuid4(),
        )
        assert create.confidence == 0.85

    def test_confidence_range_too_high(self) -> None:
        """Test confidence must be <= 1."""
        with pytest.raises(ValidationError):
            AnnotationCreate(
                frame_id=uuid4(),
                label_id=uuid4(),
                bbox_x=0.1,
                bbox_y=0.2,
                bbox_width=0.3,
                bbox_height=0.4,
                segmentation=None,
                confidence=1.5,
                source=AnnotationSource.MANUAL,
                reviewed=False,
                created_by=uuid4(),
            )

    def test_confidence_range_negative(self) -> None:
        """Test confidence must be >= 0."""
        with pytest.raises(ValidationError):
            AnnotationCreate(
                frame_id=uuid4(),
                label_id=uuid4(),
                bbox_x=0.1,
                bbox_y=0.2,
                bbox_width=0.3,
                bbox_height=0.4,
                segmentation=None,
                confidence=-0.1,
                source=AnnotationSource.MANUAL,
                reviewed=False,
                created_by=uuid4(),
            )

    def test_bbox_out_of_range(self) -> None:
        """Test bbox coordinates must be 0-1."""
        with pytest.raises(ValidationError):
            AnnotationCreate(
                frame_id=uuid4(),
                label_id=uuid4(),
                bbox_x=1.5,
                bbox_y=0.2,
                bbox_width=0.3,
                bbox_height=0.4,
                segmentation=None,
                confidence=None,
                source=AnnotationSource.MANUAL,
                reviewed=False,
                created_by=uuid4(),
            )


class TestAnnotationUpdate:
    """Tests for AnnotationUpdate schema."""

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = AnnotationUpdate(
            bbox_x=None,
            bbox_y=None,
            bbox_width=None,
            bbox_height=None,
            label_id=None,
            segmentation=None,
            confidence=None,
            source=None,
            reviewed=True,
            reviewed_by=uuid4(),
            reviewed_at=None,
        )
        assert update.reviewed is True

    def test_update_label(self) -> None:
        """Test updating label."""
        new_label = uuid4()
        update = AnnotationUpdate(
            bbox_x=None,
            bbox_y=None,
            bbox_width=None,
            bbox_height=None,
            label_id=new_label,
            segmentation=None,
            confidence=None,
            source=None,
            reviewed=None,
            reviewed_by=None,
            reviewed_at=None,
        )
        assert update.label_id == new_label

    def test_update_bbox(self) -> None:
        """Test updating bounding box."""
        update = AnnotationUpdate(
            bbox_x=0.5,
            bbox_y=0.5,
            bbox_width=0.2,
            bbox_height=0.2,
            label_id=None,
            segmentation=None,
            confidence=None,
            source=None,
            reviewed=None,
            reviewed_by=None,
            reviewed_at=None,
        )
        assert update.bbox_x == 0.5

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = AnnotationUpdate(
            bbox_x=None,
            bbox_y=None,
            bbox_width=None,
            bbox_height=None,
            label_id=None,
            segmentation=None,
            confidence=None,
            source=None,
            reviewed=None,
            reviewed_by=None,
            reviewed_at=None,
        )
        assert update.bbox_x is None
        assert update.label_id is None
