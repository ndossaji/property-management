"""Add tenant, lease, payment tables

Revision ID: 20260106_000001
Revises: 
Create Date: 2026-01-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260106_000001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('alternate_phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('ssn_last_four', sa.String(length=4), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('emergency_contact_name', sa.String(length=255), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(length=50), nullable=True),
        sa.Column('emergency_contact_relationship', sa.String(length=100), nullable=True),
        sa.Column('employer', sa.String(length=255), nullable=True),
        sa.Column('employer_phone', sa.String(length=50), nullable=True),
        sa.Column('monthly_income', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tenants_id', 'tenants', ['id'])
    op.create_index('ix_tenants_first_name', 'tenants', ['first_name'])
    op.create_index('ix_tenants_last_name', 'tenants', ['last_name'])
    op.create_index('ix_tenants_email', 'tenants', ['email'])

    # Create CHA vouchers table
    op.create_table(
        'cha_vouchers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('voucher_number', sa.String(length=100), nullable=False),
        sa.Column('status', sa.Enum('pending', 'active', 'suspended', 'terminated', 'expired', name='chavoucherstatus'), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiration_date', sa.Date(), nullable=True),
        sa.Column('portability_date', sa.Date(), nullable=True),
        sa.Column('payment_standard', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('hap_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('tenant_portion', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('cha_case_worker', sa.String(length=255), nullable=True),
        sa.Column('cha_case_worker_phone', sa.String(length=50), nullable=True),
        sa.Column('cha_case_worker_email', sa.String(length=255), nullable=True),
        sa.Column('bedroom_size', sa.Integer(), nullable=True),
        sa.Column('is_portable', sa.Boolean(), nullable=False, default=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id'),
        sa.UniqueConstraint('voucher_number')
    )
    op.create_index('ix_cha_vouchers_id', 'cha_vouchers', ['id'])
    op.create_index('ix_cha_vouchers_voucher_number', 'cha_vouchers', ['voucher_number'])

    # Create leases table
    op.create_table(
        'leases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('property_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('move_in_date', sa.Date(), nullable=True),
        sa.Column('move_out_date', sa.Date(), nullable=True),
        sa.Column('monthly_rent', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('security_deposit', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('rent_due_day', sa.Integer(), nullable=False, default=1),
        sa.Column('grace_period_days', sa.Integer(), nullable=False, default=5),
        sa.Column('late_fee_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('late_fee_percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('daily_late_fee', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('is_section_8', sa.Boolean(), nullable=False, default=False),
        sa.Column('cha_portion', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('tenant_portion', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.Enum('draft', 'active', 'expired', 'terminated', 'renewed', name='leasestatus'), nullable=False),
        sa.Column('lease_document_path', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'])
    )
    op.create_index('ix_leases_id', 'leases', ['id'])

    # Create rent_payments table
    op.create_table(
        'rent_payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lease_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('payment_period_start', sa.Date(), nullable=False),
        sa.Column('payment_period_end', sa.Date(), nullable=False),
        sa.Column('payment_method', sa.Enum('cash', 'check', 'money_order', 'bank_transfer', 'credit_card', 'debit_card', 'cha_voucher', 'other', name='paymentmethod'), nullable=False),
        sa.Column('status', sa.Enum('pending', 'completed', 'partial', 'failed', 'refunded', name='paymentstatus'), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('is_cha_payment', sa.Boolean(), nullable=False, default=False),
        sa.Column('cha_payment_reference', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('receipt_path', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['lease_id'], ['leases.id'], ondelete='CASCADE')
    )
    op.create_index('ix_rent_payments_id', 'rent_payments', ['id'])

    # Create late_fees table
    op.create_table(
        'late_fees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lease_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('fee_date', sa.Date(), nullable=False),
        sa.Column('for_period_start', sa.Date(), nullable=False),
        sa.Column('for_period_end', sa.Date(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False, default=False),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('is_waived', sa.Boolean(), nullable=False, default=False),
        sa.Column('waived_date', sa.Date(), nullable=True),
        sa.Column('waived_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['lease_id'], ['leases.id'], ondelete='CASCADE')
    )
    op.create_index('ix_late_fees_id', 'late_fees', ['id'])


def downgrade() -> None:
    op.drop_index('ix_late_fees_id', table_name='late_fees')
    op.drop_table('late_fees')
    op.drop_index('ix_rent_payments_id', table_name='rent_payments')
    op.drop_table('rent_payments')
    op.drop_index('ix_leases_id', table_name='leases')
    op.drop_table('leases')
    op.drop_index('ix_cha_vouchers_voucher_number', table_name='cha_vouchers')
    op.drop_index('ix_cha_vouchers_id', table_name='cha_vouchers')
    op.drop_table('cha_vouchers')
    op.drop_index('ix_tenants_email', table_name='tenants')
    op.drop_index('ix_tenants_last_name', table_name='tenants')
    op.drop_index('ix_tenants_first_name', table_name='tenants')
    op.drop_index('ix_tenants_id', table_name='tenants')
    op.drop_table('tenants')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS chavoucherstatus")
    op.execute("DROP TYPE IF EXISTS leasestatus")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.execute("DROP TYPE IF EXISTS paymentstatus")

