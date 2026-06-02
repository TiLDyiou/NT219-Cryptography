"""M-16: add encrypted subject column to notification_log"""

from alembic import op
import sqlalchemy as sa

revision = "0007_notification_subject_encrypted"
down_revision = "0006_seed_channels_templates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_log",
        sa.Column("subject_encrypted", sa.LargeBinary(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_log", "subject_encrypted")
