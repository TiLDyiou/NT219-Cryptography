"""seed email channel and templates"""

from alembic import op
import sqlalchemy as sa

revision = "0006_seed_channels_templates"
down_revision = "0005_monthly_partition_helper"
branch_labels = None
depends_on = None

TEMPLATES = [
    ("order_confirmed", "order", "Order {{ order_number }} confirmed"),
    ("order_cancelled", "order", "Order {{ order_number }} cancelled"),
    ("payment_received", "payment", "Payment received for {{ order_number }}"),
    ("payment_failed", "payment", "Payment failed for {{ order_number }}"),
    ("refund_processed", "payment", "Refund processed for {{ order_number }}"),
    ("shipment_created", "shipping", "Shipment created for {{ order_number }}"),
    ("shipment_delivered", "shipping", "Shipment delivered for {{ order_number }}"),
]


def upgrade() -> None:
    channel_id = "00000000-0000-0000-0000-000000000801"
    op.execute(
        sa.text(
            """
            INSERT INTO notification_channels (id, code, name, provider, config, rate_limit)
            VALUES (:id, 'email', 'Email', 'gmail_smtp', '{}', :rate_limit)
            ON CONFLICT (code) DO NOTHING
            """
        ).bindparams(id=channel_id, rate_limit='{"max_per_minute":10}')
    )
    for index, (code, category, subject) in enumerate(TEMPLATES, start=1):
        template_id = f"00000000-0000-0000-0000-0000000008{index:02d}"
        op.execute(
            sa.text(
                """
                INSERT INTO notification_templates
                    (id, code, channel_id, category, subject_template, html_template, text_template, variables, metadata)
                VALUES
                    (:id, :code, :channel_id, :category, :subject, :html, :text, '[]', '{}')
                ON CONFLICT (code) DO NOTHING
                """
            ).bindparams(
                id=template_id,
                code=code,
                channel_id=channel_id,
                category=category,
                subject=subject,
                html=f"<p>{subject}</p>",
                text=subject,
            )
        )


def downgrade() -> None:
    op.execute("DELETE FROM notification_templates WHERE code IN ('order_confirmed','order_cancelled','payment_received','payment_failed','refund_processed','shipment_created','shipment_delivered')")
