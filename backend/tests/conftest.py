import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Must be set before the app is imported
os.environ["AI_PROVIDER"] = "mock"
os.environ["MAX_DRAFT_CHARS"] = "2000"
os.environ["EMBEDDING_PROVIDER"] = "mock"

# Use in-memory SQLite for sandboxed automated test suite
temp_db_path = tempfile.mktemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{temp_db_path}"

from app.db.models import Base
from app.db.session import get_db
from app.main import app

test_engine = create_engine(
    f"sqlite:///{temp_db_path}",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    try:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
    except Exception:
        pass


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def creator_auth(client):
    email = f"creator_{os.urandom(4).hex()}@brandpilot.test"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Test Creator",
        "role": "creator",
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "email": email}


@pytest.fixture()
def reviewer_auth(client):
    email = f"reviewer_{os.urandom(4).hex()}@brandpilot.test"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Test Reviewer",
        "role": "reviewer",
    })
    assert res.status_code == 201
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}", "email": email}
