--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at, updated_at, created_by) VALUES ('f90d8abd-e0a2-4d39-a765-63e0853630f5', 'test12', 'test12', 'developer-assistant', '{"maxTokens": 4000, "readOnlyMode": false, "allowedDomains": [], "blockedKeywords": [], "contentFiltering": true, "requireHumanApproval": false}', '[{"config": {}, "enabled": true, "version": "2.1.0", "moduleId": "prompt-module"}, {"config": {}, "enabled": true, "version": "1.5.0", "moduleId": "logging-module"}, {"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]', 'bedrock:meta.llama3-2-11b-instruct-v1:0', 'test12-vector-store', 'active', '2025-06-10 17:15:44.860881', '2025-06-10 17:15:44.860881', NULL);
INSERT INTO public.agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at, updated_at, created_by) VALUES ('034c8ae4-a67d-40e9-9759-791e44e5cddd', 'Marketing Content Specialist', 'Create compelling marketing content including blog posts, social media content, and email campaigns using market research and competitor analysis. Analyze trends and create data-driven content strategies.', 'senior_marketing_specialist', '{"maxTokens": 8000, "readOnlyMode": false, "allowedDomains": ["company-website.com", "social-media-platforms.com"], "blockedKeywords": ["confidential", "internal-only"], "contentFiltering": true, "requireHumanApproval": true}', '[{"config": {"temperature": 0.7, "systemPromptEnabled": true}, "enabled": true, "version": "2.1.0", "moduleId": "prompt-module"}, {"config": {"logLevel": "info", "includeTokenUsage": true}, "enabled": true, "version": "1.5.0", "moduleId": "logging-module"}, {"config": {"maxResults": 10, "includeSnippets": true}, "enabled": true, "version": "1.3.0", "moduleId": "web-search-module"}, {"config": {"seoOptimization": true, "supportedFormats": ["blog", "social", "email"]}, "enabled": true, "version": "1.2.0", "moduleId": "content-generation-module"}]', '{"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}', 'marketing-content-store', 'active', '2025-06-10 18:48:41.168876', '2025-06-10 18:48:41.168876', NULL);
INSERT INTO public.agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at, updated_at, created_by) VALUES ('ed948d5f-f4f0-431e-9342-4918793a0084', 'test2', 'test2', 'data-analyst', '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}', '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]', 'claude-3-sonnet', 'test2-vector-store', 'active', '2025-06-10 19:08:03.593031', '2025-06-10 19:08:03.593031', NULL);
INSERT INTO public.agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at, updated_at, created_by) VALUES ('144b514f-7761-4ce5-95d4-675a54a6215a', 'Test agent', 'Agent decrip it k ', 'content-creator', '{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}', '[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]', 'claude-3-opus', 'test-agent-vector-store', 'active', '2025-06-12 07:58:14.444904', '2025-06-12 07:58:14.444904', NULL);


--
-- PostgreSQL database dump complete
--

