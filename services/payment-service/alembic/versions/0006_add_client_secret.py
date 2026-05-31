"""Add client_secret column to payment_transactions

Revision ID: 0006_add_client_secret
Revises: 0005_monthly_partition_helper
Create Date: 2026-05-31
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0006_add_client_secret'
down_revision: Union[str, None] = '0005_monthly_partition_helper'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'payment_transactions',
        sa.Column('client_secret', sa.String(length=500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('payment_transactions', 'client_secret')
