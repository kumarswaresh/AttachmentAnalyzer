# User Management API Documentation

## Overview
Comprehensive user management system with role-based access control, activity monitoring, and resource tracking.

## Authentication
All endpoints require authentication via session cookies or JWT tokens.

## User Management Endpoints

### Get All Users
```http
GET /api/admin/users
```

**Description:** Retrieve all users with detailed information including resource usage and activity metrics.

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@platform.com",
    "role": "admin",
    "organization": "ACME Corporation",
    "userType": "super_admin",
    "status": "active",
    "createdAt": "2025-06-01T07:00:48.612Z",
    "lastLogin": "6/1/2025, 10:33:13 AM",
    "agentsCount": 15,
    "apiCallsToday": 45,
    "creditsUsedToday": 809,
    "creditsRemaining": 1422,
    "storageUsedMB": 998,
    "deploymentsActive": 4
  }
]
```

### Get User Profile
```http
GET /api/auth/profile
```

**Description:** Get current authenticated user's profile information.

### Role Assignment Endpoints

#### Assign Role to User
```http
POST /api/admin/users/:userId/assign-role
```

**Request Body:**
```json
{
  "roleId": 2
}
```

#### Remove Role from User
```http
DELETE /api/admin/users/:userId/remove-role
```

**Request Body:**
```json
{
  "roleId": 2
}
```

## Activity Monitoring

### Get Activity Logs
```http
GET /api/admin/activity-logs
```

**Query Parameters:**
- `userId` (optional): Filter by specific user
- `action` (optional): Filter by action type
- `limit` (optional): Number of records to return (default: 50)

## User Statistics

### Get Admin Dashboard Stats
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "totalUsers": 1247,
  "totalOrganizations": 18,
  "activeAgents": 342,
  "totalApiCalls": 15642
}
```