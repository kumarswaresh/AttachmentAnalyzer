import { db } from "../db";
import { agents, moduleDefinitions } from "@shared/schema";

export async function simpleSeed(): Promise<void> {
  console.log("Starting simplified seeding...");

  try {
    // 1. Seed module definitions
    await seedModuleDefinitions();

    // 2. Insert agent specifications
    await insertAgentSpecs();

    console.log("Simplified seeding completed successfully!");
  } catch (error) {
    console.error("Failed to seed data:", error);
    throw error;
  }
}

async function seedModuleDefinitions(): Promise<void> {
  const modules = [
    {
      id: "prompt-module",
      name: "Prompt Module",
      version: "2.1.0",
      description: "Advanced prompt engineering and template management",
      type: "core",
      schema: {
        type: "object",
        properties: {
          templateId: { type: "string" },
          variables: { type: "object" },
          context: { type: "array" }
        }
      },
      dependencies: [],
      status: "stable"
    },
    {
      id: "recommendation-module",
      name: "Recommendation Module",
      version: "1.8.2",
      description: "Generate intelligent recommendations based on data analysis",
      type: "analysis",
      schema: {
        type: "object",
        properties: {
          context: { type: "string" },
          userProfile: { type: "object" },
          filters: { type: "object" }
        }
      },
      dependencies: ["prompt-module"],
      status: "stable"
    },
    {
      id: "database-connector",
      name: "Database Connector",
      version: "3.0.1",
      description: "Secure database connections with query validation",
      type: "integration",
      schema: {
        type: "object",
        properties: {
          query: { type: "string" },
          operation: { type: "string" },
          table: { type: "string" }
        }
      },
      dependencies: [],
      status: "stable"
    },
    {
      id: "mcp-connector",
      name: "MCP Connector",
      version: "2.0.0",
      description: "Connect to external services via Model Context Protocol",
      type: "integration",
      schema: {
        type: "object",
        properties: {
          url: { type: "string" },
          method: { type: "string" },
          headers: { type: "object" }
        }
      },
      dependencies: [],
      status: "stable"
    }
  ];

  for (const module of modules) {
    try {
      await db.insert(moduleDefinitions).values(module).onConflictDoNothing();
    } catch (error) {
      console.error(`Failed to seed module ${module.id}:`, error);
    }
  }

  console.log("✓ Module definitions seeded");
}

async function insertAgentSpecs(): Promise<void> {
  // Marketing Agent
  const marketingAgent = {
    name: "Marketing Agent",
    goal: "Recommend multi-channel campaign content that maximises CVR",
    role: "Marketing Campaign Specialist",
    guardrails: {
      requireHumanApproval: false,
      contentFiltering: true,
      readOnlyMode: false,
      maxTokens: 4000,
      allowedDomains: ["marketing.company.com"],
      blockedKeywords: ["competitor"]
    },
    modules: [
      {
        moduleId: "prompt-module",
        version: "2.1.0",
        config: {
          templates: {
            campaign_analysis: "Analyze the following campaign data and provide recommendations: {{data}}"
          }
        },
        enabled: true
      },
      {
        moduleId: "recommendation-module", 
        version: "1.8.2",
        config: {
          algorithm: "hybrid",
          maxRecommendations: 5,
          confidenceThreshold: 0.7
        },
        enabled: true
      }
    ],
    model: "gpt-4o",
    vectorStoreId: "marketing-vector-store",
    status: "active"
  };

  // Release Notes Agent
  const releaseNotesAgent = {
    name: "Release Notes Agent",
    goal: "Generate Confluence-ready release notes matching existing template",
    role: "Technical Documentation Specialist",
    guardrails: {
      requireHumanApproval: true,
      contentFiltering: true,
      readOnlyMode: true,
      maxTokens: 3000,
      allowedDomains: ["confluence.company.com", "jira.company.com"],
      blockedKeywords: ["confidential", "internal"]
    },
    modules: [
      {
        moduleId: "prompt-module",
        version: "2.1.0",
        config: {
          templates: {
            release_notes: "Generate release notes for version {{version}} with the following changes: {{changes}}"
          }
        },
        enabled: true
      },
      {
        moduleId: "mcp-connector",
        version: "2.0.0",
        config: {
          timeout: 30000,
          retries: 3
        },
        enabled: true
      }
    ],
    model: "gpt-4o",
    vectorStoreId: "release-notes-vector-store",
    status: "active"
  };

  try {
    await db.insert(agents).values([
      marketingAgent,
      releaseNotesAgent
    ]);

    console.log("✓ Agent specifications inserted");
  } catch (error) {
    console.error("Failed to insert agents:", error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleSeed()
    .then(() => {
      console.log("Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}