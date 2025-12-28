# Authentication Setup Guide

This application uses **Auth0** for authentication. Follow these steps to configure authentication for your Property Management application.

## Prerequisites

1. An Auth0 account (sign up at [auth0.com](https://auth0.com))
2. Node.js and npm installed
3. Docker and Docker Compose (for full stack deployment)

## Auth0 Configuration

### 1. Create an Auth0 Application

1. Log in to your [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Choose a name (e.g., "Property Management")
5. Select **Single Page Web Applications**
6. Click **Create**

### 2. Configure Application Settings

In your Auth0 application settings:

#### Allowed Callback URLs
```
http://localhost:3000,
http://localhost,
https://yourdomain.com
```

#### Allowed Logout URLs
```
http://localhost:3000,
http://localhost,
https://yourdomain.com
```

#### Allowed Web Origins
```
http://localhost:3000,
http://localhost,
https://yourdomain.com
```

#### Allowed Origins (CORS)
```
http://localhost:3000,
http://localhost,
https://yourdomain.com
```

### 3. Get Your Credentials

From the Auth0 application settings page, copy:
- **Domain** (e.g., `your-tenant.auth0.com`)
- **Client ID** (e.g., `abc123xyz...`)
- **Client Secret** (for backend API)

### 4. Create an API in Auth0

1. Navigate to **Applications** → **APIs**
2. Click **Create API**
3. Set a name (e.g., "Property Management API")
4. Set an identifier (e.g., `https://api.propertymgmt.com`)
5. Click **Create**

## Environment Configuration

### Frontend Environment Variables

Update your `.env` file with the following variables:

```bash
# Frontend Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.propertymgmt.com
NEXT_PUBLIC_API_URL=http://localhost/api
```

### Backend Environment Variables

```bash
# Backend Auth0 Configuration
AUTH_PROVIDER=auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_API_AUDIENCE=https://api.propertymgmt.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

## File Structure

```
frontend/src/
├── app/
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── dashboard/
│   │   └── page.tsx              # Protected dashboard page
│   ├── layout.tsx                # Root layout with Auth0Provider
│   └── page.tsx                  # Home page
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx    # Protected route wrapper
│   └── providers/
│       └── Auth0ProviderWithHistory.tsx  # Auth0 provider wrapper
├── hooks/
│   └── useAuth.ts                # Custom authentication hook
└── lib/
    └── auth.ts                   # Authentication utilities
```

## Usage

### Login Page

Navigate to `/login` to access the login page. Users will be redirected to Auth0's Universal Login page.

### Protected Routes

Wrap any page that requires authentication with the `ProtectedRoute` component:

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function MyProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

### Using the Auth Hook

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name || user?.email}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

## Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Click "Sign In" to test the authentication flow

4. After successful login, you should be redirected to the dashboard

## Troubleshooting

### "Invalid state" error
- Check that your callback URLs are correctly configured in Auth0
- Clear your browser cache and cookies

### "Access denied" error
- Verify your Auth0 domain and client ID are correct
- Check that the environment variables are properly set

### Authentication not working in production
- Ensure all production URLs are added to Auth0 allowed URLs
- Verify that `NEXT_PUBLIC_` prefixed variables are set during build time

## Security Best Practices

1. **Never commit** `.env` files to version control
2. Use **strong, unique** client secrets
3. Enable **MFA** for Auth0 dashboard access
4. Regularly **rotate** API keys and secrets
5. Use **HTTPS** in production
6. Configure **rate limiting** on Auth0

## Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 React SDK](https://auth0.com/docs/libraries/auth0-react)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

