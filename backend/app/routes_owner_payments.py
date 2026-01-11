"""
Owner Payment Routes
CRUD API endpoints for managing payments from owners to property management
"""

from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import OwnerPayment, Owner, Property, PaymentMethod
from app.schemas import (
    OwnerPaymentCreate, OwnerPaymentUpdate, OwnerPaymentResponse,
    OwnerPaymentWithDetails, OwnerPaymentSummary
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/owner-payments", tags=["owner-payments"])


@router.get("", response_model=List[OwnerPaymentWithDetails])
async def list_owner_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    owner_id: Optional[int] = Query(None, description="Filter by owner"),
    property_id: Optional[int] = Query(None, description="Filter by property"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    start_date: Optional[date] = Query(None, description="Filter by payment date start"),
    end_date: Optional[date] = Query(None, description="Filter by payment date end"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all owner payments with optional filtering"""
    query = db.query(OwnerPayment)

    if owner_id:
        query = query.filter(OwnerPayment.owner_id == owner_id)

    if property_id:
        query = query.filter(OwnerPayment.property_id == property_id)

    if payment_method:
        query = query.filter(OwnerPayment.payment_method == payment_method)

    if start_date:
        query = query.filter(OwnerPayment.payment_date >= start_date)

    if end_date:
        query = query.filter(OwnerPayment.payment_date <= end_date)

    payments = query.order_by(OwnerPayment.payment_date.desc()).offset(skip).limit(limit).all()
    return payments


@router.get("/summary", response_model=OwnerPaymentSummary)
async def get_owner_payments_summary(
    owner_id: Optional[int] = Query(None, description="Filter by owner"),
    property_id: Optional[int] = Query(None, description="Filter by property"),
    start_date: Optional[date] = Query(None, description="Filter by payment date start"),
    end_date: Optional[date] = Query(None, description="Filter by payment date end"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get summary of owner payments"""
    query = db.query(OwnerPayment)

    if owner_id:
        query = query.filter(OwnerPayment.owner_id == owner_id)

    if property_id:
        query = query.filter(OwnerPayment.property_id == property_id)

    if start_date:
        query = query.filter(OwnerPayment.payment_date >= start_date)

    if end_date:
        query = query.filter(OwnerPayment.payment_date <= end_date)

    # Get total
    total = query.with_entities(func.sum(OwnerPayment.amount)).scalar() or Decimal('0')
    count = query.count()

    # Get by owner
    by_owner_query = query.with_entities(
        OwnerPayment.owner_id,
        func.sum(OwnerPayment.amount)
    ).group_by(OwnerPayment.owner_id).all()
    by_owner = {row[0]: row[1] or Decimal('0') for row in by_owner_query}

    # Get by property
    by_property_query = query.filter(OwnerPayment.property_id.isnot(None)).with_entities(
        OwnerPayment.property_id,
        func.sum(OwnerPayment.amount)
    ).group_by(OwnerPayment.property_id).all()
    by_property = {row[0]: row[1] or Decimal('0') for row in by_property_query}

    return OwnerPaymentSummary(
        total_payments=total,
        payments_count=count,
        by_owner=by_owner,
        by_property=by_property
    )


@router.get("/{payment_id}", response_model=OwnerPaymentWithDetails)
async def get_owner_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific owner payment by ID"""
    payment = db.query(OwnerPayment).filter(OwnerPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner payment with id {payment_id} not found"
        )
    return payment


@router.post("", response_model=OwnerPaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_owner_payment(
    payment_data: OwnerPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new owner payment"""
    # Verify owner exists
    owner = db.query(Owner).filter(Owner.id == payment_data.owner_id).first()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner with id {payment_data.owner_id} not found"
        )

    # Verify property exists if provided
    if payment_data.property_id:
        prop = db.query(Property).filter(Property.id == payment_data.property_id).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property with id {payment_data.property_id} not found"
            )

    payment = OwnerPayment(**payment_data.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=OwnerPaymentResponse)
async def update_owner_payment(
    payment_id: int,
    payment_data: OwnerPaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing owner payment"""
    payment = db.query(OwnerPayment).filter(OwnerPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner payment with id {payment_id} not found"
        )

    update_data = payment_data.model_dump(exclude_unset=True)

    # Verify owner exists if updating
    if 'owner_id' in update_data:
        owner = db.query(Owner).filter(Owner.id == update_data['owner_id']).first()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Owner with id {update_data['owner_id']} not found"
            )

    # Verify property exists if updating
    if 'property_id' in update_data and update_data['property_id'] is not None:
        prop = db.query(Property).filter(Property.id == update_data['property_id']).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property with id {update_data['property_id']} not found"
            )

    for field, value in update_data.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_owner_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an owner payment"""
    payment = db.query(OwnerPayment).filter(OwnerPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner payment with id {payment_id} not found"
        )

    db.delete(payment)
    db.commit()
    return None

