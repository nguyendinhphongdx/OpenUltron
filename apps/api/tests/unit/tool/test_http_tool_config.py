import pytest

from app.core.errors import ValidationFailedError
from app.modules.tool.service import _validate_config_for_kind

VALID_CONFIG = {
    "request": {
        "method": "GET",
        "url": "https://api.example.com/weather",
        "headers": [{"name": "Authorization", "value": "Bearer secret"}],
        "query": [{"name": "units", "value": "metric"}],
        "body": None,
    },
    "ai_params": [{"name": "city", "description": "Tên thành phố", "type": "string"}],
}


def test_valid_http_config_passes() -> None:
    _validate_config_for_kind("http", VALID_CONFIG)  # không raise


def test_non_http_kind_skips_validation() -> None:
    _validate_config_for_kind("builtin", {"anything": "goes"})  # không raise


def test_missing_request_url_raises() -> None:
    config = {
        "request": {
            "method": "GET",
            "headers": [],
            "query": [],
            "body": None,
        },
        "ai_params": [],
    }
    with pytest.raises(ValidationFailedError):
        _validate_config_for_kind("http", config)


def test_invalid_method_literal_raises() -> None:
    config = {
        "request": {
            "method": "PATCH",
            "url": "https://api.example.com/x",
            "headers": [],
            "query": [],
            "body": None,
        },
        "ai_params": [],
    }
    with pytest.raises(ValidationFailedError):
        _validate_config_for_kind("http", config)


def test_invalid_ai_param_type_raises() -> None:
    config = {
        "request": {
            "method": "GET",
            "url": "https://api.example.com/x",
            "headers": [],
            "query": [],
            "body": None,
        },
        "ai_params": [{"name": "city", "description": "Tên thành phố", "type": "array"}],
    }
    with pytest.raises(ValidationFailedError):
        _validate_config_for_kind("http", config)
