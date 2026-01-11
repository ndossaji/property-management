"""
Tests for Lease API Endpoints
"""

import pytest


class TestLeaseCRUD:
    """Test lease CRUD operations"""

    def test_create_lease(self, client, auth_headers, sample_tenant, sample_property):
        """Test creating a new lease"""
        response = client.post(
            "/api/leases",
            json={
                "tenant_id": sample_tenant["id"],
                "property_id": sample_property["id"],
                "start_date": "2026-02-01",
                "end_date": "2027-01-31",
                "monthly_rent": 1800.00,
                "security_deposit": 1800.00,
                "status": "draft",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["tenant_id"] == sample_tenant["id"]
        assert data["property_id"] == sample_property["id"]
        assert float(data["monthly_rent"]) == 1800.00
        assert data["status"] == "draft"
        assert "id" in data

    def test_create_section_8_lease(self, client, auth_headers, sample_tenant_with_voucher, sample_property):
        """Test creating a Section 8 lease"""
        response = client.post(
            "/api/leases",
            json={
                "tenant_id": sample_tenant_with_voucher["id"],
                "property_id": sample_property["id"],
                "start_date": "2026-02-01",
                "end_date": "2027-01-31",
                "monthly_rent": 1500.00,
                "is_section_8": True,
                "cha_portion": 1200.00,
                "tenant_portion": 300.00,
                "status": "active",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["is_section_8"] is True
        assert float(data["cha_portion"]) == 1200.00
        assert float(data["tenant_portion"]) == 300.00

    def test_create_lease_with_late_fee_config(self, client, auth_headers, sample_tenant, sample_property):
        """Test creating a lease with late fee configuration"""
        response = client.post(
            "/api/leases",
            json={
                "tenant_id": sample_tenant["id"],
                "property_id": sample_property["id"],
                "start_date": "2026-03-01",
                "end_date": "2027-02-28",
                "monthly_rent": 2000.00,
                "rent_due_day": 1,
                "grace_period_days": 5,
                "late_fee_amount": 50.00,
                "late_fee_percentage": 5.0,
                "daily_late_fee": 10.00,
                "status": "draft",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert float(data["late_fee_amount"]) == 50.00
        assert float(data["late_fee_percentage"]) == 5.0
        assert float(data["daily_late_fee"]) == 10.00

    def test_list_leases(self, client, auth_headers, sample_lease):
        """Test listing all leases"""
        response = client.get("/api/leases", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(l["id"] == sample_lease["id"] for l in data)

    def test_list_leases_filter_by_status(self, client, auth_headers, sample_lease):
        """Test filtering leases by status"""
        response = client.get("/api/leases?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(l["status"] == "active" for l in data)

    def test_list_leases_filter_by_tenant(self, client, auth_headers, sample_lease, sample_tenant):
        """Test filtering leases by tenant"""
        response = client.get(f"/api/leases?tenant_id={sample_tenant['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(l["tenant_id"] == sample_tenant["id"] for l in data)

    def test_get_lease(self, client, auth_headers, sample_lease):
        """Test getting a specific lease"""
        response = client.get(f"/api/leases/{sample_lease['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_lease["id"]
        # Should include nested tenant and property
        assert "tenant" in data
        assert "property" in data

    def test_get_lease_not_found(self, client, auth_headers):
        """Test getting a non-existent lease"""
        response = client.get("/api/leases/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_lease(self, client, auth_headers, sample_lease):
        """Test updating a lease"""
        response = client.put(
            f"/api/leases/{sample_lease['id']}",
            json={"monthly_rent": 1600.00, "notes": "Rent increased"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["monthly_rent"]) == 1600.00
        assert data["notes"] == "Rent increased"

    def test_delete_lease(self, client, auth_headers, sample_tenant, sample_property):
        """Test deleting a draft lease"""
        # Create a draft lease (only draft leases can be deleted)
        create_response = client.post(
            "/api/leases",
            json={
                "tenant_id": sample_tenant["id"],
                "property_id": sample_property["id"],
                "start_date": "2026-10-01",
                "end_date": "2027-09-30",
                "monthly_rent": 1500.00,
                "status": "draft",
            },
            headers=auth_headers,
        )
        lease_id = create_response.json()["id"]

        response = client.delete(f"/api/leases/{lease_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/leases/{lease_id}", headers=auth_headers)
        assert response.status_code == 404


class TestLeaseWorkflows:
    """Test lease workflow operations"""

    def test_activate_lease(self, client, auth_headers, sample_tenant, sample_property):
        """Test activating a draft lease"""
        # Create draft lease
        create_response = client.post(
            "/api/leases",
            json={
                "tenant_id": sample_tenant["id"],
                "property_id": sample_property["id"],
                "start_date": "2026-04-01",
                "end_date": "2027-03-31",
                "monthly_rent": 1500.00,
                "status": "draft",
            },
            headers=auth_headers,
        )
        lease_id = create_response.json()["id"]

        # Activate (endpoint doesn't accept JSON body)
        response = client.post(
            f"/api/leases/{lease_id}/activate",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"

    def test_terminate_lease(self, client, auth_headers, sample_lease):
        """Test terminating a lease"""
        response = client.post(
            f"/api/leases/{sample_lease['id']}/terminate",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "terminated"

