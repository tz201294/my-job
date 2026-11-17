"""notifications and comment reactions

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-17 18:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'comment_reactions',
        sa.Column('comment_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('emoji', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['comment_id'], ['post_comments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('comment_id', 'user_id'),
    )
    op.create_index('ix_comment_reactions_user_id', 'comment_reactions', ['user_id'])

    op.create_table(
        'notifications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False),
        sa.Column('post_id', sa.String(), nullable=True),
        sa.Column('comment_id', sa.String(), nullable=True),
        sa.Column('question_id', sa.String(), nullable=True),
        sa.Column('challenge_id', sa.String(), nullable=True),
        sa.Column('suggestion_id', sa.String(), nullable=True),
        sa.Column('snippet', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['comment_id'], ['post_comments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['qa_questions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['challenge_id'], ['work_challenges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['suggestion_id'], ['challenge_suggestions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_user_id_created_at', 'notifications', ['user_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_user_id_created_at', table_name='notifications')
    op.drop_table('notifications')
    op.drop_index('ix_comment_reactions_user_id', table_name='comment_reactions')
    op.drop_table('comment_reactions')
