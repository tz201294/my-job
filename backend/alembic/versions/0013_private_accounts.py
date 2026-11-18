"""private accounts: users.is_private and follow_requests

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-20 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_private', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table(
        'follow_requests',
        sa.Column('requester_id', sa.String(), nullable=False),
        sa.Column('target_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('requester_id', 'target_id'),
    )
    op.create_index(op.f('ix_follow_requests_target_id'), 'follow_requests', ['target_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_follow_requests_target_id'), table_name='follow_requests')
    op.drop_table('follow_requests')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_private')
