import { db } from "../db";
import { 
  roles, 
  userRoles, 
  organizations, 
  organizationMembers, 
  userActivity, 
  userUsageStats, 
  clientApiKeys, 
  apiAccessLogs, 
  billingRecords,
  users,
  type Role,
  type InsertRole,
  type UserRole,
  type InsertUserRole,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type UserActivity,
  type InsertUserActivity,
  type UserUsageStats,
  type ClientApiKey,
  type InsertClientApiKey,
  type User
} from "@shared/schema";
import { eq, and, desc, gte, lte, count, sum } from "drizzle-orm";
import crypto from "crypto";

export class RBACService {
  // Default system roles
  static readonly DEFAULT_ROLES = [
    {
      name: "Super Admin",
      description: "Full system access with all permissions",
      isSystemRole: true,
      permissions: ["*"],
      featureAccess: {
        agentBuilder: true,
        visualBuilder: true,
        mcpIntegrations: true,
        apiManagement: true,
        userManagement: true,
        analytics: true,
        deployments: true,
        credentials: true,
        billing: true
      },
      resourceLimits: {
        maxAgents: null,
        maxDeployments: null,
        maxApiKeys: null,
        maxCredentials: null,
        dailyApiCalls: null,
        monthlyCost: null
      }
    },
    {
      name: "Organization Admin",
      description: "Full access within organization",
      isSystemRole: true,
      permissions: ["org:*"],
      featureAccess: {
        agentBuilder: true,
        visualBuilder: true,
        mcpIntegrations: true,
        apiManagement: true,
        userManagement: true,
        analytics: true,
        deployments: true,
        credentials: true,
        billing: true
      },
      resourceLimits: {
        maxAgents: 100,
        maxDeployments: 50,
        maxApiKeys: 20,
        maxCredentials: 50,
        dailyApiCalls: 100000,
        monthlyCost: 10000
      }
    },
    {
      name: "Developer",
      description: "Development and deployment access",
      isSystemRole: true,
      permissions: ["agent:create", "agent:read", "agent:update", "deployment:*", "api:read"],
      featureAccess: {
        agentBuilder: true,
        visualBuilder: true,
        mcpIntegrations: true,
        apiManagement: false,
        userManagement: false,
        analytics: true,
        deployments: true,
        credentials: true,
        billing: false
      },
      resourceLimits: {
        maxAgents: 50,
        maxDeployments: 25,
        maxApiKeys: 10,
        maxCredentials: 25,
        dailyApiCalls: 50000,
        monthlyCost: 5000
      }
    },
    {
      name: "Client User",
      description: "Limited access for client users",
      isSystemRole: true,
      permissions: ["agent:read", "api:read"],
      featureAccess: {
        agentBuilder: false,
        visualBuilder: false,
        mcpIntegrations: false,
        apiManagement: true,
        userManagement: false,
        analytics: false,
        deployments: false,
        credentials: false,
        billing: false
      },
      resourceLimits: {
        maxAgents: 10,
        maxDeployments: 5,
        maxApiKeys: 5,
        maxCredentials: 10,
        dailyApiCalls: 10000,
        monthlyCost: 1000
      }
    },
    {
      name: "Viewer",
      description: "Read-only access",
      isSystemRole: true,
      permissions: ["read:*"],
      featureAccess: {
        agentBuilder: false,
        visualBuilder: false,
        mcpIntegrations: false,
        apiManagement: false,
        userManagement: false,
        analytics: true,
        deployments: false,
        credentials: false,
        billing: false
      },
      resourceLimits: {
        maxAgents: 0,
        maxDeployments: 0,
        maxApiKeys: 2,
        maxCredentials: 0,
        dailyApiCalls: 1000,
        monthlyCost: 0
      }
    }
  ];

  // Initialize default roles
  async initializeDefaultRoles(): Promise<void> {
    for (const roleData of RBACService.DEFAULT_ROLES) {
      const existing = await db.select().from(roles).where(eq(roles.name, roleData.name)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(roles).values(roleData);
      }
    }
  }

  // Role Management
  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(roleData).returning();
    return role;
  }

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | null> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return role || null;
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role | null> {
    const [role] = await db.update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role || null;
  }

  async deleteRole(id: number): Promise<boolean> {
    // Check if role is a system role
    const role = await this.getRole(id);
    if (role?.isSystemRole) {
      throw new Error("Cannot delete system roles");
    }

    // Check if role is assigned to any users
    const assignments = await db.select().from(userRoles).where(eq(userRoles.roleId, id)).limit(1);
    if (assignments.length > 0) {
      throw new Error("Cannot delete role that is assigned to users");
    }

    const result = await db.delete(roles).where(eq(roles.id, id));
    return result.rowCount > 0;
  }

  // User Role Assignment
  async assignUserRole(userId: number, roleId: number, assignedBy?: number, expiresAt?: Date): Promise<UserRole> {
    // Check if assignment already exists
    const existing = await db.select().from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.isActive, true)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("User already has this role assigned");
    }

    const [userRole] = await db.insert(userRoles).values({
      userId,
      roleId,
      assignedBy,
      expiresAt,
      isActive: true
    }).returning();

    return userRole;
  }

  async removeUserRole(userId: number, roleId: number): Promise<boolean> {
    const result = await db.update(userRoles)
      .set({ isActive: false })
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    
    return result.rowCount > 0;
  }

  async getUserRoles(userId: number): Promise<(UserRole & { role: Role })[]> {
    return await db.select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      assignedBy: userRoles.assignedBy,
      assignedAt: userRoles.assignedAt,
      expiresAt: userRoles.expiresAt,
      isActive: userRoles.isActive,
      role: roles
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)));
  }

  // Permission Checking
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const userRolesList = await this.getUserRoles(userId);
    
    for (const userRole of userRolesList) {
      const permissions = userRole.role.permissions || [];
      
      // Check for wildcard permission
      if (permissions.includes("*")) {
        return true;
      }
      
      // Check for exact permission
      if (permissions.includes(permission)) {
        return true;
      }
      
      // Check for wildcard patterns
      for (const perm of permissions) {
        if (perm.endsWith(":*")) {
          const prefix = perm.slice(0, -2);
          if (permission.startsWith(prefix + ":")) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  async hasFeatureAccess(userId: number, feature: keyof Role['featureAccess']): Promise<boolean> {
    const userRolesList = await this.getUserRoles(userId);
    
    for (const userRole of userRolesList) {
      if (userRole.role.featureAccess?.[feature]) {
        return true;
      }
    }
    
    return false;
  }

  async getUserResourceLimits(userId: number): Promise<Role['resourceLimits']> {
    const userRolesList = await this.getUserRoles(userId);
    
    // Get the most permissive limits across all roles
    const limits: Role['resourceLimits'] = {
      maxAgents: null,
      maxDeployments: null,
      maxApiKeys: null,
      maxCredentials: null,
      dailyApiCalls: null,
      monthlyCost: null
    };

    for (const userRole of userRolesList) {
      const roleLimits = userRole.role.resourceLimits;
      if (roleLimits) {
        Object.keys(limits).forEach(key => {
          const limitKey = key as keyof typeof limits;
          const roleLimit = roleLimits[limitKey];
          const currentLimit = limits[limitKey];
          
          // Take the higher limit (null means unlimited)
          if (roleLimit === null || (currentLimit !== null && roleLimit > currentLimit)) {
            limits[limitKey] = roleLimit;
          }
        });
      }
    }

    return limits;
  }

  // Organization Management
  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(orgData).returning();
    
    // Add owner as admin member
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: orgData.ownerId,
      role: "owner"
    });

    return org;
  }

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async getUserOrganizations(userId: number): Promise<(Organization & { memberRole: string })[]> {
    return await db.select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      description: organizations.description,
      ownerId: organizations.ownerId,
      settings: organizations.settings,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      memberRole: organizationMembers.role
    })
    .from(organizations)
    .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.isActive, true)));
  }

  async addOrganizationMember(orgId: number, userId: number, role: string = "member"): Promise<OrganizationMember> {
    const [member] = await db.insert(organizationMembers).values({
      organizationId: orgId,
      userId,
      role
    }).returning();

    return member;
  }

  // Activity Logging
  async logActivity(activityData: InsertUserActivity): Promise<void> {
    await db.insert(userActivity).values(activityData);
  }

  async getUserActivity(userId: number, limit: number = 50): Promise<UserActivity[]> {
    return await db.select().from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.timestamp))
      .limit(limit);
  }

  // Usage Stats and Analytics
  async updateUserUsageStats(userId: number, date: string, stats: Partial<UserUsageStats>): Promise<void> {
    const existing = await db.select().from(userUsageStats)
      .where(and(eq(userUsageStats.userId, userId), eq(userUsageStats.date, date)))
      .limit(1);

    if (existing.length > 0) {
      await db.update(userUsageStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(and(eq(userUsageStats.userId, userId), eq(userUsageStats.date, date)));
    } else {
      await db.insert(userUsageStats).values({
        userId,
        date,
        ...stats
      });
    }
  }

  async getUserUsageStats(userId: number, startDate?: string, endDate?: string): Promise<UserUsageStats[]> {
    let query = db.select().from(userUsageStats).where(eq(userUsageStats.userId, userId));
    
    if (startDate) {
      query = query.where(gte(userUsageStats.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(userUsageStats.date, endDate));
    }
    
    return await query.orderBy(desc(userUsageStats.date));
  }

  // Client API Key Management
  async createClientApiKey(keyData: Omit<InsertClientApiKey, 'keyHash' | 'keyPrefix'>): Promise<{ apiKey: ClientApiKey; rawKey: string }> {
    // Generate API key
    const rawKey = `apk_${crypto.randomBytes(16).toString('hex')}_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const [apiKey] = await db.insert(clientApiKeys).values({
      ...keyData,
      keyHash,
      keyPrefix
    }).returning();

    return { apiKey, rawKey };
  }

  async validateApiKey(rawKey: string): Promise<ClientApiKey | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    const [apiKey] = await db.select().from(clientApiKeys)
      .where(and(eq(clientApiKeys.keyHash, keyHash), eq(clientApiKeys.isActive, true)))
      .limit(1);

    if (apiKey) {
      // Update last used timestamp
      await db.update(clientApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(clientApiKeys.id, apiKey.id));
    }

    return apiKey || null;
  }

  async getUserApiKeys(userId: number): Promise<ClientApiKey[]> {
    return await db.select().from(clientApiKeys)
      .where(and(eq(clientApiKeys.userId, userId), eq(clientApiKeys.isActive, true)))
      .orderBy(desc(clientApiKeys.createdAt));
  }

  async revokeApiKey(keyId: number): Promise<boolean> {
    const result = await db.update(clientApiKeys)
      .set({ isActive: false })
      .where(eq(clientApiKeys.id, keyId));
    
    return result.rowCount > 0;
  }

  // API Access Logging
  async logApiAccess(logData: Omit<typeof apiAccessLogs.$inferInsert, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(apiAccessLogs).values(logData);
  }

  // Analytics and Reporting
  async getOrganizationStats(orgId: number): Promise<{
    totalUsers: number;
    totalAgents: number;
    totalApiCalls: number;
    totalCost: number;
    activeUsers: number;
  }> {
    // Get total users
    const totalUsersResult = await db.select({ count: count() })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.isActive, true)));

    // Get usage stats for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const usageStats = await db.select({
      totalAgents: sum(userUsageStats.agentCount),
      totalApiCalls: sum(userUsageStats.apiCallCount),
      totalCost: sum(userUsageStats.costIncurred)
    })
    .from(userUsageStats)
    .where(and(
      eq(userUsageStats.organizationId, orgId),
      eq(userUsageStats.date, currentMonth)
    ));

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalAgents: Number(usageStats[0]?.totalAgents) || 0,
      totalApiCalls: Number(usageStats[0]?.totalApiCalls) || 0,
      totalCost: Number(usageStats[0]?.totalCost) || 0,
      activeUsers: 0 // TODO: Implement active users calculation
    };
  }
}

export const rbacService = new RBACService();