"""remove paid_by field from rent_payments

Revision ID: 20260108_000002
Revises: 20260108_000001
Create Date: 2026-01-08 00:00:02.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260108_000002'
down_revision: Union[str, None] = '20260108_000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove paid_by column from rent_payments - it should only exist in expenses
    op.drop_column('rent_payments', 'paid_by')


def downgrade() -> None:
    op.add_column('rent_payments', sa.Column('paid_by', sa.String(50), nullable=False, server_default='property_management'))

