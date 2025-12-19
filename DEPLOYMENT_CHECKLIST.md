# Docker Deployment Checklist

Use this checklist to ensure a successful deployment of the Property Management Application.

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Update `POSTGRES_PASSWORD` with a strong password (min 16 characters)
- [ ] Update `REDIS_PASSWORD` with a strong password (min 16 characters)
- [ ] Generate and set `SECRET_KEY` (min 32 characters)
- [ ] Generate and set `JWT_SECRET` (min 32 characters)
- [ ] Configure Auth0 credentials (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`)
- [ ] Configure AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] Set `S3_BUCKET_NAME` for file storage
- [ ] Configure SMTP settings for email notifications
- [ ] Update `CORS_ORIGINS` with your production domain

### 2. Infrastructure Setup
- [ ] Ensure Docker Engine 20.10+ is installed
- [ ] Ensure Docker Compose 2.0+ is installed
- [ ] Verify at least 4GB RAM is available
- [ ] Verify at least 10GB disk space is available
- [ ] Configure firewall rules (ports 80, 443)
- [ ] Set up SSL certificates (if using HTTPS)

### 3. External Services
- [ ] Create Auth0 application and configure callback URLs
- [ ] Create AWS S3 bucket with proper permissions
- [ ] Configure AWS IAM user with S3 access
- [ ] Set up SMTP service or AWS SES
- [ ] Configure Plaid account (if using)
- [ ] Set up monitoring/logging service (optional)

## Deployment Steps

### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd propertymgmt

# Set up environment
make setup
# Edit .env file with your configuration

# Build images
make build
```

### 2. Database Initialization
```bash
# Start database service
docker-compose up -d postgres

# Wait for database to be healthy
docker-compose ps postgres

# Run migrations (when you have them)
# make db-migrate
```

### 3. Start All Services
```bash
# Start all services
make up

# Verify all services are running
make status

# Check logs for any errors
make logs
```

### 4. Verify Deployment
- [ ] Check all services are healthy: `docker-compose ps`
- [ ] Access frontend: http://localhost or http://your-domain.com
- [ ] Access backend API docs: http://localhost/api/docs
- [ ] Test health endpoint: http://localhost/api/health
- [ ] Verify database connection
- [ ] Verify Redis connection
- [ ] Test Celery workers are processing tasks
- [ ] Test file upload to S3
- [ ] Test email sending
- [ ] Test authentication flow

## Post-Deployment

### 1. Security Hardening
- [ ] Enable HTTPS/SSL in nginx configuration
- [ ] Configure SSL certificates (Let's Encrypt recommended)
- [ ] Update `SESSION_COOKIE_SECURE=true` in .env
- [ ] Restrict CORS origins to production domains only
- [ ] Enable rate limiting in nginx
- [ ] Set up fail2ban or similar intrusion prevention
- [ ] Configure firewall to only allow necessary ports
- [ ] Disable direct database access from outside
- [ ] Review and update security headers in nginx

### 2. Monitoring & Logging
- [ ] Set up log aggregation (e.g., ELK stack, CloudWatch)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for service failures
- [ ] Set up performance monitoring
- [ ] Configure backup monitoring

### 3. Backup Strategy
- [ ] Set up automated database backups
- [ ] Test database restore procedure
- [ ] Configure S3 bucket versioning
- [ ] Set up volume backups
- [ ] Document backup retention policy
- [ ] Test disaster recovery procedure

### 4. Performance Optimization
- [ ] Configure nginx caching
- [ ] Set up CDN for static assets (optional)
- [ ] Optimize database indexes
- [ ] Configure Redis caching strategy
- [ ] Set up database connection pooling
- [ ] Monitor and optimize Celery worker concurrency

### 5. Maintenance
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Set up automated updates (with caution)
- [ ] Schedule regular security updates
- [ ] Plan for scaling (horizontal/vertical)
- [ ] Document rollback procedure

## Production Checklist

### Before Going Live
- [ ] All environment variables are set correctly
- [ ] SSL/TLS is configured and working
- [ ] Database backups are automated and tested
- [ ] Monitoring and alerting are configured
- [ ] Error tracking is set up
- [ ] Load testing has been performed
- [ ] Security audit has been completed
- [ ] Documentation is up to date
- [ ] Team is trained on deployment procedures
- [ ] Rollback plan is documented and tested

### After Going Live
- [ ] Monitor logs for errors
- [ ] Check performance metrics
- [ ] Verify all integrations are working
- [ ] Test critical user flows
- [ ] Monitor resource usage
- [ ] Set up regular health checks
- [ ] Schedule first backup verification
- [ ] Document any issues encountered

## Scaling Considerations

### Horizontal Scaling
```bash
# Scale backend API
docker-compose up -d --scale backend=3

# Scale Celery workers
docker-compose up -d --scale celery-worker=4
```

### Vertical Scaling
- [ ] Increase container resource limits
- [ ] Upgrade server hardware
- [ ] Optimize database configuration
- [ ] Increase Redis memory

### Database Scaling
- [ ] Consider read replicas
- [ ] Implement connection pooling
- [ ] Optimize slow queries
- [ ] Consider database sharding (for very large scale)

## Troubleshooting

### Common Issues
1. **Services won't start**: Check logs with `make logs`
2. **Database connection errors**: Verify credentials and network
3. **Permission errors**: Check volume ownership
4. **Out of memory**: Increase Docker memory limits
5. **Slow performance**: Check resource usage with `docker stats`

### Emergency Procedures
- **Rollback**: `git checkout <previous-version> && make prod-deploy`
- **Database restore**: `make db-restore`
- **Service restart**: `make restart`
- **View logs**: `make logs`

## Security Notes

⚠️ **CRITICAL**: Never commit the following to version control:
- `.env` file
- SSL certificates
- API keys or secrets
- Database credentials
- Any file containing sensitive information

## Support

For issues or questions:
1. Check logs: `make logs`
2. Review documentation: `DOCKER_DEPLOYMENT.md`
3. Check service status: `make status`
4. Review this checklist for missed steps

