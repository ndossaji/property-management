#!/bin/bash

# =============================================================================
# Quick Start Script for Property Management Application
# =============================================================================
# This script helps you get started with the Docker deployment quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Print header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Property Management Application - Quick Start            ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose is installed"

# Check if .env exists
if [ ! -f .env ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please edit .env file with your configuration before proceeding!"
    print_warning "At minimum, update these values:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - REDIS_PASSWORD"
    echo "  - SECRET_KEY"
    echo "  - JWT_SECRET"
    echo ""
    read -p "Press Enter after you've updated .env file..."
else
    print_success ".env file already exists"
fi

# Ask user what they want to do
echo ""
print_info "What would you like to do?"
echo "  1) Start in PRODUCTION mode (recommended for deployment)"
echo "  2) Start in DEVELOPMENT mode (with hot reload)"
echo "  3) Just build images (don't start services)"
echo "  4) Exit"
echo ""
read -p "Enter your choice [1-4]: " choice

case $choice in
    1)
        print_info "Building Docker images..."
        docker-compose build
        print_success "Build complete!"
        
        print_info "Starting services in production mode..."
        docker-compose up -d
        print_success "Services started!"
        ;;
    2)
        print_info "Building Docker images for development..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
        print_success "Build complete!"
        
        print_info "Starting services in development mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
        print_success "Services started!"
        ;;
    3)
        print_info "Building Docker images..."
        docker-compose build
        print_success "Build complete!"
        print_info "Services not started. Run 'docker-compose up -d' to start them."
        exit 0
        ;;
    4)
        print_info "Exiting..."
        exit 0
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Wait for services to be healthy
print_info "Waiting for services to be healthy (this may take a minute)..."
sleep 10

# Check service status
print_info "Checking service status..."
docker-compose ps

# Print access information
echo ""
print_success "Deployment complete!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Access Your Application                                   ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend:        http://localhost                         ║${NC}"
echo -e "${GREEN}║  Backend API:     http://localhost/api                     ║${NC}"
echo -e "${GREEN}║  API Docs:        http://localhost/api/docs                ║${NC}"
echo -e "${GREEN}║  Health Check:    http://localhost/api/health              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Print useful commands
print_info "Useful commands:"
echo "  View logs:           make logs"
echo "  Stop services:       make down"
echo "  Restart services:    make restart"
echo "  View status:         make status"
echo "  Access backend:      make shell-backend"
echo "  Access database:     make db-shell"
echo ""
print_info "For more commands, run: make help"
echo ""

# Print next steps
print_warning "Next steps:"
echo "  1. Verify all services are running: make status"
echo "  2. Check logs for any errors: make logs"
echo "  3. Access the application at http://localhost"
echo "  4. Review DEPLOYMENT_CHECKLIST.md for production deployment"
echo ""

print_success "Happy coding! 🚀"

