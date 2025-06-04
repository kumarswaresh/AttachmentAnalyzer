# Role Management & RBAC API Documentation

## Overview
Comprehensive role-based access control system with dynamic role creation, predefined system roles, and granular permission management.

## Role Management Endpoints

### Get All Roles
```http
GET /api/roles
```

**Description:** Retrieve all roles with permissions and resource limits.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Super Admin",
    "description": "Full system administration access",
    "permissions": [
      "manage_users",
      "manage_roles",
      "manage_organizations",
      "manage_agents",
      "manage_credentials",
      "access_billing",
      "view_analytics"
    ],
    "resourceLimits": {
      "maxAgents": null,
      "maxDeployments": null,
      "maxApiKeys": null,
      "maxCredentials": null,
      "dailyApiCalls": null,
      "monthlyCost": null
    },
    "isSystemRole": true,
    "createdAt": "2025-06-01T00:00:00.000Z",
    "updatedAt": "2025-06-01T00:00:00.000Z"
  }
]
```

### Get Role by ID
```http
GET /api/roles/:id
```

**Response:**
```json
{
  "id": 1,
  "name": "Super Admin",
  "description": "Full system administration access",
  "permissions": ["manage_users", "manage_roles"],
  "resourceLimits": {
    "maxAgents": null,
    "maxDeployments": null
  },
  "isSystemRole": true
}
```

### Create Role
```http
POST /api/roles
```

**Request Body:**
```json
{
  "name": "Custom Manager",
  "description": "Custom role for project managers",
  "permissions": [
    "manage_agents",
    "view_analytics",
    "manage_credentials"
  ],
  "resourceLimits": {
    "maxAgents": 10,
    "maxDeployments": 5,
    "maxApiKeys": 3,
    "maxCredentials": 15,
    "dailyApiCalls": 1000,
    "monthlyCost": 500
  }
}
```

### Update Role
```http
PUT /api/roles/:id
```

**Request Body:**
```json
{
  "name": "Updated Role Name",
  "description": "Updated description",
  "permissions": [
    "manage_agents",
    "view_analytics"
  ],
  "resourceLimits": {
    "maxAgents": 15,
    "dailyApiCalls": 2000
  }
}
```

### Delete Role
```http
DELETE /api/roles/:id
```

**Response:**
```json
{
  "message": "Role deleted successfully"
}
```

## Predefined Role Management

### Seed Predefined Roles
```http
POST /api/admin/seed-roles
```

**Description:** Create or update predefined system roles with default configurations.

**Response:**
```json
{
  "message": "Predefined roles seeded successfully",
  "roles": [
    {
      "name": "Super Admin",
      "created": true
    },
    {
      "name": "Organization Admin", 
      "created": true
    },
    {
      "name": "Client Admin",
      "created": true
    },
    {
      "name": "Standard User",
      "created": true
    },
    {
      "name": "Read Only",
      "created": true
    }
  ]
}
```

## Role Assignment Endpoints

### Assign Role to User
```http
POST /api/admin/users/:userId/assign-role
```

**Request Body:**
```json
{
  "roleId": 2
}
```

**Response:**
```json
{
  "message": "Role assigned successfully",
  "assignment": {
    "userId": 1,
    "roleId": 2,
    "assignedAt": "2025-06-04T12:00:00.000Z"
  }
}
```

### Remove Role from User
```http
DELETE /api/admin/users/:userId/remove-role
```

**Request Body:**
```json
{
  "roleId": 2
}
```

**Response:**
```json
{
  "message": "Role removed successfully"
}
```

### Get User Roles
```http
GET /api/admin/users/:userId/roles
```

**Response:**
```json
[
  {
    "id": 2,
    "name": "Organization Admin",
    "assignedAt": "2025-06-04T12:00:00.000Z"
  }
]
```

## Permission System

### Available Permissions
The system supports the following granular permissions:

#### User Management
- `manage_users` - Create, update, delete users
- `view_users` - View user information
- `manage_user_roles` - Assign/remove roles from users

#### Role Management  
- `manage_roles` - Create, update, delete roles
- `view_roles` - View role information
- `assign_roles` - Assign roles to users

#### Organization Management
- `manage_organizations` - Create, update, delete organizations
- `view_organizations` - View organization information
- `manage_org_members` - Add/remove organization members

#### Agent Management
- `manage_agents` - Create, update, delete agents
- `view_agents` - View agent information
- `deploy_agents` - Deploy and manage agent deployments
- `configure_agents` - Configure agent settings

#### Credential Management
- `manage_credentials` - Create, update, delete credentials
- `view_credentials` - View credential information
- `use_credentials` - Use credentials in agents/workflows

#### Billing & Analytics
- `access_billing` - Access billing information and payments
- `view_analytics` - View system analytics and reports
- `manage_credits` - Manage user credit allocations

#### System Administration
- `system_admin` - Full system administration access
- `manage_api_keys` - Manage API keys
- `view_logs` - Access system logs
- `manage_settings` - Manage system settings

### Check User Permissions
```http
GET /api/auth/permissions
```

**Response:**
```json
{
  "permissions": [
    "manage_users",
    "view_analytics",
    "manage_agents"
  ],
  "role": "Organization Admin"
}
```

### Check Specific Permission
```http
GET /api/auth/check-permission/:permission
```

**Response:**
```json
{
  "hasPermission": true,
  "permission": "manage_users"
}
```

## Predefined System Roles

### Super Admin
- **Permissions**: All system permissions
- **Resource Limits**: Unlimited
- **Description**: Full system administration access
- **Default Users**: Platform administrators

### Organization Admin
- **Permissions**: Organization management, user management within org, billing access
- **Resource Limits**: 
  - Max Agents: 100
  - Max Deployments: 50
  - Max API Keys: 10
  - Daily API Calls: 10,000
- **Description**: Full administration within organization

### Client Admin
- **Permissions**: Agent management, credential management, analytics access
- **Resource Limits**:
  - Max Agents: 25
  - Max Deployments: 15
  - Max API Keys: 5
  - Daily API Calls: 5,000
- **Description**: Client-level administration and agent management

### Standard User
- **Permissions**: Basic agent usage, view analytics
- **Resource Limits**:
  - Max Agents: 5
  - Max Deployments: 3
  - Max API Keys: 2
  - Daily API Calls: 1,000
- **Description**: Standard user with basic functionality

### Read Only
- **Permissions**: View-only access to assigned resources
- **Resource Limits**: No creation/modification limits
- **Description**: Read-only access for monitoring and reporting

## Resource Limits

### Limit Types
- `maxAgents`: Maximum number of agents user can create
- `maxDeployments`: Maximum number of active deployments
- `maxApiKeys`: Maximum number of API keys
- `maxCredentials`: Maximum number of stored credentials  
- `dailyApiCalls`: Maximum API calls per day
- `monthlyCost`: Maximum monthly spending limit

### Limit Enforcement
- Limits are checked before resource creation
- API returns 403 Forbidden when limits exceeded
- Usage tracking updates in real-time
- Limits can be null for unlimited access

## Error Responses

### 400 Bad Request - Invalid Role Data
```json
{
  "error": "Validation Error",
  "message": "Invalid permission specified",
  "details": {
    "field": "permissions",
    "invalidValues": ["invalid_permission"]
  }
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "error": "Authorization Error", 
  "message": "Insufficient permissions to manage roles"
}
```

### 404 Not Found - Role Not Found
```json
{
  "error": "Resource Not Found",
  "message": "Role with ID 999 not found"
}
```

### 409 Conflict - Role Name Exists
```json
{
  "error": "Resource Conflict",
  "message": "Role name 'Admin' already exists"
}
```