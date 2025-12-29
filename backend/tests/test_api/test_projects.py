"""Tests for project API endpoints."""

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestProjectsAuth:
    """Tests for project endpoint authentication."""

    def test_create_project_no_auth(self, client: TestClient) -> None:
        """Test that creating a project without auth fails."""
        response = client.post("/api/v1/projects", json={"name": "Test"})
        assert response.status_code in (401, 403)

    def test_list_projects_no_auth(self, client: TestClient) -> None:
        """Test that listing projects without auth fails."""
        response = client.get("/api/v1/projects")
        assert response.status_code in (401, 403)

    def test_get_project_no_auth(self, client: TestClient) -> None:
        """Test that getting a project without auth fails."""
        project_id = uuid4()
        response = client.get(f"/api/v1/projects/{project_id}")
        assert response.status_code in (401, 403)

    def test_update_project_no_auth(self, client: TestClient) -> None:
        """Test that updating a project without auth fails."""
        project_id = uuid4()
        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Updated"},
        )
        assert response.status_code in (401, 403)

    def test_delete_project_no_auth(self, client: TestClient) -> None:
        """Test that deleting a project without auth fails."""
        project_id = uuid4()
        response = client.delete(f"/api/v1/projects/{project_id}")
        assert response.status_code in (401, 403)


class TestCreateProject:
    """Tests for POST /api/v1/projects."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_create_minimal(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a project with minimal data."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
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
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )
        mock_get_client.return_value = mock_supabase

        response = client.post(
            "/api/v1/projects",
            json={"name": "Test Project"},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["status"] == "active"

    @patch("app.api.v1.projects.get_supabase_client")
    def test_create_with_all_fields(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a project with all fields."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Full Project",
                "description": "A project with all fields",
                "status": "active",
                "settings": {"default_fps": 60.0, "auto_annotation": True},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = (
            mock_result
        )
        mock_get_client.return_value = mock_supabase

        response = client.post(
            "/api/v1/projects",
            json={
                "name": "Full Project",
                "description": "A project with all fields",
                "settings": {"default_fps": 60.0, "auto_annotation": True},
            },
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Full Project"
        assert data["description"] == "A project with all fields"

    def test_create_invalid_data(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a project with invalid data."""
        response = client.post(
            "/api/v1/projects",
            json={"name": ""},  # Empty name should fail
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_missing_name(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a project without name."""
        response = client.post(
            "/api/v1/projects",
            json={},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestListProjects:
    """Tests for GET /api/v1/projects."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_list_empty(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects when none exist."""
        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get("/api/v1/projects", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.v1.projects.get_supabase_client")
    def test_list_with_data(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects when some exist."""
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(uuid4()),
                "owner_id": TEST_USER_ID,
                "name": "Project 1",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": str(uuid4()),
                "owner_id": TEST_USER_ID,
                "name": "Project 2",
                "description": "Second project",
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            },
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get("/api/v1/projects", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Project 1"
        assert data[1]["name"] == "Project 2"

    @patch("app.api.v1.projects.get_supabase_client")
    def test_list_with_pagination(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects with pagination."""
        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            "/api/v1/projects?skip=10&limit=5",
            headers=auth_headers,
        )

        assert response.status_code == 200


class TestGetProject:
    """Tests for GET /api/v1/projects/{project_id}."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_get_existing(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting an existing project."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Existing Project",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Existing Project"

    @patch("app.api.v1.projects.get_supabase_client")
    def test_get_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting a project that doesn't exist."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestUpdateProject:
    """Tests for PATCH /api/v1/projects/{project_id}."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_update_name(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test updating project name."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "Updated Name",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    @patch("app.api.v1.projects.get_supabase_client")
    def test_update_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test updating a project that doesn't exist."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Updated"},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDeleteProject:
    """Tests for DELETE /api/v1/projects/{project_id}."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_delete_existing(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting an existing project."""
        project_id = uuid4()
        now = datetime.now(tz=UTC).isoformat()

        mock_supabase = MagicMock()
        # Mock for get_project check
        mock_select_result = MagicMock()
        mock_select_result.data = [
            {
                "id": str(project_id),
                "owner_id": TEST_USER_ID,
                "name": "To Delete",
                "description": None,
                "status": "active",
                "settings": {},
                "created_at": now,
                "updated_at": now,
            }
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_select_result

        # Mock for delete
        mock_delete_result = MagicMock()
        mock_delete_result.data = []
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_result
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

    @patch("app.api.v1.projects.get_supabase_client")
    def test_delete_nonexistent(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test deleting a project that doesn't exist."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestProjectsAuthorization:
    """Tests for project authorization (access control)."""

    @patch("app.api.v1.projects.get_supabase_client")
    def test_get_other_users_project_returns_404(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        other_user_auth_headers: dict[str, str],
    ) -> None:
        """Test that accessing another user's project returns 404."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        # Query returns empty because owner_id doesn't match
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.get(
            f"/api/v1/projects/{project_id}",
            headers=other_user_auth_headers,
        )

        assert response.status_code == 404

    @patch("app.api.v1.projects.get_supabase_client")
    def test_update_other_users_project_returns_404(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        other_user_auth_headers: dict[str, str],
    ) -> None:
        """Test that updating another user's project returns 404."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Hacked"},
            headers=other_user_auth_headers,
        )

        assert response.status_code == 404

    @patch("app.api.v1.projects.get_supabase_client")
    def test_delete_other_users_project_returns_404(
        self,
        mock_get_client: MagicMock,
        client: TestClient,
        other_user_auth_headers: dict[str, str],
    ) -> None:
        """Test that deleting another user's project returns 404."""
        project_id = uuid4()

        mock_supabase = MagicMock()
        mock_result = MagicMock()
        mock_result.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_result
        mock_get_client.return_value = mock_supabase

        response = client.delete(
            f"/api/v1/projects/{project_id}",
            headers=other_user_auth_headers,
        )

        assert response.status_code == 404


class TestProjectsPagination:
    """Tests for project pagination edge cases."""

    def test_list_with_invalid_skip(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects with negative skip."""
        response = client.get(
            "/api/v1/projects?skip=-1",
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_list_with_invalid_limit(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects with limit exceeding maximum."""
        response = client.get(
            "/api/v1/projects?limit=101",
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_list_with_zero_limit(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test listing projects with zero limit."""
        response = client.get(
            "/api/v1/projects?limit=0",
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestProjectsInputValidation:
    """Tests for project input validation."""

    def test_get_with_invalid_uuid(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test getting a project with invalid UUID format."""
        response = client.get(
            "/api/v1/projects/not-a-uuid",
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_create_with_name_too_long(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test creating a project with name exceeding maximum length."""
        response = client.post(
            "/api/v1/projects",
            json={"name": "x" * 256},  # Assuming max 255 chars
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_update_with_invalid_status(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test updating a project with invalid status."""
        project_id = uuid4()
        response = client.patch(
            f"/api/v1/projects/{project_id}",
            json={"status": "invalid_status"},
            headers=auth_headers,
        )
        assert response.status_code == 422
