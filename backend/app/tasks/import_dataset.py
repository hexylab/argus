"""Import dataset task for processing uploaded ZIP files."""

import json
import logging
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any
from uuid import UUID

import yaml  # type: ignore[import-untyped]
from celery import Task
from PIL import Image
from supabase import Client

from app.celery import celery_app
from app.core.storage import (
    download_object,
    generate_frame_s3_key,
    generate_thumbnail_s3_key,
    upload_object,
)
from app.crud.frame import create_frames_bulk
from app.crud.import_job import (
    ImportJobNotFoundError,
    get_import_job,
    update_import_job,
)
from app.crud.label import create_label, get_labels
from app.crud.video import create_video
from app.models.frame import FrameCreate
from app.models.import_job import (
    ImportFormat,
    ImportJobUpdate,
    ImportPreviewLabel,
    ImportPreviewResponse,
    ImportStatus,
)
from app.models.label import LabelCreate
from app.models.video import VideoCreate, VideoSourceType, VideoStatus, VideoUpdate
from app.tasks.frame_extraction import (
    THUMBNAIL_SIZE,
    create_thumbnail,
    generate_service_role_jwt,
)

logger = logging.getLogger(__name__)

# Supported image formats
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def get_supabase_client() -> Client:
    """Get Supabase client for worker tasks."""
    from supabase import create_client

    from app.core.config import get_settings

    settings = get_settings()
    service_role_key = generate_service_role_jwt()
    return create_client(settings.supabase_url, service_role_key)


def is_image_file(path: Path) -> bool:
    """Check if a file is a supported image."""
    return path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS


def detect_format_from_zip(zip_path: Path) -> ImportFormat:
    """
    Detect the import format from a ZIP file structure.

    Args:
        zip_path: Path to the ZIP file.

    Returns:
        Detected import format.
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()

        # Check for COCO format (annotations.json)
        for name in names:
            if name.endswith("annotations.json") or name.endswith("instances.json"):
                return ImportFormat.COCO

        # Check for YOLO format (data.yaml or classes.txt with labels folder)
        has_yaml = any(
            name.endswith(".yaml") or name.endswith(".yml") for name in names
        )
        has_labels = any(
            "/labels/" in name or name.startswith("labels/") for name in names
        )
        if has_yaml and has_labels:
            return ImportFormat.YOLO

        # Default to images only
        return ImportFormat.IMAGES_ONLY


def parse_coco_annotations(
    zip_path: Path, extract_dir: Path
) -> tuple[list[dict[str, Any]], dict[int, str], list[Path]]:
    """
    Parse COCO format annotations from a ZIP file.

    Args:
        zip_path: Path to the ZIP file.
        extract_dir: Directory to extract files to.

    Returns:
        Tuple of (annotations, category_map, image_paths).
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    # Find annotations file
    annotations_file = None
    for path in extract_dir.rglob("*.json"):
        if path.name in [
            "annotations.json",
            "instances.json",
            "_annotations.coco.json",
        ]:
            annotations_file = path
            break

    if not annotations_file:
        # Try to find any JSON file that looks like COCO format
        for path in extract_dir.rglob("*.json"):
            try:
                with open(path) as f:
                    data = json.load(f)
                    if "images" in data and "annotations" in data:
                        annotations_file = path
                        break
            except (json.JSONDecodeError, KeyError):
                continue

    if not annotations_file:
        raise ValueError("No COCO annotations file found in ZIP")

    with open(annotations_file) as f:
        coco_data = json.load(f)

    # Build category map
    category_map = {cat["id"]: cat["name"] for cat in coco_data.get("categories", [])}

    # Build image ID to filename map
    image_map = {img["id"]: img["file_name"] for img in coco_data.get("images", [])}

    # Find image directory
    images_dir = None
    for candidate in ["images", "train", "val", "test"]:
        candidate_dir = extract_dir / candidate
        if candidate_dir.exists() and candidate_dir.is_dir():
            images_dir = candidate_dir
            break

    if not images_dir:
        # Images might be in the root or alongside annotations
        images_dir = annotations_file.parent

    # Collect image paths
    image_paths = []
    for img_data in coco_data.get("images", []):
        filename = img_data["file_name"]
        # Try to find the image file
        for search_dir in [images_dir, extract_dir]:
            img_path = search_dir / filename
            if img_path.exists():
                image_paths.append(img_path)
                break
            # Try without subdirectory prefix
            img_path = search_dir / Path(filename).name
            if img_path.exists():
                image_paths.append(img_path)
                break

    # Process annotations
    annotations = []
    for ann in coco_data.get("annotations", []):
        image_id = ann.get("image_id")
        category_id = ann.get("category_id")
        bbox = ann.get("bbox")  # [x, y, width, height]

        if not all([image_id, category_id, bbox]):
            continue

        # Get image dimensions for normalization
        img_data = next(
            (img for img in coco_data["images"] if img["id"] == image_id), None
        )
        if not img_data:
            continue

        img_width = img_data.get("width", 1)
        img_height = img_data.get("height", 1)

        # Normalize bbox to 0-1 range
        x, y, w, h = bbox
        annotations.append(
            {
                "image_filename": image_map.get(image_id, ""),
                "category_name": category_map.get(category_id, "unknown"),
                "bbox_x": x / img_width,
                "bbox_y": y / img_height,
                "bbox_width": w / img_width,
                "bbox_height": h / img_height,
                "segmentation": ann.get("segmentation"),
            }
        )

    return annotations, category_map, image_paths


def parse_yolo_annotations(
    zip_path: Path, extract_dir: Path
) -> tuple[list[dict[str, Any]], dict[int, str], list[Path]]:
    """
    Parse YOLO format annotations from a ZIP file.

    Args:
        zip_path: Path to the ZIP file.
        extract_dir: Directory to extract files to.

    Returns:
        Tuple of (annotations, category_map, image_paths).
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    # Find data.yaml for class names
    category_map: dict[int, str] = {}
    for yaml_file in extract_dir.rglob("*.yaml"):
        try:
            with open(yaml_file) as f:
                data = yaml.safe_load(f)
                if "names" in data:
                    names = data["names"]
                    if isinstance(names, list):
                        category_map = dict(enumerate(names))
                    elif isinstance(names, dict):
                        category_map = {int(k): v for k, v in names.items()}
                    break
        except (yaml.YAMLError, ValueError):
            continue

    # Try classes.txt as fallback
    if not category_map:
        for classes_file in extract_dir.rglob("classes.txt"):
            with open(classes_file) as f:
                for i, line in enumerate(f):
                    category_map[i] = line.strip()
            break

    # Find images and labels directories
    images_dirs = list(extract_dir.rglob("images"))
    labels_dirs = list(extract_dir.rglob("labels"))

    if not images_dirs:
        # Try root directory
        images_dirs = [extract_dir]

    # Collect image paths and their annotations
    image_paths: list[Path] = []
    annotations: list[dict[str, Any]] = []

    for images_dir in images_dirs:
        for img_path in images_dir.iterdir():
            if not is_image_file(img_path):
                continue

            image_paths.append(img_path)

            # Find corresponding label file
            label_file = None
            for labels_dir in labels_dirs:
                candidate = labels_dir / f"{img_path.stem}.txt"
                if candidate.exists():
                    label_file = candidate
                    break

            if not label_file:
                # Try same directory
                candidate = img_path.with_suffix(".txt")
                if candidate.exists():
                    label_file = candidate

            if label_file:
                with open(label_file) as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            class_id = int(parts[0])
                            # YOLO format: center_x, center_y, width, height (normalized)
                            cx, cy, w, h = map(float, parts[1:5])
                            # Convert to x, y, width, height format
                            annotations.append(
                                {
                                    "image_filename": img_path.name,
                                    "category_name": category_map.get(
                                        class_id, f"class_{class_id}"
                                    ),
                                    "bbox_x": cx - w / 2,
                                    "bbox_y": cy - h / 2,
                                    "bbox_width": w,
                                    "bbox_height": h,
                                }
                            )

    return annotations, category_map, image_paths


def parse_images_only(
    zip_path: Path, extract_dir: Path
) -> tuple[list[dict[str, Any]], dict[int, str], list[Path]]:
    """
    Extract images only from a ZIP file (no annotations).

    Args:
        zip_path: Path to the ZIP file.
        extract_dir: Directory to extract files to.

    Returns:
        Tuple of (empty annotations, empty category_map, image_paths).
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(extract_dir)

    image_paths = [
        p for p in extract_dir.rglob("*") if p.is_file() and is_image_file(p)
    ]

    return [], {}, image_paths


def preview_import_zip(s3_key: str, format_hint: ImportFormat) -> ImportPreviewResponse:
    """
    Preview the contents of an import ZIP file.

    Args:
        s3_key: S3 key of the ZIP file.
        format_hint: Hint for the expected format.

    Returns:
        Preview response with format, image count, and labels.
    """
    temp_dir = None
    try:
        temp_dir = Path(tempfile.mkdtemp(prefix="argus_preview_"))
        zip_path = temp_dir / "import.zip"

        # Download ZIP from S3
        download_object(s3_key, zip_path)

        # Detect actual format
        detected_format = detect_format_from_zip(zip_path)
        extract_dir = temp_dir / "extracted"
        extract_dir.mkdir()

        # Parse based on format
        if detected_format == ImportFormat.COCO:
            annotations, _category_map, image_paths = parse_coco_annotations(
                zip_path, extract_dir
            )
        elif detected_format == ImportFormat.YOLO:
            annotations, _category_map, image_paths = parse_yolo_annotations(
                zip_path, extract_dir
            )
        else:
            annotations, _category_map, image_paths = parse_images_only(
                zip_path, extract_dir
            )

        # Count annotations per label
        label_counts: dict[str, int] = {}
        for ann in annotations:
            label_name = ann["category_name"]
            label_counts[label_name] = label_counts.get(label_name, 0) + 1

        labels = [
            ImportPreviewLabel(name=name, count=count)
            for name, count in label_counts.items()
        ]

        return ImportPreviewResponse(
            format=detected_format,
            total_images=len(image_paths),
            labels=labels,
            sample_images=None,  # Could add presigned URLs for sample images
        )

    finally:
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)  # type: ignore[untyped-decorator]
def process_import(
    self: Task,
    import_job_id: str,
    project_id: str,
    user_id: str,
    name: str | None = None,
) -> dict[str, Any]:
    """
    Process an import job.

    This task:
    1. Downloads the ZIP from S3
    2. Parses the format (COCO/YOLO/images)
    3. Creates an image_set (video with source_type=IMAGE_SET)
    4. Processes and uploads each image
    5. Creates frame records
    6. Creates annotation records if present
    7. Updates import job status

    Args:
        self: Celery task instance.
        import_job_id: UUID of the import job.
        project_id: UUID of the project.
        user_id: UUID of the user who initiated the import.
        name: Optional name for the image set.

    Returns:
        Dictionary with import results.
    """
    import_job_uuid = UUID(import_job_id)
    project_uuid = UUID(project_id)
    user_uuid = UUID(user_id)
    temp_dir = None

    try:
        logger.info(f"Starting import processing for job {import_job_id}")

        client = get_supabase_client()

        # Get import job
        try:
            import_job = get_import_job(client, import_job_uuid, project_uuid)
        except ImportJobNotFoundError:
            logger.error(f"Import job {import_job_id} not found")
            raise

        # Create temporary directory
        temp_dir = Path(tempfile.mkdtemp(prefix="argus_import_"))
        zip_path = temp_dir / "import.zip"
        extract_dir = temp_dir / "extracted"
        extract_dir.mkdir()

        # Download ZIP from S3
        if not import_job.s3_key:
            raise ValueError("Import job has no S3 key")
        s3_key = import_job.s3_key
        logger.info(f"Downloading ZIP from S3: {s3_key}")
        download_object(s3_key, zip_path)

        # Parse based on format
        format_to_use = import_job.format
        if format_to_use == ImportFormat.IMAGES_ONLY:
            # Re-detect format in case it was wrongly specified
            format_to_use = detect_format_from_zip(zip_path)

        if format_to_use == ImportFormat.COCO:
            annotations, _category_map, image_paths = parse_coco_annotations(
                zip_path, extract_dir
            )
        elif format_to_use == ImportFormat.YOLO:
            annotations, _category_map, image_paths = parse_yolo_annotations(
                zip_path, extract_dir
            )
        else:
            annotations, _category_map, image_paths = parse_images_only(
                zip_path, extract_dir
            )

        total_images = len(image_paths)
        total_annotations = len(annotations)

        # Update progress
        update_import_job(
            client,
            import_job_uuid,
            project_uuid,
            ImportJobUpdate(
                total_images=total_images,
                total_annotations=total_annotations,
                progress=10.0,
            ),
        )

        # Create or get labels
        existing_labels = get_labels(client, project_uuid)
        label_name_to_id: dict[str, UUID] = {
            label.name: label.id for label in existing_labels
        }

        # Use provided label mapping or create new labels
        label_mapping = import_job.label_mapping or {}

        # Create missing labels
        unique_label_names = {ann["category_name"] for ann in annotations}
        for label_name in unique_label_names:
            if label_name not in label_name_to_id and label_name not in label_mapping:
                new_label = create_label(
                    client,
                    LabelCreate(
                        project_id=project_uuid,
                        name=label_name,
                    ),
                )
                label_name_to_id[label_name] = new_label.id

        # Apply provided label mapping
        for external_name, internal_id in label_mapping.items():
            label_name_to_id[external_name] = UUID(internal_id)

        # Create image set (video with source_type=IMAGE_SET)
        image_set_name = name or f"Import {import_job_id[:8]}"
        video_data = VideoCreate(
            project_id=project_uuid,
            filename=image_set_name,
            original_filename=image_set_name,
            s3_key=s3_key,  # Reference to original ZIP
            source_type=VideoSourceType.IMAGE_SET,
        )
        video = create_video(client, video_data)

        # Update import job with video ID
        update_import_job(
            client,
            import_job_uuid,
            project_uuid,
            ImportJobUpdate(video_id=video.id, progress=20.0),
        )

        # Process images
        thumbnails_dir = temp_dir / "thumbnails"
        thumbnails_dir.mkdir()

        frame_creates: list[FrameCreate] = []
        filename_to_frame_number: dict[str, int] = {}

        for i, img_path in enumerate(image_paths):
            frame_number = i
            filename_to_frame_number[img_path.name] = frame_number

            # Get image dimensions
            with Image.open(img_path) as img:
                width, height = img.size

            # Generate S3 keys
            frame_s3_key = generate_frame_s3_key(project_uuid, video.id, frame_number)
            thumbnail_s3_key = generate_thumbnail_s3_key(
                project_uuid, video.id, frame_number
            )

            # Create thumbnail
            thumbnail_path = thumbnails_dir / f"{frame_number:06d}.jpg"
            create_thumbnail(img_path, thumbnail_path, THUMBNAIL_SIZE)

            # Upload image and thumbnail to S3
            content_type = "image/jpeg"
            if img_path.suffix.lower() == ".png":
                content_type = "image/png"
            elif img_path.suffix.lower() == ".webp":
                content_type = "image/webp"

            upload_object(img_path, frame_s3_key, content_type)
            upload_object(thumbnail_path, thumbnail_s3_key, "image/jpeg")

            frame_creates.append(
                FrameCreate(
                    video_id=video.id,
                    frame_number=frame_number,
                    timestamp_ms=frame_number * 1000,  # 1 second intervals
                    s3_key=frame_s3_key,
                    thumbnail_s3_key=thumbnail_s3_key,
                    width=width,
                    height=height,
                )
            )

            # Update progress
            progress = 20.0 + (i / total_images) * 50.0
            if i % 10 == 0:
                update_import_job(
                    client,
                    import_job_uuid,
                    project_uuid,
                    ImportJobUpdate(processed_images=i + 1, progress=progress),
                )

        # Bulk create frames
        logger.info(f"Creating {len(frame_creates)} frames in database")
        created_frames = create_frames_bulk(client, frame_creates)

        # Build frame lookup
        frame_number_to_id: dict[int, UUID] = {
            f.frame_number: f.id for f in created_frames
        }

        # Update video frame count and status
        from app.crud.video import update_video

        update_video(
            client,
            video.id,
            project_uuid,
            VideoUpdate(
                status=VideoStatus.READY,
                frame_count=len(created_frames),
            ),
        )

        # Create annotations if present
        imported_annotations = 0
        if annotations:
            from app.crud.annotation import bulk_create_annotations
            from app.models.annotation import AnnotationCreate, AnnotationSource

            annotation_creates: list[AnnotationCreate] = []

            for ann in annotations:
                filename = ann["image_filename"]
                # Try to match filename
                frame_num = filename_to_frame_number.get(filename)
                if frame_num is None:
                    # Try matching by basename only
                    basename = Path(filename).name
                    frame_num = filename_to_frame_number.get(basename)

                if frame_num is None:
                    continue

                frame_id = frame_number_to_id.get(frame_num)
                if not frame_id:
                    continue

                label_id = label_name_to_id.get(ann["category_name"])
                if not label_id:
                    continue

                annotation_creates.append(
                    AnnotationCreate(
                        frame_id=frame_id,
                        label_id=label_id,
                        bbox_x=ann["bbox_x"],
                        bbox_y=ann["bbox_y"],
                        bbox_width=ann["bbox_width"],
                        bbox_height=ann["bbox_height"],
                        source=AnnotationSource.IMPORTED,
                        created_by=user_uuid,
                    )
                )

            if annotation_creates:
                logger.info(f"Creating {len(annotation_creates)} annotations")
                bulk_create_annotations(client, annotation_creates)
                imported_annotations = len(annotation_creates)

        # Update final status
        update_import_job(
            client,
            import_job_uuid,
            project_uuid,
            ImportJobUpdate(
                status=ImportStatus.COMPLETED,
                progress=100.0,
                processed_images=total_images,
                imported_annotations=imported_annotations,
            ),
        )

        logger.info(f"Import completed for job {import_job_id}")

        return {
            "import_job_id": import_job_id,
            "video_id": str(video.id),
            "frame_count": len(created_frames),
            "annotation_count": imported_annotations,
            "status": "success",
        }

    except Exception as e:
        logger.exception(f"Import failed for job {import_job_id}: {e}")

        # Update status to failed
        try:
            client = get_supabase_client()
            update_import_job(
                client,
                import_job_uuid,
                project_uuid,
                ImportJobUpdate(
                    status=ImportStatus.FAILED,
                    error_message=str(e)[:500],
                ),
            )
        except Exception as update_error:
            logger.error(f"Failed to update import job status: {update_error}")

        raise self.retry(exc=e) from e

    finally:
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
