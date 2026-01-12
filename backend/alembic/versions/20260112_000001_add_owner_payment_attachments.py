"""add owner_payment_attachments table

Revision ID: 20260112_000001
Revises: 20260108_100000
Create Date: 2026-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260112_000001'
down_revision: Union[str, None] = '20260108_100000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create owner_payment_attachments table
    op.create_table(
        'owner_payment_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['owner_payments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_owner_payment_attachments_id', 'owner_payment_attachments', ['id'], unique=False)
    op.create_index('ix_owner_payment_attachments_payment_id', 'owner_payment_attachments', ['payment_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_owner_payment_attachments_payment_id', table_name='owner_payment_attachments')
    op.drop_index('ix_owner_payment_attachments_id', table_name='owner_payment_attachments')
    op.drop_table('owner_payment_attachments')

