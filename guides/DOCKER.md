# Docker Setup Guide

Quick guide for running Karakeep with Docker for local development.

## What's Included

The `docker-compose.yml` provides:

- **PostgreSQL 16** - Main database
- **Redis 7** - Cache and job queue
- **pgAdmin** (optional) - PostgreSQL GUI
- **Redis Commander** (optional) - Redis GUI

## Quick Start

### 1. Start Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 2. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Or use Prisma Studio to explore the database
npm run db:studio
```

### 3. Start Development Server

```bash
npm run dev
```

## Service Details

### PostgreSQL

- **Host**: localhost
- **Port**: 5432
- **Database**: karakeep_dev
- **User**: karakeep
- **Password**: karakeep_dev_password
- **Connection String**:
  ```
  postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_dev?schema=public
  ```

### Redis

- **Host**: localhost
- **Port**: 6379
- **Password**: karakeep_redis_password
- **Connection String**:
  ```
  redis://:karakeep_redis_password@localhost:6379
  ```

## Optional Tools

Start with `--profile tools` to include GUI tools:

```bash
docker compose --profile tools up -d
```

### pgAdmin (PostgreSQL GUI)

- **URL**: http://localhost:5050
- **Email**: admin@karakeep.local
- **Password**: admin

To connect to the database:
1. Right-click "Servers" → "Register" → "Server"
2. General tab: Name = "Karakeep Local"
3. Connection tab:
   - Host: postgres (or host.docker.internal for Mac/Windows)
   - Port: 5432
   - Database: karakeep_dev
   - Username: karakeep
   - Password: karakeep_dev_password

### Redis Commander (Redis GUI)

- **URL**: http://localhost:8081
- Automatically connected to Redis

## Useful Commands

```bash
# Start services
docker compose up -d

# Stop services (keeps data)
docker compose stop

# Stop and remove containers (keeps data)
docker compose down

# Stop and remove everything including data
docker compose down -v

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Execute commands in containers
docker compose exec postgres psql -U karakeep -d karakeep_dev
docker compose exec redis redis-cli -a karakeep_redis_password

# Restart a service
docker compose restart postgres
docker compose restart redis

# Check service health
docker compose ps
```

## Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis persistence files
- `pgadmin_data` - pgAdmin settings

To reset the database:
```bash
docker compose down -v
docker compose up -d
npm run db:migrate
```

## Production Deployment

For production, use managed services:
- **Database**: Neon, Supabase, Vercel Postgres, Railway
- **Redis**: Upstash, Redis Cloud, Railway

Update `DATABASE_URL` and `REDIS_URL` in production environment variables.

## Troubleshooting

### Port Already in Use

If ports 5432 or 6379 are already in use:

1. Edit `docker-compose.yml` and change the host port:
   ```yaml
   ports:
     - "5433:5432"  # PostgreSQL
     - "6380:6379"  # Redis
   ```

2. Update `.env` accordingly:
   ```env
   DATABASE_URL="postgresql://karakeep:karakeep_dev_password@localhost:5433/karakeep_dev"
   REDIS_URL="redis://:karakeep_redis_password@localhost:6380"
   ```

### Connection Refused

Make sure containers are running:
```bash
docker compose ps
docker compose logs postgres
docker compose logs redis
```

### Reset Database

```bash
# Stop and remove all data
docker compose down -v

# Start fresh
docker compose up -d

# Run migrations
npm run db:migrate
```

## Alternative: Local Installation

If you prefer not to use Docker:

**PostgreSQL**:
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql-16
sudo systemctl start postgresql
```

**Redis**:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

Then update `.env` with your local connection strings.

---

**Next Steps**: [Quick Start Guide](docs/planning/quick-start.md)
