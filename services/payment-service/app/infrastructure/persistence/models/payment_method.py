from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, LargeBinary, Index
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base, generate_uuid


class PaymentMethodModel(Base):
    __tablename__ = "payment_methods"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    method_type = Column(String(30), nullable=False)  # credit_card|debit_card|bank_transfer|e_wallet|cod
    psp_provider = Column(String(30), nullable=False, default="stripe")
    psp_payment_method_id = Column(String(255), nullable=False)  # Stripe pm_xxx — NOT a PAN
    psp_customer_id = Column(String(255), nullable=True)  # Stripe cus_xxx
    card_last4 = Column(String(4), nullable=True)  # display only
    card_brand = Column(String(20), nullable=True)  # visa|mastercard|jcb
    card_fingerprint = Column(String(255), nullable=True)  # detect duplicate cards
    billing_name_encrypted = Column(LargeBinary, nullable=True)  # 🔒 FLE
    billing_email_encrypted = Column(LargeBinary, nullable=True)  # 🔒 FLE
    is_default = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default="active")  # active|expired|revoked
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    transactions = relationship("PaymentTransactionModel", back_populates="payment_method")

    __table_args__ = (
        Index("idx_pm_user_status", "user_id", "status"),
        Index("idx_pm_fingerprint", "card_fingerprint"),
    )
