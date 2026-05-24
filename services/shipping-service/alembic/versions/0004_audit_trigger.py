from alembic import op

revision = "0004_audit_trigger"
down_revision = "0003_audit_log_partitioned"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(
        """
        CREATE OR REPLACE FUNCTION audit_shipping_changes() RETURNS trigger AS $$
        BEGIN
          INSERT INTO shipping_audit_log (
            id, table_name, record_id, action, old_data, new_data,
            changed_fields, actor_type, hmac_key_version, created_at
          )
          VALUES (
            gen_random_uuid()::text, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id),
            TG_OP, to_jsonb(OLD), to_jsonb(NEW), '[]'::jsonb, 'db-trigger', 0, now()
          );
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    for table in ("shipping_providers", "shipping_rates", "shipments"):
        op.execute(
            f"""
            CREATE TRIGGER trg_audit_{table}
            AFTER INSERT OR UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION audit_shipping_changes();
            """
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in ("shipping_providers", "shipping_rates", "shipments"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_audit_{table} ON {table};")
    op.execute("DROP FUNCTION IF EXISTS audit_shipping_changes();")
