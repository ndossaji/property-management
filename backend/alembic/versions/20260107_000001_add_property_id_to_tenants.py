"""Add property_id to tenants table

Revision ID: 20260107_000001
Revises: 20260106_000001
Create Date: 2026-01-07
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260107_000001'
down_revision = '20260106_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add property_id column to tenants table
    op.add_column('tenants', sa.Column('property_id', sa.Integer(), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_tenants_property_id',
        'tenants', 'properties',
        ['property_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Create index for the foreign key
    op.create_index('ix_tenants_property_id', 'tenants', ['property_id'])


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_tenants_property_id', table_name='tenants')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_tenants_property_id', 'tenants', type_='foreignkey')
    
    # Drop column
    op.drop_column('tenants', 'property_id')

