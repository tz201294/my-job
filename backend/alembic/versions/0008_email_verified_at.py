"""users.email_verified_at: when the user confirmed their email address (null = not confirmed)

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-17 20:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email_verified_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('email_verified_at')
