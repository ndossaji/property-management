"""
Custom Field Routes
CRUD API endpoints for managing custom fields and their options
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CustomField, CustomFieldOption
from app.schemas import (
    CustomFieldCreate, CustomFieldUpdate, CustomFieldResponse
)
from app.auth import get_current_active_user, User

router = APIRouter(prefix="/api/custom-fields", tags=["custom-fields"])


@router.get("", response_model=List[CustomFieldResponse])
async def list_custom_fields(
    entity_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all custom fields, optionally filtered by entity type"""
    query = db.query(CustomField)
    if entity_type:
        query = query.filter(CustomField.entity_type == entity_type)
    return query.order_by(CustomField.display_order, CustomField.created_at).all()


@router.get("/{field_id}", response_model=CustomFieldResponse)
async def get_custom_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a specific custom field by ID"""
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Custom field with id {field_id} not found"
        )
    return field


@router.post("", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_field(
    field_data: CustomFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new custom field with options"""
    # Create the custom field
    field = CustomField(
        name=field_data.name,
        field_type=field_data.field_type,
        entity_type=field_data.entity_type,
        is_required=field_data.is_required,
        display_order=field_data.display_order
    )
    db.add(field)
    db.flush()  # Get the field ID
    
    # Create options if provided
    for option_data in field_data.options:
        option = CustomFieldOption(
            field_id=field.id,
            value=option_data.value,
            label=option_data.label,
            display_order=option_data.display_order
        )
        db.add(option)
    
    db.commit()
    db.refresh(field)
    return field


@router.put("/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: int,
    field_data: CustomFieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing custom field"""
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Custom field with id {field_id} not found"
        )
    
    # Update basic fields
    if field_data.name is not None:
        field.name = field_data.name
    if field_data.is_required is not None:
        field.is_required = field_data.is_required
    if field_data.display_order is not None:
        field.display_order = field_data.display_order
    
    # Update options if provided
    if field_data.options is not None:
        # Delete existing options
        db.query(CustomFieldOption).filter(CustomFieldOption.field_id == field_id).delete()
        
        # Create new options
        for option_data in field_data.options:
            option = CustomFieldOption(
                field_id=field.id,
                value=option_data.value,
                label=option_data.label,
                display_order=option_data.display_order
            )
            db.add(option)
    
    db.commit()
    db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a custom field"""
    field = db.query(CustomField).filter(CustomField.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Custom field with id {field_id} not found"
        )
    
    db.delete(field)
    db.commit()
    return None

