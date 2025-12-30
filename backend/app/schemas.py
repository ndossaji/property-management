"""
Pydantic Schemas
Request and response schemas for the Property Management API
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models import PropertyStatus, PropertyType, ExpenseCategory, CustomFieldType


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


class PropertyCreate(PropertyBase):
    """Schema for creating a Property"""
    owner_ids: List[int] = Field(default_factory=list, description="List of owner IDs to assign to this property")
    custom_fields: Optional[Dict[int, str]] = Field(None, description="Custom field values keyed by field_id")


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

    owner_ids: Optional[List[int]] = Field(None, description="List of owner IDs to assign to this property")
    custom_fields: Optional[Dict[int, str]] = Field(None, description="Custom field values keyed by field_id")


class PropertyResponse(PropertyBase):
    """Schema for Property response"""
    id: int
    full_address: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PropertyWithOwners(PropertyResponse):
    """Schema for Property with owner details"""
    owners: List[OwnerResponse] = []

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
    custom_fields: Dict[int, str] = Field(default_factory=dict, description="Custom field values keyed by field_id")


class ExpenseUpdate(BaseModel):
    """Schema for updating an Expense"""
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[Decimal] = Field(None, gt=0)
    category: Optional[ExpenseCategory] = None
    expense_date: Optional[date] = None
    vendor: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    property_id: Optional[int] = None
    custom_fields: Optional[Dict[int, str]] = Field(None, description="Custom field values keyed by field_id")


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


# ============================================================================
# Custom Field Schemas
# ============================================================================

class CustomFieldOptionBase(BaseModel):
    """Base schema for CustomFieldOption"""
    value: str = Field(..., min_length=1, max_length=255)
    label: str = Field(..., min_length=1, max_length=255)
    display_order: int = Field(default=0)


class CustomFieldOptionCreate(CustomFieldOptionBase):
    """Schema for creating a CustomFieldOption"""
    pass


class CustomFieldOptionResponse(CustomFieldOptionBase):
    """Schema for CustomFieldOption response"""
    id: int
    field_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CustomFieldBase(BaseModel):
    """Base schema for CustomField"""
    name: str = Field(..., min_length=1, max_length=255)
    field_type: CustomFieldType
    entity_type: str = Field(..., pattern="^(expense|property)$")
    is_required: bool = Field(default=False)
    display_order: int = Field(default=0)


class CustomFieldCreate(CustomFieldBase):
    """Schema for creating a CustomField"""
    options: List[CustomFieldOptionCreate] = Field(default_factory=list)


class CustomFieldUpdate(BaseModel):
    """Schema for updating a CustomField"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    is_required: Optional[bool] = None
    display_order: Optional[int] = None
    options: Optional[List[CustomFieldOptionCreate]] = None


class CustomFieldResponse(CustomFieldBase):
    """Schema for CustomField response"""
    id: int
    created_at: datetime
    updated_at: datetime
    options: List[CustomFieldOptionResponse] = []

    class Config:
        from_attributes = True


class ExpenseCustomFieldValueBase(BaseModel):
    """Base schema for ExpenseCustomFieldValue"""
    field_id: int
    value: Optional[str] = None


class ExpenseCustomFieldValueResponse(ExpenseCustomFieldValueBase):
    """Schema for ExpenseCustomFieldValue response"""
    id: int
    expense_id: int
    field: CustomFieldResponse
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
