"""fix paid_by enum type in expenses

Revision ID: 20260108_000003
Revises: 20260108_000002
Create Date: 2026-01-08 00:00:03.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260108_000003'
down_revision: Union[str, None] = '20260108_000002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get the current database dialect
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL-specific enum handling
        op.execute("DROP TYPE IF EXISTS paidby CASCADE")
        op.execute("CREATE TYPE paidby AS ENUM ('UNPAID', 'PROPERTY_MANAGEMENT', 'OWNER')")
        op.execute("ALTER TABLE expenses ALTER COLUMN paid_by DROP DEFAULT")
        op.execute("UPDATE expenses SET paid_by = 'UNPAID' WHERE paid_by = 'unpaid'")
        op.execute("UPDATE expenses SET paid_by = 'PROPERTY_MANAGEMENT' WHERE paid_by = 'property_management'")
        op.execute("UPDATE expenses SET paid_by = 'OWNER' WHERE paid_by = 'owner'")
        op.execute("ALTER TABLE expenses ALTER COLUMN paid_by TYPE paidby USING paid_by::paidby")
        op.execute("ALTER TABLE expenses ALTER COLUMN paid_by SET DEFAULT 'UNPAID'")
    else:
        # SQLite - just ensure values are stored correctly (SQLite stores enums as strings)
        # No type changes needed - SQLite doesn't support ALTER COLUMN TYPE
        pass


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == 'postgresql':
        # Convert back to string
        op.execute("ALTER TABLE expenses ALTER COLUMN paid_by TYPE VARCHAR(50) USING paid_by::text")
        op.execute("ALTER TABLE expenses ALTER COLUMN paid_by SET DEFAULT 'unpaid'")

        # Update values back to lowercase
        op.execute("UPDATE expenses SET paid_by = 'unpaid' WHERE paid_by = 'UNPAID'")
        op.execute("UPDATE expenses SET paid_by = 'property_management' WHERE paid_by = 'PROPERTY_MANAGEMENT'")
        op.execute("UPDATE expenses SET paid_by = 'owner' WHERE paid_by = 'OWNER'")

        # Drop the enum type
        op.execute("DROP TYPE IF EXISTS paidby")
    else:
        # SQLite - no changes needed
        pass

