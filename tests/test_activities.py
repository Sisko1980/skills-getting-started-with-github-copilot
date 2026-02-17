from fastapi.testclient import TestClient
from urllib.parse import quote
import pytest

import src.app as app_module

client = TestClient(app_module.app)

@pytest.fixture(autouse=True)
def reset_activities():
    # snapshot participants for all activities, restore after each test
    original = {k: v["participants"][:] for k, v in app_module.activities.items()}
    yield
    for k, v in original.items():
        app_module.activities[k]["participants"] = v


def test_get_activities_structure():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Programming Class" in data


def test_signup_and_prevent_duplicates():
    activity = "Programming Class"
    email = "pytest_user@example.com"

    # signup should succeed
    r = client.post(f"/activities/{quote(activity)}/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json()["message"]

    # server state should include the new participant
    data = client.get("/activities").json()
    assert email in data[activity]["participants"]

    # duplicate signup should be rejected
    r2 = client.post(f"/activities/{quote(activity)}/signup?email={email}")
    assert r2.status_code == 400


def test_unregister_participant_and_errors():
    activity = "Chess Club"
    email = "temp_remove@example.com"

    # first sign up the test email
    r = client.post(f"/activities/{quote(activity)}/signup?email={email}")
    assert r.status_code == 200

    # then unregister should succeed
    d = client.delete(f"/activities/{quote(activity)}/participants?email={email}")
    assert d.status_code == 200
    assert "Unregistered" in d.json()["message"]

    # unregistering again should return 404
    d2 = client.delete(f"/activities/{quote(activity)}/participants?email={email}")
    assert d2.status_code == 404


def test_unknown_activity_errors():
    unknown = "Nonexistent Club"
    email = "a@b.com"

    r = client.post(f"/activities/{quote(unknown)}/signup?email={email}")
    assert r.status_code == 404

    d = client.delete(f"/activities/{quote(unknown)}/participants?email={email}")
    assert d.status_code == 404
