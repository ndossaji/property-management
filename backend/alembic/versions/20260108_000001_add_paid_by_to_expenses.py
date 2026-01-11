"""add paid_by field to expenses

Revision ID: 20260108_000001
Revises: 20260107_100000
Create Date: 2026-01-08 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260108_000001'
down_revision: Union[str, None] = '20260107_100000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add paid_by column with default value 'unpaid'
    op.add_column('expenses', sa.Column('paid_by', sa.String(50), nullable=False, server_default='unpaid'))


def downgrade() -> None:
    op.drop_column('expenses', 'paid_by')

