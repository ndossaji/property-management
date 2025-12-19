# Docker Deployment Guide

This guide explains how to deploy the Property Management Application using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB of available RAM
- At least 10GB of available disk space

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and update the following critical values:

- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `REDIS_PASSWORD` - Strong password for Redis
- `SECRET_KEY` - Random 32+ character string
- `JWT_SECRET` - Random 32+ character string
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` - Your Auth0 credentials
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` - Your AWS credentials
- `SMTP_*` - Your email server configuration

### 2. Build and Start Services

```bash
# Build all services
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Verify Deployment

Check that all services are running:

```bash
docker-compose ps
```

Access the application:

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **API Documentation**: http://localhost/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Service Architecture

The deployment consists of the following services:

1. **postgres** - PostgreSQL 15 database
2. **redis** - Redis 7 for caching and Celery broker
3. **backend** - FastAPI application server
4. **celery-worker** - Background task processor
5. **celery-beat** - Scheduled task scheduler
6. **frontend** - Next.js application
7. **nginx** - Reverse proxy and load balancer

## Common Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend bash

# Run database migrations
docker-compose exec backend alembic upgrade head

# Create superuser
docker-compose exec backend python -m app.scripts.create_superuser

# Django-style management commands
docker-compose exec backend python -m app.cli <command>
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker-compose exec postgres psql -U postgres -d propertymgmt

# Backup database
docker-compose exec postgres pg_dump -U postgres propertymgmt > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres propertymgmt < backup.sql

# View database logs
docker-compose logs postgres
```

### Celery Operations

```bash
# View active tasks
docker-compose exec celery-worker celery -A app.celery_app inspect active

# View scheduled tasks
docker-compose exec celery-beat celery -A app.celery_app inspect scheduled

# Purge all tasks
docker-compose exec celery-worker celery -A app.celery_app purge
```

## Development vs Production

### Development Mode

For development with hot reload:

```bash
# Use development target
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production Mode

For production deployment:

1. Ensure all environment variables are properly set
2. Use strong passwords and secrets
3. Configure SSL certificates in nginx
4. Set `APP_ENV=production` and `NODE_ENV=production`
5. Consider using Docker Swarm or Kubernetes for orchestration

## Scaling

Scale specific services:

```bash
# Scale Celery workers
docker-compose up -d --scale celery-worker=4

# Scale backend API
docker-compose up -d --scale backend=3
```

## Monitoring

### Health Checks

All services include health checks. View status:

```bash
docker-compose ps
```

### Resource Usage

```bash
# View resource usage
docker stats

# View specific service
docker stats propertymgmt-backend
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes
docker-compose down -v
docker-compose up -d
```

### Database connection errors

```bash
# Verify PostgreSQL is healthy
docker-compose exec postgres pg_isready

# Check database logs
docker-compose logs postgres
```

### Permission errors

```bash
# Fix volume permissions
docker-compose down
sudo chown -R $USER:$USER .
docker-compose up -d
```

## Security Considerations

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Use strong passwords** - Generate random passwords for all services
3. **Enable SSL/TLS** - Configure HTTPS in nginx for production
4. **Limit exposed ports** - Only expose necessary ports
5. **Regular updates** - Keep Docker images updated
6. **Network isolation** - Services communicate via internal network
7. **Non-root users** - All containers run as non-root users

## Backup Strategy

### Automated Backups

Create a backup script:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres propertymgmt | gzip > backups/db_$DATE.sql.gz
```

### Volume Backups

```bash
# Backup volumes
docker run --rm -v propertymgmt_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data.tar.gz /data
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

