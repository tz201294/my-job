"""view_events: which professions someone opens, for the "For you" feed

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-19 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'view_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('slug', sa.String(length=64), nullable=True),
        sa.Column('field', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_view_events_user_id_created_at', 'view_events', ['user_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_view_events_user_id_created_at', table_name='view_events')
    op.drop_table('view_events')
