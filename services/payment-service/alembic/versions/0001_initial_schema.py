"""Initial schema creation

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-05-24 14:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Table payment_methods
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('method_type', sa.String(length=30), nullable=False),
        sa.Column('psp_provider', sa.String(length=30), nullable=False, server_default='stripe'),
        sa.Column('psp_payment_method_id', sa.String(length=255), nullable=False),
        sa.Column('psp_customer_id', sa.String(length=255), nullable=True),
        sa.Column('card_last4', sa.String(length=4), nullable=True),
        sa.Column('card_brand', sa.String(length=20), nullable=True),
        sa.Column('card_fingerprint', sa.String(length=255), nullable=True),
        sa.Column('billing_name_encrypted', sa.LargeBinary(), nullable=True),
        sa.Column('billing_email_encrypted', sa.LargeBinary(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_pm_user_status', 'payment_methods', ['user_id', 'status'])
    op.create_index('idx_pm_fingerprint', 'payment_methods', ['card_fingerprint'])

    # 2. Table payment_transactions
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('merchant_id', sa.String(length=36), nullable=False),
        sa.Column('payment_method_id', sa.String(length=36), nullable=True),
        sa.Column('transaction_type', sa.String(length=20), nullable=False, server_default='charge'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=False, server_default='VND'),
        sa.Column('psp_provider', sa.String(length=30), nullable=False, server_default='stripe'),
        sa.Column('psp_transaction_id', sa.String(length=255), nullable=True),
        sa.Column('psp_status', sa.String(length=50), nullable=True),
        sa.Column('psp_response', sa.JSON(), nullable=True),
        sa.Column('psp_fee', sa.Numeric(precision=15, scale=2), nullable=True, server_default='0'),
        sa.Column('three_ds_status', sa.String(length=20), nullable=True),
        sa.Column('three_ds_version', sa.String(length=10), nullable=True),
        sa.Column('authentication_type', sa.String(length=30), nullable=True),
        sa.Column('fraud_trace_id', sa.String(length=255), nullable=True),
        sa.Column('fraud_score', sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column('idempotency_key', sa.String(length=255), nullable=False),
        sa.Column('failure_code', sa.String(length=100), nullable=True),
        sa.Column('failure_message', sa.String(length=1000), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('device_fingerprint', sa.String(length=255), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['payment_method_id'], ['payment_methods.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key')
    )
    op.create_index('idx_pt_order', 'payment_transactions', ['order_id'])
    op.create_index('idx_pt_user_created', 'payment_transactions', ['user_id', 'created_at'])
    op.create_index('idx_pt_psp', 'payment_transactions', ['psp_transaction_id'])
    op.create_index('idx_pt_status_pending', 'payment_transactions', ['status'])
    op.create_index('idx_pt_idemp', 'payment_transactions', ['idempotency_key'])

    # 3. Table idempotency_keys
    op.create_table(
        'idempotency_keys',
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('request_path', sa.String(length=500), nullable=False),
        sa.Column('request_hash', sa.String(length=64), nullable=False),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='processing'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )
    op.create_index('idx_idemp_expires', 'idempotency_keys', ['expires_at'])

    # 4. Table psp_webhook_log
    op.create_table(
        'psp_webhook_log',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('psp_provider', sa.String(length=30), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('event_id', sa.String(length=255), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('signature', sa.Text(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_processed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('psp_provider', 'event_id', name='uq_psp_webhook_event')
    )
    op.create_index('idx_wh_unprocessed', 'psp_webhook_log', ['is_processed'])

    # 5. Table merchant_settlements
    op.create_table(
        'merchant_settlements',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('merchant_id', sa.String(length=36), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_sales', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('total_shipping_fee', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('total_psp_fee', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('commission_rate', sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column('commission_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('net_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('currency_code', sa.String(length=3), nullable=False, server_default='VND'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('payment_method', sa.String(length=30), nullable=True),
        sa.Column('payment_reference', sa.String(length=255), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('merchant_id', 'period_start', name='uq_merchant_period_start')
    )
    op.create_index('idx_settle_merchant_status', 'merchant_settlements', ['merchant_id', 'status'])
    op.create_index('idx_settle_status_pending', 'merchant_settlements', ['status'])
    op.create_index('idx_settle_period', 'merchant_settlements', ['period_end'])

    # 6. Table settlement_items
    op.create_table(
        'settlement_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('settlement_id', sa.String(length=36), nullable=False),
        sa.Column('order_id', sa.String(length=36), nullable=False),
        sa.Column('transaction_id', sa.String(length=36), nullable=False),
        sa.Column('order_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('shipping_fee', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('psp_fee', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('commission', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('merchant_payout', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['merchant_settlements.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transaction_id'], ['payment_transactions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('order_id')
    )
    op.create_index('idx_si_settlement', 'settlement_items', ['settlement_id'])


def downgrade() -> None:
    op.drop_table('settlement_items')
    op.drop_table('merchant_settlements')
    op.drop_table('psp_webhook_log')
    op.drop_table('idempotency_keys')
    op.drop_table('payment_transactions')
    op.drop_table('payment_methods')
