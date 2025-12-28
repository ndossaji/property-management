"""
Owner Routes
CRUD API endpoints for managing property owners
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Owner
from app.schemas import OwnerCreate, OwnerUpdate, OwnerResponse, OwnerWithProperties
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/owners", tags=["owners"])


@router.get("", response_model=List[OwnerResponse])
async def list_owners(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all owners with optional search and pagination"""
    query = db.query(Owner)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Owner.name.ilike(search_term)) | (Owner.email.ilike(search_term))
        )
    
    owners = query.order_by(Owner.name).offset(skip).limit(limit).all()
    return owners


@router.get("/{owner_id}", response_model=OwnerWithProperties)
async def get_owner(
    owner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific owner by ID with their properties"""
    owner = db.query(Owner).filter(Owner.id == owner_id).first()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner with id {owner_id} not found"
        )
    return owner


@router.post("", response_model=OwnerResponse, status_code=status.HTTP_201_CREATED)
async def create_owner(
    owner_data: OwnerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new owner"""
    # Check if email already exists
    if owner_data.email:
        existing = db.query(Owner).filter(Owner.email == owner_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An owner with this email already exists"
            )
    
    owner = Owner(**owner_data.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: int,
    owner_data: OwnerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing owner"""
    owner = db.query(Owner).filter(Owner.id == owner_id).first()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner with id {owner_id} not found"
        )
    
    # Check email uniqueness if being updated
    if owner_data.email and owner_data.email != owner.email:
        existing = db.query(Owner).filter(Owner.email == owner_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An owner with this email already exists"
            )
    
    update_data = owner_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)
    
    db.commit()
    db.refresh(owner)
    return owner


@router.delete("/{owner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_owner(
    owner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an owner"""
    owner = db.query(Owner).filter(Owner.id == owner_id).first()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Owner with id {owner_id} not found"
        )
    
    # Check if owner has properties
    if owner.properties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete owner with associated properties. Remove properties first."
        )
    
    db.delete(owner)
    db.commit()
    return None

