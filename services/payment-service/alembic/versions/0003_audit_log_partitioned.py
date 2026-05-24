"""create audit log partitioned table

Revision ID: 0003_audit_log_partitioned
Revises: 0002_outbox_table
Create Date: 2026-05-24 14:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003_audit_log_partitioned'
down_revision: Union[str, None] = '0002_outbox_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    dialect_name = connection.dialect.name

    if dialect_name == "postgresql":
        # Create partitioned table in Postgres
        op.execute("""
            CREATE TABLE payment_audit_log (
                id VARCHAR(36) NOT NULL,
                table_name VARCHAR(100) NOT NULL,
                record_id VARCHAR(36) NOT NULL,
                action VARCHAR(10) NOT NULL,
                old_data JSONB,
                new_data JSONB,
                changed_fields VARCHAR(100)[],
                actor_id VARCHAR(36),
                actor_type VARCHAR(20),
                ip_address VARCHAR(64),
                user_agent VARCHAR(500),
                correlation_id VARCHAR(255),
                hmac_signature VARCHAR(128),
                hmac_key_version INT NOT NULL DEFAULT 1,
                created_at TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (id, created_at)
            ) PARTITION BY RANGE (created_at);
        """)

        # Create initial 3 monthly partitions
        op.execute("""
            CREATE TABLE payment_audit_log_2026_05 PARTITION OF payment_audit_log
                FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
        """)
        op.execute("""
            CREATE TABLE payment_audit_log_2026_06 PARTITION OF payment_audit_log
                FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
        """)
        op.execute("""
            CREATE TABLE payment_audit_log_2026_07 PARTITION OF payment_audit_log
                FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
        """)

        # Create indexes on parent (these automatically propagate to children in Postgres 11+)
        op.execute("CREATE INDEX idx_pay_audit_record ON payment_audit_log (table_name, record_id);")
        op.execute("CREATE INDEX idx_pay_audit_actor ON payment_audit_log (actor_id);")
        op.execute("CREATE INDEX idx_pay_audit_time ON payment_audit_log (created_at);")

    else:
        # Standard table for SQLite fallback
        op.create_table(
            'payment_audit_log',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('table_name', sa.String(length=100), nullable=False),
            sa.Column('record_id', sa.String(length=36), nullable=False),
            sa.Column('action', sa.String(length=10), nullable=False),
            sa.Column('old_data', sa.JSON(), nullable=True),
            sa.Column('new_data', sa.JSON(), nullable=True),
            sa.Column('changed_fields', sa.JSON(), nullable=True),  # JSON array for SQLite
            sa.Column('actor_id', sa.String(length=36), nullable=True),
            sa.Column('actor_type', sa.String(length=20), nullable=True),
            sa.Column('ip_address', sa.String(length=64), nullable=True),
            sa.Column('user_agent', sa.String(length=500), nullable=True),
            sa.Column('correlation_id', sa.String(length=255), nullable=True),
            sa.Column('hmac_signature', sa.String(length=128), nullable=True),
            sa.Column('hmac_key_version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id', 'created_at')
        )
        op.create_index('idx_pay_audit_record', 'payment_audit_log', ['table_name', 'record_id'])
        op.create_index('idx_pay_audit_actor', 'payment_audit_log', ['actor_id'])
        op.create_index('idx_pay_audit_time', 'payment_audit_log', ['created_at'])


def downgrade() -> None:
    connection = op.get_bind()
    dialect_name = connection.dialect.name

    if dialect_name == "postgresql":
        op.execute("DROP TABLE IF EXISTS payment_audit_log CASCADE;")
    else:
        op.drop_table('payment_audit_log')
