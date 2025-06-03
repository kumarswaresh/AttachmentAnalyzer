import { pgTable, varchar, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const credentials = pgTable("credentials", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // 'mcp', 'ai_model', 'cloud', 'integration'
  provider: varchar("provider").notNull(), // 'serpapi', 'openai', 'anthropic', 'aws', etc.
  keyType: varchar("key_type").notNull(), // 'api_key', 'access_token', 'certificate', etc.
  isRequired: boolean("is_required").default(false),
  isConfigured: boolean("is_configured").default(false),
  encryptedValue: text("encrypted_value"), // Encrypted credential value
  awsParameterPath: varchar("aws_parameter_path"), // AWS Parameter Store path
  useAwsParameterStore: boolean("use_aws_parameter_store").default(false),
  metadata: jsonb("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCredentialSchema = createInsertSchema(credentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCredentialSchema = createSelectSchema(credentials);

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

// Predefined credential templates
export const credentialTemplates = [
  // MCP Connectors
  {
    name: "SERPAPI_API_KEY",
    description: "SerpAPI key for web search, hotels, flights, and travel data",
    category: "mcp",
    provider: "serpapi",
    keyType: "api_key",
    isRequired: true,
    metadata: {
      website: "https://serpapi.com/",
      documentation: "https://serpapi.com/search-api"
    }
  },
  {
    name: "OPENWEATHERMAP_API_KEY",
    description: "OpenWeatherMap API key for weather data",
    category: "mcp",
    provider: "openweathermap",
    keyType: "api_key",
    isRequired: true,
    metadata: {
      website: "https://openweathermap.org/api",
      documentation: "https://openweathermap.org/api/one-call-3"
    }
  },
  {
    name: "GOOGLE_TRENDS_API_KEY",
    description: "Google API key for trends data (optional - uses SerpAPI if not provided)",
    category: "mcp",
    provider: "google",
    keyType: "api_key",
    isRequired: false,
    metadata: {
      website: "https://console.developers.google.com/",
      documentation: "https://developers.google.com/trends"
    }
  },
  {
    name: "GOOGLE_MAPS_API_KEY",
    description: "Google Maps API key for geospatial services",
    category: "mcp",
    provider: "google",
    keyType: "api_key",
    isRequired: false,
    metadata: {
      website: "https://console.developers.google.com/",
      documentation: "https://developers.google.com/maps/documentation"
    }
  },
  
  // AI Models
  {
    name: "OPENAI_API_KEY",
    description: "OpenAI API key for GPT models and AI services",
    category: "ai_model",
    provider: "openai",
    keyType: "api_key",
    isRequired: true,
    metadata: {
      website: "https://platform.openai.com/",
      documentation: "https://platform.openai.com/docs/api-reference"
    }
  },
  {
    name: "ANTHROPIC_API_KEY",
    description: "Anthropic API key for Claude models",
    category: "ai_model",
    provider: "anthropic",
    keyType: "api_key",
    isRequired: false,
    metadata: {
      website: "https://console.anthropic.com/",
      documentation: "https://docs.anthropic.com/claude/reference"
    }
  },
  {
    name: "XAI_API_KEY",
    description: "xAI API key for Grok models",
    category: "ai_model",
    provider: "xai",
    keyType: "api_key",
    isRequired: false,
    metadata: {
      website: "https://x.ai/",
      documentation: "https://docs.x.ai/"
    }
  },
  
  // Cloud Services
  {
    name: "AWS_ACCESS_KEY_ID",
    description: "AWS Access Key ID for cloud services",
    category: "cloud",
    provider: "aws",
    keyType: "access_key_id",
    isRequired: false,
    metadata: {
      website: "https://aws.amazon.com/",
      documentation: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
    }
  },
  {
    name: "AWS_SECRET_ACCESS_KEY",
    description: "AWS Secret Access Key for cloud services",
    category: "cloud",
    provider: "aws",
    keyType: "secret_access_key",
    isRequired: false,
    metadata: {
      website: "https://aws.amazon.com/",
      documentation: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"
    }
  },
  {
    name: "AWS_REGION",
    description: "AWS Region for cloud services",
    category: "cloud",
    provider: "aws",
    keyType: "region",
    isRequired: false,
    metadata: {
      website: "https://aws.amazon.com/",
      documentation: "https://docs.aws.amazon.com/general/latest/gr/rande.html"
    }
  },
  
  // Integration Services
  {
    name: "SLACK_BOT_TOKEN",
    description: "Slack Bot Token for workspace integration",
    category: "integration",
    provider: "slack",
    keyType: "bot_token",
    isRequired: false,
    metadata: {
      website: "https://api.slack.com/",
      documentation: "https://api.slack.com/authentication/token-types"
    }
  },
  {
    name: "SLACK_CHANNEL_ID",
    description: "Slack Channel ID for message posting",
    category: "integration",
    provider: "slack",
    keyType: "channel_id",
    isRequired: false,
    metadata: {
      website: "https://api.slack.com/",
      documentation: "https://api.slack.com/methods/conversations.list"
    }
  },
  {
    name: "SENDGRID_API_KEY",
    description: "SendGrid API key for email services",
    category: "integration",
    provider: "sendgrid",
    keyType: "api_key",
    isRequired: false,
    metadata: {
      website: "https://sendgrid.com/",
      documentation: "https://docs.sendgrid.com/api-reference"
    }
  },
  {
    name: "STRIPE_SECRET_KEY",
    description: "Stripe Secret Key for payment processing",
    category: "integration",
    provider: "stripe",
    keyType: "secret_key",
    isRequired: false,
    metadata: {
      website: "https://stripe.com/",
      documentation: "https://stripe.com/docs/api"
    }
  }
];