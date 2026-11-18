"""profession_profiles.catalog_slug: the built-in catalog profession a person picked

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-19 14:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('profession_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('catalog_slug', sa.String(length=64), nullable=True))
        batch_op.create_index(batch_op.f('ix_profession_profiles_catalog_slug'), ['catalog_slug'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('profession_profiles', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_profession_profiles_catalog_slug'))
        batch_op.drop_column('catalog_slug')
