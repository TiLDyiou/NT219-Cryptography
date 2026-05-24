from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "0006_seed_providers"
down_revision = "0005_monthly_partition_helper"
branch_labels = None
depends_on = None


providers = [
    ("mock", "Mock Carrier", None),
    ("ghn", "Giao Hang Nhanh", "https://dev-online-gateway.ghn.vn"),
    ("ghtk", "Giao Hang Tiet Kiem", None),
    ("jnt", "J&T Express", None),
    ("fedex", "FedEx", None),
]


def upgrade() -> None:
    table = sa.table(
        "shipping_providers",
        sa.column("id", sa.String),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("api_base_url", sa.String),
        sa.column("logo_url", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("supported_countries", sa.JSON),
        sa.column("capabilities", sa.JSON),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        table,
        [
            {
                "id": f"provider-{code}",
                "code": code,
                "name": name,
                "api_base_url": url,
                "logo_url": None,
                "is_active": True,
                "supported_countries": ["VN"],
                "capabilities": {"tracking": True, "cod": code in {"ghn", "ghtk", "jnt"}},
                "created_at": now,
                "updated_at": now,
            }
            for code, name, url in providers
        ],
    )


def downgrade() -> None:
    codes = ", ".join(f"'{code}'" for code, _, _ in providers)
    op.execute(f"DELETE FROM shipping_providers WHERE code IN ({codes})")
