"""
Property Routes
CRUD API endpoints for managing properties
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Property, Owner, PropertyStatus, PropertyType
from app.schemas import PropertyCreate, PropertyUpdate, PropertyResponse, PropertyWithOwner
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/properties", tags=["properties"])


@router.get("", response_model=List[PropertyWithOwner])
async def list_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: str = Query(None, description="Search by address or nickname"),
    owner_id: Optional[int] = Query(None, description="Filter by owner"),
    status: Optional[PropertyStatus] = Query(None, description="Filter by status"),
    property_type: Optional[PropertyType] = Query(None, description="Filter by type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all properties with optional filtering and pagination"""
    query = db.query(Property)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Property.street_address.ilike(search_term)) |
            (Property.nickname.ilike(search_term)) |
            (Property.city.ilike(search_term))
        )
    
    if owner_id is not None:
        query = query.filter(Property.owner_id == owner_id)
    
    if status is not None:
        query = query.filter(Property.status == status)
    
    if property_type is not None:
        query = query.filter(Property.property_type == property_type)
    
    properties = query.order_by(Property.created_at.desc()).offset(skip).limit(limit).all()
    return properties


@router.get("/{property_id}", response_model=PropertyWithOwner)
async def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific property by ID with owner details"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with id {property_id} not found"
        )
    return property


@router.post("", response_model=PropertyWithOwner, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new property"""
    # Verify owner exists if provided
    if property_data.owner_id:
        owner = db.query(Owner).filter(Owner.id == property_data.owner_id).first()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Owner with id {property_data.owner_id} not found"
            )
    
    property = Property(**property_data.model_dump())
    db.add(property)
    db.commit()
    db.refresh(property)
    return property


@router.put("/{property_id}", response_model=PropertyWithOwner)
async def update_property(
    property_id: int,
    property_data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing property"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with id {property_id} not found"
        )
    
    # Verify new owner exists if being updated
    if property_data.owner_id is not None:
        if property_data.owner_id != 0:  # Allow setting to null with 0
            owner = db.query(Owner).filter(Owner.id == property_data.owner_id).first()
            if not owner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Owner with id {property_data.owner_id} not found"
                )
    
    update_data = property_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property, field, value)
    
    db.commit()
    db.refresh(property)
    return property


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a property"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property with id {property_id} not found"
        )
    
    db.delete(property)
    db.commit()
    return None

