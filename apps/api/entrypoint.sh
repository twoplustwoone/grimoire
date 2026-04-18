#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy --schema=../../packages/db/prisma/schema.prisma
echo "Migrations complete. Starting API..."
exec node dist/index.js
