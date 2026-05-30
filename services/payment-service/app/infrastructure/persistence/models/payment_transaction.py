from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, JSON, ForeignKey, Integer, Index
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base, generate_uuid


class PaymentTransactionModel(Base):
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), nullable=False, index=True)
    merchant_id = Column(String(36), nullable=False, index=True)
    payment_method_id = Column(String(36), ForeignKey("payment_methods.id"), nullable=True)
    transaction_type = Column(String(20), nullable=False, default="charge")  # charge|cod_collect
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending|processing|succeeded|failed|cancelled
    amount = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), nullable=False, default="VND")
    psp_provider = Column(String(30), nullable=False, default="stripe")
    psp_transaction_id = Column(String(255), nullable=True, index=True)  # Stripe pi_xxx or ch_xxx
    psp_status = Column(String(50), nullable=True)
    psp_response = Column(JSON, nullable=True)  # full PSP response (masked)
    psp_fee = Column(Numeric(15, 2), nullable=True, default=0)
    three_ds_status = Column(String(20), nullable=True)
    three_ds_version = Column(String(10), nullable=True)
    authentication_type = Column(String(30), nullable=True)
    fraud_trace_id = Column(String(255), nullable=True)
    fraud_score = Column(Numeric(5, 4), nullable=True)
    idempotency_key = Column(String(255), nullable=False, unique=True, index=True)
    failure_code = Column(String(100), nullable=True)
    failure_message = Column(String(1000), nullable=True)
    client_secret = Column(String(500), nullable=True)
    ip_address = Column(String(64), nullable=True)  # stored as string for compatibility
    user_agent = Column(String(500), nullable=True)
    device_fingerprint = Column(String(255), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    failed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    payment_method = relationship("PaymentMethodModel", back_populates="transactions")
    settlement_items = relationship("SettlementItemModel", back_populates="transaction")

    __table_args__ = (
        Index("idx_pt_order", "order_id"),
        Index("idx_pt_user_created", "user_id", "created_at"),
        Index("idx_pt_psp", "psp_transaction_id"),
        Index("idx_pt_status_pending", "status"),
        Index("idx_pt_idemp", "idempotency_key"),
    )
