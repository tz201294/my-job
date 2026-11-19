"""user_interests: interests are catalog professions (slugs) instead of broad fields

An existing interest in a field (e.g. "Healthcare & Medicine") becomes every catalog profession
in that field, so nobody loses what they chose. Downgrade turns them back into their fields.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-19 10:00:00
"""
import json
from pathlib import Path

from alembic import op
import sqlalchemy as sa


revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None

# The catalog as it was when this migration was written (a later catalog change must not change it).
_CATALOG = json.loads((Path(__file__).resolve().parents[2] / 'app' / 'core' / 'professions.json').read_text(encoding='utf-8'))
_FIELD_OF = {p['slug']: p['field'] for p in _CATALOG}

interests = sa.table('user_interests', sa.column('user_id', sa.String), sa.column('interest', sa.String))


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.select(interests.c.user_id, interests.c.interest)).all()
    fields = {}
    for p in _CATALOG:
        fields.setdefault(p['field'], []).append(p['slug'])
    for user_id, interest in rows:
        if interest in _FIELD_OF:
            continue  # already a profession
        conn.execute(interests.delete().where(interests.c.user_id == user_id, interests.c.interest == interest))
        have = {r[0] for r in conn.execute(sa.select(interests.c.interest).where(interests.c.user_id == user_id))}
        for slug in fields.get(interest, []):
            if slug not in have:
                conn.execute(interests.insert().values(user_id=user_id, interest=slug))
                have.add(slug)


def downgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(sa.select(interests.c.user_id, interests.c.interest)).all()
    for user_id, interest in rows:
        field = _FIELD_OF.get(interest)
        if not field:
            continue
        conn.execute(interests.delete().where(interests.c.user_id == user_id, interests.c.interest == interest))
        exists = conn.execute(sa.select(interests.c.interest)
                              .where(interests.c.user_id == user_id, interests.c.interest == field)).first()
        if not exists:
            conn.execute(interests.insert().values(user_id=user_id, interest=field))
