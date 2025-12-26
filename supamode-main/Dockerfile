# Multi-stage Dockerfile for Supamode (App + API)
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat dumb-init gettext

# Enable corepack for pnpm
RUN corepack enable pnpm

# Set working directory
WORKDIR /app

# Cheap layer – only invalidates when lock / root deps change
COPY .npmrc turbo.json package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy every workspace manifest (tiny, still cache-friendly)
COPY apps/      ./apps
COPY packages/  ./packages
COPY tooling/  ./tooling

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build stage for API
FROM base AS build-api
WORKDIR /app
RUN pnpm run build --filter=api

# Build stage for App
FROM base AS build-app  
WORKDIR /app

# Declare Vite build-time variables as ARGs
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SITE_URL
ARG VITE_OAUTH_PROVIDERS
ARG VITE_ENABLE_VERSION_CHECK
ARG VITE_CAPTCHA_SITE_KEY

# Set as environment variables for the build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_OAUTH_PROVIDERS=$VITE_OAUTH_PROVIDERS
ENV VITE_ENABLE_VERSION_CHECK=$VITE_ENABLE_VERSION_CHECK
ENV VITE_CAPTCHA_SITE_KEY=$VITE_CAPTCHA_SITE_KEY

RUN pnpm run build --filter=app

# Production stage for API
FROM base AS api-runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for API
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# Copy built API and dependencies
COPY --from=build-api --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=build-api --chown=hono:nodejs /app/apps/api ./apps/api
COPY --from=build-api --chown=hono:nodejs /app/packages ./packages
COPY --from=build-api --chown=hono:nodejs /app/package.json ./

USER hono
EXPOSE 3000

CMD ["pnpm", "run", "start:api"]

# Production stage for App (nginx)
FROM nginx:alpine AS app-runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init gettext

# Create non-root user for app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S rr -u 1001

# Copy built app assets
COPY --from=build-app --chown=rr:nodejs /app/apps/app/dist /usr/share/nginx/html

# Copy nginx configuration and entrypoint
COPY apps/app/nginx.conf.template /etc/nginx/nginx.conf.template
COPY apps/app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && \
    chown rr:nodejs /docker-entrypoint.sh

# Environment variables
ENV API_URL=http://api:3000

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

# Multi-service runner (for docker-compose)
FROM base AS multi-runner
WORKDIR /app

ENV NODE_ENV=production

# Create users
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# Copy API build
COPY --from=build-api --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=build-api --chown=hono:nodejs /app/apps/api ./apps/api
COPY --from=build-api --chown=hono:nodejs /app/packages ./packages
COPY --from=build-api --chown=hono:nodejs /app/package.json ./

# Install nginx for serving static files
RUN apk add --no-cache nginx

# Copy app build
COPY --from=build-app /app/apps/app/dist /usr/share/nginx/html
COPY apps/app/nginx.conf.template /etc/nginx/nginx.conf.template

# Create startup script with proper env substitution
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "Starting multi-service container..."' >> /start.sh && \
    echo 'echo "API_URL: ${API_URL}"' >> /start.sh && \
    echo '# Substitute environment variables in nginx config' >> /start.sh && \
    echo 'envsubst '"'"'${API_URL}'"'"' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf' >> /start.sh && \
    echo '# Validate nginx config' >> /start.sh && \
    echo 'nginx -t' >> /start.sh && \
    echo '# Start nginx in background' >> /start.sh && \
    echo 'nginx &' >> /start.sh && \
    echo '# Start API server' >> /start.sh && \
    echo 'cd /app && exec pnpm run start:api' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80 3000

CMD ["/start.sh"]