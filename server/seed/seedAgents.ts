import { db } from "../db";
import { agents, moduleDefinitions } from "@shared/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { VectorStore } from "../services/VectorStore";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1"
});

const vectorStore = new VectorStore();

export async function seedAgents(): Promise<void> {
  console.log("Starting agent seeding...");

  try {
    // 1. Push example historical-trend CSV to S3
    await pushExampleDataToS3();

    // 2. Seed module definitions
    await seedModuleDefinitions();

    // 3. Insert the two AgentSpec rows via Prisma
    const [marketingAgent, releaseNotesAgent] = await insertAgentSpecs();

    // 4. Warm up vector cache with 3 embeddings per agent
    await warmUpVectorCache(marketingAgent.id, releaseNotesAgent.id);

    console.log("Agent seeding completed successfully!");
  } catch (error) {
    console.error("Failed to seed agents:", error);
    throw error;
  }
}

async function pushExampleDataToS3(): Promise<void> {
  const bucketName = process.env.S3_BUCKET || "agent-data";
  
  const marketingData = `Date,Channel,Impressions,Clicks,CVR,Spend
2024-01-01,LinkedIn,125000,3250,2.8,4500
2024-01-01,Google Ads,89000,4100,3.2,3200
2024-01-01,Facebook,156000,2890,1.9,2800
2024-01-02,LinkedIn,132000,3480,2.9,4600
2024-01-02,Google Ads,92000,4350,3.4,3400
2024-01-02,Facebook,148000,2650,1.8,2600
2024-01-03,LinkedIn,128000,3380,3.1,4700
2024-01-03,Google Ads,87000,4200,3.8,3300
2024-01-03,Facebook,152000,2920,2.1,2700`;

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: "marketing/historical-trends.csv",
      Body: marketingData,
      ContentType: "text/csv"
    }));

    console.log("✓ Example marketing data uploaded to S3");
  } catch (error) {
    console.error("Failed to upload to S3:", error);
    // Continue seeding even if S3 upload fails
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
      id: "logging-module",
      name: "Logging Module",
      version: "1.5.0",
      description: "Comprehensive logging and monitoring capabilities",
      type: "core",
      schema: {
        type: "object",
        properties: {
          level: { type: "string" },
          message: { type: "string" },
          metadata: { type: "object" }
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
    },
    {
      id: "jira-connector",
      name: "JIRA Connector",
      version: "1.2.0",
      description: "Connect to JIRA for issue tracking and project management",
      type: "integration",
      schema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          projectKey: { type: "string" },
          issueType: { type: "string" }
        }
      },
      dependencies: ["mcp-connector"],
      status: "stable"
    },
    {
      id: "template-filler",
      name: "Template Filler",
      version: "1.0.5",
      description: "Fill templates with dynamic content while preserving structure",
      type: "generation",
      schema: {
        type: "object",
        properties: {
          templateId: { type: "string" },
          data: { type: "object" },
          format: { type: "string" }
        }
      },
      dependencies: ["prompt-module"],
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

async function insertAgentSpecs(): Promise<[any, any]> {
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
          },
          contextSettings: {
            maxTokens: 2000,
            includeHistory: true,
            historyLength: 5
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
      },
      {
        moduleId: "database-connector",
        version: "3.0.1",
        config: {
          allowedOperations: ["SELECT"],
          allowedTables: ["campaigns", "analytics", "channels"],
          readOnlyMode: true
        },
        enabled: true
      },
      {
        moduleId: "logging-module",
        version: "1.5.0",
        config: {
          level: "info",
          destinations: ["database", "cloudwatch"]
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
    model: "bedrock:anthropic.claude-3-sonnet-20240229-v1:0",
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
        moduleId: "jira-connector",
        version: "1.2.0",
        config: {
          baseUrl: "https://jira.company.com",
          projectKey: "PROD"
        },
        enabled: true
      },
      {
        moduleId: "template-filler",
        version: "1.0.5",
        config: {
          defaultTemplate: "confluence-release-notes",
          preserveFormatting: true
        },
        enabled: true
      },
      {
        moduleId: "logging-module",
        version: "1.5.0",
        config: {
          level: "debug",
          destinations: ["database", "cloudwatch"]
        },
        enabled: true
      }
    ],
    model: "bedrock:amazon.titan-text-express-v1",
    vectorStoreId: "release-notes-vector-store",
    status: "active"
  };

  const insertedAgents = await db.insert(agents).values([
    marketingAgent,
    releaseNotesAgent
  ]).returning();

  console.log("✓ Agent specifications inserted");
  return [insertedAgents[0], insertedAgents[1]];
}

async function warmUpVectorCache(marketingAgentId: string, releaseNotesAgentId: string): Promise<void> {
  const marketingQueries = [
    {
      question: "What are the best performing marketing channels?",
      answer: "Based on recent data analysis, LinkedIn sponsored content shows the highest CVR at 3.1%, followed by Google Ads at 3.4%. LinkedIn also provides the most qualified leads for B2B campaigns."
    },
    {
      question: "How should I optimize campaign budget allocation?",
      answer: "Recommend allocating 40% to LinkedIn for professional targeting, 35% to Google Ads for high-intent keywords, and 25% to Facebook for broader awareness. This allocation maximizes CVR while maintaining reach."
    },
    {
      question: "What creative formats work best for B2B campaigns?",
      answer: "Educational content and case studies perform 23% better than promotional content. Video testimonials and product demos show the highest engagement rates, particularly on LinkedIn and YouTube."
    }
  ];

  const releaseNotesQueries = [
    {
      question: "Generate release notes for version 2.1.0",
      answer: "# Release Notes v2.1.0\n\n## New Features\n- Enhanced dashboard analytics\n- Improved user authentication\n\n## Bug Fixes\n- Fixed login timeout issues\n- Resolved data export formatting\n\n## Breaking Changes\nNone"
    },
    {
      question: "How do I format release notes for Confluence?",
      answer: "Use h1. for main title, h2. for sections, and *bold* for emphasis. Include sections for New Features, Bug Fixes, Breaking Changes, and Known Issues. Always include version number and release date."
    },
    {
      question: "What should be included in release notes?",
      answer: "Include: version number, release date, new features with descriptions, bug fixes, breaking changes, deprecations, known issues, and migration notes if applicable. Keep descriptions concise but informative."
    }
  ];

  // Cache marketing agent queries
  for (const query of marketingQueries) {
    try {
      await vectorStore.cacheResult(marketingAgentId, query.question, query.answer);
    } catch (error) {
      console.error(`Failed to cache marketing query: ${query.question}`, error);
    }
  }

  // Cache release notes agent queries
  for (const query of releaseNotesQueries) {
    try {
      await vectorStore.cacheResult(releaseNotesAgentId, query.question, query.answer);
    } catch (error) {
      console.error(`Failed to cache release notes query: ${query.question}`, error);
    }
  }

  console.log("✓ Vector cache warmed up with example queries");
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAgents()
    .then(() => {
      console.log("Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}
