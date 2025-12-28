# Simple Authentication System

## Overview

This application now uses a **simple username/password authentication system** with JWT tokens - perfect for prototyping and development!

No external services (like Auth0) are required. Everything runs locally.

## Demo Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** admin

### User Account
- **Username:** `demo`
- **Password:** `demo123`
- **Role:** user

## How It Works

### Backend (FastAPI)
- **JWT Tokens:** Secure token-based authentication
- **Password Hashing:** Bcrypt for secure password storage
- **Hardcoded Users:** Demo users defined in `backend/app/auth.py`
- **Token Expiry:** 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

### Frontend (Next.js)
- **Simple Login Form:** Username and password fields
- **LocalStorage:** Stores JWT token and user info
- **Protected Routes:** Automatic redirect to login for unauthenticated users
- **Auto Token Verification:** Checks token validity on page load

## Quick Start

### 1. Start the Services

```bash
# Development mode (recommended)
make dev-build

# Or production mode
make down
make build
make up
```

### 2. Access the Application

- **Frontend:** http://localhost:3000 (dev) or http://localhost (prod)
- **Backend API:** http://localhost:8000 (dev) or http://localhost/api (prod)
- **API Docs:** http://localhost:8000/docs (dev) or http://localhost/api/docs (prod)

### 3. Login

1. Navigate to http://localhost:3000
2. Click "Sign In"
3. Use one of the demo credentials above
4. You'll be redirected to the dashboard

## File Structure

### Backend
```
backend/app/
├── auth.py           # Authentication logic, JWT, password hashing
├── routes_auth.py    # Login, logout, user info endpoints
└── main.py           # FastAPI app with auth routes
```

### Frontend
```
frontend/src/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page with form
│   ├── dashboard/
│   │   └── page.tsx          # Protected dashboard
│   └── layout.tsx            # Root layout (no auth provider needed)
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx  # Route protection wrapper
├── hooks/
│   └── useAuth.ts            # Authentication hook
└── lib/
    └── auth.ts               # Auth utilities and types
```

## API Endpoints

### POST /api/auth/login
Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### GET /api/auth/me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "username": "admin",
  "email": "admin@propertymgmt.com",
  "full_name": "Admin User",
  "role": "admin"
}
```

### GET /api/auth/verify
Verify if token is valid.

### POST /api/auth/logout
Logout (client-side token removal).

## Adding New Users

For now, users are hardcoded in `backend/app/auth.py`. To add a new user:

1. Open `backend/app/auth.py`
2. Add to the `DEMO_USERS` dictionary:

```python
DEMO_USERS = {
    "newuser": {
        "username": "newuser",
        "email": "newuser@propertymgmt.com",
        "full_name": "New User",
        "hashed_password": pwd_context.hash("password123"),
        "role": "user",
    },
}
```

3. Restart the backend: `make restart-backend`

## Security Notes

⚠️ **This is for PROTOTYPE/DEVELOPMENT only!**

For production, you should:
- [ ] Use a real database for user storage
- [ ] Implement proper user registration
- [ ] Add email verification
- [ ] Implement password reset
- [ ] Use environment variables for secrets
- [ ] Add rate limiting
- [ ] Implement refresh tokens
- [ ] Add HTTPS
- [ ] Consider using Auth0, AWS Cognito, or similar

## Configuration

Environment variables in `.env`:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API URL for frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing the Authentication

### Using the UI
1. Go to http://localhost:3000
2. Click "Sign In"
3. Enter credentials
4. Access protected dashboard

### Using curl
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get user info (replace TOKEN with actual token)
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Using API Docs
1. Go to http://localhost:8000/docs
2. Click on `/api/auth/login`
3. Click "Try it out"
4. Enter credentials and execute
5. Copy the access_token
6. Click "Authorize" button at top
7. Enter: `Bearer <your-token>`
8. Now you can test protected endpoints

## Troubleshooting

### "Incorrect username or password"
- Check you're using the correct credentials
- Username and password are case-sensitive

### "Could not validate credentials"
- Token may have expired (30 min default)
- Login again to get a new token

### CORS errors
- Make sure backend is running
- Check `CORS_ORIGINS` in `.env` includes your frontend URL

### Token not persisting
- Check browser localStorage
- Make sure cookies/localStorage aren't blocked

## Next Steps

Once you're ready to move beyond prototype:
1. Implement database-backed user storage
2. Add user registration
3. Implement password reset
4. Add role-based access control (RBAC)
5. Consider migrating to Auth0 or similar service

---

**Current Status:** ✅ Simple auth system ready for prototype development!

