"""
Pydantic Schemas
Request and response schemas for the Property Management API
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models import (
    PropertyStatus, PropertyType, ExpenseCategory, CustomFieldType,
    LeaseStatus, PaymentStatus, PaymentMethod, CHAVoucherStatus, PaidBy
)


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
    paid_by: PaidBy = PaidBy.UNPAID
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
    paid_by: Optional[PaidBy] = None
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


# ============================================================================
# Tenant Schemas
# ============================================================================

class TenantBase(BaseModel):
    """Base schema for Tenant"""
    property_id: Optional[int] = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    alternate_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    ssn_last_four: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r'^\d{4}$')
    date_of_birth: Optional[date] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=100)
    employer: Optional[str] = Field(None, max_length=255)
    employer_phone: Optional[str] = Field(None, max_length=50)
    monthly_income: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    is_active: bool = True


class TenantCreate(TenantBase):
    """Schema for creating a Tenant"""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating a Tenant"""
    property_id: Optional[int] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    alternate_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    ssn_last_four: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r'^\d{4}$')
    date_of_birth: Optional[date] = None
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=100)
    employer: Optional[str] = Field(None, max_length=255)
    employer_phone: Optional[str] = Field(None, max_length=50)
    monthly_income: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class TenantResponse(TenantBase):
    """Schema for Tenant response"""
    id: int
    property_id: Optional[int] = None
    full_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantWithProperty(TenantResponse):
    """Schema for Tenant with property details"""
    property: Optional[PropertyResponse] = Field(None, validation_alias='assigned_property')

    class Config:
        from_attributes = True


# ============================================================================
# CHA Voucher Schemas
# ============================================================================

class CHAVoucherBase(BaseModel):
    """Base schema for CHA Voucher"""
    voucher_number: str = Field(..., min_length=1, max_length=100)
    status: CHAVoucherStatus = CHAVoucherStatus.PENDING
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    portability_date: Optional[date] = None
    payment_standard: Optional[Decimal] = Field(None, ge=0)
    hap_amount: Optional[Decimal] = Field(None, ge=0)
    tenant_portion: Optional[Decimal] = Field(None, ge=0)
    cha_case_worker: Optional[str] = Field(None, max_length=255)
    cha_case_worker_phone: Optional[str] = Field(None, max_length=50)
    cha_case_worker_email: Optional[EmailStr] = None
    bedroom_size: Optional[int] = Field(None, ge=0)
    is_portable: bool = False
    notes: Optional[str] = None


class CHAVoucherCreate(CHAVoucherBase):
    """Schema for creating a CHA Voucher"""
    tenant_id: Optional[int] = None  # Optional when creating via nested endpoint


class CHAVoucherUpdate(BaseModel):
    """Schema for updating a CHA Voucher"""
    voucher_number: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[CHAVoucherStatus] = None
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    portability_date: Optional[date] = None
    payment_standard: Optional[Decimal] = Field(None, ge=0)
    hap_amount: Optional[Decimal] = Field(None, ge=0)
    tenant_portion: Optional[Decimal] = Field(None, ge=0)
    cha_case_worker: Optional[str] = Field(None, max_length=255)
    cha_case_worker_phone: Optional[str] = Field(None, max_length=50)
    cha_case_worker_email: Optional[EmailStr] = None
    bedroom_size: Optional[int] = Field(None, ge=0)
    is_portable: Optional[bool] = None
    notes: Optional[str] = None


class CHAVoucherResponse(CHAVoucherBase):
    """Schema for CHA Voucher response"""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantWithVoucher(TenantResponse):
    """Schema for Tenant with CHA Voucher details and property"""
    property: Optional[PropertyResponse] = Field(None, validation_alias='assigned_property')
    cha_voucher: Optional[CHAVoucherResponse] = None

    class Config:
        from_attributes = True


# ============================================================================
# Lease Schemas
# ============================================================================

class LeaseBase(BaseModel):
    """Base schema for Lease"""
    start_date: date
    end_date: date
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    monthly_rent: Decimal = Field(..., gt=0)
    security_deposit: Optional[Decimal] = Field(None, ge=0)
    rent_due_day: int = Field(default=1, ge=1, le=31)
    grace_period_days: int = Field(default=5, ge=0)
    late_fee_amount: Optional[Decimal] = Field(None, ge=0)
    late_fee_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    daily_late_fee: Optional[Decimal] = Field(None, ge=0)
    is_section_8: bool = False
    cha_portion: Optional[Decimal] = Field(None, ge=0)
    tenant_portion: Optional[Decimal] = Field(None, ge=0)
    status: LeaseStatus = LeaseStatus.DRAFT
    lease_document_path: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None


class LeaseCreate(LeaseBase):
    """Schema for creating a Lease"""
    tenant_id: int
    property_id: int


class LeaseUpdate(BaseModel):
    """Schema for updating a Lease"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    monthly_rent: Optional[Decimal] = Field(None, gt=0)
    security_deposit: Optional[Decimal] = Field(None, ge=0)
    rent_due_day: Optional[int] = Field(None, ge=1, le=31)
    grace_period_days: Optional[int] = Field(None, ge=0)
    late_fee_amount: Optional[Decimal] = Field(None, ge=0)
    late_fee_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    daily_late_fee: Optional[Decimal] = Field(None, ge=0)
    is_section_8: Optional[bool] = None
    cha_portion: Optional[Decimal] = Field(None, ge=0)
    tenant_portion: Optional[Decimal] = Field(None, ge=0)
    status: Optional[LeaseStatus] = None
    lease_document_path: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None


class LeaseResponse(LeaseBase):
    """Schema for Lease response"""
    id: int
    tenant_id: int
    property_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaseWithDetails(LeaseResponse):
    """Schema for Lease with tenant and property details"""
    tenant: TenantResponse
    property: PropertyResponse

    class Config:
        from_attributes = True


# ============================================================================
# Rent Payment Schemas
# ============================================================================

class RentPaymentBase(BaseModel):
    """Base schema for Rent Payment"""
    amount: Decimal = Field(..., gt=0)
    payment_date: date
    payment_method: PaymentMethod = PaymentMethod.CHECK
    status: PaymentStatus = PaymentStatus.COMPLETED
    reference_number: Optional[str] = Field(None, max_length=100)
    is_cha_payment: bool = False
    cha_payment_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    receipt_path: Optional[str] = Field(None, max_length=500)


class RentPaymentCreate(RentPaymentBase):
    """Schema for creating a Rent Payment"""
    lease_id: int


class RentPaymentUpdate(BaseModel):
    """Schema for updating a Rent Payment"""
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[date] = None
    payment_method: Optional[PaymentMethod] = None
    status: Optional[PaymentStatus] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    is_cha_payment: Optional[bool] = None
    cha_payment_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    receipt_path: Optional[str] = Field(None, max_length=500)


class RentPaymentResponse(RentPaymentBase):
    """Schema for Rent Payment response"""
    id: int
    lease_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RentPaymentWithLease(RentPaymentResponse):
    """Schema for Rent Payment with lease details"""
    lease: LeaseWithDetails

    class Config:
        from_attributes = True


# ============================================================================
# Late Fee Schemas
# ============================================================================

class LateFeeBase(BaseModel):
    """Base schema for Late Fee"""
    amount: Decimal = Field(..., gt=0)
    fee_date: date
    for_period_start: date
    for_period_end: date
    is_paid: bool = False
    paid_date: Optional[date] = None
    is_waived: bool = False
    waived_date: Optional[date] = None
    waived_reason: Optional[str] = None
    notes: Optional[str] = None


class LateFeeCreate(LateFeeBase):
    """Schema for creating a Late Fee"""
    lease_id: int


class LateFeeUpdate(BaseModel):
    """Schema for updating a Late Fee"""
    amount: Optional[Decimal] = Field(None, gt=0)
    fee_date: Optional[date] = None
    for_period_start: Optional[date] = None
    for_period_end: Optional[date] = None
    is_paid: Optional[bool] = None
    paid_date: Optional[date] = None
    is_waived: Optional[bool] = None
    waived_date: Optional[date] = None
    waived_reason: Optional[str] = None
    notes: Optional[str] = None


class LateFeeResponse(LateFeeBase):
    """Schema for Late Fee response"""
    id: int
    lease_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LateFeeWithLease(LateFeeResponse):
    """Schema for Late Fee with lease details"""
    lease: LeaseWithDetails

    class Config:
        from_attributes = True


# ============================================================================
# Composite/Summary Schemas
# ============================================================================

class TenantWithLeases(TenantWithVoucher):
    """Schema for Tenant with all lease details"""
    leases: List[LeaseResponse] = []

    class Config:
        from_attributes = True


class LeaseWithPayments(LeaseWithDetails):
    """Schema for Lease with all payment and late fee details"""
    rent_payments: List[RentPaymentResponse] = []
    late_fees: List[LateFeeResponse] = []

    class Config:
        from_attributes = True


class RentPaymentSummary(BaseModel):
    """Summary of rent payments for a lease or tenant"""
    total_expected: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    total_late_fees: Decimal
    total_late_fees_paid: Decimal
    total_late_fees_outstanding: Decimal
    payments_count: int
    late_fees_count: int


# ============================================================================
# Owner Payment Schemas
# ============================================================================

class OwnerPaymentBase(BaseModel):
    """Base schema for Owner Payment"""
    amount: Decimal = Field(..., gt=0)
    payment_date: date
    payment_method: PaymentMethod = PaymentMethod.CHECK
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None


class OwnerPaymentCreate(OwnerPaymentBase):
    """Schema for creating an Owner Payment"""
    owner_id: int
    property_id: Optional[int] = None


class OwnerPaymentUpdate(BaseModel):
    """Schema for updating an Owner Payment"""
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[date] = None
    payment_method: Optional[PaymentMethod] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    owner_id: Optional[int] = None
    property_id: Optional[int] = None


class OwnerPaymentResponse(OwnerPaymentBase):
    """Schema for Owner Payment response"""
    id: int
    owner_id: int
    property_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OwnerPaymentWithDetails(OwnerPaymentResponse):
    """Schema for Owner Payment with owner and property details"""
    owner: OwnerResponse
    property: Optional[PropertyResponse] = None

    class Config:
        from_attributes = True


class OwnerPaymentSummary(BaseModel):
    """Summary of owner payments"""
    total_payments: Decimal
    payments_count: int
    by_owner: Dict[int, Decimal] = Field(default_factory=dict)
    by_property: Dict[int, Decimal] = Field(default_factory=dict)


class PropertyBalanceResponse(BaseModel):
    """Property balance showing expenses vs payments"""
    property_id: int
    property_address: str
    property_nickname: Optional[str] = None
    total_expenses: Decimal
    total_payments: Decimal
    balance_owed: Decimal  # Positive = owner owes us, Negative = we owe owner
    owner_names: List[str] = Field(default_factory=list)


class PropertyBalancesSummary(BaseModel):
    """Summary of all property balances"""
    properties: List[PropertyBalanceResponse]
    total_expenses: Decimal
    total_payments: Decimal
    total_balance_owed: Decimal
