"""remove payment period fields

Revision ID: 8acdddb43235
Revises: 20260107_000001
Create Date: 2026-01-07 05:44:02.475712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8acdddb43235'
down_revision: Union[str, None] = '20260107_000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('rent_payments', 'payment_period_start')
    op.drop_column('rent_payments', 'payment_period_end')


def downgrade() -> None:
    op.add_column('rent_payments', sa.Column('payment_period_start', sa.DATE(), nullable=True))
    op.add_column('rent_payments', sa.Column('payment_period_end', sa.DATE(), nullable=True))

