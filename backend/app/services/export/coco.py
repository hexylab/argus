"""COCO format export service."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from supabase import Client

from app.crud.annotation import get_annotations
from app.crud.frame import get_frames
from app.crud.label import get_labels
from app.crud.video import get_videos
from app.models.annotation import Annotation
from app.models.frame import Frame
from app.models.label import Label
from app.models.video import Video


class COCOExportError(Exception):
    """Raised when COCO export fails."""

    pass


class COCOExporter:
    """Exports project data to COCO format."""

    def __init__(self, client: Client) -> None:
        """
        Initialize the COCO exporter.

        Args:
            client: Supabase client instance.
        """
        self.client = client

    def export_project(self, project_id: UUID) -> dict[str, Any]:
        """
        Export a project to COCO format.

        Args:
            project_id: UUID of the project to export.

        Returns:
            COCO format dictionary.
        """
        # Fetch all data
        videos = self._get_all_videos(project_id)
        labels = self._get_all_labels(project_id)

        # Build ID mappings
        label_id_to_category_id: dict[UUID, int] = {}
        frame_id_to_image_id: dict[UUID, int] = {}
        frame_map: dict[UUID, Frame] = {}

        # Build categories
        categories = self._build_categories(labels, label_id_to_category_id)

        # Build images and collect annotations
        images: list[dict[str, Any]] = []
        all_annotations: list[Annotation] = []
        image_id_counter = 1

        for video in videos:
            frames = self._get_all_frames(video.id)
            for frame in frames:
                # Map frame_id to image_id and store frame
                frame_id_to_image_id[frame.id] = image_id_counter
                frame_map[frame.id] = frame

                # Add image
                image = self._build_image(frame, image_id_counter)
                images.append(image)
                image_id_counter += 1

                # Collect annotations for this frame
                annotations = self._get_all_annotations(frame.id)
                all_annotations.extend(annotations)

        # Build annotations
        coco_annotations = self._build_annotations(
            all_annotations,
            frame_id_to_image_id,
            label_id_to_category_id,
            frame_map,
        )

        # Build info
        info = self._build_info()

        return {
            "info": info,
            "licenses": [],
            "images": images,
            "annotations": coco_annotations,
            "categories": categories,
        }

    def _get_all_videos(self, project_id: UUID) -> list[Video]:
        """Get all videos for a project."""
        all_videos: list[Video] = []
        skip = 0
        limit = 1000

        while True:
            videos = get_videos(self.client, project_id, skip=skip, limit=limit)
            if not videos:
                break
            all_videos.extend(videos)
            if len(videos) < limit:
                break
            skip += limit

        return all_videos

    def _get_all_frames(self, video_id: UUID) -> list[Frame]:
        """Get all frames for a video."""
        all_frames: list[Frame] = []
        skip = 0
        limit = 1000

        while True:
            frames = get_frames(self.client, video_id, skip=skip, limit=limit)
            if not frames:
                break
            all_frames.extend(frames)
            if len(frames) < limit:
                break
            skip += limit

        return all_frames

    def _get_all_annotations(self, frame_id: UUID) -> list[Annotation]:
        """Get all annotations for a frame."""
        all_annotations: list[Annotation] = []
        skip = 0
        limit = 1000

        while True:
            annotations = get_annotations(self.client, frame_id, skip=skip, limit=limit)
            if not annotations:
                break
            all_annotations.extend(annotations)
            if len(annotations) < limit:
                break
            skip += limit

        return all_annotations

    def _get_all_labels(self, project_id: UUID) -> list[Label]:
        """Get all labels for a project."""
        all_labels: list[Label] = []
        skip = 0
        limit = 1000

        while True:
            labels = get_labels(self.client, project_id, skip=skip, limit=limit)
            if not labels:
                break
            all_labels.extend(labels)
            if len(labels) < limit:
                break
            skip += limit

        return all_labels

    def _build_info(self) -> dict[str, Any]:
        """Build COCO info section."""
        now = datetime.now(tz=UTC)
        return {
            "description": "Exported from Argus",
            "url": "",
            "version": "1.0",
            "year": now.year,
            "contributor": "Argus",
            "date_created": now.isoformat(),
        }

    def _build_categories(
        self,
        labels: list[Label],
        label_id_to_category_id: dict[UUID, int],
    ) -> list[dict[str, Any]]:
        """Build COCO categories from labels."""
        categories: list[dict[str, Any]] = []

        for i, label in enumerate(labels, start=1):
            label_id_to_category_id[label.id] = i
            categories.append(
                {
                    "id": i,
                    "name": label.name,
                    "supercategory": "",
                }
            )

        return categories

    def _build_image(self, frame: Frame, image_id: int) -> dict[str, Any]:
        """Build COCO image entry from frame."""
        # Extract filename from s3_key
        file_name = frame.s3_key.split("/")[-1] if "/" in frame.s3_key else frame.s3_key

        return {
            "id": image_id,
            "file_name": file_name,
            "width": frame.width or 0,
            "height": frame.height or 0,
        }

    def _build_annotations(
        self,
        annotations: list[Annotation],
        frame_id_to_image_id: dict[UUID, int],
        label_id_to_category_id: dict[UUID, int],
        frame_map: dict[UUID, Frame],
    ) -> list[dict[str, Any]]:
        """Build COCO annotations."""
        coco_annotations: list[dict[str, Any]] = []

        for i, annotation in enumerate(annotations, start=1):
            image_id = frame_id_to_image_id.get(annotation.frame_id)
            category_id = label_id_to_category_id.get(annotation.label_id)

            if image_id is None or category_id is None:
                # Skip if mapping not found
                continue

            frame = frame_map.get(annotation.frame_id)
            if frame is None:
                continue

            # Convert normalized coordinates to absolute pixels
            img_width = frame.width or 1
            img_height = frame.height or 1

            x = annotation.bbox_x * img_width
            y = annotation.bbox_y * img_height
            width = annotation.bbox_width * img_width
            height = annotation.bbox_height * img_height
            area = width * height

            # Build segmentation
            segmentation: list[list[float]] = []
            if annotation.segmentation:
                # Convert normalized segmentation to absolute coordinates
                segmentation = [
                    [
                        coord * img_width if j % 2 == 0 else coord * img_height
                        for j, coord in enumerate(polygon)
                    ]
                    for polygon in annotation.segmentation
                ]

            coco_annotations.append(
                {
                    "id": i,
                    "image_id": image_id,
                    "category_id": category_id,
                    "bbox": [x, y, width, height],
                    "area": area,
                    "iscrowd": 0,
                    "segmentation": segmentation,
                }
            )

        return coco_annotations
