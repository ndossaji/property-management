"""
Tests for Late Fee API Endpoints
"""

import pytest


class TestLateFeeCRUD:
    """Test late fee CRUD operations"""

    def test_create_late_fee(self, client, auth_headers, sample_lease):
        """Test creating a late fee"""
        response = client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 50.00,
                "fee_date": "2026-01-06",
                "for_period_start": "2026-01-01",
                "for_period_end": "2026-01-31",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["lease_id"] == sample_lease["id"]
        assert float(data["amount"]) == 50.00
        assert data["is_paid"] is False
        assert data["is_waived"] is False
        assert "id" in data

    def test_list_late_fees(self, client, auth_headers, sample_lease):
        """Test listing late fees"""
        # Create late fee
        client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 75.00,
                "fee_date": "2026-02-06",
                "for_period_start": "2026-02-01",
                "for_period_end": "2026-02-28",
            },
            headers=auth_headers,
        )

        response = client.get("/api/late-fees", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_late_fees_filter_by_lease(self, client, auth_headers, sample_lease):
        """Test filtering late fees by lease"""
        response = client.get(f"/api/late-fees?lease_id={sample_lease['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(lf["lease_id"] == sample_lease["id"] for lf in data)

    def test_list_unpaid_late_fees(self, client, auth_headers, sample_lease):
        """Test listing unpaid late fees"""
        # Create late fee
        client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 50.00,
                "fee_date": "2026-03-06",
                "for_period_start": "2026-03-01",
                "for_period_end": "2026-03-31",
            },
            headers=auth_headers,
        )

        response = client.get("/api/late-fees?paid=false", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(not lf["is_paid"] for lf in data)

    def test_get_late_fee(self, client, auth_headers, sample_lease):
        """Test getting a specific late fee"""
        create_response = client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 100.00,
                "fee_date": "2026-04-06",
                "for_period_start": "2026-04-01",
                "for_period_end": "2026-04-30",
            },
            headers=auth_headers,
        )
        fee_id = create_response.json()["id"]

        response = client.get(f"/api/late-fees/{fee_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == fee_id

    def test_mark_late_fee_paid(self, client, auth_headers, sample_lease):
        """Test marking a late fee as paid"""
        create_response = client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 50.00,
                "fee_date": "2026-05-06",
                "for_period_start": "2026-05-01",
                "for_period_end": "2026-05-31",
            },
            headers=auth_headers,
        )
        fee_id = create_response.json()["id"]

        # Endpoint is /pay, not /paid
        response = client.post(
            f"/api/late-fees/{fee_id}/pay",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_paid"] is True
        # paid_date is set automatically to today

    def test_waive_late_fee(self, client, auth_headers, sample_lease):
        """Test waiving a late fee"""
        create_response = client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 50.00,
                "fee_date": "2026-06-06",
                "for_period_start": "2026-06-01",
                "for_period_end": "2026-06-30",
            },
            headers=auth_headers,
        )
        fee_id = create_response.json()["id"]

        # Waive endpoint takes reason as query parameter
        response = client.post(
            f"/api/late-fees/{fee_id}/waive?reason=First-time+late+payment%2C+good+tenant+history",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_waived"] is True
        assert "First-time late payment" in data["waived_reason"]

    def test_delete_late_fee(self, client, auth_headers, sample_lease):
        """Test deleting a late fee"""
        create_response = client.post(
            "/api/late-fees",
            json={
                "lease_id": sample_lease["id"],
                "amount": 50.00,
                "fee_date": "2026-07-06",
                "for_period_start": "2026-07-01",
                "for_period_end": "2026-07-31",
            },
            headers=auth_headers,
        )
        fee_id = create_response.json()["id"]

        response = client.delete(f"/api/late-fees/{fee_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/late-fees/{fee_id}", headers=auth_headers)
        assert response.status_code == 404

