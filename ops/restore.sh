#!/usr/bin/env bash
# Restores an encrypted backup made by ops/backup.sh into an EMPTY database.
#
#   TARGET_DATABASE_URL=postgresql://...  BACKUP_PASSPHRASE=...  ops/restore.sh <file.dump.gpg>
#
# On purpose it refuses a database that already has tables, so it can never overwrite the live one by mistake:
# restore into a new database, check it, then point the API at it (docs/DEPLOY.md, "Restoring a backup").
set -euo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is not set}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is not set}"
sealed="${1:?usage: ops/restore.sh <file.dump.gpg>}"
[ -f "$sealed" ] || { echo "No such file: $sealed" >&2; exit 1; }

existing="$(psql "$TARGET_DATABASE_URL" -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
if [ "$existing" -gt 0 ]; then
  echo "The target database already has $existing tables. Restore only into a new, empty database." >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --decrypt --output "$work/backup.dump" "$sealed" 3<<<"$BACKUP_PASSPHRASE"

version_num="$(psql "$TARGET_DATABASE_URL" -Atc "SHOW server_version_num")"
major=$((version_num / 10000))
docker run --rm -i --network host postgres:"$major" \
  pg_restore --no-owner --no-privileges --exit-on-error --dbname "$TARGET_DATABASE_URL" < "$work/backup.dump"

echo "Restored. Tables and rows:"
psql "$TARGET_DATABASE_URL" -Atc "SELECT 'users', count(*) FROM users UNION ALL SELECT 'posts', count(*) FROM posts
  UNION ALL SELECT 'alembic version', count(*) FROM alembic_version" | sed 's/|/: /'
