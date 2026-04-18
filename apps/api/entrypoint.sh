#!/bin/sh
set -e
echo "Running database migrations..."
(cd /app && pnpm --filter @grimoire/db exec prisma migrate deploy --schema=./prisma/schema.prisma)
echo "Migrations complete. Starting API..."
exec node dist/index.js
