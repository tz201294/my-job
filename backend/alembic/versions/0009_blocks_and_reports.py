"""blocks and reports (moderation)

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-18 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'blocks',
        sa.Column('blocker_id', sa.String(), nullable=False),
        sa.Column('blocked_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('blocker_id', 'blocked_id'),
    )
    op.create_index(op.f('ix_blocks_blocked_id'), 'blocks', ['blocked_id'], unique=False)

    op.create_table(
        'reports',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('reporter_id', sa.String(), nullable=False),
        sa.Column('target_type', sa.String(length=16), nullable=False),
        sa.Column('target_id', sa.String(), nullable=False),
        sa.Column('target_user_id', sa.String(), nullable=True),
        sa.Column('reason', sa.String(length=32), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_reports_reporter_id'), 'reports', ['reporter_id'], unique=False)
    op.create_index(op.f('ix_reports_target_user_id'), 'reports', ['target_user_id'], unique=False)
    op.create_index('ix_reports_status_target', 'reports', ['status', 'target_type', 'target_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_reports_status_target', table_name='reports')
    op.drop_index(op.f('ix_reports_target_user_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_reporter_id'), table_name='reports')
    op.drop_table('reports')
    op.drop_index(op.f('ix_blocks_blocked_id'), table_name='blocks')
    op.drop_table('blocks')
