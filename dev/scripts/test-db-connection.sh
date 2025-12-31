#!/bin/bash

# Usage: DATABASE_URL="your-connection-string" ./test-db-connection.sh

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

success=0
failure=0

for i in $(seq 1 100); do
  result=$(docker run --rm postgres:15 psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>&1)

  if echo "$result" | grep -q "does not exist\|error\|ERROR"; then
    failure=$((failure + 1))
    echo "Attempt $i: FAIL"
  else
    success=$((success + 1))
    echo "Attempt $i: OK"
  fi

  sleep 1
done

echo ""
echo "Results: $success successful, $failure failed out of 100 attempts"
