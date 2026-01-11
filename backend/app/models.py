"""
Database Models
SQLAlchemy models for the Property Management application
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Numeric, Date, Table, Boolean, JSON
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()

# Association table for many-to-many relationship between properties and owners
property_owners = Table(
    'property_owners',
    Base.metadata,
    Column('property_id', Integer, ForeignKey('properties.id', ondelete='CASCADE'), primary_key=True),
    Column('owner_id', Integer, ForeignKey('owners.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow, nullable=False)
)


class PropertyStatus(str, enum.Enum):
    """Property status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    SOLD = "sold"


class PropertyType(str, enum.Enum):
    """Property type enumeration"""
    SINGLE_FAMILY = "single_family"
    MULTI_FAMILY = "multi_family"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    APARTMENT = "apartment"
    COMMERCIAL = "commercial"
    LAND = "land"
    OTHER = "other"


class ExpenseCategory(str, enum.Enum):
    """Expense category enumeration"""
    MAINTENANCE = "maintenance"
    REPAIRS = "repairs"
    UTILITIES = "utilities"
    INSURANCE = "insurance"
    TAXES = "taxes"
    MORTGAGE = "mortgage"
    HOA = "hoa"
    LANDSCAPING = "landscaping"
    CLEANING = "cleaning"
    SUPPLIES = "supplies"
    LEGAL = "legal"
    ACCOUNTING = "accounting"
    ADVERTISING = "advertising"
    TRAVEL = "travel"
    OTHER = "other"


class LeaseStatus(str, enum.Enum):
    """Lease status enumeration"""
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"


class PaymentStatus(str, enum.Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    """Payment method enumeration"""
    CASH = "cash"
    CHECK = "check"
    MONEY_ORDER = "money_order"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    CHA_VOUCHER = "cha_voucher"
    OTHER = "other"


class CHAVoucherStatus(str, enum.Enum):
    """CHA Voucher status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    EXPIRED = "expired"


class PaidBy(str, enum.Enum):
    """Paid by enumeration - tracks who paid for the expense"""
    UNPAID = "unpaid"
    PROPERTY_MANAGEMENT = "property_management"
    OWNER = "owner"


class Owner(Base):
    """Owner model - represents property owners"""
    __tablename__ = "owners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True, unique=True, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships - many-to-many with properties
    properties = relationship("Property", secondary=property_owners, back_populates="owners", lazy="selectin")

    def __repr__(self):
        return f"<Owner(id={self.id}, name='{self.name}')>"


class Property(Base):
    """Property model - represents managed properties"""
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)

    # Address fields
    street_address = Column(String(255), nullable=False)
    unit_number = Column(String(50), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zip_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="USA")

    # Property details
    nickname = Column(String(100), nullable=True)  # Optional friendly name
    property_type = Column(SQLEnum(PropertyType), nullable=False, default=PropertyType.SINGLE_FAMILY)
    status = Column(SQLEnum(PropertyStatus), nullable=False, default=PropertyStatus.ACTIVE)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships - many-to-many with owners
    owners = relationship("Owner", secondary=property_owners, back_populates="properties", lazy="selectin")
    custom_field_values = relationship("PropertyCustomFieldValue", back_populates="property", cascade="all, delete-orphan", lazy="selectin")

    @property
    def full_address(self):
        """Return the full formatted address"""
        parts = [self.street_address]
        if self.unit_number:
            parts.append(f"Unit {self.unit_number}")
        parts.append(f"{self.city}, {self.state} {self.zip_code}")
        if self.country != "USA":
            parts.append(self.country)
        return ", ".join(parts)

    def __repr__(self):
        return f"<Property(id={self.id}, address='{self.street_address}', nickname='{self.nickname}')>"


class Expense(Base):
    """Expense model - represents expenses tied to properties"""
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)

    # Expense details
    description = Column(String(500), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(SQLEnum(ExpenseCategory), nullable=False, default=ExpenseCategory.OTHER)
    expense_date = Column(Date, nullable=False)
    vendor = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    # Payment tracking
    paid_by = Column(SQLEnum(PaidBy), nullable=False, default=PaidBy.UNPAID)

    # Foreign keys
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", backref="expenses", lazy="selectin")
    receipts = relationship("ExpenseReceipt", back_populates="expense", cascade="all, delete-orphan", lazy="selectin")
    custom_field_values = relationship("ExpenseCustomFieldValue", back_populates="expense", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<Expense(id={self.id}, description='{self.description}', amount={self.amount})>"


class ExpenseReceipt(Base):
    """ExpenseReceipt model - represents receipt images for expenses"""
    __tablename__ = "expense_receipts"

    id = Column(Integer, primary_key=True, index=True)

    # File details
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)

    # Foreign keys
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    expense = relationship("Expense", back_populates="receipts")

    def __repr__(self):
        return f"<ExpenseReceipt(id={self.id}, filename='{self.original_filename}')>"


class CustomFieldType(str, enum.Enum):
    """Custom field type enumeration"""
    TEXT = "text"
    NUMBER = "number"
    DROPDOWN = "dropdown"
    DATE = "date"
    CHECKBOX = "checkbox"


class CustomField(Base):
    """CustomField model - represents custom fields for expenses and properties"""
    __tablename__ = "custom_fields"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    field_type = Column(SQLEnum(CustomFieldType), nullable=False)
    entity_type = Column(String(50), nullable=False)  # 'expense' or 'property'
    is_required = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    options = relationship("CustomFieldOption", back_populates="field", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<CustomField(id={self.id}, name='{self.name}', type='{self.field_type}')>"


class CustomFieldOption(Base):
    """CustomFieldOption model - represents dropdown options for custom fields"""
    __tablename__ = "custom_field_options"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False)
    value = Column(String(255), nullable=False)
    label = Column(String(255), nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    field = relationship("CustomField", back_populates="options")

    def __repr__(self):
        return f"<CustomFieldOption(id={self.id}, value='{self.value}', label='{self.label}')>"


class ExpenseCustomFieldValue(Base):
    """ExpenseCustomFieldValue model - stores custom field values for expenses"""
    __tablename__ = "expense_custom_field_values"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False)
    value = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    expense = relationship("Expense", back_populates="custom_field_values", lazy="selectin")
    field = relationship("CustomField", lazy="selectin")

    def __repr__(self):
        return f"<ExpenseCustomFieldValue(expense_id={self.expense_id}, field_id={self.field_id})>"


class PropertyCustomFieldValue(Base):
    """PropertyCustomFieldValue model - stores custom field values for properties"""
    __tablename__ = "property_custom_field_values"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False)
    value = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="custom_field_values", lazy="selectin")
    field = relationship("CustomField", lazy="selectin")

    def __repr__(self):
        return f"<PropertyCustomFieldValue(property_id={self.property_id}, field_id={self.field_id})>"


# ============================================================================
# Tenant Management Models
# ============================================================================

class Tenant(Base):
    """Tenant model - represents tenants/renters"""
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)

    # Property association
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)

    # Personal information
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    alternate_phone = Column(String(50), nullable=True)

    # Address (for correspondence/previous address)
    address = Column(Text, nullable=True)

    # Identification
    ssn_last_four = Column(String(4), nullable=True)  # Last 4 digits of SSN for verification
    date_of_birth = Column(Date, nullable=True)

    # Emergency contact
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)

    # Employment information
    employer = Column(String(255), nullable=True)
    employer_phone = Column(String(50), nullable=True)
    monthly_income = Column(Numeric(10, 2), nullable=True)

    # Additional info
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    assigned_property = relationship("Property", backref="tenants", lazy="selectin")
    leases = relationship("Lease", back_populates="tenant", lazy="selectin")
    cha_voucher = relationship("CHAVoucher", back_populates="tenant", uselist=False, lazy="selectin")

    @property
    def full_name(self):
        """Return the tenant's full name"""
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.full_name}')>"


class CHAVoucher(Base):
    """CHAVoucher model - represents Chicago Housing Authority voucher information"""
    __tablename__ = "cha_vouchers"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key to tenant
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Voucher details
    voucher_number = Column(String(100), nullable=False, unique=True, index=True)
    status = Column(SQLEnum(CHAVoucherStatus), nullable=False, default=CHAVoucherStatus.PENDING)

    # Voucher dates
    issue_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    portability_date = Column(Date, nullable=True)  # For portable vouchers

    # Payment information
    payment_standard = Column(Numeric(10, 2), nullable=True)  # Maximum subsidy amount
    hap_amount = Column(Numeric(10, 2), nullable=True)  # Housing Assistance Payment amount
    tenant_portion = Column(Numeric(10, 2), nullable=True)  # Tenant's expected rent portion

    # CHA contact information
    cha_case_worker = Column(String(255), nullable=True)
    cha_case_worker_phone = Column(String(50), nullable=True)
    cha_case_worker_email = Column(String(255), nullable=True)

    # Additional details
    bedroom_size = Column(Integer, nullable=True)  # Voucher bedroom size
    is_portable = Column(Boolean, default=False, nullable=False)  # Port-in voucher
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="cha_voucher")

    def __repr__(self):
        return f"<CHAVoucher(id={self.id}, voucher_number='{self.voucher_number}')>"


class Lease(Base):
    """Lease model - represents lease agreements between tenants and properties"""
    __tablename__ = "leases"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)

    # Lease dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    move_in_date = Column(Date, nullable=True)
    move_out_date = Column(Date, nullable=True)

    # Rent information
    monthly_rent = Column(Numeric(10, 2), nullable=False)
    security_deposit = Column(Numeric(10, 2), nullable=True)
    rent_due_day = Column(Integer, default=1, nullable=False)  # Day of month rent is due
    grace_period_days = Column(Integer, default=5, nullable=False)  # Days before late fee applies

    # Late fee configuration
    late_fee_amount = Column(Numeric(10, 2), nullable=True)  # Flat late fee
    late_fee_percentage = Column(Numeric(5, 2), nullable=True)  # Or percentage of rent
    daily_late_fee = Column(Numeric(10, 2), nullable=True)  # Additional daily late fee

    # CHA/Subsidy information
    is_section_8 = Column(Boolean, default=False, nullable=False)
    cha_portion = Column(Numeric(10, 2), nullable=True)  # CHA payment amount
    tenant_portion = Column(Numeric(10, 2), nullable=True)  # Tenant payment amount

    # Status
    status = Column(SQLEnum(LeaseStatus), nullable=False, default=LeaseStatus.DRAFT)

    # Additional details
    lease_document_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="leases", lazy="selectin")
    property = relationship("Property", backref="leases", lazy="selectin")
    rent_payments = relationship("RentPayment", back_populates="lease", lazy="selectin", cascade="all, delete-orphan")
    late_fees = relationship("LateFee", back_populates="lease", lazy="selectin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Lease(id={self.id}, tenant_id={self.tenant_id}, property_id={self.property_id})>"


class RentPayment(Base):
    """RentPayment model - represents individual rent payments"""
    __tablename__ = "rent_payments"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key
    lease_id = Column(Integer, ForeignKey("leases.id", ondelete="CASCADE"), nullable=False)

    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False)

    # Payment method and status
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False, default=PaymentMethod.CHECK)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.COMPLETED)

    # Check/reference information
    reference_number = Column(String(100), nullable=True)  # Check number, transaction ID, etc.

    # CHA payment tracking
    is_cha_payment = Column(Boolean, default=False, nullable=False)
    cha_payment_reference = Column(String(100), nullable=True)

    # Additional details
    notes = Column(Text, nullable=True)
    receipt_path = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    lease = relationship("Lease", back_populates="rent_payments")

    def __repr__(self):
        return f"<RentPayment(id={self.id}, lease_id={self.lease_id}, amount={self.amount})>"


class LateFee(Base):
    """LateFee model - represents late fees charged to tenants"""
    __tablename__ = "late_fees"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key
    lease_id = Column(Integer, ForeignKey("leases.id", ondelete="CASCADE"), nullable=False)

    # Fee details
    amount = Column(Numeric(10, 2), nullable=False)
    fee_date = Column(Date, nullable=False)  # Date the late fee was assessed
    for_period_start = Column(Date, nullable=False)  # Rent period the late fee is for
    for_period_end = Column(Date, nullable=False)

    # Status
    is_paid = Column(Boolean, default=False, nullable=False)
    paid_date = Column(Date, nullable=True)
    is_waived = Column(Boolean, default=False, nullable=False)
    waived_date = Column(Date, nullable=True)
    waived_reason = Column(Text, nullable=True)

    # Additional details
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    lease = relationship("Lease", back_populates="late_fees")

    def __repr__(self):
        return f"<LateFee(id={self.id}, lease_id={self.lease_id}, amount={self.amount})>"


class OwnerPayment(Base):
    """OwnerPayment model - represents payments from owners to property management to reimburse expenses"""
    __tablename__ = "owner_payments"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    owner_id = Column(Integer, ForeignKey("owners.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True, index=True)

    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False, default=PaymentMethod.CHECK)
    reference_number = Column(String(100), nullable=True)  # Check number, transaction ID, etc.
    description = Column(String(500), nullable=True)  # What this payment is for
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("Owner", backref="payments", lazy="selectin")
    property = relationship("Property", backref="owner_payments", lazy="selectin")

    def __repr__(self):
        return f"<OwnerPayment(id={self.id}, owner_id={self.owner_id}, amount={self.amount})>"
