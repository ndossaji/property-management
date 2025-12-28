# How to Restart Services with New Authentication Changes

## Quick Start (Recommended)

### For Development with Hot Reload

```bash
# Stop current services
make down

# Start in development mode (includes hot reload)
make dev-build
```

This will:
- Rebuild the frontend with new authentication code
- Start all services with hot reload enabled
- Allow you to make changes without restarting

### For Production Mode

```bash
# Stop all services
make down

# Rebuild all images
make build

# Start all services
make up

# Check status
make status
```

## Step-by-Step Instructions

### Step 1: Configure Environment Variables

Before restarting, make sure your Auth0 credentials are set:

```bash
# Edit your .env file
nano .env  # or use your preferred editor

# Add these values (get them from Auth0 dashboard):
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.propertymgmt.com
```

### Step 2: Stop Current Services

```bash
make down
```

Or manually:
```bash
docker-compose down
```

### Step 3: Rebuild Frontend

Since we added new code, rebuild the frontend:

```bash
# Rebuild just the frontend
docker-compose build frontend

# Or rebuild everything
make build
```

### Step 4: Start Services

**Option A: Development Mode (Recommended for testing)**
```bash
make dev-build
```

This starts services with:
- Hot reload enabled
- Source code mounted as volumes
- Direct access to services (frontend on port 3000, backend on port 8000)
- Debug logging enabled

**Option B: Production Mode**
```bash
make up
```

This starts services with:
- Optimized builds
- Services behind nginx proxy
- Production logging

### Step 5: Verify Services

```bash
# Check service status
make status

# View frontend logs
make logs-frontend

# View all logs
make logs
```

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `make dev-build` | Start in development mode with rebuild |
| `make dev` | Start in development mode (no rebuild) |
| `make up` | Start in production mode |
| `make down` | Stop all services |
| `make restart-frontend` | Restart just the frontend |
| `make logs-frontend` | View frontend logs |
| `make status` | Check service status |
| `make build` | Rebuild all images |

## Testing the Login Page

After restarting:

1. **Open your browser:**
   - Development mode: http://localhost:3000
   - Production mode: http://localhost

2. **Click "Sign In"** on the home page

3. **You'll be redirected to** `/login`

4. **Click "Sign in with Auth0"**

5. **You should see** Auth0's Universal Login page

## Troubleshooting

### Frontend won't start

```bash
# Check logs
make logs-frontend

# Common issue: node_modules conflict
# Solution: Rebuild without cache
docker-compose build --no-cache frontend
make up
```

### Auth0 configuration errors

```bash
# Check environment variables are loaded
docker-compose exec frontend env | grep AUTH0

# Should show:
# NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
# NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

If not showing:
1. Check `.env` file has the correct values
2. Rebuild the frontend: `docker-compose build frontend`
3. Restart: `make up`

### Port conflicts

If port 3000 or 80 is already in use:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :80

# Kill the process or change ports in docker-compose.yml
```

### Changes not appearing

```bash
# Force rebuild without cache
make build-no-cache

# Then restart
make up
```

## Development Workflow

For active development, use this workflow:

```bash
# 1. Start in dev mode (one time)
make dev-build

# 2. Make changes to your code
# Changes will auto-reload!

# 3. View logs in real-time
make logs-frontend

# 4. When done, stop services
# Press Ctrl+C (if running in foreground)
# Or: make down (if running in background)
```

## Production Deployment

When ready to deploy to production:

```bash
# 1. Ensure .env has production values
# 2. Build production images
make build

# 3. Start in production mode
make up

# 4. Verify everything is running
make status

# 5. Check logs for errors
make logs
```

## Accessing Services

### Development Mode
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Production Mode
- Frontend: http://localhost
- Backend API: http://localhost/api
- API Docs: http://localhost/api/docs

## Next Steps After Restart

1. ✅ Verify services are running: `make status`
2. ✅ Check frontend logs: `make logs-frontend`
3. ✅ Open browser to http://localhost:3000 (dev) or http://localhost (prod)
4. ✅ Test login flow
5. ✅ Check Auth0 dashboard for login attempts

## Need Help?

```bash
# View all available commands
make help

# Check service health
make status

# View logs for debugging
make logs
```

