"""
Pydantic Schemas
Request and response schemas for the Property Management API
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models import PropertyStatus, PropertyType, ExpenseCategory


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


# ============================================================================
# Expense Schemas
# ============================================================================

class ExpenseReceiptBase(BaseModel):
    """Base schema for ExpenseReceipt"""
    filename: str
    original_filename: str
    file_path: str
    content_type: Optional[str] = None
    file_size: Optional[int] = None


class ExpenseReceiptResponse(ExpenseReceiptBase):
    """Schema for ExpenseReceipt response"""
    id: int
    expense_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseBase(BaseModel):
    """Base schema for Expense"""
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal = Field(..., gt=0)
    category: ExpenseCategory = ExpenseCategory.OTHER
    expense_date: date
    vendor: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    property_id: int


class ExpenseCreate(ExpenseBase):
    """Schema for creating an Expense"""
    pass


class ExpenseUpdate(BaseModel):
    """Schema for updating an Expense"""
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[Decimal] = Field(None, gt=0)
    category: Optional[ExpenseCategory] = None
    expense_date: Optional[date] = None
    vendor: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    property_id: Optional[int] = None


class ExpenseResponse(ExpenseBase):
    """Schema for Expense response"""
    id: int
    created_at: datetime
    updated_at: datetime
    receipts: List[ExpenseReceiptResponse] = []

    class Config:
        from_attributes = True


class ExpenseWithProperty(ExpenseResponse):
    """Schema for Expense with property details"""
    property: Optional[PropertyResponse] = None

    class Config:
        from_attributes = True


class BulkExpenseCreate(BaseModel):
    """Schema for bulk expense creation from CSV"""
    expenses: List[ExpenseCreate]


class BulkExpenseResult(BaseModel):
    """Schema for bulk expense creation result"""
    success_count: int
    error_count: int
    errors: List[str] = []
