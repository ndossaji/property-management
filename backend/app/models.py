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
