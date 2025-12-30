"""YOLO format export service."""

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


class YOLOExportError(Exception):
    """Raised when YOLO export fails."""

    pass


class YOLOExporter:
    """Exports project data to YOLO format."""

    def __init__(self, client: Client) -> None:
        """
        Initialize the YOLO exporter.

        Args:
            client: Supabase client instance.
        """
        self.client = client

    def export_project(self, project_id: UUID) -> dict[str, Any]:
        """
        Export a project to YOLO format.

        Args:
            project_id: UUID of the project to export.

        Returns:
            Dictionary with 'data_yaml' and 'annotations' keys.
            - data_yaml: YAML string with class names
            - annotations: Dict mapping filename.txt to annotation content
        """
        # Fetch all data
        videos = self._get_all_videos(project_id)
        labels = self._get_all_labels(project_id)

        # Build label_id to class_id mapping (0-indexed for YOLO)
        label_id_to_class_id: dict[UUID, int] = {}
        for i, label in enumerate(labels):
            label_id_to_class_id[label.id] = i

        # Build data.yaml content
        data_yaml = self._build_data_yaml(labels)

        # Build annotations for each frame
        annotations: dict[str, str] = {}

        for video in videos:
            frames = self._get_all_frames(video.id)
            for frame in frames:
                # Get annotations for this frame
                frame_annotations = self._get_all_annotations(frame.id)

                # Build annotation content
                content = self._build_annotation_content(
                    frame_annotations,
                    label_id_to_class_id,
                )

                # Generate filename (use frame's s3_key basename with .txt extension)
                base_name = self._get_base_name(frame.s3_key)
                txt_filename = base_name.rsplit(".", 1)[0] + ".txt"

                annotations[txt_filename] = content

        return {
            "data_yaml": data_yaml,
            "annotations": annotations,
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

    def _build_data_yaml(self, labels: list[Label]) -> str:
        """Build data.yaml content."""
        lines = ["names:"]
        for i, label in enumerate(labels):
            lines.append(f"  {i}: {label.name}")
        lines.append(f"nc: {len(labels)}")
        return "\n".join(lines) + "\n"

    def _get_base_name(self, s3_key: str) -> str:
        """Extract base filename from s3_key."""
        return s3_key.split("/")[-1] if "/" in s3_key else s3_key

    def _build_annotation_content(
        self,
        annotations: list[Annotation],
        label_id_to_class_id: dict[UUID, int],
    ) -> str:
        """
        Build YOLO annotation content for a single image.

        YOLO format: class_id center_x center_y width height
        All values are normalized (0-1).

        Args:
            annotations: List of annotations for the frame.
            label_id_to_class_id: Mapping from label UUID to class index.

        Returns:
            String content for the .txt file.
        """
        lines: list[str] = []

        for annotation in annotations:
            class_id = label_id_to_class_id.get(annotation.label_id)
            if class_id is None:
                # Skip if label not found
                continue

            # Convert from top-left (x, y, w, h) to center (cx, cy, w, h)
            # DB stores normalized coordinates (0-1)
            center_x = annotation.bbox_x + annotation.bbox_width / 2
            center_y = annotation.bbox_y + annotation.bbox_height / 2
            width = annotation.bbox_width
            height = annotation.bbox_height

            # Format with 6 decimal places
            line = f"{class_id} {center_x:.6f} {center_y:.6f} {width:.6f} {height:.6f}"
            lines.append(line)

        return "\n".join(lines) + "\n" if lines else ""
