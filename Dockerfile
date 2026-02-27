# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (including devDependencies for build)
RUN pnpm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN pnpm exec prisma generate

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Testing stage
FROM node:22-alpine AS testing

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy everything from builder (deps, source, dist, prisma)
COPY --from=builder /app ./

# Run tests
RUN pnpm test

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (Prisma CLI is required for generate/migrate in this stage)
RUN pnpm install --frozen-lockfile

# Copy prisma schema, config, and generate client
COPY prisma ./prisma
COPY prisma.config.ts prisma.config.cjs ./
RUN pnpm exec prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Ensure node user can access app files (needed for prisma migrate)
RUN chown -R node:node /app

EXPOSE 8080

# Run migrations, seed data, and start the app
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --config ./prisma.config.cjs && node dist/prisma/seed.js && node dist/src/main.js"]
