#!/usr/bin/env bash
# Makes an encrypted backup of the database: dump -> check it can be read -> encrypt -> delete the unencrypted copy.
#
#   DATABASE_URL=postgresql://...  BACKUP_PASSPHRASE=...  ops/backup.sh <output folder>
#
# Writes <output folder>/prologue-<date>.dump.gpg (a pg_dump "custom" archive, encrypted with AES-256 using the
# passphrase). pg_dump comes from the official postgres Docker image of the server's own major version, because
# pg_dump refuses servers newer than itself. Used by .github/workflows/backup.yml and checked in CI.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE is not set}"
out_dir="${1:?usage: ops/backup.sh <output folder>}"
mkdir -p "$out_dir"
out_dir="$(cd "$out_dir" && pwd)"

stamp="$(date -u +%Y-%m-%d_%H%M)"
plain="$out_dir/prologue-$stamp.dump"
sealed="$plain.gpg"

version_num="$(psql "$DATABASE_URL" -Atc "SHOW server_version_num")"
major=$((version_num / 10000))
echo "Database server: Postgres $major"

# --no-owner / --no-privileges: the backup restores into any database, whatever its user is called.
docker run --rm --network host postgres:"$major" \
  pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$plain"

# A backup that can't be read is worse than none: check it lists its tables and their data.
tables="$(docker run --rm -i postgres:"$major" pg_restore --list < "$plain" | grep -c " TABLE DATA " || true)"
if [ "$tables" -lt 1 ]; then
  echo "The dump contains no table data; refusing to keep it." >&2
  rm -f "$plain"
  exit 1
fi
echo "Dump OK: $(du -h "$plain" | cut -f1), $tables tables with data"

gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --symmetric --cipher-algo AES256 --output "$sealed" "$plain" 3<<<"$BACKUP_PASSPHRASE"
rm -f "$plain"
echo "Encrypted backup: $sealed ($(du -h "$sealed" | cut -f1))"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "file=$sealed" >> "$GITHUB_OUTPUT"
  echo "stamp=$stamp" >> "$GITHUB_OUTPUT"
fi
