"""create outbox table

Revision ID: 0002_outbox_table
Revises: 0001_initial_schema
Create Date: 2026-05-24 14:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002_outbox_table'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payment_outbox',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('aggregate_type', sa.String(length=50), nullable=False),
        sa.Column('aggregate_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_outbox_pending', 'payment_outbox', ['status', 'created_at'])


def downgrade() -> None:
    op.drop_table('payment_outbox')
