#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
container_id=""
cleanup() {
  if [[ -n "$container_id" ]]; then docker rm --force --volumes "$container_id" >/dev/null; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

container_id=$(docker run --detach --name "roast-pgboss-read-timeout-$$" \
  --label purpose=roast-pgboss-read-timeout-test \
  --cpus 0.5 --memory 256m --pids-limit 100 --publish 127.0.0.1::5432 \
  --env POSTGRES_USER=repro --env POSTGRES_PASSWORD=local-test-only \
  --env POSTGRES_DB=repro "${PGBOSS_TEST_POSTGRES_IMAGE:-postgres:16.3}")
ready=false
for ((attempt=0; attempt<30; attempt++)); do
  if docker exec "$container_id" pg_isready -h 127.0.0.1 -U repro >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then echo 'Test PostgreSQL did not become ready' >&2; exit 1; fi
binding=$(docker port "$container_id" 5432/tcp)
export PGBOSS_TEST_PORT="${binding##*:}"
cd "$repo_root/internal-packages/jobs"
pnpm exec tsx --test --test-concurrency=1 "$@" src/core/__tests__/PgBossService.integration.test.ts
