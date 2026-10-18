#!/usr/bin/env bash
set -euo pipefail
umask 077
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
test_dir=$(mktemp -d)
trap 'rm -rf -- "$test_dir"' EXIT
export GNUPGHOME="$test_dir/gnupg"
mkdir -m 700 "$GNUPGHOME"
export DATABASE_BACKUP_ENCRYPTION_KEY="$(openssl rand -base64 48)"

printf '%s\n' '-- PostgreSQL database dump' 'SELECT 123456789;' | gzip > "$test_dir/input.sql.gz"
bash "$script_dir/db-backup-crypto.sh" encrypt "$test_dir/input.sql.gz" "$test_dir/backup.sql.gz.gpg"
bash "$script_dir/db-backup-crypto.sh" decrypt "$test_dir/backup.sql.gz.gpg" "$test_dir/restored.sql.gz"
cmp "$test_dir/input.sql.gz" "$test_dir/restored.sql.gz"
gzip -t "$test_dir/restored.sql.gz"
[[ $(stat -c '%a' "$test_dir/backup.sql.gz.gpg") == 600 ]]
[[ $(stat -c '%a' "$test_dir/restored.sql.gz") == 600 ]]

head -c -1 "$test_dir/backup.sql.gz.gpg" > "$test_dir/truncated.gpg"
if bash "$script_dir/db-backup-crypto.sh" decrypt \
  "$test_dir/truncated.gpg" "$test_dir/truncated.sql.gz" 2>/dev/null; then
  echo "Decryption unexpectedly accepted a truncated backup" >&2; exit 1
fi
[[ ! -e "$test_dir/truncated.sql.gz" ]]

if DATABASE_BACKUP_ENCRYPTION_KEY=incorrect bash "$script_dir/db-backup-crypto.sh" decrypt \
  "$test_dir/backup.sql.gz.gpg" "$test_dir/wrong-key.sql.gz" 2>/dev/null; then
  echo "Decryption unexpectedly accepted an incorrect key" >&2; exit 1
fi
[[ ! -e "$test_dir/wrong-key.sql.gz" ]]
if DATABASE_BACKUP_ENCRYPTION_KEY= bash "$script_dir/db-backup-crypto.sh" encrypt \
  "$test_dir/input.sql.gz" "$test_dir/missing-key.gpg" 2>/dev/null; then
  echo "Encryption unexpectedly accepted a missing key" >&2; exit 1
fi
[[ ! -e "$test_dir/missing-key.gpg" ]]
if bash "$script_dir/db-backup-crypto.sh" encrypt \
  "$test_dir/input.sql.gz" "$test_dir/backup.sql.gz.gpg" 2>/dev/null; then
  echo "Encryption unexpectedly overwrote an existing backup" >&2; exit 1
fi
echo "Backup round trip, file permissions, corrupt data, incorrect/missing keys, and overwrite protection passed."
