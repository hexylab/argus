"""Sample tests to verify CI pipeline works correctly."""


def test_sample_pass() -> None:
    """Basic test that always passes."""
    assert True


def test_arithmetic() -> None:
    """Test basic arithmetic operations."""
    assert 1 + 1 == 2
    assert 10 - 5 == 5
    assert 3 * 4 == 12


def test_string_operations() -> None:
    """Test basic string operations."""
    assert "hello".upper() == "HELLO"
    assert "WORLD".lower() == "world"
    assert "foo" + "bar" == "foobar"
