"""Tests for Profile models."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.user import Profile, ProfileCreate, ProfilePreferences, ProfileUpdate


class TestProfilePreferences:
    """Tests for ProfilePreferences."""

    def test_defaults(self) -> None:
        """Test default values."""
        prefs = ProfilePreferences()
        assert prefs.theme == "light"
        assert prefs.notifications_enabled is True
        assert prefs.language == "ja"

    def test_custom_values(self) -> None:
        """Test custom values."""
        prefs = ProfilePreferences(theme="dark", language="en")
        assert prefs.theme == "dark"
        assert prefs.language == "en"

    def test_extra_allowed(self) -> None:
        """Test extra fields are allowed."""
        prefs = ProfilePreferences(custom_field="value")  # type: ignore[call-arg]
        assert prefs.custom_field == "value"  # type: ignore[attr-defined]


class TestProfile:
    """Tests for Profile model."""

    def test_full_profile(self) -> None:
        """Test Profile with all fields."""
        now = datetime.now(tz=UTC)
        profile = Profile(
            id=uuid4(),
            display_name="Test User",
            avatar_url="https://example.com/avatar.png",
            preferences=ProfilePreferences(),
            created_at=now,
            updated_at=now,
        )
        assert profile.display_name == "Test User"
        assert profile.avatar_url is not None

    def test_minimal_profile(self) -> None:
        """Test Profile with minimal fields."""
        now = datetime.now(tz=UTC)
        profile = Profile(
            id=uuid4(),
            display_name=None,
            avatar_url=None,
            created_at=now,
            updated_at=now,
        )
        assert profile.display_name is None
        assert profile.avatar_url is None


class TestProfileCreate:
    """Tests for ProfileCreate schema."""

    def test_create_with_id(self) -> None:
        """Test ProfileCreate requires id."""
        create = ProfileCreate(id=uuid4(), display_name="New User")
        assert create.id is not None

    def test_create_requires_id(self) -> None:
        """Test ProfileCreate fails without id."""
        with pytest.raises(ValidationError):
            ProfileCreate(display_name="New User")  # type: ignore[call-arg]


class TestProfileUpdate:
    """Tests for ProfileUpdate schema."""

    def test_partial_update(self) -> None:
        """Test partial update."""
        update = ProfileUpdate(display_name="Updated Name")
        assert update.display_name == "Updated Name"
        assert update.avatar_url is None

    def test_empty_update(self) -> None:
        """Test empty update is valid."""
        update = ProfileUpdate(display_name=None)
        assert update.display_name is None
