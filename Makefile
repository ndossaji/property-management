# =============================================================================
# Makefile for Property Management Application
# =============================================================================
# Convenience commands for Docker operations

.PHONY: help build up down restart logs clean test migrate backup restore

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Property Management Application - Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# =============================================================================
# Setup Commands
# =============================================================================

setup: ## Initial setup - copy .env.example to .env
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file. Please update it with your configuration.$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists.$(NC)"; \
	fi

# =============================================================================
# Build Commands
# =============================================================================

build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build

build-no-cache: ## Build all Docker images without cache
	@echo "$(BLUE)Building Docker images without cache...$(NC)"
	docker-compose build --no-cache

# =============================================================================
# Service Management
# =============================================================================

up: ## Start all services in detached mode
	@echo "$(BLUE)Starting all services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services started successfully!$(NC)"
	@make status

down: ## Stop all services
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)Services stopped successfully!$(NC)"

down-volumes: ## Stop all services and remove volumes (WARNING: deletes data)
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)Services and volumes removed!$(NC)"; \
	fi

restart: ## Restart all services
	@echo "$(BLUE)Restarting all services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)Services restarted!$(NC)"

restart-backend: ## Restart backend service
	docker-compose restart backend

restart-frontend: ## Restart frontend service
	docker-compose restart frontend

restart-celery: ## Restart celery workers
	docker-compose restart celery-worker celery-beat

# =============================================================================
# Development Commands
# =============================================================================

dev: ## Start services in development mode with hot reload
	@echo "$(BLUE)Starting services in development mode...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-build: ## Build and start services in development mode
	@echo "$(BLUE)Building and starting services in development mode...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# =============================================================================
# Logs and Monitoring
# =============================================================================

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-celery: ## View celery worker logs
	docker-compose logs -f celery-worker celery-beat

logs-db: ## View database logs
	docker-compose logs -f postgres

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps

stats: ## Show resource usage statistics
	docker stats

# =============================================================================
# Database Commands
# =============================================================================

db-shell: ## Access PostgreSQL shell
	docker-compose exec postgres psql -U postgres -d propertymgmt

db-migrate: ## Run database migrations
	docker-compose exec backend alembic upgrade head

db-rollback: ## Rollback last migration
	docker-compose exec backend alembic downgrade -1

db-backup: ## Backup database to backups/
	@mkdir -p backups
	@echo "$(BLUE)Creating database backup...$(NC)"
	docker-compose exec -T postgres pg_dump -U postgres propertymgmt | gzip > backups/db_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "$(GREEN)Backup created successfully!$(NC)"

db-restore: ## Restore database from latest backup
	@echo "$(RED)WARNING: This will overwrite the current database!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		gunzip < $$(ls -t backups/db_*.sql.gz | head -1) | docker-compose exec -T postgres psql -U postgres propertymgmt; \
		echo "$(GREEN)Database restored!$(NC)"; \
	fi

# =============================================================================
# Shell Access
# =============================================================================

shell-backend: ## Access backend container shell
	docker-compose exec backend bash

shell-frontend: ## Access frontend container shell
	docker-compose exec frontend sh

shell-db: ## Access database container shell
	docker-compose exec postgres bash

# =============================================================================
# Testing
# =============================================================================

test: ## Run backend tests
	docker-compose exec backend pytest

test-coverage: ## Run tests with coverage report
	docker-compose exec backend pytest --cov=app --cov-report=html

# =============================================================================
# Cleanup Commands
# =============================================================================

clean: ## Remove stopped containers and unused images
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	docker-compose down
	docker system prune -f
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-all: ## Remove all containers, images, and volumes (WARNING: nuclear option)
	@echo "$(RED)WARNING: This will remove ALL Docker resources!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -af --volumes; \
		echo "$(GREEN)All Docker resources removed!$(NC)"; \
	fi

# =============================================================================
# Production Commands
# =============================================================================

prod-deploy: ## Deploy to production (build and start)
	@echo "$(BLUE)Deploying to production...$(NC)"
	docker-compose build
	docker-compose up -d
	@echo "$(GREEN)Production deployment complete!$(NC)"

prod-update: ## Update production deployment (pull, build, restart)
	@echo "$(BLUE)Updating production deployment...$(NC)"
	git pull
	docker-compose build
	docker-compose up -d
	@echo "$(GREEN)Production update complete!$(NC)"

