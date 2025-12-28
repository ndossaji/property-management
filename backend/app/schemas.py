"""
Pydantic Schemas
Request and response schemas for the Property Management API
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models import PropertyStatus, PropertyType


# ============================================================================
# Owner Schemas
# ============================================================================

class OwnerBase(BaseModel):
    """Base schema for Owner"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    notes: Optional[str] = None


class OwnerCreate(OwnerBase):
    """Schema for creating an Owner"""
    pass


class OwnerUpdate(BaseModel):
    """Schema for updating an Owner"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    notes: Optional[str] = None


class OwnerResponse(OwnerBase):
    """Schema for Owner response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OwnerWithProperties(OwnerResponse):
    """Schema for Owner with their properties"""
    properties: List["PropertyResponse"] = []

    class Config:
        from_attributes = True


# ============================================================================
# Property Schemas
# ============================================================================

class PropertyBase(BaseModel):
    """Base schema for Property"""
    street_address: str = Field(..., min_length=1, max_length=255)
    unit_number: Optional[str] = Field(None, max_length=50)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=50)
    zip_code: str = Field(..., min_length=1, max_length=20)
    country: str = Field(default="USA", max_length=100)
    
    nickname: Optional[str] = Field(None, max_length=100)
    property_type: PropertyType = PropertyType.SINGLE_FAMILY
    status: PropertyStatus = PropertyStatus.ACTIVE
    
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    square_feet: Optional[int] = Field(None, ge=0)
    year_built: Optional[int] = Field(None, ge=1800, le=2100)
    notes: Optional[str] = None
    
    owner_id: Optional[int] = None


class PropertyCreate(PropertyBase):
    """Schema for creating a Property"""
    pass


class PropertyUpdate(BaseModel):
    """Schema for updating a Property"""
    street_address: Optional[str] = Field(None, min_length=1, max_length=255)
    unit_number: Optional[str] = Field(None, max_length=50)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=50)
    zip_code: Optional[str] = Field(None, min_length=1, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    nickname: Optional[str] = Field(None, max_length=100)
    property_type: Optional[PropertyType] = None
    status: Optional[PropertyStatus] = None
    
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    square_feet: Optional[int] = Field(None, ge=0)
    year_built: Optional[int] = Field(None, ge=1800, le=2100)
    notes: Optional[str] = None
    
    owner_id: Optional[int] = None


class PropertyResponse(PropertyBase):
    """Schema for Property response"""
    id: int
    full_address: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PropertyWithOwner(PropertyResponse):
    """Schema for Property with owner details"""
    owner: Optional[OwnerResponse] = None

    class Config:
        from_attributes = True


# Update forward references
OwnerWithProperties.model_rebuild()

