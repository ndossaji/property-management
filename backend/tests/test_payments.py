"""
Tests for Rent Payment and Late Fee API Endpoints
"""

import pytest


class TestRentPaymentCRUD:
    """Test rent payment CRUD operations"""

    def test_create_payment(self, client, auth_headers, sample_lease):
        """Test creating a rent payment"""
        response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-01-05",
                "payment_period_start": "2026-01-01",
                "payment_period_end": "2026-01-31",
                "payment_method": "check",
                "status": "completed",
                "reference_number": "CHK-1001",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["lease_id"] == sample_lease["id"]
        assert float(data["amount"]) == 1500.00
        assert data["payment_method"] == "check"
        assert data["status"] == "completed"
        assert "id" in data

    def test_create_cha_payment(self, client, auth_headers, sample_lease):
        """Test creating a CHA (Section 8) payment"""
        response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1200.00,
                "payment_date": "2026-01-01",
                "payment_period_start": "2026-01-01",
                "payment_period_end": "2026-01-31",
                "payment_method": "cha_voucher",
                "status": "completed",
                "is_cha_payment": True,
                "cha_payment_reference": "CHA-PAY-2026-001",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_cha_payment"] is True
        assert data["payment_method"] == "cha_voucher"
        assert data["cha_payment_reference"] == "CHA-PAY-2026-001"

    def test_create_partial_payment(self, client, auth_headers, sample_lease):
        """Test creating a partial rent payment"""
        response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 750.00,
                "payment_date": "2026-01-05",
                "payment_period_start": "2026-01-01",
                "payment_period_end": "2026-01-31",
                "payment_method": "cash",
                "status": "partial",
                "notes": "First half of rent",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "partial"
        assert float(data["amount"]) == 750.00

    def test_list_payments(self, client, auth_headers, sample_lease):
        """Test listing payments"""
        # Create a payment first
        client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-02-01",
                "payment_period_start": "2026-02-01",
                "payment_period_end": "2026-02-28",
                "payment_method": "bank_transfer",
                "status": "completed",
            },
            headers=auth_headers,
        )

        response = client.get("/api/payments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_payments_filter_by_lease(self, client, auth_headers, sample_lease):
        """Test filtering payments by lease"""
        response = client.get(f"/api/payments?lease_id={sample_lease['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(p["lease_id"] == sample_lease["id"] for p in data)

    def test_list_payments_filter_by_status(self, client, auth_headers, sample_lease):
        """Test filtering payments by status"""
        # Create completed payment
        client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-03-01",
                "payment_period_start": "2026-03-01",
                "payment_period_end": "2026-03-31",
                "payment_method": "check",
                "status": "completed",
            },
            headers=auth_headers,
        )

        response = client.get("/api/payments?status=completed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(p["status"] == "completed" for p in data)

    def test_get_payment(self, client, auth_headers, sample_lease):
        """Test getting a specific payment"""
        create_response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-04-01",
                "payment_period_start": "2026-04-01",
                "payment_period_end": "2026-04-30",
                "payment_method": "debit_card",
                "status": "completed",
            },
            headers=auth_headers,
        )
        payment_id = create_response.json()["id"]

        response = client.get(f"/api/payments/{payment_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == payment_id

    def test_update_payment(self, client, auth_headers, sample_lease):
        """Test updating a payment"""
        create_response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-05-01",
                "payment_period_start": "2026-05-01",
                "payment_period_end": "2026-05-31",
                "payment_method": "check",
                "status": "pending",
            },
            headers=auth_headers,
        )
        payment_id = create_response.json()["id"]

        response = client.put(
            f"/api/payments/{payment_id}",
            json={"status": "completed", "reference_number": "CHK-5001"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["reference_number"] == "CHK-5001"

    def test_delete_payment(self, client, auth_headers, sample_lease):
        """Test deleting a payment"""
        create_response = client.post(
            "/api/payments",
            json={
                "lease_id": sample_lease["id"],
                "amount": 1500.00,
                "payment_date": "2026-06-01",
                "payment_period_start": "2026-06-01",
                "payment_period_end": "2026-06-30",
                "payment_method": "cash",
                "status": "completed",
            },
            headers=auth_headers,
        )
        payment_id = create_response.json()["id"]

        response = client.delete(f"/api/payments/{payment_id}", headers=auth_headers)
        assert response.status_code == 204

