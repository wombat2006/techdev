# Multi-stage production build for TechSapo Wall-bounce System
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm ci && npm run build

# Production stage
FROM node:20-alpine@sha256:c7620fdecfefb96813da62519897808775230386f4c8482e972e37b8b18cb460 AS production

# Security: Set production environment
ENV NODE_ENV=production

# Security: Install required packages and create non-root user
RUN apk add --no-cache curl tini && \
    addgroup -g 1001 -S techsapo && \
    adduser -S techsapo -u 1001

WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Set permissions
RUN chown -R techsapo:techsapo /app
USER techsapo

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/health || exit 1

EXPOSE ${PORT:-4000}

# Security: Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "--max-old-space-size=4096", "dist/wall-bounce-server.js"]