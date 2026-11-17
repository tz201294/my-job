"""post comments; comments_count reflects real comments

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-17 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'post_comments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('post_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_post_comments_post_id_created_at', 'post_comments', ['post_id', 'created_at'])
    op.create_index('ix_post_comments_user_id', 'post_comments', ['user_id'])

    # Until now comments_count held placeholder numbers; there are no comments yet, so it is 0 everywhere.
    op.execute(sa.text('UPDATE posts SET comments_count = 0'))


def downgrade() -> None:
    op.drop_index('ix_post_comments_user_id', table_name='post_comments')
    op.drop_index('ix_post_comments_post_id_created_at', table_name='post_comments')
    op.drop_table('post_comments')
