import os

# Must be set before the app is imported
os.environ["AI_PROVIDER"] = "mock"
os.environ["MAX_DRAFT_CHARS"] = "2000"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)
