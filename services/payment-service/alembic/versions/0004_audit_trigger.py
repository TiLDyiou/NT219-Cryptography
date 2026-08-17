"""create audit triggers

Revision ID: 0004_audit_trigger
Revises: 0003_audit_log_partitioned
Create Date: 2026-05-24 14:45:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = '0004_audit_trigger'
down_revision: Union[str, None] = '0003_audit_log_partitioned'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    dialect_name = connection.dialect.name

    if dialect_name == "postgresql":
        # Create function audit_payment_changes
        op.execute("""
            CREATE OR REPLACE FUNCTION audit_payment_changes()
            RETURNS TRIGGER AS $$
            DECLARE
                old_row JSONB := NULL;
                new_row JSONB := NULL;
                diff_cols VARCHAR(100)[] := '{}';
                corr_id VARCHAR(255) := NULL;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    old_row := to_jsonb(OLD);
                ELSIF TG_OP = 'INSERT' THEN
                    new_row := to_jsonb(NEW);
                ELSIF TG_OP = 'UPDATE' THEN
                    old_row := to_jsonb(OLD);
                    new_row := to_jsonb(NEW);

                    -- Compute changed fields
                    SELECT array_agg(key) INTO diff_cols
                    FROM jsonb_each(new_row)
                    WHERE new_row->key IS DISTINCT FROM old_row->key;
                END IF;

                -- Find correlation_id from transaction context if available (optional)
                IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                    IF (new_row ? 'metadata_json') AND jsonb_typeof(new_row->'metadata_json') = 'object' THEN
                        IF (new_row->'metadata_json') ? 'correlation_id' THEN
                            corr_id := new_row->'metadata_json'->>'correlation_id';
                        END IF;
                    END IF;
                END IF;

                INSERT INTO payment_audit_log (
                    id,
                    table_name,
                    record_id,
                    action,
                    old_data,
                    new_data,
                    changed_fields,
                    actor_id,
                    actor_type,
                    ip_address,
                    user_agent,
                    correlation_id,
                    hmac_signature,
                    hmac_key_version,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    TG_TABLE_NAME,
                    COALESCE(NEW.id, OLD.id),
                    TG_OP,
                    old_row,
                    new_row,
                    diff_cols,
                    NULL,  -- populating actor later or leaving as NULL
                    'system',
                    NULL,
                    NULL,
                    corr_id,
                    NULL,  -- signing asynchronously or in post-processing
                    1,
                    NOW()
                );

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        # Add triggers on payment_methods, payment_transactions, and merchant_settlements
        op.execute("""
            CREATE TRIGGER trg_audit_payment_methods
            AFTER INSERT OR UPDATE OR DELETE ON payment_methods
            FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();
        """)

        op.execute("""
            CREATE TRIGGER trg_audit_payment_transactions
            AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
            FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();
        """)

        op.execute("""
            CREATE TRIGGER trg_audit_merchant_settlements
            AFTER INSERT OR UPDATE OR DELETE ON merchant_settlements
            FOR EACH ROW EXECUTE FUNCTION audit_payment_changes();
        """)


def downgrade() -> None:
    connection = op.get_bind()
    dialect_name = connection.dialect.name

    if dialect_name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_audit_payment_methods ON payment_methods;")
        op.execute("DROP TRIGGER IF EXISTS trg_audit_payment_transactions ON payment_transactions;")
        op.execute("DROP TRIGGER IF EXISTS trg_audit_merchant_settlements ON merchant_settlements;")
        op.execute("DROP FUNCTION IF EXISTS audit_payment_changes();")
