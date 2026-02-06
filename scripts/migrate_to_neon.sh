#!/usr/bin/env bash
set -euo pipefail

# migrate_to_neon.sh
# Usage:
# DATABASE_URL="postgresql://user:PASS@host:5432/db?sslmode=require" \
# LOCAL_CONN="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
# ./scripts/migrate_to_neon.sh

if [[ -z "${DATABASE_URL:-}" || -z "${LOCAL_CONN:-}" ]]; then
  echo "ERROR: DATABASE_URL and LOCAL_CONN must be set as environment variables."
  echo "Example: DATABASE_URL='postgresql://user:PASSWORD@host:5432/db?sslmode=require'" 
  echo "         LOCAL_CONN='postgresql://postgres:PASSWORD@127.0.0.1:54322/postgres'"
  exit 1
fi

export TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_BACKUP="remote_backup_${TIMESTAMP}.custom"
LOCAL_DUMP="local_dump_${TIMESTAMP}.custom"
LOGFILE="migration_${TIMESTAMP}.log"

echo "Migration started: $(date)" | tee "$LOGFILE"

# Check for required CLI tools
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found. Install PostgreSQL client (psql/pg_dump). On macOS: brew install libpq && echo 'export PATH=\"$(brew --prefix libpq)/bin:$PATH\"' >> ~/.zshrc" | tee -a "$LOGFILE"; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore not found. Install PostgreSQL client." | tee -a "$LOGFILE"; exit 1; }
command -v psql >/dev/null 2>&1 || echo "Warning: psql not found. Some verification steps may be skipped." | tee -a "$LOGFILE"

# 1) Create a backup of the remote DB
echo "Creating remote backup to $REMOTE_BACKUP" | tee -a "$LOGFILE"
pg_dump -Fc --no-owner --no-acl --dbname="${DATABASE_URL}" -f "$REMOTE_BACKUP" 2>&1 | tee -a "$LOGFILE"

# 2) Create a dump of the local DB
echo "Creating local dump to $LOCAL_DUMP" | tee -a "$LOGFILE"
pg_dump -Fc --no-owner --no-acl --dbname="${LOCAL_CONN}" -f "$LOCAL_DUMP" 2>&1 | tee -a "$LOGFILE"

# 3) Optional: list extensions present in local dump (informational)
if command -v pg_restore >/dev/null 2>&1; then
  echo "Listing extensions detected in local dump (informational)" | tee -a "$LOGFILE"
  pg_restore -l "$LOCAL_DUMP" | grep -i extension || true
fi

# 4) Restore local dump to remote
echo "Restoring local dump to remote (this will affect remote DB)" | tee -a "$LOGFILE"
read -p "Type 'YES' to proceed with restore to remote DB: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborting restore." | tee -a "$LOGFILE"
  exit 0
fi

pg_restore --no-owner --no-acl --dbname="${DATABASE_URL}" "$LOCAL_DUMP" 2>&1 | tee -a "$LOGFILE"

# 5) Verification (row counts for public tables)
if command -v psql >/dev/null 2>&1; then
  echo "Running verification queries..." | tee -a "$LOGFILE"
  echo "Collecting local counts..." | tee -a "$LOGFILE"
  psql "${LOCAL_CONN}" -At -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | while read -r t; do echo "$t: $(psql "${LOCAL_CONN}" -At -c "SELECT COUNT(*) FROM \"$t\";")"; done > local_counts.txt
  echo "Collecting remote counts..." | tee -a "$LOGFILE"
  psql "${DATABASE_URL}" -At -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" | while read -r t; do echo "$t: $(psql "${DATABASE_URL}" -At -c "SELECT COUNT(*) FROM \"$t\";")"; done > remote_counts.txt
  echo "Differences:" | tee -a "$LOGFILE"
  diff -u local_counts.txt remote_counts.txt || true
else
  echo "Skipping psql verification (psql not installed). Please run verification manually." | tee -a "$LOGFILE"
fi

# 6) Cleanup suggestions
echo "Migration finished. Logs: $LOGFILE" | tee -a "$LOGFILE"
echo "Remote backup file: $REMOTE_BACKUP" | tee -a "$LOGFILE"
echo "Local dump file: $LOCAL_DUMP" | tee -a "$LOGFILE"

echo "Please rotate the remote DB password after you confirm the migration succeeded." | tee -a "$LOGFILE"

# End
exit 0
