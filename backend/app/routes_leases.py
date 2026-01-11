"""
Lease Routes
CRUD API endpoints for managing leases
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lease, Tenant, Property, LeaseStatus
from app.schemas import (
    LeaseCreate, LeaseUpdate, LeaseResponse, LeaseWithDetails, LeaseWithPayments
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/leases", tags=["leases"])


@router.get("", response_model=List[LeaseWithDetails])
async def list_leases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    tenant_id: Optional[int] = Query(None, description="Filter by tenant"),
    property_id: Optional[int] = Query(None, description="Filter by property"),
    status: Optional[LeaseStatus] = Query(None, description="Filter by lease status"),
    is_section_8: Optional[bool] = Query(None, description="Filter by Section 8 status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all leases with optional filtering and pagination"""
    query = db.query(Lease)
    
    if tenant_id:
        query = query.filter(Lease.tenant_id == tenant_id)
    
    if property_id:
        query = query.filter(Lease.property_id == property_id)
    
    if status:
        query = query.filter(Lease.status == status)
    
    if is_section_8 is not None:
        query = query.filter(Lease.is_section_8 == is_section_8)
    
    leases = query.order_by(Lease.start_date.desc()).offset(skip).limit(limit).all()
    return leases


@router.get("/{lease_id}", response_model=LeaseWithPayments)
async def get_lease(
    lease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific lease by ID with all payment and late fee details"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    return lease


@router.post("", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    lease_data: LeaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new lease"""
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == lease_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {lease_data.tenant_id} not found"
        )
    
    # Verify property exists
    property_obj = db.query(Property).filter(Property.id == lease_data.property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with id {lease_data.property_id} not found"
        )
    
    # Check for overlapping active leases on the same property
    if lease_data.status == LeaseStatus.ACTIVE:
        existing_active = db.query(Lease).filter(
            Lease.property_id == lease_data.property_id,
            Lease.status == LeaseStatus.ACTIVE,
            Lease.start_date <= lease_data.end_date,
            Lease.end_date >= lease_data.start_date
        ).first()
        if existing_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property already has an active lease for this period"
            )
    
    # Validate dates
    if lease_data.end_date <= lease_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    lease = Lease(**lease_data.model_dump())
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease


@router.put("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: int,
    lease_data: LeaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing lease"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    
    update_data = lease_data.model_dump(exclude_unset=True)
    
    # Validate dates if both are being updated
    start = update_data.get('start_date', lease.start_date)
    end = update_data.get('end_date', lease.end_date)
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    for field, value in update_data.items():
        setattr(lease, field, value)
    
    db.commit()
    db.refresh(lease)
    return lease


@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    lease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a lease (only if in draft status)"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )

    if lease.status != LeaseStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft leases can be deleted. Terminate the lease instead."
        )

    db.delete(lease)
    db.commit()
    return None


@router.post("/{lease_id}/activate", response_model=LeaseResponse)
async def activate_lease(
    lease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Activate a draft lease"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )

    if lease.status != LeaseStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft leases can be activated"
        )

    # Check for overlapping active leases
    existing_active = db.query(Lease).filter(
        Lease.property_id == lease.property_id,
        Lease.status == LeaseStatus.ACTIVE,
        Lease.id != lease_id,
        Lease.start_date <= lease.end_date,
        Lease.end_date >= lease.start_date
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property already has an active lease for this period"
        )

    lease.status = LeaseStatus.ACTIVE
    db.commit()
    db.refresh(lease)
    return lease


@router.post("/{lease_id}/terminate", response_model=LeaseResponse)
async def terminate_lease(
    lease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Terminate an active lease"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )

    if lease.status not in [LeaseStatus.ACTIVE, LeaseStatus.EXPIRED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active or expired leases can be terminated"
        )

    lease.status = LeaseStatus.TERMINATED
    db.commit()
    db.refresh(lease)
    return lease


@router.post("/{lease_id}/renew", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def renew_lease(
    lease_id: int,
    lease_data: LeaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Renew a lease by creating a new lease and marking the old one as renewed"""
    old_lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not old_lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )

    if old_lease.status not in [LeaseStatus.ACTIVE, LeaseStatus.EXPIRED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active or expired leases can be renewed"
        )

    # Mark old lease as renewed
    old_lease.status = LeaseStatus.RENEWED

    # Create new lease
    new_lease = Lease(**lease_data.model_dump())
    db.add(new_lease)
    db.commit()
    db.refresh(new_lease)
    return new_lease

