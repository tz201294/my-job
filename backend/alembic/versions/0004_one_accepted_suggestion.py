"""one accepted suggestion per challenge; solved flag matches accepted suggestions

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-17 09:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

suggestions = sa.table(
    'challenge_suggestions',
    sa.column('id', sa.String),
    sa.column('challenge_id', sa.String),
    sa.column('is_accepted_by_worker', sa.Boolean),
)
challenges = sa.table(
    'work_challenges',
    sa.column('id', sa.String),
    sa.column('is_solved', sa.Boolean),
)


def upgrade() -> None:
    accepted = suggestions.c.is_accepted_by_worker.is_(sa.true())

    # Existing data may have several accepted suggestions on one challenge; keep one so the index can be built.
    keep = sa.select(sa.func.min(suggestions.c.id)).where(accepted).group_by(suggestions.c.challenge_id)
    op.execute(
        suggestions.update().where(accepted, suggestions.c.id.not_in(keep)).values(is_accepted_by_worker=False)
    )

    # A challenge is solved exactly when it has an accepted suggestion.
    solved_ids = sa.select(suggestions.c.challenge_id).where(accepted)
    op.execute(challenges.update().values(is_solved=challenges.c.id.in_(solved_ids)))

    with op.batch_alter_table('challenge_suggestions', schema=None) as batch_op:
        batch_op.create_index(
            'uq_challenge_one_accepted_suggestion', ['challenge_id'], unique=True,
            postgresql_where=sa.text('is_accepted_by_worker IS true'),
            sqlite_where=sa.text('is_accepted_by_worker IS true'),
        )


def downgrade() -> None:
    with op.batch_alter_table('challenge_suggestions', schema=None) as batch_op:
        batch_op.drop_index('uq_challenge_one_accepted_suggestion')
