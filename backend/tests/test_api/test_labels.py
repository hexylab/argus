"""Tests for label API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestLabelsAuth:
    """Tests for label endpoint authentication."""

    def test_create_label_no_auth(self, client: TestClient) -> None:
        """Test that creating a label without auth fails."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/labels",
            json={"name": "Test", "project_id": str(project_id)},
        )
        assert response.status_code in (401, 403)

    def test_list_labels_no_auth(self, client: TestClient) -> None:
        """Test that listing labels without auth fails."""
        project_id = uuid4()
        response = client.get(f"/api/v1/projects/{project_id}/labels")
        assert response.status_code in (401, 403)

    def test_get_label_no_auth(self, client: TestClient) -> None:
        """Test that getting a label without auth fails."""
        project_id = uuid4()
        label_id = uuid4()
        response = client.get(f"/api/v1/projects/{project_id}/labels/{label_id}")
        assert response.status_code in (401, 403)

    def test_update_label_no_auth(self, client: TestClient) -> None:
        """Test that updating a label without auth fails."""
        project_id = uuid4()
        label_id = uuid4()
        response = client.patch(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            json={"name": "Updated"},
        )
        assert response.status_code in (401, 403)

    def test_delete_label_no_auth(self, client: TestClient) -> None:
        """Test that deleting a label without auth fails."""
        project_id = uuid4()
        label_id = uuid4()
        response = client.delete(f"/api/v1/projects/{project_id}/labels/{label_id}")
        assert response.status_code in (401, 403)


class TestCreateLabel:
    """Tests for POST /api/v1/projects/{project_id}/labels."""

    @patch("app.api.v1.labels.get_supabase_client")
    def test_create_minimal(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a label with minimal data."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for label creation
        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Test Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            mock_label_result
        )
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/labels",
            json={"name": "Test Label", "project_id": str(project_id)},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Label"

    @patch("app.api.v1.labels.get_supabase_client")
    def test_create_project_not_found(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a label with nonexistent project."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.post(
            f"/api/v1/projects/{project_id}/labels",
            json={"name": "Test Label", "project_id": str(project_id)},
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_create_invalid_data(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a label with invalid data."""
        project_id = uuid4()
        response = client.post(
            f"/api/v1/projects/{project_id}/labels",
            json={"name": "", "project_id": str(project_id)},  # Empty name
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestListLabels:
    """Tests for GET /api/v1/projects/{project_id}/labels."""

    @patch("app.api.v1.labels.get_supabase_client")
    def test_list_empty(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing labels when none exist."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for labels list
        mock_labels_result = MagicMock()
        mock_labels_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_labels_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/labels",
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.v1.labels.get_supabase_client")
    def test_list_with_data(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing labels when some exist."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for labels list
        mock_labels_result = MagicMock()
        mock_labels_result.data = [
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Label 1",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            },
            {
                "id": str(uuid4()),
                "project_id": str(project_id),
                "name": "Label 2",
                "color": "#00FF00",
                "description": "Second label",
                "sort_order": 1,
                "created_at": now,
            },
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value.range.return_value.execute.return_value = mock_labels_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/labels",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Label 1"
        assert data[1]["name"] == "Label 2"


class TestGetLabel:
    """Tests for GET /api/v1/projects/{project_id}/labels/{label_id}."""

    @patch("app.api.v1.labels.get_supabase_client")
    def test_get_existing(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting an existing label."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check and label get
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Existing Label",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]

        # First call for project, second for label
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_result,
            mock_label_result,
        ]
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Existing Label"

    @patch("app.api.v1.labels.get_supabase_client")
    def test_get_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting a label that doesn't exist."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for label not found
        mock_label_result = MagicMock()
        mock_label_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestUpdateLabel:
    """Tests for PATCH /api/v1/projects/{project_id}/labels/{label_id}."""

    @patch("app.api.v1.labels.get_supabase_client")
    def test_update_name(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test updating label name."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for label update
        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "Updated Name",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_label_result
        mock_get_client.return_value = mock_supabase

        response = client.patch(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    @patch("app.api.v1.labels.get_supabase_client")
    def test_update_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test updating a label that doesn't exist."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_project_result

        # Mock for label not found
        mock_label_result = MagicMock()
        mock_label_result.data = []
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_label_result
        mock_get_client.return_value = mock_supabase

        response = client.patch(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            json={"name": "Updated"},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDeleteLabel:
    """Tests for DELETE /api/v1/projects/{project_id}/labels/{label_id}."""

    @patch("app.api.v1.labels.get_supabase_client")
    def test_delete_existing(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting an existing label."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for label existence check
        mock_label_result = MagicMock()
        mock_label_result.data = [
            {
                "id": str(label_id),
                "project_id": str(project_id),
                "name": "To Delete",
                "color": "#FF0000",
                "description": None,
                "sort_order": 0,
                "created_at": now,
            }
        ]

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

    @patch("app.api.v1.labels.get_supabase_client")
    def test_delete_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting a label that doesn't exist."""
        project_id = uuid4()
        label_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for project ownership check
        mock_project_result = MagicMock()
        mock_project_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Test Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]

        # Mock for label not found
        mock_label_result = MagicMock()
        mock_label_result.data = []

        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.side_effect = [
            mock_project_result,
            mock_label_result,
        ]
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}/labels/{label_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404
