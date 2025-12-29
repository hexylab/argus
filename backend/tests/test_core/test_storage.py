"""Tests for storage module."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from botocore.exceptions import ClientError

from app.core.storage import (
    check_object_exists,
    delete_object,
    generate_presigned_download_url,
    generate_presigned_upload_url,
    generate_s3_key,
)


class TestGenerateS3Key:
    """Tests for generate_s3_key."""

    def test_generates_correct_key(self) -> None:
        """Test that S3 key is generated in the correct format."""
        project_id = uuid4()
        video_id = uuid4()
        filename = "test_video.mp4"

        key = generate_s3_key(project_id, video_id, filename)

        assert key == f"projects/{project_id}/videos/{video_id}/test_video.mp4"

    def test_handles_special_characters_in_filename(self) -> None:
        """Test that filenames with special characters are handled."""
        project_id = uuid4()
        video_id = uuid4()
        filename = "my video (1).mp4"

        key = generate_s3_key(project_id, video_id, filename)

        assert key == f"projects/{project_id}/videos/{video_id}/my video (1).mp4"


class TestGeneratePresignedUploadUrl:
    """Tests for generate_presigned_upload_url."""

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_generates_url_with_content_type(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test generating URL with content type."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://example.com/presigned"
        mock_client.return_value = mock_s3

        url = generate_presigned_upload_url(
            s3_key="test/key.mp4",
            content_type="video/mp4",
            expires_in=3600,
        )

        assert url == "https://example.com/presigned"
        mock_s3.generate_presigned_url.assert_called_once_with(
            "put_object",
            Params={
                "Bucket": "test-bucket",
                "Key": "test/key.mp4",
                "ContentType": "video/mp4",
            },
            ExpiresIn=3600,
        )

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_generates_url_without_content_type(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test generating URL without content type."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://example.com/presigned"
        mock_client.return_value = mock_s3

        url = generate_presigned_upload_url(s3_key="test/key.mp4")

        assert url == "https://example.com/presigned"
        mock_s3.generate_presigned_url.assert_called_once_with(
            "put_object",
            Params={
                "Bucket": "test-bucket",
                "Key": "test/key.mp4",
            },
            ExpiresIn=3600,
        )


class TestGeneratePresignedDownloadUrl:
    """Tests for generate_presigned_download_url."""

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_generates_download_url(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test generating download URL."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_s3.generate_presigned_url.return_value = "https://example.com/download"
        mock_client.return_value = mock_s3

        url = generate_presigned_download_url(s3_key="test/key.mp4", expires_in=7200)

        assert url == "https://example.com/download"
        mock_s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={
                "Bucket": "test-bucket",
                "Key": "test/key.mp4",
            },
            ExpiresIn=7200,
        )


class TestDeleteObject:
    """Tests for delete_object."""

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_deletes_object(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test deleting an object."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_client.return_value = mock_s3

        delete_object(s3_key="test/key.mp4")

        mock_s3.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="test/key.mp4",
        )


class TestCheckObjectExists:
    """Tests for check_object_exists."""

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_returns_true_when_exists(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test that True is returned when object exists."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_s3.head_object.return_value = {"ContentLength": 1000}
        mock_client.return_value = mock_s3

        result = check_object_exists(s3_key="test/key.mp4")

        assert result is True

    @patch("app.core.storage.get_storage_client")
    @patch("app.core.storage.get_settings")
    def test_returns_false_when_not_exists(
        self, mock_settings: MagicMock, mock_client: MagicMock
    ) -> None:
        """Test that False is returned when object doesn't exist."""
        mock_settings.return_value.minio_bucket = "test-bucket"
        mock_s3 = MagicMock()
        mock_s3.head_object.side_effect = ClientError(
            error_response={"Error": {"Code": "404", "Message": "Not Found"}},
            operation_name="HeadObject",
        )
        mock_client.return_value = mock_s3

        result = check_object_exists(s3_key="test/key.mp4")

        assert result is False
