# Docker Deployment - Property Management Application

Complete Docker deployment configuration for the Property Management Application.

## 🏗️ Architecture

This application uses a microservices architecture with the following components:

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and React Query
- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Database**: PostgreSQL 15 with automated backups
- **Cache/Queue**: Redis 7 for caching and Celery message broker
- **Background Workers**: Celery for async task processing
- **Reverse Proxy**: Nginx for routing and load balancing
- **Authentication**: Auth0 or AWS Cognito
- **Storage**: AWS S3 for file uploads and documents

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ disk space

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd propertymgmt
   ```

2. **Set up environment variables**
   ```bash
   make setup
   # Edit .env with your configuration
   ```

3. **Build and start services**
   ```bash
   make build
   make up
   ```

4. **Verify deployment**
   ```bash
   make status
   ```

5. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - API Docs: http://localhost/api/docs

## 📚 Documentation

- **[Docker Deployment Guide](DOCKER_DEPLOYMENT.md)** - Comprehensive deployment instructions
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[Tech Stack Breakdown](TechStack_Breakdown.md)** - Detailed technology choices

## 🛠️ Development

### Development Mode

Start services with hot reload:

```bash
make dev
```

This will:
- Enable hot reload for backend (FastAPI)
- Enable hot reload for frontend (Next.js)
- Mount source code as volumes
- Use development-specific settings

### Common Commands

```bash
# View logs
make logs

# Access backend shell
make shell-backend

# Access database
make db-shell

# Run migrations
make db-migrate

# Run tests
make test

# Restart services
make restart
```

See `Makefile` for all available commands.

## 📦 Project Structure

```
propertymgmt/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── celery_app.py   # Celery configuration
│   │   └── tasks.py        # Background tasks
│   ├── Dockerfile          # Backend container image
│   ├── Dockerfile.celery   # Celery worker image
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   └── app/           # Next.js app directory
│   ├── Dockerfile         # Frontend container image
│   ├── package.json       # Node.js dependencies
│   └── next.config.js     # Next.js configuration
├── docker/                # Docker configuration files
│   ├── nginx/            # Nginx configuration
│   │   ├── nginx.conf
│   │   └── conf.d/
│   └── postgres/         # PostgreSQL initialization
│       └── init.sql
├── docker-compose.yml     # Production compose file
├── docker-compose.dev.yml # Development overrides
├── .env.example          # Environment variables template
├── Makefile              # Convenience commands
└── README.md             # Main project README
```

## 🔒 Security

- All services run as non-root users
- Secrets managed via environment variables
- CORS configured for production domains
- Rate limiting enabled in nginx
- Health checks for all services
- SSL/TLS support (configure in nginx)

**Important**: Never commit `.env` file or any secrets to version control!

## 🔄 Backup & Restore

### Backup Database

```bash
make db-backup
```

Backups are stored in `backups/` directory.

### Restore Database

```bash
make db-restore
```

## 🚢 Production Deployment

1. Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Configure production environment variables
3. Set up SSL certificates
4. Configure domain and DNS
5. Deploy:
   ```bash
   make prod-deploy
   ```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend API
docker-compose up -d --scale backend=3

# Scale Celery workers
docker-compose up -d --scale celery-worker=4
```

---

Built with ❤️ using modern technologies and best practices.

