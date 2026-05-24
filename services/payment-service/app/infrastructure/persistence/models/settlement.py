from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.infrastructure.persistence.models.base import Base, generate_uuid


class MerchantSettlementModel(Base):
    __tablename__ = "merchant_settlements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    merchant_id = Column(String(36), nullable=False, index=True)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    total_orders = Column(Integer, nullable=False, default=0)
    total_sales = Column(Numeric(15, 2), nullable=False, default=0)
    total_shipping_fee = Column(Numeric(15, 2), nullable=False, default=0)
    total_psp_fee = Column(Numeric(15, 2), nullable=False, default=0)
    commission_rate = Column(Numeric(5, 4), nullable=False)
    commission_amount = Column(Numeric(15, 2), nullable=False)
    net_amount = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), nullable=False, default="VND")
    status = Column(String(20), nullable=False, default="pending")  # pending|processing|paid|failed
    payment_method = Column(String(30), nullable=True)  # bank_transfer|e_wallet
    payment_reference = Column(String(255), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = relationship("SettlementItemModel", back_populates="settlement", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("merchant_id", "period_start", name="uq_merchant_period_start"),
        Index("idx_settle_merchant_status", "merchant_id", "status"),
        Index("idx_settle_status_pending", "status"),
        Index("idx_settle_period", "period_end"),
    )


class SettlementItemModel(Base):
    __tablename__ = "settlement_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    settlement_id = Column(String(36), ForeignKey("merchant_settlements.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(String(36), nullable=False, unique=True)
    transaction_id = Column(String(36), ForeignKey("payment_transactions.id"), nullable=False)
    order_amount = Column(Numeric(15, 2), nullable=False)
    shipping_fee = Column(Numeric(15, 2), nullable=False, default=0)
    psp_fee = Column(Numeric(15, 2), nullable=False, default=0)
    commission = Column(Numeric(15, 2), nullable=False)
    merchant_payout = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    settlement = relationship("MerchantSettlementModel", back_populates="items")
    transaction = relationship("PaymentTransactionModel", back_populates="settlement_items")

    __table_args__ = (
        Index("idx_si_settlement", "settlement_id"),
    )
