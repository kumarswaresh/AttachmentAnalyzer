FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    git \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S aiagent && \
    adduser -S aiagent -u 1001 -G aiagent

# Set working directory
WORKDIR /opt/ai-agent

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Install dependencies
RUN npm ci --production && npm cache clean --force

# Copy application code
COPY . .

# Create log directory
RUN mkdir -p /var/log/ai-agent && \
    chown -R aiagent:aiagent /var/log/ai-agent /opt/ai-agent

# Switch to app user
USER aiagent

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["node", "--loader", "tsx", "server/index.ts"]