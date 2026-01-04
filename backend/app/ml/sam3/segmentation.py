"""SAM 3 segmentation functions.

This module provides functions to generate bounding boxes and masks
from images using text prompts with the SAM 3 model.
"""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from PIL import Image

from app.ml.sam3.model import get_sam3_processor


@dataclass
class BoundingBox:
    """Bounding box with coordinates and confidence score.

    Attributes:
        x1: Left x coordinate.
        y1: Top y coordinate.
        x2: Right x coordinate.
        y2: Bottom y coordinate.
        score: Confidence score (0.0 to 1.0).
    """

    x1: float
    y1: float
    x2: float
    y2: float
    score: float


@dataclass
class SegmentationResult:
    """Result of text-prompted segmentation.

    Attributes:
        boxes: List of detected bounding boxes with scores.
        masks: Optional list of segmentation masks (H, W) as uint8 (0-255).
               Only included if include_masks=True was specified.
    """

    boxes: list[BoundingBox]
    masks: list[NDArray[np.uint8]] | None


def segment_from_text(
    image: Image.Image,
    prompt: str,
    include_masks: bool = False,
) -> SegmentationResult:
    """Segment objects from an image using a text prompt.

    Uses SAM 3's text-prompted segmentation capability to detect and
    segment objects matching the given text description.

    Args:
        image: PIL Image to segment.
        prompt: Text description of objects to find (e.g., "red box", "person").
        include_masks: Whether to include segmentation masks in the result.
                      Setting this to True increases memory usage.

    Returns:
        SegmentationResult containing detected bounding boxes and optionally masks.

    Example:
        >>> from PIL import Image
        >>> image = Image.open("factory.jpg")
        >>> result = segment_from_text(image, "cpu")
        >>> for box in result.boxes:
        ...     print(f"Found at ({box.x1}, {box.y1}) - ({box.x2}, {box.y2})")
        ...     print(f"Confidence: {box.score:.2f}")
    """
    processor = get_sam3_processor()

    # Set image (feature extraction)
    inference_state = processor.set_image(image)

    # Run text-prompted segmentation
    output = processor.set_text_prompt(
        state=inference_state,
        prompt=prompt,
    )

    # Extract results
    raw_boxes = output["boxes"]
    raw_scores = output["scores"]
    raw_masks = output["masks"]

    # Convert to Python types
    # Handle both tensor and numpy array cases
    if hasattr(raw_boxes, "cpu"):
        boxes_np = raw_boxes.cpu().numpy()
    else:
        boxes_np = np.array(raw_boxes)

    if hasattr(raw_scores, "cpu"):
        scores_np = raw_scores.cpu().numpy()
    else:
        scores_np = np.array(raw_scores)

    # Build bounding box list
    boxes: list[BoundingBox] = []
    for i in range(len(scores_np)):
        box = boxes_np[i]
        boxes.append(
            BoundingBox(
                x1=float(box[0]),
                y1=float(box[1]),
                x2=float(box[2]),
                y2=float(box[3]),
                score=float(scores_np[i]),
            )
        )

    # Extract masks if requested
    masks: list[NDArray[np.uint8]] | None = None
    if include_masks and raw_masks is not None and len(raw_masks) > 0:
        masks = []
        for mask in raw_masks:
            mask_np = mask.cpu().numpy() if hasattr(mask, "cpu") else np.array(mask)

            # Squeeze extra dimensions (batch, channel)
            mask_np = np.squeeze(mask_np)

            # Convert to uint8 (0-255)
            mask_uint8: NDArray[np.uint8] = (mask_np * 255).astype(np.uint8)
            masks.append(mask_uint8)

    return SegmentationResult(boxes=boxes, masks=masks)


def get_best_detection(
    result: SegmentationResult,
) -> tuple[BoundingBox, NDArray[np.uint8] | None] | None:
    """Get the detection with the highest confidence score.

    Args:
        result: Segmentation result to extract from.

    Returns:
        Tuple of (best_box, best_mask) or None if no detections found.
        best_mask is None if masks were not included in the result.
    """
    if not result.boxes:
        return None

    best_idx = max(range(len(result.boxes)), key=lambda i: result.boxes[i].score)
    best_box = result.boxes[best_idx]
    best_mask = result.masks[best_idx] if result.masks else None

    return (best_box, best_mask)
