# Multi-stage build for Node.js backend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Build the backend (TypeScript compilation)
RUN npm run build

# Production image, copy all the files and run backend
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for health checks
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy the built application
COPY --from=builder --chown=backend:nodejs /app/dist ./dist

# Copy necessary configuration files
COPY --from=builder --chown=backend:nodejs /app/drizzle.config.ts ./drizzle.config.ts

USER backend

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]