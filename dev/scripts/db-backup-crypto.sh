#!/usr/bin/env bash
# Encrypt backups before upload; decrypt into a temporary file before exposing output.
set -euo pipefail
umask 077

if [[ $# -ne 3 || ! "$1" =~ ^(encrypt|decrypt)$ ]]; then
  echo "Usage: $0 encrypt|decrypt INPUT OUTPUT" >&2
  exit 1
fi

if [[ -z "${DATABASE_BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "DATABASE_BACKUP_ENCRYPTION_KEY is required" >&2
  exit 1
fi

operation="$1"
input="$2"
output="$3"
[[ -f "$input" ]] || { echo "Input file does not exist" >&2; exit 1; }
[[ ! -e "$output" ]] || { echo "Refusing to overwrite output file" >&2; exit 1; }

temporary_output=$(mktemp "${output}.tmp.XXXXXX")
trap 'rm -f -- "$temporary_output"' EXIT

gpg_options=(--batch --yes --pinentry-mode loopback --no-symkey-cache --passphrase-fd 0)
if [[ "$operation" == encrypt ]]; then
  printf '%s' "$DATABASE_BACKUP_ENCRYPTION_KEY" | gpg "${gpg_options[@]}" \
    --symmetric --cipher-algo AES256 --compress-algo none --output "$temporary_output" -- "$input"
else
  printf '%s' "$DATABASE_BACKUP_ENCRYPTION_KEY" | gpg "${gpg_options[@]}" \
    --decrypt --output "$temporary_output" -- "$input"
fi

mv -- "$temporary_output" "$output"
