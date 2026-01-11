"""
Tenant Routes
CRUD API endpoints for managing tenants and CHA vouchers
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Tenant, CHAVoucher, CHAVoucherStatus
from app.schemas import (
    TenantCreate, TenantUpdate, TenantResponse, TenantWithVoucher, TenantWithLeases,
    TenantWithProperty,
    CHAVoucherCreate, CHAVoucherUpdate, CHAVoucherResponse
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/tenants", tags=["tenants"])


@router.get("", response_model=List[TenantWithVoucher])
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(None, description="Search by name, email, or phone"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    has_voucher: Optional[bool] = Query(None, description="Filter by CHA voucher status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all tenants with optional filtering and pagination"""
    query = db.query(Tenant)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Tenant.first_name.ilike(search_term)) |
            (Tenant.last_name.ilike(search_term)) |
            (Tenant.email.ilike(search_term)) |
            (Tenant.phone.ilike(search_term))
        )
    
    if is_active is not None:
        query = query.filter(Tenant.is_active == is_active)
    
    if has_voucher is not None:
        if has_voucher:
            query = query.filter(Tenant.cha_voucher != None)
        else:
            query = query.filter(Tenant.cha_voucher == None)
    
    tenants = query.order_by(Tenant.last_name, Tenant.first_name).offset(skip).limit(limit).all()
    return tenants


@router.get("/{tenant_id}", response_model=TenantWithLeases)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific tenant by ID with their leases and voucher information"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )
    return tenant


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new tenant"""
    tenant = Tenant(**tenant_data.model_dump())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    tenant_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )
    
    update_data = tenant_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)
    
    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )
    
    # Check if tenant has active leases
    active_leases = [l for l in tenant.leases if l.status in ['active', 'draft']]
    if active_leases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete tenant with active leases. Terminate leases first."
        )
    
    db.delete(tenant)
    db.commit()
    return None


# ============================================================================
# CHA Voucher Endpoints
# ============================================================================

@router.get("/{tenant_id}/voucher", response_model=CHAVoucherResponse)
async def get_tenant_voucher(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a tenant's CHA voucher"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )

    if not tenant.cha_voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} does not have a CHA voucher"
        )

    return tenant.cha_voucher


@router.post("/{tenant_id}/voucher", response_model=CHAVoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant_voucher(
    tenant_id: int,
    voucher_data: CHAVoucherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a CHA voucher for a tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )

    if tenant.cha_voucher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant already has a CHA voucher"
        )

    # Check if voucher number already exists
    existing = db.query(CHAVoucher).filter(CHAVoucher.voucher_number == voucher_data.voucher_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A voucher with this number already exists"
        )

    voucher = CHAVoucher(**voucher_data.model_dump())
    voucher.tenant_id = tenant_id
    db.add(voucher)
    db.commit()
    db.refresh(voucher)
    return voucher


@router.put("/{tenant_id}/voucher", response_model=CHAVoucherResponse)
async def update_tenant_voucher(
    tenant_id: int,
    voucher_data: CHAVoucherUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a tenant's CHA voucher"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )

    if not tenant.cha_voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} does not have a CHA voucher"
        )

    # Check voucher number uniqueness if being updated
    if voucher_data.voucher_number and voucher_data.voucher_number != tenant.cha_voucher.voucher_number:
        existing = db.query(CHAVoucher).filter(CHAVoucher.voucher_number == voucher_data.voucher_number).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A voucher with this number already exists"
            )

    update_data = voucher_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant.cha_voucher, field, value)

    db.commit()
    db.refresh(tenant.cha_voucher)
    return tenant.cha_voucher


@router.delete("/{tenant_id}/voucher", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant_voucher(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a tenant's CHA voucher"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} not found"
        )

    if not tenant.cha_voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with id {tenant_id} does not have a CHA voucher"
        )

    db.delete(tenant.cha_voucher)
    db.commit()
    return None


# ============================================================================
# Standalone CHA Voucher Routes
# ============================================================================

voucher_router = APIRouter(prefix="/api/vouchers", tags=["cha-vouchers"])


@voucher_router.get("", response_model=List[CHAVoucherResponse])
async def list_vouchers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[CHAVoucherStatus] = Query(None, description="Filter by voucher status"),
    search: str = Query(None, description="Search by voucher number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all CHA vouchers with optional filtering"""
    query = db.query(CHAVoucher)

    if status:
        query = query.filter(CHAVoucher.status == status)

    if search:
        query = query.filter(CHAVoucher.voucher_number.ilike(f"%{search}%"))

    vouchers = query.order_by(CHAVoucher.voucher_number).offset(skip).limit(limit).all()
    return vouchers


@voucher_router.get("/{voucher_id}", response_model=CHAVoucherResponse)
async def get_voucher(
    voucher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific CHA voucher by ID"""
    voucher = db.query(CHAVoucher).filter(CHAVoucher.id == voucher_id).first()
    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CHA Voucher with id {voucher_id} not found"
        )
    return voucher

