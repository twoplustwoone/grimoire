FROM node:22-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files for all packages
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json ./apps/web/

# Copy prisma schema so @grimoire/db's postinstall (prisma generate) succeeds
COPY packages/db/prisma/ ./packages/db/prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Generate Prisma client
RUN pnpm --filter @grimoire/db generate

# Build the web app
ARG DATABASE_URL
ARG BETTER_AUTH_URL
ARG BETTER_AUTH_SECRET
ARG NEXT_PUBLIC_API_URL
ARG API_INTERNAL_URL
ENV DATABASE_URL=$DATABASE_URL
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL
RUN pnpm --filter @grimoire/web build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_INTERNAL_URL=""
ENV BETTER_AUTH_SECRET=""
ENV BETTER_AUTH_URL=""
ENV DATABASE_URL=""

# Copy the standalone Next.js output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
