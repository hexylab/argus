"""Tests for API dependencies (authentication endpoints)."""

from fastapi.testclient import TestClient

from tests.conftest import TEST_USER_ID


class TestHealthCheck:
    """Tests for health check endpoint."""

    def test_health_check(self, client: TestClient) -> None:
        """Test health check endpoint (no auth required)."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestAuthentication:
    """Tests for authentication dependencies."""

    def test_get_me_authenticated(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
    ) -> None:
        """Test authenticated endpoint with valid token."""
        response = client.get("/api/v1/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == TEST_USER_ID
        assert data["email"] == "test@example.com"

    def test_get_me_no_auth(self, client: TestClient) -> None:
        """Test authenticated endpoint without token."""
        response = client.get("/api/v1/me")
        # HTTPBearer returns 401 or 403 depending on version
        assert response.status_code in (401, 403)

    def test_get_me_invalid_token(self, client: TestClient) -> None:
        """Test authenticated endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code == 401

    def test_get_me_expired_token(
        self,
        client: TestClient,
        expired_auth_headers: dict[str, str],
    ) -> None:
        """Test authenticated endpoint with expired token."""
        response = client.get("/api/v1/me", headers=expired_auth_headers)
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower()

    def test_get_me_malformed_token(self, client: TestClient) -> None:
        """Test authenticated endpoint with malformed token."""
        headers = {"Authorization": "Bearer not.a.jwt"}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code == 401

    def test_get_me_wrong_auth_scheme(self, client: TestClient) -> None:
        """Test authenticated endpoint with wrong auth scheme."""
        headers = {"Authorization": "Basic dXNlcjpwYXNz"}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code in (401, 403)

    def test_get_me_empty_bearer(self, client: TestClient) -> None:
        """Test authenticated endpoint with empty bearer token."""
        headers = {"Authorization": "Bearer "}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code in (401, 403)
