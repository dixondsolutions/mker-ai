# Docker Deployment

This directory contains Docker configuration for deploying ChatBots + Supamode.

## Deployment Options

### Option 1: Applications Only (Recommended)

Connect to an existing Supabase instance (Cloud or self-hosted).

```bash
# 1. Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export SUPABASE_DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
export NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
export NEXT_PUBLIC_SITE_URL=https://your-app.com
export OPENAI_API_KEY=your-openai-key

# 2. Build and start
docker compose -f docker-compose.apps.yml up --build -d

# 3. Access applications
# ChatBots: http://localhost:3000
# Supamode: http://localhost:8080
```

### Option 2: Full Stack (Self-Hosted Supabase)

For a complete self-hosted solution including Supabase:

1. **Copy the environment template:**
   ```bash
   cp docker/env-example.txt .env
   ```

2. **Edit `.env` with your values:**
   - Generate a strong `POSTGRES_PASSWORD`
   - Generate a strong `JWT_SECRET` (at least 32 characters)
   - Generate proper `ANON_KEY` and `SERVICE_ROLE_KEY`

3. **Build and start all services:**
   ```bash
   docker compose up --build -d
   ```

4. **Create an admin user:**
   - First, sign up through ChatBots at http://localhost:3000
   - Then run the admin setup script:
   ```bash
   psql "postgresql://postgres:YOUR_PASSWORD@localhost:54322/postgres" \
     -f docker/setup-admin.sql \
     -v admin_email="'your@email.com'"
   ```

5. **Access the applications:**
   - ChatBots: http://localhost:3000
   - Supamode: http://localhost:8080
   - Supabase Studio: http://localhost:54323

**Note:** Full self-hosted Supabase requires additional setup. See the official
[Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting/docker) for details.

## Files

| File | Description |
|------|-------------|
| `env-example.txt` | Environment variable template (copy to `.env`) |
| `kong.yml` | Kong API Gateway configuration |
| `vector.yml` | Vector log aggregation configuration |
| `init-db.sql` | Database initialization script (Supamode schema + seeds) |
| `setup-admin.sql` | Script to configure an admin user for Supamode |

## Services

### Applications
- **chatbots** - Next.js main application (port 3000)
- **supamode-web** - React admin dashboard (port 8080)
- **supamode-api** - Hono.js API server (internal)

### Supabase
- **db** - PostgreSQL 15 database (port 54322)
- **kong** - API Gateway (port 54321)
- **auth** - GoTrue authentication
- **rest** - PostgREST API
- **realtime** - WebSocket server
- **storage** - File storage API
- **studio** - Supabase Dashboard (port 54323)
- **meta** - Postgres metadata API
- **analytics** - Log analytics
- **vector** - Log aggregation
- **imgproxy** - Image transformation

## Commands

```bash
# Start all services
docker compose up -d

# Start and rebuild
docker compose up --build -d

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f chatbots

# Stop all services
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v

# Restart a specific service
docker compose restart supamode-api
```

## Generating JWT Keys

For production, generate proper JWT keys:

```bash
# Generate a random JWT secret
openssl rand -base64 32

# Generate API keys using Supabase CLI
supabase gen keys --jwt-secret YOUR_JWT_SECRET
```

Or use the [Supabase JWT Generator](https://supabase.com/docs/guides/hosting/overview#api-keys).

## Production Deployment

For production:

1. Use strong, unique passwords and secrets
2. Configure HTTPS using a reverse proxy (nginx, traefik)
3. Set proper CORS origins in environment variables
4. Consider disabling Supabase Studio or restricting access
5. Set up proper backup procedures for the database
6. Configure email/SMTP for authentication emails

