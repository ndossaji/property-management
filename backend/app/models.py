"""
Database Models
SQLAlchemy models for the Property Management application
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
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
    
    # Additional info
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    square_feet = Column(Integer, nullable=True)
    year_built = Column(Integer, nullable=True)
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

