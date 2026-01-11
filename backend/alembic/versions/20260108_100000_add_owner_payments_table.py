"""add owner_payments table

Revision ID: 20260108_100000
Revises: 20260108_000003
Create Date: 2026-01-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260108_100000'
down_revision: Union[str, None] = '20260108_000003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create owner_payments table
    op.create_table(
        'owner_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_method', sa.Enum('cash', 'check', 'money_order', 'bank_transfer', 'credit_card', 'debit_card', 'cha_voucher', 'other', name='paymentmethod'), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['owners.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_owner_payments_id', 'owner_payments', ['id'], unique=False)
    op.create_index('ix_owner_payments_owner_id', 'owner_payments', ['owner_id'], unique=False)
    op.create_index('ix_owner_payments_property_id', 'owner_payments', ['property_id'], unique=False)
    op.create_index('ix_owner_payments_payment_date', 'owner_payments', ['payment_date'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_owner_payments_payment_date', table_name='owner_payments')
    op.drop_index('ix_owner_payments_property_id', table_name='owner_payments')
    op.drop_index('ix_owner_payments_owner_id', table_name='owner_payments')
    op.drop_index('ix_owner_payments_id', table_name='owner_payments')
    op.drop_table('owner_payments')

