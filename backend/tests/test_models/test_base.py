"""Tests for base models."""

from datetime import UTC, datetime
from uuid import uuid4

from app.models.base import BaseSchema, JsonSettings, SupabaseModel


class TestBaseSchema:
    """Tests for BaseSchema."""

    def test_strip_whitespace(self) -> None:
        """Test that whitespace is stripped from string fields."""

        class TestSchema(BaseSchema):
            name: str

        schema = TestSchema(name="  hello world  ")
        assert schema.name == "hello world"

    def test_from_attributes(self) -> None:
        """Test from_attributes config allows ORM-style construction."""

        class MockObj:
            name = "test"

        class TestSchema(BaseSchema):
            name: str

        schema = TestSchema.model_validate(MockObj())
        assert schema.name == "test"


class TestSupabaseModel:
    """Tests for SupabaseModel."""

    def test_has_id_and_timestamps(self) -> None:
        """Test SupabaseModel has required fields."""

        class TestModel(SupabaseModel):
            pass

        now = datetime.now(tz=UTC)
        model = TestModel(id=uuid4(), created_at=now, updated_at=now)
        assert model.id is not None
        assert model.created_at == now
        assert model.updated_at == now


class TestJsonSettings:
    """Tests for JsonSettings."""

    def test_to_dict(self) -> None:
        """Test to_dict method."""

        class TestSettings(JsonSettings):
            name: str = "test"
            value: int = 42

        settings = TestSettings()
        result = settings.to_dict()
        assert result == {"name": "test", "value": 42}

    def test_extra_allowed(self) -> None:
        """Test extra fields are allowed."""

        class TestSettings(JsonSettings):
            name: str = "test"

        settings = TestSettings(custom_field="value")  # type: ignore[call-arg]
        assert settings.custom_field == "value"  # type: ignore[attr-defined]
