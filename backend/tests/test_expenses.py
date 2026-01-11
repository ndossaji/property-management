"""
Tests for Expense API Endpoints
Includes tests for the paid_by field functionality
"""

import pytest


class TestExpenseCRUD:
    """Test expense CRUD operations"""

    def test_create_expense_default_paid_by(self, client, auth_headers, sample_property):
        """Test creating an expense without paid_by defaults to 'unpaid'"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "Plumbing repair",
                "amount": 250.00,
                "category": "repairs",
                "expense_date": "2026-01-05",
                "property_id": sample_property["id"],
                "vendor": "ABC Plumbing",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "Plumbing repair"
        assert float(data["amount"]) == 250.00
        assert data["category"] == "repairs"
        assert data["paid_by"] == "unpaid"  # Default value
        assert data["vendor"] == "ABC Plumbing"
        assert "id" in data

    def test_create_expense_with_paid_by_property_management(self, client, auth_headers, sample_property):
        """Test creating an expense paid by property management"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "HVAC maintenance",
                "amount": 500.00,
                "category": "maintenance",
                "expense_date": "2026-01-10",
                "property_id": sample_property["id"],
                "paid_by": "property_management",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["paid_by"] == "property_management"

    def test_create_expense_with_paid_by_owner(self, client, auth_headers, sample_property):
        """Test creating an expense paid by owner"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "New roof installation",
                "amount": 15000.00,
                "category": "repairs",
                "expense_date": "2026-01-15",
                "property_id": sample_property["id"],
                "paid_by": "owner",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["paid_by"] == "owner"
        assert float(data["amount"]) == 15000.00

    def test_create_expense_with_all_fields(self, client, auth_headers, sample_property):
        """Test creating an expense with all optional fields"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "Annual property inspection",
                "amount": 350.00,
                "category": "other",
                "expense_date": "2026-01-20",
                "property_id": sample_property["id"],
                "vendor": "City Inspectors LLC",
                "notes": "Annual inspection required by insurance",
                "paid_by": "property_management",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "Annual property inspection"
        assert data["vendor"] == "City Inspectors LLC"
        assert data["notes"] == "Annual inspection required by insurance"
        assert data["paid_by"] == "property_management"

    def test_get_expense(self, client, auth_headers, sample_property):
        """Test getting a specific expense"""
        # Create expense first
        create_response = client.post(
            "/api/expenses",
            json={
                "description": "Window repair",
                "amount": 200.00,
                "category": "repairs",
                "expense_date": "2026-01-08",
                "property_id": sample_property["id"],
                "paid_by": "owner",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json()["id"]

        # Get the expense
        response = client.get(f"/api/expenses/{expense_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == expense_id
        assert data["description"] == "Window repair"
        assert data["paid_by"] == "owner"

    def test_get_expense_not_found(self, client, auth_headers):
        """Test getting a non-existent expense"""
        response = client.get("/api/expenses/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_list_expenses(self, client, auth_headers, sample_property):
        """Test listing expenses"""
        # Create multiple expenses
        for i, paid_by in enumerate(["unpaid", "property_management", "owner"]):
            client.post(
                "/api/expenses",
                json={
                    "description": f"Expense {i+1}",
                    "amount": 100.00 * (i + 1),
                    "category": "maintenance",
                    "expense_date": f"2026-01-0{i+1}",
                    "property_id": sample_property["id"],
                    "paid_by": paid_by,
                },
                headers=auth_headers,
            )

        response = client.get("/api/expenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        # Verify paid_by values are present
        paid_by_values = [exp["paid_by"] for exp in data]
        assert "unpaid" in paid_by_values
        assert "property_management" in paid_by_values
        assert "owner" in paid_by_values


class TestExpenseUpdate:
    """Test expense update operations"""

    def test_update_expense_paid_by(self, client, auth_headers, sample_property):
        """Test updating expense paid_by field"""
        # Create expense with unpaid status
        create_response = client.post(
            "/api/expenses",
            json={
                "description": "Lawn mowing",
                "amount": 75.00,
                "category": "landscaping",
                "expense_date": "2026-01-12",
                "property_id": sample_property["id"],
                "paid_by": "unpaid",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json()["id"]
        assert create_response.json()["paid_by"] == "unpaid"

        # Update to property_management
        response = client.put(
            f"/api/expenses/{expense_id}",
            json={"paid_by": "property_management"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["paid_by"] == "property_management"

        # Update to owner
        response = client.put(
            f"/api/expenses/{expense_id}",
            json={"paid_by": "owner"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["paid_by"] == "owner"

    def test_update_expense_multiple_fields(self, client, auth_headers, sample_property):
        """Test updating multiple fields including paid_by"""
        # Create expense
        create_response = client.post(
            "/api/expenses",
            json={
                "description": "Cleaning service",
                "amount": 150.00,
                "category": "cleaning",
                "expense_date": "2026-01-14",
                "property_id": sample_property["id"],
            },
            headers=auth_headers,
        )
        expense_id = create_response.json()["id"]

        # Update multiple fields
        response = client.put(
            f"/api/expenses/{expense_id}",
            json={
                "description": "Deep cleaning service",
                "amount": 250.00,
                "paid_by": "property_management",
                "notes": "Quarterly deep clean",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Deep cleaning service"
        assert float(data["amount"]) == 250.00
        assert data["paid_by"] == "property_management"
        assert data["notes"] == "Quarterly deep clean"

    def test_update_expense_not_found(self, client, auth_headers):
        """Test updating a non-existent expense"""
        response = client.put(
            "/api/expenses/99999",
            json={"paid_by": "owner"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestExpenseDelete:
    """Test expense delete operations"""

    def test_delete_expense(self, client, auth_headers, sample_property):
        """Test deleting an expense"""
        # Create expense
        create_response = client.post(
            "/api/expenses",
            json={
                "description": "Temporary expense",
                "amount": 50.00,
                "category": "other",
                "expense_date": "2026-01-16",
                "property_id": sample_property["id"],
                "paid_by": "unpaid",
            },
            headers=auth_headers,
        )
        expense_id = create_response.json()["id"]

        # Delete the expense
        response = client.delete(f"/api/expenses/{expense_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify it's deleted
        get_response = client.get(f"/api/expenses/{expense_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_expense_not_found(self, client, auth_headers):
        """Test deleting a non-existent expense"""
        response = client.delete("/api/expenses/99999", headers=auth_headers)
        assert response.status_code == 404


class TestExpenseValidation:
    """Test expense validation"""

    def test_create_expense_invalid_paid_by(self, client, auth_headers, sample_property):
        """Test creating expense with invalid paid_by value"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "Test expense",
                "amount": 100.00,
                "category": "other",
                "expense_date": "2026-01-18",
                "property_id": sample_property["id"],
                "paid_by": "invalid_value",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422  # Validation error

    def test_create_expense_invalid_property(self, client, auth_headers):
        """Test creating expense with non-existent property"""
        response = client.post(
            "/api/expenses",
            json={
                "description": "Test expense",
                "amount": 100.00,
                "category": "other",
                "expense_date": "2026-01-18",
                "property_id": 99999,
                "paid_by": "unpaid",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_create_expense_missing_required_fields(self, client, auth_headers, sample_property):
        """Test creating expense without required fields"""
        response = client.post(
            "/api/expenses",
            json={
                "property_id": sample_property["id"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

