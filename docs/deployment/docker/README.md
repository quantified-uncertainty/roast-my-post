# Docker Compose Guide for RoastMyPost

This guide explains how to use Docker Compose for local development and testing of the RoastMyPost application.

## Quick Start

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. **Build and start all services**:
   ```bash
   docker-compose up -d
   # Or with the development override file:
   docker-compose -f docker-compose.yml -f config/docker/docker-compose.override.yml up -d
   ```

3. **Run database migrations**:
   ```bash
   docker-compose run --rm migrate
   ```

4. **Access the application**:
   - Web app: http://localhost:3000
   - pgAdmin: http://localhost:5050 (admin@localhost / admin)

## Available Services

### Core Services (always running)
- **postgres**: PostgreSQL database
- **web**: Next.js web application
- **migrate**: One-time database migration runner

### Optional Services
- **worker**: Background job processor (disabled by default in dev)
- **pgadmin**: Database management UI (enabled in dev)
- **redis**: Caching/session storage (commented out)

## Common Commands

### Start all services
```bash
docker-compose up -d
```

### Start with worker enabled
```bash
docker-compose --profile with-worker up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f worker
```

### Stop all services
```bash
docker-compose down

# Stop and remove volumes (WARNING: deletes database!)
docker-compose down -v
```

### Rebuild after code changes
```bash
docker-compose build web worker
docker-compose up -d
```

### Run database migrations
```bash
docker-compose run --rm migrate
```

### Access database CLI
```bash
docker-compose exec postgres psql -U postgres roastmypost
```

### Run Prisma Studio
```bash
docker-compose exec web npm run db:studio
```

## Development vs Production

### Development Mode (default)
The `/config/docker/docker-compose.override.yml` file automatically:
- Enables hot reload for Next.js
- Mounts source code for live updates
- Runs in development mode
- Enables pgAdmin

### Production Mode
For production-like testing:
```bash
# Use only the base docker-compose.yml
docker-compose -f docker-compose.yml up -d
```

### Environment Variables

Required in your `.env` file:
```env
# AI/LLM Keys
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENROUTER_API_KEY=sk-or-v1-...

# Email (for authentication with Resend)
AUTH_RESEND_KEY=re_actual_key_here
EMAIL_FROM=noreply@yourdomain.com
```

## Troubleshooting

### Database connection issues
```bash
# Check if postgres is healthy
docker-compose ps
docker-compose logs postgres

# Manually test connection
docker-compose exec postgres pg_isready -U postgres
```

### Build failures
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port conflicts
If port 3000 or 5432 is already in use:
```bash
# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Web on port 3001
  - "5433:5432"  # Postgres on port 5433
```

### Memory issues
If containers are running out of memory:
```bash
# Increase Docker Desktop memory allocation
# Or reduce Node.js memory usage in docker-compose.yml:
NODE_OPTIONS: "--max-old-space-size=512"
```

## Production Deployment

For production, you should:
1. Use separate docker-compose files per environment
2. Store secrets in a secure secret management system
3. Use managed databases instead of containerized postgres
4. Set up proper monitoring and logging
5. Configure SSL/TLS termination

Example production compose file:
```yaml
version: '3.8'
services:
  web:
    image: your-registry/roastmypost:latest
    environment:
      DATABASE_URL: ${PROD_DATABASE_URL}
      # ... other production env vars
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
```

## Notes

- The default `postgres` password is `postgres` - change this for any non-local deployment
- Database data persists in a Docker volume between restarts
- To completely reset, run `docker-compose down -v`
- For better performance in development, consider using native installations of PostgreSQL and Redis