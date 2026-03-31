from sqlalchemy import Column, String, Boolean, Float, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.base import Base, generate_uuid

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False, index=True)
    
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default='draft', index=True) # draft|pending_review|active|inactive|archived
    product_type = Column(String(20), nullable=False, default='physical')
    
    base_price = Column(Float, nullable=False)
    currency_code = Column(String(3), nullable=False, default='VND')
    weight_grams = Column(Integer, nullable=True)
    is_taxable = Column(Boolean, nullable=False, default=True)
    brand = Column(String(255), nullable=True)
    
    metadata_json = Column(JSON, default={})
    images = Column(JSON, default=[])
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Opt lock
    version = Column(Integer, nullable=False, default=1)

    # Relationship
    merchant = relationship("Merchant", back_populates="products")
