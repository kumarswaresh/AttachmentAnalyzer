# AI Agent Platform - Complete Setup Guide

## 🚀 Latest Changes & Authentication System

### Recent Updates (Latest)

✅ **Server Configuration Fixed**
- Application now runs on port 5000 (updated from 5005)
- Fixed all port references in configuration files
- Updated workflow to use correct port binding

✅ **Complete Authentication System Implemented**
- Secure user registration with email validation
- Session-based login with JWT tokens
- bcrypt password hashing with salt rounds
- Role-based access control (SuperAdmin, Admin, User)
- Protected routes and API endpoints
- Complete logout functionality with session cleanup

✅ **Admin Users Created**
- Fixed password hashing issues
- Created proper admin accounts with all required fields
- Verified authentication flow end-to-end

✅ **Authentication Endpoints Working**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login 
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - User logout

---

## 🔐 Authentication & Login

### Working Login Credentials

Use these verified credentials to access the platform:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **SuperAdmin** | `admin@local.dev` | `admin123` | Full platform administration |
| **SuperAdmin** | `superadmin@agentplatform.com` | `admin123` | Full platform administration |
| **Admin** | `demo@agentplatform.com` | `demo123` | Organization and user management |

### Authentication Features

- **Secure Registration**: Complete user registration with email validation
- **Session Management**: JWT-based session tokens with automatic expiration
- **Password Security**: bcrypt hashing with 12 salt rounds for password protection
- **Role-Based Access**: Multi-tier access control (SuperAdmin, Admin, User)
- **Protected Routes**: Frontend route protection based on authentication status
- **API Authentication**: Bearer token authentication for API endpoints
- **Logout Functionality**: Complete session cleanup and token invalidation

### Testing Authentication

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail": "admin@local.dev", "password": "admin123"}'

# Test logout endpoint (use token from login response)
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected route
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## 🛠️ Quick Start Guide

### 1. Environment Setup

Create `.env` file with these settings:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/agent_platform

# Server Configuration  
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Required API Keys
OPENAI_API_KEY=your_openai_api_key

# Optional Authentication Secrets
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Create admin users and seed data
npx tsx server/create-admin-users.ts
npm run seed
```

### 3. Start Application

```bash
# Start development server
npm run dev
```

Application runs on: **http://localhost:5000**

---

## 📊 Current System Status

### ✅ Working Features

- **Authentication System**: Complete login/register/logout flow
- **User Management**: Admin users created with proper roles
- **Database**: PostgreSQL with Drizzle ORM fully configured
- **API Endpoints**: All authentication endpoints functional
- **Frontend**: React app with protected routes
- **Session Management**: JWT tokens with secure storage

### 🔧 Server Configuration

- **Port**: 5000 (fixed from previous 5005)
- **Host**: 0.0.0.0 for proper binding
- **Environment**: Development mode configured
- **Database**: PostgreSQL with proper connection pooling
- **Authentication**: Session-based with Bearer tokens

### 📁 Key Files Updated

- `README.md` - Updated with latest authentication details and port fixes
- `server/create-admin-users.ts` - Admin user creation script
- `server/check-admin.ts` - Password verification and debugging
- `client/src/hooks/useAuth.ts` - Authentication state management
- `server/routes.ts` - Authentication endpoints
- `server/auth.ts` - Authentication service implementation

---

## 🏗️ Architecture Overview

### Authentication Flow

1. **Registration**: User submits email, username, password
2. **Validation**: Server validates input and checks for duplicates
3. **Password Hashing**: bcrypt with 12 salt rounds
4. **Database Storage**: User stored with hashed password
5. **Login**: User submits credentials
6. **Verification**: Server verifies password against hash
7. **Token Generation**: JWT session token created
8. **Frontend Storage**: Token stored in localStorage
9. **API Requests**: Token sent as Bearer authorization
10. **Logout**: Token invalidated and removed

### Database Schema

The platform uses PostgreSQL with the following key tables:

- `users` - User accounts with authentication data
- `user_sessions` - Active session tracking
- `organizations` - Multi-tenant organization structure
- `agents` - AI agent definitions and configurations
- `agent_executions` - Agent execution logs and results

### Security Features

- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Management**: JWT tokens with expiration
- **Role-Based Access**: Hierarchical permission system
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM
- **CORS Configuration**: Proper cross-origin request handling
- **Environment Variables**: Sensitive data stored securely

---

## 🔍 Troubleshooting

### Common Issues

**Authentication Fails**
- Verify credentials match the working login table above
- Check if admin users were created: `npx tsx server/check-admin.ts`
- Ensure database is seeded: `npm run seed`

**Port Conflicts**
- Application runs on port 5000 (not 5005)
- Check if port is available: `lsof -i :5000`
- Update environment variables if needed

**Database Connection**
- Verify DATABASE_URL in .env file
- Test connection: `npx tsx server/check-admin.ts`
- Recreate database if needed: `npm run db:drop && npm run db:push`

**Session Issues**
- Clear browser localStorage
- Check JWT_SECRET and SESSION_SECRET in .env
- Restart server after environment changes

---

## 📚 Next Steps

With authentication fully working, you can now:

1. **Explore the Platform**: Login with admin credentials
2. **Create Agents**: Use the agent builder interface
3. **Test Features**: Try different user roles and permissions
4. **Add Integrations**: Configure external APIs and services
5. **Customize Settings**: Modify organization and user settings

The platform is ready for development and testing with a complete authentication system.