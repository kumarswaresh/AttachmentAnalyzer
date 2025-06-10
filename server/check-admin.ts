import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function checkAndFixAdmin() {
  console.log("Checking admin user...");
  
  try {
    const adminUser = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    
    if (adminUser.length === 0) {
      console.log("Admin user not found");
      return;
    }
    
    const user = adminUser[0];
    console.log("Admin user found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0
    });
    
    if (!user.password || user.password.length < 10) {
      console.log("Password hash is missing or invalid, fixing...");
      
      // Hash the password properly
      const hashedPassword = await bcrypt.hash("admin123", 12);
      
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
        
      console.log("✓ Password hash updated for admin user");
    } else {
      console.log("✓ Admin user password hash looks valid");
    }
    
    // Test password verification
    const testPassword = await bcrypt.compare("admin123", user.password || "");
    console.log("Password verification test:", testPassword ? "PASS" : "FAIL");
    
  } catch (error) {
    console.error("Error checking admin user:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndFixAdmin()
    .then(() => {
      console.log("Admin check completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Admin check failed:", error);
      process.exit(1);
    });
}

export { checkAndFixAdmin };