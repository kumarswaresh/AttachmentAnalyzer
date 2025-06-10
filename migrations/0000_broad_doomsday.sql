CREATE TABLE "agent_app_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"status" varchar DEFAULT 'pending',
	"input" jsonb NOT NULL,
	"output" jsonb,
	"context" jsonb DEFAULT '{}'::jsonb,
	"geo_context" jsonb,
	"user_profile" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration" integer,
	"error_message" text,
	"executed_by" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"icon" varchar,
	"configuration" jsonb NOT NULL,
	"flow_definition" jsonb NOT NULL,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb NOT NULL,
	"guardrails" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"execution_count" integer DEFAULT 0,
	"avg_execution_time" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_chains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"steps" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_communication_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"channel_type" varchar NOT NULL,
	"participant_agents" jsonb NOT NULL,
	"moderator_agent" uuid,
	"configuration" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_coordination_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"trigger_conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"agent_scope" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"credential_id" serial NOT NULL,
	"purpose" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"status" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"duration" integer,
	"token_count" integer,
	"model" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid,
	"memory_type" varchar NOT NULL,
	"content" text NOT NULL,
	"embedding" text,
	"semantic_tags" jsonb DEFAULT '[]'::jsonb,
	"importance" integer DEFAULT 1,
	"access_count" integer DEFAULT 0,
	"last_accessed" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_execution_id" uuid,
	"from_agent_id" uuid,
	"to_agent_id" uuid NOT NULL,
	"message_type" varchar NOT NULL,
	"content" jsonb NOT NULL,
	"status" varchar DEFAULT 'pending',
	"priority" varchar DEFAULT 'medium',
	"response_required" boolean DEFAULT false,
	"response_timeout" integer,
	"correlation_id" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"response_received_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_response_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"json_schema" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"validation_rules" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"icon" text,
	"default_goal" text NOT NULL,
	"default_role" text NOT NULL,
	"default_guardrails" jsonb NOT NULL,
	"default_modules" jsonb NOT NULL,
	"default_model" text NOT NULL,
	"is_public" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"role" text NOT NULL,
	"guardrails" jsonb NOT NULL,
	"modules" jsonb NOT NULL,
	"model" text NOT NULL,
	"vector_store_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "api_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_key_id" integer,
	"user_id" integer,
	"organization_id" integer,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"credits_used" integer DEFAULT 0,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" text,
	"error_message" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"key_name" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"billing_period" varchar(20) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"breakdown" jsonb,
	"is_paid" boolean DEFAULT false,
	"paid_at" timestamp,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chain_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" uuid NOT NULL,
	"status" varchar DEFAULT 'pending',
	"current_step" integer DEFAULT 0,
	"input" jsonb,
	"output" jsonb,
	"context" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"error_message" text,
	"executed_by" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"allowed_endpoints" jsonb DEFAULT '[]'::jsonb,
	"rate_limit" integer DEFAULT 1000,
	"allowed_ips" jsonb DEFAULT '[]'::jsonb,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"key_type" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"encrypted_value" text,
	"storage_type" text DEFAULT 'internal' NOT NULL,
	"aws_parameter_name" text,
	"is_required" boolean DEFAULT false,
	"is_configured" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"endpoint" text,
	"api_key_id" integer,
	"configuration" jsonb,
	"capabilities" jsonb,
	"context_length" integer,
	"max_tokens" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"agent_id" uuid,
	"agent_app_id" uuid,
	"access_key" varchar NOT NULL,
	"version" varchar DEFAULT '1.0.0',
	"environment" varchar DEFAULT 'production',
	"deployment_type" varchar DEFAULT 'standalone',
	"configuration" jsonb NOT NULL,
	"credential_requirements" jsonb NOT NULL,
	"endpoints" jsonb NOT NULL,
	"allowed_origins" jsonb DEFAULT '[]',
	"rate_limit" jsonb,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "deployments_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid,
	"agent_id" uuid,
	"session_id" uuid,
	"step_type" varchar NOT NULL,
	"log_level" varchar DEFAULT 'info',
	"message" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"duration" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "hotel_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_type" varchar NOT NULL,
	"period_value" varchar NOT NULL,
	"booking_count" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"average_price" numeric(10, 2) DEFAULT '0',
	"top_destinations" jsonb,
	"event_metrics" jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" varchar PRIMARY KEY NOT NULL,
	"hotel_id" varchar NOT NULL,
	"hotel_name" varchar NOT NULL,
	"location" varchar NOT NULL,
	"check_in_date" date NOT NULL,
	"check_out_date" date NOT NULL,
	"guest_count" integer NOT NULL,
	"room_type" varchar NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'USD' NOT NULL,
	"booking_status" varchar NOT NULL,
	"booked_at" timestamp DEFAULT now(),
	"special_requests" jsonb,
	"event_type" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcp_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text,
	"type" varchar NOT NULL,
	"category" varchar NOT NULL,
	"auth_config" jsonb NOT NULL,
	"endpoints" jsonb NOT NULL,
	"sample_request" jsonb,
	"sample_response" jsonb,
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_connectors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "module_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"schema" jsonb,
	"implementation" text,
	"dependencies" jsonb,
	"status" text DEFAULT 'stable' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"owner_id" integer NOT NULL,
	"plan_type" text DEFAULT 'trial' NOT NULL,
	"credits_balance" integer DEFAULT 0,
	"credits_purchased" integer DEFAULT 0,
	"credits_used" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"organization_id" integer,
	"is_system_role" boolean DEFAULT false,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"priority" integer DEFAULT 0,
	"resource_limits" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100),
	"resource_id" varchar(100),
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_usage_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer,
	"date" date NOT NULL,
	"agent_count" integer DEFAULT 0,
	"deployment_count" integer DEFAULT 0,
	"api_call_count" integer DEFAULT 0,
	"credential_count" integer DEFAULT 0,
	"cost_incurred" numeric(10, 2) DEFAULT '0.00',
	"tokens_used" integer DEFAULT 0,
	"execution_time" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vector_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" uuid,
	"question" text NOT NULL,
	"question_embedding" text,
	"answer" text NOT NULL,
	"cosine_similarity" real,
	"hit_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_app_executions" ADD CONSTRAINT "agent_app_executions_app_id_agent_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."agent_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_app_executions" ADD CONSTRAINT "agent_app_executions_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_apps" ADD CONSTRAINT "agent_apps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_chains" ADD CONSTRAINT "agent_chains_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_communication_channels" ADD CONSTRAINT "agent_communication_channels_moderator_agent_agents_id_fk" FOREIGN KEY ("moderator_agent") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_communication_channels" ADD CONSTRAINT "agent_communication_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_coordination_rules" ADD CONSTRAINT "agent_coordination_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_credentials" ADD CONSTRAINT "agent_credentials_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_credentials" ADD CONSTRAINT "agent_credentials_credential_id_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory" ADD CONSTRAINT "agent_memory_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_response_schemas" ADD CONSTRAINT "agent_response_schemas_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_api_key_id_client_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."client_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_access_logs" ADD CONSTRAINT "api_access_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_executions" ADD CONSTRAINT "chain_executions_chain_id_agent_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."agent_chains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_executions" ADD CONSTRAINT "chain_executions_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_api_keys" ADD CONSTRAINT "client_api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_models" ADD CONSTRAINT "custom_models_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_models" ADD CONSTRAINT "custom_models_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_agent_app_id_agent_apps_id_fk" FOREIGN KEY ("agent_app_id") REFERENCES "public"."agent_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_chain_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."chain_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_connectors" ADD CONSTRAINT "mcp_connectors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage_stats" ADD CONSTRAINT "user_usage_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_usage_stats" ADD CONSTRAINT "user_usage_stats_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vector_cache" ADD CONSTRAINT "vector_cache_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;