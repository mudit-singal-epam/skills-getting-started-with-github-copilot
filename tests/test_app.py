"""
Tests for the FastAPI application
"""
import pytest
from fastapi.testclient import TestClient
from src.app import app
import copy

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities_state():
    """Reset in-memory activities state between tests to avoid cross-test interference."""
    from src.app import activities

    original_activities = copy.deepcopy(activities)
    try:
        yield
    finally:
        activities.clear()
        activities.update(copy.deepcopy(original_activities))
class TestRoot:
    def test_root_redirect(self):
        """Test that root path redirects to static index.html"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/static/index.html"


class TestActivities:
    def test_get_activities(self):
        """Test getting all activities"""
        response = client.get("/activities")
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected activities exist
        assert "Basketball Team" in data
        assert "Soccer Club" in data
        assert "Art Club" in data
        assert "Drama Club" in data
        assert "Debate Team" in data
        assert "Math Club" in data
        assert "Chess Club" in data
        assert "Programming Class" in data
        assert "Gym Class" in data
    
    def test_activity_structure(self):
        """Test that activities have the correct structure"""
        response = client.get("/activities")
        data = response.json()
        
        activity = data["Basketball Team"]
        assert "description" in activity
        assert "schedule" in activity
        assert "max_participants" in activity
        assert "participants" in activity
        assert isinstance(activity["participants"], list)


class TestSignup:
    def test_signup_new_participant(self):
        """Test signing up a new participant for an activity"""
        email = "testuser@mergington.edu"
        activity = "Basketball Team"
        
        # Get initial participant count
        response = client.get("/activities")
        initial_count = len(response.json()[activity]["participants"])
        
        # Sign up
        response = client.post(
            f"/activities/{activity}/signup?email={email}"
        )
        assert response.status_code == 200
        assert email in response.json()["message"]
        
        # Verify participant was added
        response = client.get("/activities")
        new_count = len(response.json()[activity]["participants"])
        assert new_count == initial_count + 1
        assert email in response.json()[activity]["participants"]
    
    def test_signup_already_registered(self):
        """Test that signing up twice fails"""
        email = "duplicate@mergington.edu"
        activity = "Soccer Club"
        
        # First signup
        response = client.post(
            f"/activities/{activity}/signup?email={email}"
        )
        assert response.status_code == 200
        
        # Second signup with same email
        response = client.post(
            f"/activities/{activity}/signup?email={email}"
        )
        assert response.status_code == 400
        assert "already signed up" in response.json()["detail"]
    
    def test_signup_nonexistent_activity(self):
        """Test signing up for a non-existent activity"""
        email = "test@mergington.edu"
        activity = "Nonexistent Activity"
        
        response = client.post(
            f"/activities/{activity}/signup?email={email}"
        )
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]


class TestUnregister:
    def test_unregister_participant(self):
        """Test unregistering a participant from an activity"""
        email = "unregister@mergington.edu"
        activity = "Art Club"
        
        # Sign up first
        response = client.post(
            f"/activities/{activity}/signup?email={email}"
        )
        assert response.status_code == 200
        
        # Verify participant is signed up
        response = client.get("/activities")
        assert email in response.json()[activity]["participants"]
        initial_count = len(response.json()[activity]["participants"])
        
        # Unregister
        response = client.post(
            f"/activities/{activity}/unregister?email={email}"
        )
        assert response.status_code == 200
        assert email in response.json()["message"]
        
        # Verify participant was removed
        response = client.get("/activities")
        new_count = len(response.json()[activity]["participants"])
        assert new_count == initial_count - 1
        assert email not in response.json()[activity]["participants"]
    
    def test_unregister_not_registered(self):
        """Test unregistering someone who isn't registered"""
        email = "notregistered@mergington.edu"
        activity = "Drama Club"
        
        response = client.post(
            f"/activities/{activity}/unregister?email={email}"
        )
        assert response.status_code == 400
        assert "not signed up" in response.json()["detail"]
    
    def test_unregister_nonexistent_activity(self):
        """Test unregistering from a non-existent activity"""
        email = "test@mergington.edu"
        activity = "Nonexistent Activity"
        
        response = client.post(
            f"/activities/{activity}/unregister?email={email}"
        )
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]


class TestParticipantLimits:
    def test_max_participants_respected(self):
        """Test that max participants limit is respected"""
        response = client.get("/activities")
        activity_data = response.json()["Math Club"]
        
        max_participants = activity_data["max_participants"]
        current_participants = len(activity_data["participants"])
        
        # Fill the activity to max capacity
        for i in range(max_participants - current_participants):
            email = f"participant{i}@mergington.edu"
            response = client.post(
                f"/activities/Math Club/signup?email={email}"
            )
            assert response.status_code == 200
        
        # Verify activity is at max capacity
        response = client.get("/activities")
        assert len(response.json()["Math Club"]["participants"]) == max_participants
        
        # Attempt to signup when at capacity
        response = client.post(
            "/activities/Math Club/signup?email=overflow@mergington.edu"
        )
        assert response.status_code == 400
        assert "maximum participants" in response.json()["detail"].lower()
