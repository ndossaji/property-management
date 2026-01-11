"""
Tests for Tenant API Endpoints
"""

import pytest


class TestTenantCRUD:
    """Test tenant CRUD operations"""

    def test_create_tenant(self, client, auth_headers):
        """Test creating a new tenant"""
        response = client.post(
            "/api/tenants",
            json={
                "first_name": "Alice",
                "last_name": "Johnson",
                "email": "alice@test.com",
                "phone": "555-1111",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Alice"
        assert data["last_name"] == "Johnson"
        assert data["email"] == "alice@test.com"
        assert data["is_active"] is True
        assert "id" in data

    def test_create_tenant_with_full_details(self, client, auth_headers):
        """Test creating a tenant with all optional fields"""
        response = client.post(
            "/api/tenants",
            json={
                "first_name": "Bob",
                "last_name": "Williams",
                "email": "bob@test.com",
                "phone": "555-2222",
                "alternate_phone": "555-3333",
                "address": "456 Previous St, Chicago IL 60602",
                "ssn_last_four": "1234",
                "date_of_birth": "1985-06-15",
                "emergency_contact_name": "Sarah Williams",
                "emergency_contact_phone": "555-4444",
                "emergency_contact_relationship": "Spouse",
                "employer": "ABC Corp",
                "employer_phone": "555-5555",
                "monthly_income": 5000.00,
                "notes": "Good tenant reference",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["ssn_last_four"] == "1234"
        assert data["employer"] == "ABC Corp"
        assert float(data["monthly_income"]) == 5000.00

    def test_list_tenants(self, client, auth_headers, sample_tenant):
        """Test listing all tenants"""
        response = client.get("/api/tenants", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(t["id"] == sample_tenant["id"] for t in data)

    def test_list_tenants_filter_active(self, client, auth_headers, sample_tenant):
        """Test filtering tenants by active status"""
        response = client.get("/api/tenants?active_only=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert all(t["is_active"] for t in data)

    def test_get_tenant(self, client, auth_headers, sample_tenant):
        """Test getting a specific tenant"""
        response = client.get(f"/api/tenants/{sample_tenant['id']}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_tenant["id"]
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"

    def test_get_tenant_not_found(self, client, auth_headers):
        """Test getting a non-existent tenant"""
        response = client.get("/api/tenants/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_tenant(self, client, auth_headers, sample_tenant):
        """Test updating a tenant"""
        response = client.put(
            f"/api/tenants/{sample_tenant['id']}",
            json={"first_name": "Johnny", "phone": "555-0000"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Johnny"
        assert data["phone"] == "555-0000"
        assert data["last_name"] == "Doe"  # Unchanged

    def test_delete_tenant(self, client, auth_headers, sample_tenant):
        """Test deleting a tenant"""
        response = client.delete(f"/api/tenants/{sample_tenant['id']}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/tenants/{sample_tenant['id']}", headers=auth_headers)
        assert response.status_code == 404


class TestCHAVoucher:
    """Test CHA voucher management"""

    def test_create_voucher(self, client, auth_headers, sample_tenant):
        """Test creating a CHA voucher for a tenant"""
        response = client.post(
            f"/api/tenants/{sample_tenant['id']}/voucher",
            json={
                "voucher_number": "CHA-2026-100",
                "status": "active",
                "hap_amount": 1000.00,
                "tenant_portion": 400.00,
                "bedroom_size": 3,
                "cha_case_worker": "Mary Case",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["voucher_number"] == "CHA-2026-100"
        assert float(data["hap_amount"]) == 1000.00
        assert data["cha_case_worker"] == "Mary Case"

    def test_get_voucher(self, client, auth_headers, sample_tenant_with_voucher):
        """Test getting a tenant's CHA voucher"""
        tenant_id = sample_tenant_with_voucher["id"]
        response = client.get(f"/api/tenants/{tenant_id}/voucher", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["voucher_number"] == "CHA-2026-001"

    def test_update_voucher(self, client, auth_headers, sample_tenant_with_voucher):
        """Test updating a CHA voucher"""
        tenant_id = sample_tenant_with_voucher["id"]
        response = client.put(
            f"/api/tenants/{tenant_id}/voucher",
            json={"hap_amount": 1300.00, "status": "suspended"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["hap_amount"]) == 1300.00
        assert data["status"] == "suspended"

    def test_delete_voucher(self, client, auth_headers, sample_tenant_with_voucher):
        """Test deleting a CHA voucher"""
        tenant_id = sample_tenant_with_voucher["id"]
        response = client.delete(f"/api/tenants/{tenant_id}/voucher", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/tenants/{tenant_id}/voucher", headers=auth_headers)
        assert response.status_code == 404

