from sqlalchemy import Column, String, Boolean, Float, Integer, Text, JSON, DateTime, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base, generate_uuid

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False, index=True)
    logo_url = Column(Text, nullable=True)
    banner_url = Column(Text, nullable=True)
    
    # 🔒 FLE via MOCK Vault Transit
    # Ở SQLite dùng LargeBinary, nếu lưu chuỗi base64 thì dùng String
    email_encrypted = Column(LargeBinary, nullable=True)
    phone_encrypted = Column(LargeBinary, nullable=True)
    
    status = Column(String(20), nullable=False, default='pending') # pending|active|suspended|closed
    rating_avg = Column(Float, default=0.00)
    rating_count = Column(Integer, default=0)
    commission_rate = Column(Float, nullable=False, default=0.0500)
    is_verified = Column(Boolean, nullable=False, default=False)
    metadata_json = Column(JSON, default={})
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Optimistic locking
    version = Column(Integer, nullable=False, default=1)

    # Relationships
    products = relationship("Product", back_populates="merchant", cascade="all, delete-orphan")
