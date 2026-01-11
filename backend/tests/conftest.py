"""
Test Configuration and Fixtures
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import timedelta

from app.main import app
from app.database import get_db
from app.models import Base
from app.auth import create_access_token


# Create test database (in-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for tests"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with overridden database"""
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    
    with TestClient(app) as test_client:
        yield test_client
    
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Create authentication headers for testing"""
    token = create_access_token(
        data={"sub": "admin"},
        expires_delta=timedelta(minutes=30)
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_owner(client, auth_headers):
    """Create a sample owner for testing"""
    response = client.post(
        "/api/owners",
        json={"name": "Test Owner", "email": "owner@test.com", "phone": "555-1234"},
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def sample_property(client, auth_headers, sample_owner):
    """Create a sample property for testing"""
    response = client.post(
        "/api/properties",
        json={
            "street_address": "123 Test St",
            "city": "Chicago",
            "state": "IL",
            "zip_code": "60601",
            "property_type": "single_family",
            "status": "active",
            "owner_id": sample_owner["id"],
        },
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def sample_tenant(client, auth_headers):
    """Create a sample tenant for testing"""
    response = client.post(
        "/api/tenants",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@test.com",
            "phone": "555-9876",
        },
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def sample_tenant_with_voucher(client, auth_headers):
    """Create a sample tenant with CHA voucher for testing"""
    tenant_response = client.post(
        "/api/tenants",
        json={
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@test.com",
            "phone": "555-4321",
        },
        headers=auth_headers,
    )
    tenant = tenant_response.json()
    
    # Add CHA voucher
    voucher_response = client.post(
        f"/api/tenants/{tenant['id']}/voucher",
        json={
            "voucher_number": "CHA-2026-001",
            "status": "active",
            "hap_amount": 1200.00,
            "tenant_portion": 300.00,
            "bedroom_size": 2,
        },
        headers=auth_headers,
    )
    
    # Refresh tenant to include voucher
    get_response = client.get(f"/api/tenants/{tenant['id']}", headers=auth_headers)
    return get_response.json()


@pytest.fixture
def sample_lease(client, auth_headers, sample_tenant, sample_property):
    """Create a sample lease for testing"""
    response = client.post(
        "/api/leases",
        json={
            "tenant_id": sample_tenant["id"],
            "property_id": sample_property["id"],
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "monthly_rent": 1500.00,
            "security_deposit": 1500.00,
            "status": "active",
        },
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def sample_expense(client, auth_headers, sample_property):
    """Create a sample expense for testing"""
    response = client.post(
        "/api/expenses",
        json={
            "description": "Sample maintenance expense",
            "amount": 150.00,
            "category": "maintenance",
            "expense_date": "2026-01-05",
            "property_id": sample_property["id"],
            "vendor": "Test Vendor",
            "paid_by": "unpaid",
        },
        headers=auth_headers,
    )
    return response.json()

