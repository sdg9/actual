#!/bin/sh
set -eu
umask 077
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd /Users/steven/services/actual
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="backups/actual-$stamp.tar.gz"
# Stop only Actual briefly so SQLite databases, WALs and budget files agree.
# Always bring it back, even if archiving fails.
trap 'docker compose up -d actual' EXIT
docker compose stop -t 30 actual
tar -czf "$archive.partial" data compose.yaml
tar -tzf "$archive.partial" >/dev/null
mv "$archive.partial" "$archive"
find backups -name 'actual-*.tar.gz' -mtime +14 -delete
printf 'Backup verified: %s\n' "$archive"
