# Multi-stage Dockerfile for ChatBots Next.js Application
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Enable corepack for pnpm
RUN corepack enable pnpm

WORKDIR /app

# ============================================
# Dependencies stage - Install all dependencies
# ============================================
FROM base AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY turbo.json ./

# Copy all workspace package.json files
COPY apps/chatbots/package.json ./apps/chatbots/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Builder stage - Build the application
# ============================================
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/chatbots/node_modules ./apps/chatbots/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Build-time environment variables (passed via --build-arg)
# Note: SITE_URL must be HTTPS for production builds
ARG NEXT_PUBLIC_SUPABASE_URL=https://api.example.com
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key
ARG NEXT_PUBLIC_SITE_URL=https://app.example.com
ARG NEXT_PUBLIC_BILLING_PROVIDER=stripe
ARG NEXT_PUBLIC_PRODUCT_NAME=ChatBots
ARG NEXT_PUBLIC_SITE_TITLE=ChatBots
ARG NEXT_PUBLIC_SITE_DESCRIPTION=AI Chatbot Platform
ARG EMAIL_SENDER=noreply@example.com
ARG OPENAI_API_KEY=placeholder

# Set environment variables for the build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_BILLING_PROVIDER=$NEXT_PUBLIC_BILLING_PROVIDER
ENV NEXT_PUBLIC_PRODUCT_NAME=$NEXT_PUBLIC_PRODUCT_NAME
ENV NEXT_PUBLIC_SITE_TITLE=$NEXT_PUBLIC_SITE_TITLE
ENV NEXT_PUBLIC_SITE_DESCRIPTION=$NEXT_PUBLIC_SITE_DESCRIPTION
ENV EMAIL_SENDER=$EMAIL_SENDER
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# Skip HTTPS URL validation during build (use 1 for CI environments)
ENV NEXT_PUBLIC_CI=1

# Build the Next.js application
RUN pnpm --filter chatbots build

# ============================================
# Runner stage - Production runtime
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/apps/chatbots/.next/standalone ./
COPY --from=builder /app/apps/chatbots/.next/static ./apps/chatbots/.next/static
COPY --from=builder /app/apps/chatbots/public ./apps/chatbots/public

# Copy content directory for dynamic imports (MDX content)
COPY --from=builder /app/apps/chatbots/content ./apps/chatbots/content

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js server
CMD ["node", "apps/chatbots/server.js"]

