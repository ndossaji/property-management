"""
Rent Payment and Late Fee Routes
CRUD API endpoints for managing rent payments and late fees
"""

from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import RentPayment, LateFee, Lease, PaymentStatus, PaymentMethod
from app.schemas import (
    RentPaymentCreate, RentPaymentUpdate, RentPaymentResponse, RentPaymentWithLease,
    LateFeeCreate, LateFeeUpdate, LateFeeResponse, LateFeeWithLease,
    RentPaymentSummary
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/payments", tags=["rent-payments"])


@router.get("", response_model=List[RentPaymentWithLease])
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    status: Optional[PaymentStatus] = Query(None, description="Filter by payment status"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    is_cha_payment: Optional[bool] = Query(None, description="Filter CHA payments"),
    start_date: Optional[date] = Query(None, description="Filter by payment date start"),
    end_date: Optional[date] = Query(None, description="Filter by payment date end"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all rent payments with optional filtering"""
    query = db.query(RentPayment)
    
    if lease_id:
        query = query.filter(RentPayment.lease_id == lease_id)
    
    if status:
        query = query.filter(RentPayment.status == status)
    
    if payment_method:
        query = query.filter(RentPayment.payment_method == payment_method)
    
    if is_cha_payment is not None:
        query = query.filter(RentPayment.is_cha_payment == is_cha_payment)
    
    if start_date:
        query = query.filter(RentPayment.payment_date >= start_date)
    
    if end_date:
        query = query.filter(RentPayment.payment_date <= end_date)
    
    payments = query.order_by(RentPayment.payment_date.desc()).offset(skip).limit(limit).all()
    return payments


@router.get("/summary/{lease_id}", response_model=RentPaymentSummary)
async def get_payment_summary(
    lease_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get payment summary for a lease"""
    lease = db.query(Lease).filter(Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {lease_id} not found"
        )
    
    # Calculate expected rent (simplified - based on number of months)
    from dateutil.relativedelta import relativedelta
    months = 0
    current = lease.start_date
    end = min(lease.end_date, date.today())
    while current <= end:
        months += 1
        current += relativedelta(months=1)
    
    total_expected = Decimal(str(lease.monthly_rent)) * months
    
    # Get total paid
    total_paid = db.query(func.sum(RentPayment.amount)).filter(
        RentPayment.lease_id == lease_id,
        RentPayment.status == PaymentStatus.COMPLETED
    ).scalar() or Decimal('0')
    
    # Get payment count
    payments_count = db.query(RentPayment).filter(RentPayment.lease_id == lease_id).count()
    
    # Get late fees
    total_late_fees = db.query(func.sum(LateFee.amount)).filter(
        LateFee.lease_id == lease_id
    ).scalar() or Decimal('0')
    
    total_late_fees_paid = db.query(func.sum(LateFee.amount)).filter(
        LateFee.lease_id == lease_id,
        LateFee.is_paid == True
    ).scalar() or Decimal('0')
    
    late_fees_count = db.query(LateFee).filter(LateFee.lease_id == lease_id).count()
    
    return RentPaymentSummary(
        total_expected=total_expected,
        total_paid=total_paid,
        total_outstanding=total_expected - total_paid,
        total_late_fees=total_late_fees,
        total_late_fees_paid=total_late_fees_paid,
        total_late_fees_outstanding=total_late_fees - total_late_fees_paid,
        payments_count=payments_count,
        late_fees_count=late_fees_count
    )


@router.get("/{payment_id}", response_model=RentPaymentWithLease)
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific rent payment by ID"""
    payment = db.query(RentPayment).filter(RentPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with id {payment_id} not found"
        )
    return payment


@router.post("", response_model=RentPaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: RentPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new rent payment"""
    # Verify lease exists
    lease = db.query(Lease).filter(Lease.id == payment_data.lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {payment_data.lease_id} not found"
        )

    payment = RentPayment(**payment_data.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=RentPaymentResponse)
async def update_payment(
    payment_id: int,
    payment_data: RentPaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing rent payment"""
    payment = db.query(RentPayment).filter(RentPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with id {payment_id} not found"
        )

    update_data = payment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a rent payment"""
    payment = db.query(RentPayment).filter(RentPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with id {payment_id} not found"
        )

    db.delete(payment)
    db.commit()
    return None


# ============================================================================
# Late Fee Routes
# ============================================================================

late_fee_router = APIRouter(prefix="/api/late-fees", tags=["late-fees"])


@late_fee_router.get("", response_model=List[LateFeeWithLease])
async def list_late_fees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    lease_id: Optional[int] = Query(None, description="Filter by lease"),
    is_paid: Optional[bool] = Query(None, description="Filter by paid status"),
    is_waived: Optional[bool] = Query(None, description="Filter by waived status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all late fees with optional filtering"""
    query = db.query(LateFee)

    if lease_id:
        query = query.filter(LateFee.lease_id == lease_id)

    if is_paid is not None:
        query = query.filter(LateFee.is_paid == is_paid)

    if is_waived is not None:
        query = query.filter(LateFee.is_waived == is_waived)

    late_fees = query.order_by(LateFee.fee_date.desc()).offset(skip).limit(limit).all()
    return late_fees


@late_fee_router.get("/{late_fee_id}", response_model=LateFeeWithLease)
async def get_late_fee(
    late_fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific late fee by ID"""
    late_fee = db.query(LateFee).filter(LateFee.id == late_fee_id).first()
    if not late_fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Late fee with id {late_fee_id} not found"
        )
    return late_fee


@late_fee_router.post("", response_model=LateFeeResponse, status_code=status.HTTP_201_CREATED)
async def create_late_fee(
    late_fee_data: LateFeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new late fee"""
    # Verify lease exists
    lease = db.query(Lease).filter(Lease.id == late_fee_data.lease_id).first()
    if not lease:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lease with id {late_fee_data.lease_id} not found"
        )

    late_fee = LateFee(**late_fee_data.model_dump())
    db.add(late_fee)
    db.commit()
    db.refresh(late_fee)
    return late_fee


@late_fee_router.put("/{late_fee_id}", response_model=LateFeeResponse)
async def update_late_fee(
    late_fee_id: int,
    late_fee_data: LateFeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing late fee"""
    late_fee = db.query(LateFee).filter(LateFee.id == late_fee_id).first()
    if not late_fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Late fee with id {late_fee_id} not found"
        )

    update_data = late_fee_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(late_fee, field, value)

    db.commit()
    db.refresh(late_fee)
    return late_fee


@late_fee_router.post("/{late_fee_id}/pay", response_model=LateFeeResponse)
async def mark_late_fee_paid(
    late_fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark a late fee as paid"""
    late_fee = db.query(LateFee).filter(LateFee.id == late_fee_id).first()
    if not late_fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Late fee with id {late_fee_id} not found"
        )

    if late_fee.is_waived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark a waived late fee as paid"
        )

    late_fee.is_paid = True
    late_fee.paid_date = date.today()
    db.commit()
    db.refresh(late_fee)
    return late_fee


@late_fee_router.post("/{late_fee_id}/waive", response_model=LateFeeResponse)
async def waive_late_fee(
    late_fee_id: int,
    reason: str = Query(..., description="Reason for waiving the late fee"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Waive a late fee"""
    late_fee = db.query(LateFee).filter(LateFee.id == late_fee_id).first()
    if not late_fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Late fee with id {late_fee_id} not found"
        )

    if late_fee.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot waive a paid late fee"
        )

    late_fee.is_waived = True
    late_fee.waived_date = date.today()
    late_fee.waived_reason = reason
    db.commit()
    db.refresh(late_fee)
    return late_fee


@late_fee_router.delete("/{late_fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_late_fee(
    late_fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a late fee"""
    late_fee = db.query(LateFee).filter(LateFee.id == late_fee_id).first()
    if not late_fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Late fee with id {late_fee_id} not found"
        )

    db.delete(late_fee)
    db.commit()
    return None

