#!/bin/bash

# Nakliyat Platform Deployment Script for Linux
# Author: AI Assistant
# Version: 1.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="nakliyat-platform"
BACKUP_DIR="./backups"
LOG_FILE="./deployment.log"

# Functions
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check dependencies
check_dependencies() {
    info "Checking system dependencies..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if ports are available
    for port in 80 443 3000 8001 27017; do
        if netstat -tuln | grep -q ":$port "; then
            warning "Port $port is already in use. Please free the port or modify docker-compose.yml"
        fi
    done
    
    success "All dependencies check passed"
}

# Create necessary directories
create_directories() {
    info "Creating necessary directories..."
    
    mkdir -p "$BACKUP_DIR"
    mkdir -p ./nginx/ssl
    mkdir -p ./mongo-init
    mkdir -p ./logs
    
    success "Directories created"
}

# Generate environment files
generate_env_files() {
    info "Generating environment configuration files..."
    
    # Generate backend .env if not exists
    if [ ! -f "./backend/.env" ]; then
        cat > ./backend/.env << EOF
MONGO_URL=mongodb://admin:nakliyat123!@mongodb:27017/
DB_NAME=moving_platform
SECRET_KEY=$(openssl rand -hex 32)
EOF
        success "Backend .env file generated"
    else
        info "Backend .env file already exists"
    fi
    
    # Generate frontend .env if not exists
    if [ ! -f "./frontend/.env" ]; then
        cat > ./frontend/.env << EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EXPO_USE_FAST_RESOLVER=1
EOF
        success "Frontend .env file generated"
    else
        info "Frontend .env file already exists"
    fi
}

# Create MongoDB initialization script
create_mongo_init() {
    info "Creating MongoDB initialization script..."
    
    cat > ./mongo-init/init-mongo.js << 'EOF'
// MongoDB initialization script for Nakliyat Platform
db = db.getSiblingDB('moving_platform');

// Create collections with indexes
db.createCollection('users');
db.createCollection('moving_requests');
db.createCollection('bids');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "user_type": 1 });
db.users.createIndex({ "is_approved": 1 });

db.moving_requests.createIndex({ "customer_id": 1 });
db.moving_requests.createIndex({ "status": 1 });
db.moving_requests.createIndex({ "created_at": -1 });

db.bids.createIndex({ "request_id": 1 });
db.bids.createIndex({ "mover_id": 1 });
db.bids.createIndex({ "status": 1 });

print("Database initialized successfully!");
EOF
    
    success "MongoDB initialization script created"
}

# Backup existing data
backup_data() {
    if [ -d "mongodb_data" ]; then
        info "Backing up existing data..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
        
        # Copy MongoDB data if exists
        if docker volume ls | grep -q nakliyat_mongodb_data; then
            docker run --rm -v nakliyat_mongodb_data:/data -v "$(pwd)/$BACKUP_DIR/$BACKUP_NAME:/backup" alpine tar czf /backup/mongodb_backup.tar.gz -C /data .
            success "Data backed up to $BACKUP_DIR/$BACKUP_NAME"
        fi
    fi
}

# Deploy application
deploy() {
    info "Starting deployment..."
    
    # Stop existing containers if running
    if docker ps | grep -q nakliyat_; then
        info "Stopping existing containers..."
        docker-compose down
    fi
    
    # Build and start services
    info "Building and starting services..."
    docker-compose up --build -d
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_services
}

# Check if services are running
check_services() {
    info "Checking service health..."
    
    local services=("mongodb" "backend" "frontend" "nginx")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        if docker-compose ps | grep "$service" | grep -q "Up"; then
            success "$service is running"
        else
            error "$service is not running"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        success "All services are running successfully"
        
        # Test API endpoint
        sleep 10
        if curl -f http://localhost/api/ >/dev/null 2>&1; then
            success "Backend API is responding"
        else
            warning "Backend API is not responding yet"
        fi
        
        # Test frontend
        if curl -f http://localhost/ >/dev/null 2>&1; then
            success "Frontend is responding"
        else
            warning "Frontend is not responding yet"
        fi
    fi
}

# Show deployment information
show_info() {
    info "Deployment completed successfully!"
    
    cat << EOF

${GREEN}==========================================
    NAKLIYAT PLATFORM DEPLOYED
==========================================${NC}

${BLUE}Access URLs:${NC}
• Web Application: http://localhost
• API Documentation: http://localhost/api/docs
• MongoDB: localhost:27017

${BLUE}Default Credentials:${NC}
• MongoDB Admin: admin / nakliyat123!

${BLUE}Container Status:${NC}
$(docker-compose ps)

${BLUE}Useful Commands:${NC}
• View logs: docker-compose logs -f [service_name]
• Stop services: docker-compose down
• Restart services: docker-compose restart
• Update services: docker-compose up --build -d

${YELLOW}Security Notes:${NC}
• Change default MongoDB password in production
• Configure SSL certificates for HTTPS
• Update SECRET_KEY in backend/.env
• Configure firewall rules

${GREEN}Happy Moving Platform Management!${NC}

EOF
}

# Cleanup function
cleanup() {
    info "Cleaning up temporary files..."
    # Add any cleanup tasks here
    success "Cleanup completed"
}

# Main deployment process
main() {
    log "Starting Nakliyat Platform deployment"
    
    check_dependencies
    create_directories
    generate_env_files
    create_mongo_init
    backup_data
    deploy
    show_info
    cleanup
    
    success "Deployment process completed successfully!"
}

# Handle script interruption
trap 'error "Deployment interrupted by user"' INT TERM

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        info "Stopping Nakliyat Platform..."
        docker-compose down
        success "Platform stopped"
        ;;
    "restart")
        info "Restarting Nakliyat Platform..."
        docker-compose restart
        check_services
        success "Platform restarted"
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "backup")
        backup_data
        ;;
    "help")
        cat << EOF
Nakliyat Platform Deployment Script

Usage: $0 [command]

Commands:
    deploy      Deploy the platform (default)
    stop        Stop all services
    restart     Restart all services
    logs        Show logs for all services or specific service
    backup      Backup existing data
    help        Show this help message

Examples:
    $0                  # Deploy the platform
    $0 deploy           # Deploy the platform
    $0 stop             # Stop all services
    $0 logs backend     # Show backend logs
    $0 logs             # Show all logs

EOF
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage information."
        ;;
esac