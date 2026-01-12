"""
Owner Payment Routes
CRUD API endpoints for managing payments from owners to property management
"""

import os
import uuid
from typing import List, Optional
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import OwnerPayment, OwnerPaymentAttachment, Owner, Property, PaymentMethod, Expense
from app.schemas import (
    OwnerPaymentCreate, OwnerPaymentUpdate, OwnerPaymentResponse,
    OwnerPaymentWithDetails, OwnerPaymentSummary,
    PropertyBalanceResponse, PropertyBalancesSummary,
    OwnerPaymentAttachmentResponse
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/owner-payments", tags=["owner-payments"])

# Upload directory for owner payment attachments
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "owner_payments")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_FILE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


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


@router.get("/property-balances", response_model=PropertyBalancesSummary)
async def get_property_balances(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get balances for all properties showing expenses vs payments received from owners"""
    # Get all properties
    properties = db.query(Property).all()

    # Get expenses grouped by property
    expenses_by_property = {}
    expenses_query = db.query(
        Expense.property_id,
        func.sum(Expense.amount)
    ).group_by(Expense.property_id).all()
    for prop_id, total in expenses_query:
        expenses_by_property[prop_id] = total or Decimal('0')

    # Get owner payments grouped by property
    payments_by_property = {}
    payments_query = db.query(
        OwnerPayment.property_id,
        func.sum(OwnerPayment.amount)
    ).filter(OwnerPayment.property_id.isnot(None)).group_by(OwnerPayment.property_id).all()
    for prop_id, total in payments_query:
        payments_by_property[prop_id] = total or Decimal('0')

    # Build response
    property_balances = []
    total_expenses = Decimal('0')
    total_payments = Decimal('0')

    for prop in properties:
        prop_expenses = expenses_by_property.get(prop.id, Decimal('0'))
        prop_payments = payments_by_property.get(prop.id, Decimal('0'))
        balance = prop_expenses - prop_payments

        total_expenses += prop_expenses
        total_payments += prop_payments

        # Get owner names for this property
        owner_names = [owner.name for owner in prop.owners] if prop.owners else []

        property_balances.append(PropertyBalanceResponse(
            property_id=prop.id,
            property_address=prop.full_address,
            property_nickname=prop.nickname,
            total_expenses=prop_expenses,
            total_payments=prop_payments,
            balance_owed=balance,
            owner_names=owner_names
        ))

    # Sort by balance owed (highest first)
    property_balances.sort(key=lambda x: x.balance_owed, reverse=True)

    return PropertyBalancesSummary(
        properties=property_balances,
        total_expenses=total_expenses,
        total_payments=total_payments,
        total_balance_owed=total_expenses - total_payments
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


# ============================================================================
# Attachment Endpoints
# ============================================================================

@router.post("/{payment_id}/attachments", response_model=OwnerPaymentAttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    payment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload an attachment for an owner payment"""
    # Verify payment exists
    payment = db.query(OwnerPayment).filter(OwnerPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner payment with id {payment_id} not found"
        )

    # Validate file type
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}"
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create attachment record
    attachment = OwnerPaymentAttachment(
        filename=unique_filename,
        original_filename=file.filename or "attachment",
        file_path=file_path,
        content_type=file.content_type,
        file_size=len(content),
        payment_id=payment_id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{payment_id}/attachments/{attachment_id}/download")
async def download_attachment(
    payment_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Download an attachment file"""
    attachment = db.query(OwnerPaymentAttachment).filter(
        OwnerPaymentAttachment.id == attachment_id,
        OwnerPaymentAttachment.payment_id == payment_id
    ).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    if not os.path.exists(attachment.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found on server"
        )

    return FileResponse(
        attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.content_type
    )


@router.delete("/{payment_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    payment_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an attachment"""
    attachment = db.query(OwnerPaymentAttachment).filter(
        OwnerPaymentAttachment.id == attachment_id,
        OwnerPaymentAttachment.payment_id == payment_id
    ).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Delete file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()
    return None
