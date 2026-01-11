"""add paid_by field to rent_payments

Revision ID: 20260107_100000
Revises: 8acdddb43235
Create Date: 2026-01-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260107_100000'
down_revision: Union[str, None] = '8acdddb43235'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add paid_by column with default value 'property_management'
    op.add_column('rent_payments', sa.Column('paid_by', sa.String(50), nullable=False, server_default='property_management'))


def downgrade() -> None:
    op.drop_column('rent_payments', 'paid_by')

