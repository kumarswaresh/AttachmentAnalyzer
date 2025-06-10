import { authService } from "./auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Create admin users with all required registration fields
 */
async function createAdminUsers() {
  console.log("Creating admin users...");

  const adminUsers = [
    {
      username: "admin",
      email: "admin@agentplatform.com",
      password: "admin123",
      role: "superadmin"
    },
    {
      username: "superadmin",
      email: "superadmin@agentplatform.com", 
      password: "admin123",
      role: "superadmin"
    },
    {
      username: "demo-admin",
      email: "demo@agentplatform.com",
      password: "demo123",
      role: "admin"
    }
  ];

  try {
    for (const userData of adminUsers) {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Register the user with proper authentication
      const result = await authService.register(
        userData.username,
        userData.email,
        userData.password
      );

      if (result.success && result.user) {
        // Update user role to admin/superadmin
        await db
          .update(users)
          .set({ 
            role: userData.role,
            updatedAt: new Date()
          })
          .where(eq(users.id, result.user.id));

        console.log(`✓ Created ${userData.role}: ${userData.username} (${userData.email})`);
      } else {
        console.error(`✗ Failed to create ${userData.username}: ${result.message}`);
      }
    }

    console.log("Admin user creation completed successfully");
    
    // Display login credentials
    console.log("\n=== Admin Login Credentials ===");
    console.log("SuperAdmin 1: admin / admin123");
    console.log("SuperAdmin 2: superadmin / admin123");
    console.log("Admin: demo-admin / demo123");
    console.log("===============================\n");

  } catch (error) {
    console.error("Error creating admin users:", error);
    throw error;
  }
}

// Run if called directly (ESM compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUsers()
    .then(() => {
      console.log("Admin users setup complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to create admin users:", error);
      process.exit(1);
    });
}

export { createAdminUsers };