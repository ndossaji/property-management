"""
Database Models
SQLAlchemy models for the Property Management application
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Numeric, Date
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()


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

    # Relationships
    properties = relationship("Property", back_populates="owner", lazy="selectin")

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
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("owners.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("Owner", back_populates="properties", lazy="selectin")

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
