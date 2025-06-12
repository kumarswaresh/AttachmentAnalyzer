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

DROP DATABASE IF EXISTS neondb;
--
-- Name: neondb; Type: DATABASE; Schema: -; Owner: neondb_owner
--

CREATE DATABASE neondb WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C.UTF-8';


ALTER DATABASE neondb OWNER TO neondb_owner;

\connect neondb

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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: neondb_owner
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: neondb_owner
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: neondb_owner
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: agent_apps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_apps (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    flow_definition jsonb NOT NULL,
    input_schema jsonb NOT NULL,
    output_schema jsonb NOT NULL,
    is_active boolean DEFAULT true,
    execution_count integer DEFAULT 0,
    avg_execution_time integer DEFAULT 0,
    guardrails jsonb NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    icon text,
    configuration jsonb,
    is_public boolean DEFAULT false
);


ALTER TABLE public.agent_apps OWNER TO neondb_owner;

--
-- Name: agent_chains; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_chains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying NOT NULL,
    description text,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_chains OWNER TO neondb_owner;

--
-- Name: agent_credentials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_credentials (
    id integer NOT NULL,
    agent_id uuid NOT NULL,
    credential_id integer NOT NULL,
    purpose text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_credentials OWNER TO neondb_owner;

--
-- Name: agent_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.agent_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_credentials_id_seq OWNER TO neondb_owner;

--
-- Name: agent_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.agent_credentials_id_seq OWNED BY public.agent_credentials.id;


--
-- Name: agent_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_logs (
    id integer NOT NULL,
    agent_id uuid NOT NULL,
    execution_id uuid NOT NULL,
    status text NOT NULL,
    input jsonb,
    output jsonb,
    duration integer,
    token_count integer,
    model text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    error_message text,
    metadata jsonb
);


ALTER TABLE public.agent_logs OWNER TO neondb_owner;

--
-- Name: agent_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.agent_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_logs_id_seq OWNER TO neondb_owner;

--
-- Name: agent_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.agent_logs_id_seq OWNED BY public.agent_logs.id;


--
-- Name: agent_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chain_execution_id uuid,
    from_agent_id uuid,
    to_agent_id uuid NOT NULL,
    message_type character varying NOT NULL,
    content jsonb NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    priority integer DEFAULT 1,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    processed_at timestamp without time zone,
    metadata jsonb
);


ALTER TABLE public.agent_messages OWNER TO neondb_owner;

--
-- Name: agent_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agent_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    icon text,
    default_goal text NOT NULL,
    default_role text NOT NULL,
    default_guardrails jsonb NOT NULL,
    default_modules jsonb NOT NULL,
    default_model text NOT NULL,
    is_public boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.agent_templates OWNER TO neondb_owner;

--
-- Name: agent_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.agent_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agent_templates_id_seq OWNER TO neondb_owner;

--
-- Name: agent_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.agent_templates_id_seq OWNED BY public.agent_templates.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    goal text NOT NULL,
    role text NOT NULL,
    guardrails jsonb NOT NULL,
    modules jsonb NOT NULL,
    model text NOT NULL,
    vector_store_id text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer
);


ALTER TABLE public.agents OWNER TO neondb_owner;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    provider text NOT NULL,
    key_name text NOT NULL,
    encrypted_key text NOT NULL,
    is_active boolean DEFAULT true,
    last_used timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_keys OWNER TO neondb_owner;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO neondb_owner;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: chain_executions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chain_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chain_id uuid NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    current_step integer DEFAULT 0,
    input jsonb,
    output jsonb,
    context jsonb DEFAULT '{}'::jsonb,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    error_message text,
    executed_by integer,
    metadata jsonb
);


ALTER TABLE public.chain_executions OWNER TO neondb_owner;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO neondb_owner;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_messages_id_seq OWNER TO neondb_owner;

--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id integer,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_sessions OWNER TO neondb_owner;

--
-- Name: credentials; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.credentials (
    id integer NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    key_type text NOT NULL,
    category text NOT NULL,
    description text,
    encrypted_value text,
    storage_type text DEFAULT 'internal'::text NOT NULL,
    aws_parameter_name text,
    is_required boolean DEFAULT false,
    is_configured boolean DEFAULT false,
    is_default boolean DEFAULT false,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.credentials OWNER TO neondb_owner;

--
-- Name: credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.credentials_id_seq OWNER TO neondb_owner;

--
-- Name: credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.credentials_id_seq OWNED BY public.credentials.id;


--
-- Name: custom_models; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_models (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    model_id text NOT NULL,
    endpoint text,
    api_key_id integer,
    configuration jsonb,
    capabilities jsonb,
    context_length integer,
    max_tokens integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_models OWNER TO neondb_owner;

--
-- Name: custom_models_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.custom_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_models_id_seq OWNER TO neondb_owner;

--
-- Name: custom_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.custom_models_id_seq OWNED BY public.custom_models.id;


--
-- Name: hotel_analytics; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hotel_analytics (
    id integer NOT NULL,
    period_type character varying NOT NULL,
    period_value character varying NOT NULL,
    booking_count integer DEFAULT 0,
    total_revenue numeric(12,2) DEFAULT '0'::numeric,
    average_price numeric(10,2) DEFAULT '0'::numeric,
    top_destinations jsonb,
    event_metrics jsonb,
    calculated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.hotel_analytics OWNER TO neondb_owner;

--
-- Name: hotel_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.hotel_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hotel_analytics_id_seq OWNER TO neondb_owner;

--
-- Name: hotel_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.hotel_analytics_id_seq OWNED BY public.hotel_analytics.id;


--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.hotel_bookings (
    id character varying NOT NULL,
    hotel_id character varying NOT NULL,
    hotel_name character varying NOT NULL,
    location character varying NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    guest_count integer NOT NULL,
    room_type character varying NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'USD'::character varying NOT NULL,
    booking_status character varying NOT NULL,
    booked_at timestamp without time zone DEFAULT now(),
    special_requests jsonb,
    event_type character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.hotel_bookings OWNER TO neondb_owner;

--
-- Name: mcp_connectors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.mcp_connectors (
    id text NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    description text,
    configuration jsonb,
    endpoints jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    auth_config jsonb,
    sample_request jsonb,
    sample_response jsonb,
    is_public boolean DEFAULT false,
    created_by integer
);


ALTER TABLE public.mcp_connectors OWNER TO neondb_owner;

--
-- Name: module_definitions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.module_definitions (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    description text,
    type text NOT NULL,
    schema jsonb,
    implementation text,
    dependencies jsonb,
    status text DEFAULT 'stable'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.module_definitions OWNER TO neondb_owner;

--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organization_members (
    id integer NOT NULL,
    user_id integer,
    organization_id integer,
    role_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.organization_members OWNER TO neondb_owner;

--
-- Name: organization_members_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organization_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organization_members_id_seq OWNER TO neondb_owner;

--
-- Name: organization_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organization_members_id_seq OWNED BY public.organization_members.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    settings jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    slug text,
    owner_id integer,
    ownerid integer,
    plan_type text DEFAULT 'trial'::text,
    api_rate_limit integer DEFAULT 1000,
    billing_enabled boolean DEFAULT false,
    allow_user_registration boolean DEFAULT true,
    default_role_id integer
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO neondb_owner;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_system_role boolean DEFAULT false,
    permissions text[],
    resource_limits jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.roles OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO neondb_owner;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vector_cache; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vector_cache (
    id integer NOT NULL,
    agent_id uuid,
    question text NOT NULL,
    question_embedding text,
    answer text NOT NULL,
    cosine_similarity real,
    hit_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_used timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.vector_cache OWNER TO neondb_owner;

--
-- Name: vector_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.vector_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vector_cache_id_seq OWNER TO neondb_owner;

--
-- Name: vector_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.vector_cache_id_seq OWNED BY public.vector_cache.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: agent_credentials id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_credentials ALTER COLUMN id SET DEFAULT nextval('public.agent_credentials_id_seq'::regclass);


--
-- Name: agent_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_logs ALTER COLUMN id SET DEFAULT nextval('public.agent_logs_id_seq'::regclass);


--
-- Name: agent_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_templates ALTER COLUMN id SET DEFAULT nextval('public.agent_templates_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: credentials id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credentials ALTER COLUMN id SET DEFAULT nextval('public.credentials_id_seq'::regclass);


--
-- Name: custom_models id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_models ALTER COLUMN id SET DEFAULT nextval('public.custom_models_id_seq'::regclass);


--
-- Name: hotel_analytics id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hotel_analytics ALTER COLUMN id SET DEFAULT nextval('public.hotel_analytics_id_seq'::regclass);


--
-- Name: organization_members id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members ALTER COLUMN id SET DEFAULT nextval('public.organization_members_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vector_cache id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vector_cache ALTER COLUMN id SET DEFAULT nextval('public.vector_cache_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: neondb_owner
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: agent_apps; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_apps (id, name, description, category, flow_definition, input_schema, output_schema, is_active, execution_count, avg_execution_time, guardrails, created_by, created_at, updated_at, icon, configuration, is_public) FROM stdin;
\.


--
-- Data for Name: agent_chains; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_chains (id, name, description, steps, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agent_credentials; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_credentials (id, agent_id, credential_id, purpose, created_at) FROM stdin;
1	034c8ae4-a67d-40e9-9759-791e44e5cddd	7	primary_llm	2025-06-10 18:48:41.211233
\.


--
-- Data for Name: agent_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_logs (id, agent_id, execution_id, status, input, output, duration, token_count, model, "timestamp", error_message, metadata) FROM stdin;
1	f90d8abd-e0a2-4d39-a765-63e0853630f5	0decdd35-7a91-4fc3-8038-a420735acfcb	success	\N	\N	\N	\N	bedrock:meta.llama3-2-11b-instruct-v1:0	2025-06-10 17:15:44.910757	\N	{"input": null, "model": "bedrock:meta.llama3-2-11b-instruct-v1:0", "action": "created", "output": null, "modules": 3, "agentName": "test12", "fromCache": false}
4	ed948d5f-f4f0-431e-9342-4918793a0084	9e8bfdd8-64a6-4c28-8ad6-7339044e4658	success	\N	\N	\N	\N	claude-3-sonnet	2025-06-10 19:08:03.652059	\N	{"input": null, "model": "claude-3-sonnet", "action": "created", "output": null, "modules": 1, "agentName": "test2", "fromCache": false}
5	034c8ae4-a67d-40e9-9759-791e44e5cddd	04f1248f-d42a-4fbd-94a5-cd26990b26b7	error	\N	\N	649	\N	\N	2025-06-12 05:23:01.740172	Bedrock execution failed: Unsupported Bedrock model: {"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	{"error": "Bedrock execution failed: Unsupported Bedrock model: {\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "input": "test", "output": null, "duration": 649, "fromCache": false}
6	034c8ae4-a67d-40e9-9759-791e44e5cddd	9269bd25-2ef3-4090-8555-6abf6c3beb6c	error	\N	\N	635	\N	\N	2025-06-12 05:27:59.241131	Bedrock execution failed: Unsupported Bedrock model: {"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	{"error": "Bedrock execution failed: Unsupported Bedrock model: {\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "input": "Create a marketing campaign for family hotels in Cancun targeting families with children ages 5-12", "output": null, "duration": 635, "fromCache": false}
7	034c8ae4-a67d-40e9-9759-791e44e5cddd	b3f7bcb0-b537-469a-85e0-7b5ac749eced	error	\N	\N	377	\N	\N	2025-06-12 05:28:34.962378	Bedrock execution failed: Unsupported Bedrock model: {"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	{"error": "Bedrock execution failed: Unsupported Bedrock model: {\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "input": "Create a marketing campaign for family hotels in Cancun targeting families with children ages 5-12", "output": null, "duration": 377, "fromCache": false}
8	034c8ae4-a67d-40e9-9759-791e44e5cddd	058b0f1a-e180-46fa-8344-66c4100b3fe4	error	\N	\N	278	\N	\N	2025-06-12 05:28:55.719584	Bedrock execution failed: Unsupported Bedrock model: {"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	{"error": "Bedrock execution failed: Unsupported Bedrock model: {\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "input": "Create a short marketing tagline for family hotels in Cancun", "output": null, "duration": 278, "fromCache": false}
9	034c8ae4-a67d-40e9-9759-791e44e5cddd	aa3d6057-7754-4270-ad43-4cecfa31fa7a	error	\N	\N	471	\N	\N	2025-06-12 05:29:15.720333	Bedrock execution failed: Unsupported Bedrock model: {"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	{"error": "Bedrock execution failed: Unsupported Bedrock model: {\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "input": "Test", "output": null, "duration": 471, "fromCache": false}
10	034c8ae4-a67d-40e9-9759-791e44e5cddd	7388693e-2956-4b91-8acb-075243a437db	success	\N	\N	12872	\N	{"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	2025-06-12 07:57:02.266764	\N	{"input": "Hotels top 10", "model": "{\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-4-turbo\\",\\"temperature\\":0.7,\\"maxTokens\\":4000,\\"credentialId\\":7}", "output": "To create compelling marketing content about the \\"Top 10 Hotels,\\" we can focus on various aspects such as luxury, location, amenities, customer service, and unique experiences offered by each hotel. Below is a draft for a blog post that highlights the top 10 hotels globally, appealing to travelers looking for exceptional experiences.\\n\\n---\\n\\n### Discover the Top 10 Hotels Around the World for Your Next Getaway\\n\\nTravel is more than just a destination; it’s about the experiences that shape our journeys. The right hotel can elevate your trip from ordinary to extraordinary. Here’s a curated list of the top 10 hotels around the globe, each offering unique features that promise an unforgettable stay.\\n\\n#### 1. **The Ritz Paris, France**\\nA symbol of luxury and elegance, The Ritz Paris offers opulent rooms and world-class dining. Indulge in their famous afternoon tea or relax at the stunning spa.\\n\\n#### 2. **Four Seasons Resort Bora Bora, French Polynesia**\\nWith its breathtaking overwater bungalows and pristine beaches, this resort is perfect for honeymooners and those seeking a slice of paradise. Enjoy water sports or unwind with a private beach cabana.\\n\\n#### 3. **The St. Regis New York, USA**\\nLocated in Midtown Manhattan, The St. Regis combines classic sophistication with modern amenities. Don’t miss the renowned Butler service and the iconic King Cole Bar.\\n\\n#### 4. **Aman Tokyo, Japan**\\nAman Tokyo is an urban oasis, blending traditional Japanese design with contemporary luxury. Its serene atmosphere and exceptional service make it a favorite for business and leisure travelers alike.\\n\\n#### 5. **Banyan Tree Phuket, Thailand**\\nSurrounded by lush tropical gardens and a stunning beach, Banyan Tree Phuket offers luxury villas with private pools. The resort is renowned for its wellness programs and exquisite dining options.\\n\\n#### 6. **The Savoy, London, UK**\\nAn iconic landmark on the Thames, The Savoy is synonymous with elegance. Experience the art of British hospitality with its luxurious rooms and world-class dining options.\\n\\n#### 7. **Hotel Bel-Air, Los Angeles, USA**\\nNestled in a picturesque garden setting, Hotel Bel-Air offers a serene escape in the heart of LA. The hotel boasts a renowned restaurant and luxurious accommodations.\\n\\n#### 8. **Soneva Fushi, Maldives**\\nFor eco-conscious travelers, Soneva Fushi combines luxury with sustainability. Enjoy pristine beaches, gourmet dining, and innovative experiences like outdoor cinema under the stars.\\n\\n#### 9. **The Oberoi Udaivilas, India**\\nOverlooking Lake Pichola, this hotel is a palace-like retreat that offers a taste of royal heritage. Experience traditional Indian hospitality and luxurious spa treatments.\\n\\n#### 10. **The Peninsula Hong Kong, China**\\nKnown as the \\"Grande Dame of the East,\\" The Peninsula offers a blend of old-world charm and modern luxury. Enjoy its rooftop bar and the famous afternoon tea service.\\n\\n### Conclusion\\nWhether you’re planning a romantic getaway, a family vacation, or a solo adventure, these top hotels offer something for every type of traveler. Experience unmatched luxury, exceptional service, and unique local cultures at these exquisite destinations. Book your stay today and create memories that will last a lifetime.\\n\\n---\\n\\n**Call to Action:** Share your favorite hotel experiences with us in the comments below! Which hotel are you excited to visit next?\\n\\n---\\n\\nThis content can be adapted for social media snippets and email campaigns as well. If you would like to explore specific aspects or create tailored content for a particular hotel or audience, please let me know! Human approval is recommended for the final content before publication.", "duration": 12872, "fromCache": false}
11	144b514f-7761-4ce5-95d4-675a54a6215a	2103bdaf-c25d-4046-8864-946ad946c2d2	success	\N	\N	\N	\N	claude-3-opus	2025-06-12 07:58:14.49217	\N	{"input": null, "model": "claude-3-opus", "action": "created", "output": null, "modules": 1, "agentName": "Test agent", "fromCache": false}
\.


--
-- Data for Name: agent_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_messages (id, chain_execution_id, from_agent_id, to_agent_id, message_type, content, status, priority, "timestamp", processed_at, metadata) FROM stdin;
\.


--
-- Data for Name: agent_templates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agent_templates (id, name, description, category, icon, default_goal, default_role, default_guardrails, default_modules, default_model, is_public, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: agents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.agents (id, name, goal, role, guardrails, modules, model, vector_store_id, status, created_at, updated_at, created_by) FROM stdin;
f90d8abd-e0a2-4d39-a765-63e0853630f5	test12	test12	developer-assistant	{"maxTokens": 4000, "readOnlyMode": false, "allowedDomains": [], "blockedKeywords": [], "contentFiltering": true, "requireHumanApproval": false}	[{"config": {}, "enabled": true, "version": "2.1.0", "moduleId": "prompt-module"}, {"config": {}, "enabled": true, "version": "1.5.0", "moduleId": "logging-module"}, {"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]	bedrock:meta.llama3-2-11b-instruct-v1:0	test12-vector-store	active	2025-06-10 17:15:44.860881	2025-06-10 17:15:44.860881	\N
034c8ae4-a67d-40e9-9759-791e44e5cddd	Marketing Content Specialist	Create compelling marketing content including blog posts, social media content, and email campaigns using market research and competitor analysis. Analyze trends and create data-driven content strategies.	senior_marketing_specialist	{"maxTokens": 8000, "readOnlyMode": false, "allowedDomains": ["company-website.com", "social-media-platforms.com"], "blockedKeywords": ["confidential", "internal-only"], "contentFiltering": true, "requireHumanApproval": true}	[{"config": {"temperature": 0.7, "systemPromptEnabled": true}, "enabled": true, "version": "2.1.0", "moduleId": "prompt-module"}, {"config": {"logLevel": "info", "includeTokenUsage": true}, "enabled": true, "version": "1.5.0", "moduleId": "logging-module"}, {"config": {"maxResults": 10, "includeSnippets": true}, "enabled": true, "version": "1.3.0", "moduleId": "web-search-module"}, {"config": {"seoOptimization": true, "supportedFormats": ["blog", "social", "email"]}, "enabled": true, "version": "1.2.0", "moduleId": "content-generation-module"}]	{"provider":"openai","model":"gpt-4-turbo","temperature":0.7,"maxTokens":4000,"credentialId":7}	marketing-content-store	active	2025-06-10 18:48:41.168876	2025-06-10 18:48:41.168876	\N
ed948d5f-f4f0-431e-9342-4918793a0084	test2	test2	data-analyst	{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}	[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]	claude-3-sonnet	test2-vector-store	active	2025-06-10 19:08:03.593031	2025-06-10 19:08:03.593031	\N
144b514f-7761-4ce5-95d4-675a54a6215a	Test agent	Agent decrip it k 	content-creator	{"maxTokens": 4000, "readOnlyMode": false, "contentFiltering": true, "requireHumanApproval": false}	[{"config": {}, "enabled": true, "version": "1.0.0", "moduleId": "marketing-campaign"}]	claude-3-opus	test-agent-vector-store	active	2025-06-12 07:58:14.444904	2025-06-12 07:58:14.444904	\N
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.api_keys (id, user_id, provider, key_name, encrypted_key, is_active, last_used, created_at, updated_at) FROM stdin;
1	1	platform	tes1	ap_a20a9a6f1bd7492aa54c21e7d38f6498653729b2c04d445b	t	\N	2025-06-10 16:32:07.560903	2025-06-10 16:32:07.560903
\.


--
-- Data for Name: chain_executions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chain_executions (id, chain_id, status, current_step, input, output, context, started_at, completed_at, error_message, executed_by, metadata) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chat_messages (id, session_id, role, content, metadata, "timestamp") FROM stdin;
1	aea00e1a-31bc-471b-a3b0-0a8993b2196c	user	yo	\N	2025-06-11 18:09:37.857432
2	aea00e1a-31bc-471b-a3b0-0a8993b2196c	user	geenerate	\N	2025-06-11 18:09:52.578006
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.chat_sessions (id, agent_id, user_id, status, created_at, updated_at) FROM stdin;
aea00e1a-31bc-471b-a3b0-0a8993b2196c	ed948d5f-f4f0-431e-9342-4918793a0084	\N	active	2025-06-11 18:09:32.496782	2025-06-11 18:09:32.496782
\.


--
-- Data for Name: credentials; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.credentials (id, name, provider, key_type, category, description, encrypted_value, storage_type, aws_parameter_name, is_required, is_configured, is_default, tags, created_at, updated_at) FROM stdin;
2	Anthropic Primary	anthropic	api_key	AI Models	Primary Anthropic API key for Claude models	\N	internal	\N	f	f	t	{}	2025-06-10 18:48:40.633971	2025-06-10 18:48:40.633971
3	AWS Primary	aws	access_key	Cloud Services	Primary AWS access credentials	\N	internal	\N	f	f	t	{}	2025-06-10 18:48:40.716138	2025-06-10 18:48:40.716138
4	SerpAPI Primary	serpapi	api_key	MCP Connectors	Primary SerpAPI key for search functionality	\N	internal	\N	f	f	t	{}	2025-06-10 18:48:40.792667	2025-06-10 18:48:40.792667
5	Google Maps Primary	google_maps	api_key	MCP Connectors	Primary Google Maps API key	\N	internal	\N	f	f	t	{}	2025-06-10 18:48:40.872804	2025-06-10 18:48:40.872804
6	WeatherAPI Primary	weatherapi	api_key	MCP Connectors	Primary WeatherAPI key	\N	internal	\N	f	f	t	{}	2025-06-10 18:48:40.958452	2025-06-10 18:48:40.958452
1	OpenAI Primary	openai	api_key	AI Models	Primary OpenAI API key for GPT models	\N	internal	\N	f	f	f	{}	2025-06-10 18:48:40.471687	2025-06-10 18:48:40.471687
7	OpenAI Demo Key	openai	api_key	AI Models	Demo OpenAI API key for GPT models	33fd21a0f9c848413d83d07b068c0da30f7ff9947623851a7a98fa8657b691f0	internal	\N	f	t	t	{demo,marketing}	2025-06-10 18:48:41.045407	2025-06-10 18:48:41.045407
8	Anthropic Demo Key	anthropic	api_key	AI Models	Demo Anthropic API key for Claude models	7bb48a1367b74c01dc1ca66fbb60f031caa0ee9c7f4a58ca4718b52953b276da	internal	\N	f	t	f	{demo,content}	2025-06-10 18:48:41.08517	2025-06-10 18:48:41.08517
\.


--
-- Data for Name: custom_models; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_models (id, user_id, name, provider, model_id, endpoint, api_key_id, configuration, capabilities, context_length, max_tokens, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hotel_analytics; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.hotel_analytics (id, period_type, period_value, booking_count, total_revenue, average_price, top_destinations, event_metrics, calculated_at) FROM stdin;
\.


--
-- Data for Name: hotel_bookings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.hotel_bookings (id, hotel_id, hotel_name, location, check_in_date, check_out_date, guest_count, room_type, total_amount, currency, booking_status, booked_at, special_requests, event_type, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mcp_connectors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.mcp_connectors (id, name, display_name, type, category, description, configuration, endpoints, is_active, created_at, updated_at, auth_config, sample_request, sample_response, is_public, created_by) FROM stdin;
\.


--
-- Data for Name: module_definitions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.module_definitions (id, name, version, description, type, schema, implementation, dependencies, status, created_at, updated_at) FROM stdin;
prompt-module	Prompt Module	2.1.0	Advanced prompt engineering and template management	core	{"type": "object", "properties": {"context": {"type": "array"}, "variables": {"type": "object"}, "templateId": {"type": "string"}}}	\N	[]	stable	2025-06-01 04:28:57.024062	2025-06-01 04:28:57.024062
recommendation-module	Recommendation Module	1.8.2	Generate intelligent recommendations based on data analysis	analysis	{"type": "object", "properties": {"context": {"type": "string"}, "filters": {"type": "object"}, "userProfile": {"type": "object"}}}	\N	["prompt-module"]	stable	2025-06-01 04:28:57.071366	2025-06-01 04:28:57.071366
database-connector	Database Connector	3.0.1	Secure database connections with query validation	integration	{"type": "object", "properties": {"query": {"type": "string"}, "table": {"type": "string"}, "operation": {"type": "string"}}}	\N	[]	stable	2025-06-01 04:28:57.119166	2025-06-01 04:28:57.119166
logging-module	Logging Module	1.5.0	Comprehensive logging and monitoring capabilities	core	{"type": "object", "properties": {"level": {"type": "string"}, "message": {"type": "string"}, "metadata": {"type": "object"}}}	\N	[]	stable	2025-06-01 04:28:57.158094	2025-06-01 04:28:57.158094
mcp-connector	MCP Connector	2.0.0	Connect to external services via Model Context Protocol	integration	{"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string"}, "headers": {"type": "object"}}}	\N	[]	stable	2025-06-01 04:28:57.200441	2025-06-01 04:28:57.200441
jira-connector	JIRA Connector	1.2.0	Connect to JIRA for issue tracking and project management	integration	{"type": "object", "properties": {"baseUrl": {"type": "string"}, "issueType": {"type": "string"}, "projectKey": {"type": "string"}}}	\N	["mcp-connector"]	stable	2025-06-01 04:28:57.243612	2025-06-01 04:28:57.243612
template-filler	Template Filler	1.0.5	Fill templates with dynamic content while preserving structure	generation	{"type": "object", "properties": {"data": {"type": "object"}, "format": {"type": "string"}, "templateId": {"type": "string"}}}	\N	["prompt-module"]	stable	2025-06-01 04:28:57.282981	2025-06-01 04:28:57.282981
\.


--
-- Data for Name: organization_members; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organization_members (id, user_id, organization_id, role_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organizations (id, name, description, settings, is_active, created_at, updated_at, slug, owner_id, ownerid, plan_type, api_rate_limit, billing_enabled, allow_user_registration, default_role_id) FROM stdin;
1	Demo Organization	A demo organization for testing	\N	t	2025-06-10 14:09:27.932579	2025-06-10 14:09:27.932579	demo-org	\N	1	trial	1000	f	t	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.roles (id, name, description, is_system_role, permissions, resource_limits, created_at, updated_at) FROM stdin;
1	Super Admin	Full system access with all administrative privileges	t	{admin:*,user:*,agent:*,deployment:*,api:*,credential:*}	{"maxAgents": 999999, "maxApiKeys": 999999, "monthlyCost": 999999, "dailyApiCalls": 999999, "maxCredentials": 999999, "maxDeployments": 999999}	2025-06-12 14:37:31.418429	2025-06-12 14:37:31.418429
2	Organization Admin	Administrative access within organization scope	t	{user:create,user:read,user:update,agent:*,deployment:*,api:*}	{"maxAgents": 100, "maxApiKeys": 25, "monthlyCost": 1000, "dailyApiCalls": 100000, "maxCredentials": 50, "maxDeployments": 50}	2025-06-12 14:37:31.473031	2025-06-12 14:37:31.473031
3	Agent Developer	Can create, modify, and deploy agents	t	{agent:*,deployment:create,deployment:read,deployment:update,api:create,api:read}	{"maxAgents": 25, "maxApiKeys": 10, "monthlyCost": 500, "dailyApiCalls": 50000, "maxCredentials": 20, "maxDeployments": 15}	2025-06-12 14:37:31.513362	2025-06-12 14:37:31.513362
4	API User	API access with rate limiting	t	{api:read,agent:read,deployment:read}	{"maxAgents": 0, "maxApiKeys": 5, "monthlyCost": 100, "dailyApiCalls": 10000, "maxCredentials": 10, "maxDeployments": 0}	2025-06-12 14:37:31.551666	2025-06-12 14:37:31.551666
5	Standard User	Basic platform access	t	{agent:read,deployment:read}	{"maxAgents": 5, "maxApiKeys": 2, "monthlyCost": 50, "dailyApiCalls": 5000, "maxCredentials": 5, "maxDeployments": 3}	2025-06-12 14:37:31.59111	2025-06-12 14:37:31.59111
6	Viewer	Read-only access to assigned resources	t	{agent:read,deployment:read}	{"maxAgents": 0, "maxApiKeys": 1, "monthlyCost": 10, "dailyApiCalls": 1000, "maxCredentials": 2, "maxDeployments": 0}	2025-06-12 14:37:31.62996	2025-06-12 14:37:31.62996
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_sessions (id, user_id, expires_at, created_at) FROM stdin;
n0rO7RXtOR3V1RwNFR-vLLhGtPujm8o6	5	2025-07-10 16:00:51.516	2025-06-10 16:00:51.536552
d7W9gnQ-XGCizbs8APua0oM7733_Tf8K	6	2025-07-10 16:00:52.093	2025-06-10 16:00:52.111215
JWT8ZwRP4nMbJLcRlmFDWyqNl0XX4Rae	1	2025-07-10 16:28:34.895	2025-06-10 16:28:34.914691
7bKwgmGEVNGg-QDZjr2O3X5dYZgwAz8Z	1	2025-07-10 17:03:04.056	2025-06-10 17:03:04.075079
0_WddZr-yhL-0eiTzisYepQkuZBxkCbM	1	2025-07-10 18:19:55.002	2025-06-10 18:19:55.020846
TM5dpErjMqtt5-TrXR9TaKR5wN_sgAOV	1	2025-07-12 07:56:07.321	2025-06-12 07:56:07.34167
egpd0JJUFnhabqJUiy8qcKu1JK6R3b1Y	1	2025-07-12 09:19:08.32	2025-06-12 09:19:08.317265
wLqlM_otVQyp1SCCrlrWsarhP94HpKYA	1	2025-07-12 09:19:10.687	2025-06-12 09:19:10.707529
4bkGX30yiH_GZMVs-TiVxTGK4XDmne-U	1	2025-07-12 09:40:03.719	2025-06-12 09:40:03.736857
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, role, is_active, last_login, created_at, updated_at) FROM stdin;
1	admin	$2b$10$g8iWKGhHGiphka1xINyNVeIcdlrcTwtXYGdW3jyNY607TUl2E8cS2	admin@local.dev	Super Admin	t	\N	2025-06-10 13:47:38.325146	2025-06-10 13:47:38.325146
2	demo-user	$2b$10$sWv2kettNLUYMKIajgHcM.9buhGacWw1TFZzXM2ONZC4YEhESwYMy	demo@example.com	user	t	\N	2025-06-10 14:09:28.125235	2025-06-10 14:09:28.125235
3	test-user	$2b$10$sWv2kettNLUYMKIajgHcM.9buhGacWw1TFZzXM2ONZC4YEhESwYMy	test@example.com	user	t	\N	2025-06-10 14:09:28.20077	2025-06-10 14:09:28.20077
4	kumarswaresh@gmail.com	$2b$12$fbh/Ix5NqX1.2UgtZcV5suyfWC1UhkP.Of9I/oAB5Rb9o0Bbn8j4G	kumarswaresh@gmail.com	user	t	\N	2025-06-10 15:56:23.553077	2025-06-10 15:56:23.553077
5	superadmin	$2b$12$EIrBHq6EewrXzTJF1WEeKusFYQ5VLzFp73rw2PIieGv/RsrBpHxda	superadmin@agentplatform.com	superadmin	t	\N	2025-06-10 16:00:51.479233	2025-06-10 16:00:51.56
6	demo-admin	$2b$12$DbEGaQ7K81yEEhughsjcc.c1HDflvEB499uK20raNw9wJg4halLQS	demo@agentplatform.com	admin	t	\N	2025-06-10 16:00:52.073915	2025-06-10 16:00:52.13
\.


--
-- Data for Name: vector_cache; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vector_cache (id, agent_id, question, question_embedding, answer, cosine_similarity, hit_count, created_at, last_used) FROM stdin;
1	034c8ae4-a67d-40e9-9759-791e44e5cddd	Hotels top 10	{"-0.0574606","0.03715817","0.017859057","-0.031681236","-0.03996746","-0.023265168","-0.075071774","0.026841702","0.047498245","-0.015852422","-0.0014341542","-0.013916608","-0.046199832","-0.018343009","0.03078415","0.013727748","-0.04124226","0.023831747","0.01332642","0.035765328","-0.014719262","-0.01506157","0.0008786408","-0.002279597","0.03751228","0.03087858","-0.030217571","-0.012700822","0.052503027","0.029839851","-0.013727748","-0.040534038","0.05476935","-0.0068815798","-0.005161185","-0.026912523","0.010511229","0.009714477","0.012960505","0.019145664","0.062370956","0.036969308","-0.0011921776","-0.006368117","-0.018036112","0.015309449","0.0022368084","-0.026109869","-0.01726887","-0.008835099","-0.020928029","0.013397243","-0.018236777","-0.0075602946","0.004246395","0.031940915","-0.026062654","0.0021128692","0.03779557","0.005361848","-0.009342659","-0.009041663","0.051653158","0.012098832","0.004727397","0.0052880747","-0.032696355","0.009832514","0.008469182","-0.036001403","-0.000021901467","0.016808523","-0.017670197","0.005043147","0.008758374","-0.008787883","-0.002728139","-0.015285841","0.0147546735","-0.019641422","-0.03918841","0.016749505","-0.015545524","0.025118355","-0.0044411565","-0.021872327","-0.07299432","0.017918075","-0.026251514","0.006350411","-0.02320615","0.0011449626","-0.017080009","0.0138457855","-0.025708543","-0.01758757","0.042989217","0.002453702","-0.037087347","0.024953103","0.023158936","-0.05793275","0.006149748","0.032790784","0.004966423","-0.024020609","-0.030666113","0.008770178","0.039282843","-0.0012976736","-0.09858482","-0.0052615167","-0.07242774","0.017988898","-0.057224523","0.028565047","0.0008815917","0.017068205","-0.008339341","-0.027290244","0.02405602","0.009803005","0.016655074","0.023005486","-0.04379187","-0.005373652","-0.033829514","-0.041124225","0.0028181425","-0.043862693","-0.045137495","-0.016690487","-0.015108786","0.017351495","0.03845658","0.052786317","0.011774229","0.0024094381","-0.0042286892","-0.011036496","0.038952336","-0.016348178","0.034962673","-0.022049384","0.020750972","-0.004255248","-0.015840618","-0.018402029","-0.009254131","0.007772762","-0.037087347","0.016478019","-0.01016892","0.027408281","-0.04789957","-0.022934664","0.013881196","0.004526734","-0.029910672","0.01427072","-0.04594015","0.0076488224","-0.0015684217","0.016359981","0.0107945185","0.036756843","-0.024858674","0.008026542","-0.057602245","-0.009289542","0.031704843","-0.010340075","-0.00024529645","0.025378037","-0.029367702","0.043555796","0.022013972","0.0112076495","-0.025401644","0.0637874","-0.02064474","-0.009053468","0.015521917","0.0025584602","-0.022899253","0.04549161","-0.05448606","-0.007578","-0.012405729","0.0010520082","0.011986696","-0.029887065","-0.037819177","0.00293618","-0.026700057","0.0027546976","-0.023926178","-0.02345403","0.017741019","-0.040463217","-0.029249664","-0.03892873","0.011455528","-0.029155234","-0.0445237","-0.020833598","-0.01843744","-0.017847253","-0.007896701","-0.018697122","0.06392905","0.03201174","-0.0065215654","-0.016690487","-0.023536654","-0.022663178","-0.0027355163","-0.014317934","0.05306961","0.032956038","-0.0021497558","-0.00086757477","0.045161102","0.024008805","0.0043968926","0.05585529","-0.0065156636","-0.011048299","0.0089236265","-0.002977493","0.012712627","0.01360971","-0.0009981536","-0.04690806","-0.02390257","0.015781598","-0.041336693","-0.0007642921","0.00018978199","-0.019499777","-0.048206467","0.0077432524","-0.04192688","-0.011219453","0.032200597","-0.04124226","-0.013279206","0.0058782618","0.020514898","0.030760543","-0.04662477","0.040840935","0.013668729","-0.039046768","0.043673832","-0.02062113","-0.018319402","-0.015639953","0.00029380244","-0.057413384","0.010700089","0.017599374","-0.0045355866","-0.031846486","-0.031681236","0.013066739","-0.052927963","0.0014297279","0.067517385","-0.05878262","-0.07082243","-0.01875614","-0.024244878","0.021482805","0.00893543","-0.0028210934","-0.016029477","-0.021293944","-0.04910355","0.0138457855","-0.008764276","-0.019487971","0.029580168","-0.010104001","0.025236392","-0.030760543","-0.00086314837","0.006621897","-0.024504561","0.020479485","0.004349678","0.019086646","0.0023828796","-0.05080329","0.043579403","0.022474319","0.015167804","-0.017221654","0.03848019","0.0020036846","0.029887065","0.0050903624","0.01979487","-0.001941715","-0.007583902","-0.0041814744","-0.0054356214","-0.025779365","0.01604128","0.028635869","0.011378804","0.0026381356","-0.0056687454","-0.042989217","-0.07086965","-0.054533273","0.008274421","0.023642888","-0.011709308","-0.045326356","0.049528487","0.0129132895","0.01777643","0.029509347","-0.027431889","0.016277356","0.009655458","-0.017221654","0.0155809345","0.025496075","-0.019051233","0.04095897","0.061048936","-0.005642187","-0.060718432","0.039495308","-0.047403812","0.055052638","-0.038102467","0.009136094","-0.014235308","-0.011160435","-0.004334923","-0.0112902755","0.045231927","0.0038539206","0.016501626","0.007814075","0.017481336","-0.017186243","-0.016395392","0.010251547","-0.028919159","0.036827665","-0.029769028","0.0027178107","0.037276205","0.030193964","-0.048041217","0.05259746","-0.0524086","0.028305365","-0.018945001","-0.060718432","0.06652587","0.006008103","-0.05892426","0.033451796","-0.019240094","0.0059756427","-0.017481336","-0.0075189816","-0.0068815798","0.02358387","-0.009732182","-0.010505327","0.04249346","0.051133797","0.016147515","-0.013869393","-0.007731449","-0.05108658","0.010818127","-0.038716264","0.01553372","-0.008162285","-0.023843551","-0.030005103","-0.036827665","0.033333756","0.021010654","0.0023917325","0.0021025408","-0.022804823","0.018862374","0.037205383","0.061615516","0.015415682","-0.059301984","0.018661711","-0.025684934","-0.041619983","-0.03413641","-0.021305747","-0.0026823995","-0.038055252","-0.049811777","-0.015510112","-0.00325193","-0.007690136","-0.044311233","-0.054958206","0.01281886","0.016277356","-0.049811777","0.015887832","0.0035558762","0.003918841","-0.003700472","-0.04409877","0.04499585","0.03734703","-0.0008417541","0.048914693","-0.032814395","-0.019476168","0.027809609","-0.045066673","-0.040014673","0.0006337132","-0.00783178","-0.015899636","-0.033758692","0.0388343","-0.05174759","-0.028187327","-0.0052172523","0.014601224","0.04801761","0.018295795","-0.022049384","-0.042162955","-0.07412748","-0.03649716","-0.014329739","0.0061025326","0.004098848","0.04605819","0.01347987","-0.0012371794","-0.012866075","-0.023253364","-0.027715178","-0.06463727","-0.042942002","-0.029296879","0.04556243","0.0039837616","-0.01998373","-0.06289032","0.016159318","-0.009513813","-0.03238946","-0.01885057","0.054061122","-0.021022458","-0.049764562","0.037110955","0.043862693","-0.039731383","-0.023324188","-0.023985196","-0.042894784","-0.017693805","0.010747304","-0.01787086","0.02049129","-0.0062146685","0.05632744","-0.015132393","-0.011514547","-0.02910802","-0.055241495","-0.060151853","-0.0052467617","0.040132713","-0.015049767","0.03201174","-0.052927963","-0.0138457855","0.01758757","0.008575416","0.038669046","-0.011166337","-0.0032371753","0.01885057","-0.05330568","-0.0027104334","-0.018874178","-0.02441013","-0.0019018773","-0.02910802","-0.008534103","-0.008280323","0.051417086","0.007997033","-0.010517131","-0.02288745","0.021836916","0.025378037","0.034041982","0.014164486","-0.033451796","0.019476168","-0.027833216","0.014601224","0.0002606044","0.0413603","-0.009478402","-0.012547374","0.0030984813","0.013751355","0.03722899","0.0049310117","-0.008988547","-0.021175906","-0.0015684217","-0.03862183","0.00902986","-0.025590505","-0.0039985166","-0.03779557","-0.0048513366","0.01651343","0.0057484205","-0.00783178","0.019889299","0.012181458","-0.005597923","-0.017127225","0.052219737","0.021270337","-0.03274357","-0.019027626","-0.020444075","-0.04228099","-0.021105085","0.002490589","-0.010782715","-0.023088112","0.058027178","0.0037152267","-0.021801505","0.0033079977","-0.016359981","-0.024244878","0.0052910256","0.047569066","0.023418617","-0.0011545531","0.008203599","-0.0052880747","-0.0002703794","0.019334523","0.014247112","0.0025805924","0.009938748","0.024504561","0.0010859439","0.0061615515","0.007005519","-0.018283991","-0.014766477","-0.023572065","0.034584954","-0.011992598","0.036638804","-0.016560646","-0.009537421","0.039046768","0.01847285","-0.011024692","0.049197983","0.041501943","-0.035505645","-0.019759458","0.01487271","0.04088815","0.020821795","0.007920309","0.044382058","-0.008227206","-0.0056244815","-0.049528487","0.0470497","0.01787086","-0.009496108","0.038409363","-0.03491546","0.017705608","-0.0026750222","0.0073065143","-0.01664327","-0.020609327","-0.013338225","0.034160018","-0.03342819","0.030312","0.020385057","-0.008162285","0.005060853","-0.016584253","-0.021128692","0.006680916","-0.007182575","0.05127544","-0.06614815","-0.0031722547","-0.0056687454","0.00146809","0.0023297628","0.04929241","0.0045326357","0.03328654","-0.019027626","0.045066673","0.022179225","-0.027479103","0.03545843","-0.00325193","0.03876348","0.041667197","-0.005822194","-0.00040649125","0.0035499744","0.024811458","0.0028461765","-0.03994385","-0.008551809","-0.012022108","0.016277356","0.00085577107","0.009260033","-0.03331015","0.017339692","-0.0017543306","0.01487271","0.0042021307","0.0027797804","-0.017882664","-0.0039808108","-0.0025437057","-0.015037963","-0.007843584","0.012807056","0.009212818","-0.01417629","-0.014247112","0.017752822","0.025519682","-0.035364002","0.010847636","-0.013361832","-0.04416959","-0.029155234","-0.02286384","0.022497926","-0.010092196","-0.0546277","-0.0023887816","0.010888949","0.021777898","-0.015179608","0.021541823","0.04480699","-0.00517889","0.029887065","-0.048159253","-0.045892935","-0.030170355","0.03331015","0.058829833","-0.03687488","0.005341192","0.017044598","-0.019889299","-0.00912429","-0.012033911","0.00045555053","-0.034230843","-0.009254131","-0.003697521","0.0069110887","0.024174057","0.017410515","0.020668346","-0.029698206","-0.014294327","-0.002462555","-0.03161041","0.01979487","0.018508261","0.011485037","0.0063799205","-0.015592739","0.018826963","0.041950487","-0.020255215","0.016902953","0.0017440023","-0.0074068457","-0.017375102","-0.02311172","0.019877495","0.005680549","0.017032795","-0.03368787","0.012594589","0.017504944","-0.057318956","0.006627799","0.01787086","0.053258467","-0.0013825129","-0.012960505","-0.003786049","-0.018708926","0.010345977","-0.023536654","0.0052261055","-0.021671664","0.01875614","-0.006899285","0.018779747","-0.028423402","-0.0006167453","-0.055808075","-0.0020951636","0.0147546735","0.008097365","0.039377272","0.0009767594","0.035198748","-0.016902953","0.036709625","-0.017245263","0.01745773","-0.01664327","-0.03659159","-0.010877145","-0.008799687","0.0073419255","0.022013972","-0.009295444","0.021211319","-0.04157277","0.016466215","0.014990748","0.020739168","0.068886615","0.01960601","0.050567217","-0.0043585305","0.036992915","-0.0099682575","-0.04407516","-0.03040643","-0.009761692","-0.039920244","-0.016997384","-0.0464123","-0.0073360233","-0.0054326705","-0.010192528","0.009000351","-0.01879155","-0.015781598","-0.02469342","-0.009602341","-0.014778281","-0.005642187","-0.022840234","0.005063804","0.04192688","-0.02165986","0.007141262","0.012358515","-0.027549926","0.043650225","0.013019524","0.0023445175","-0.022462515","0.025118355","-0.044759776","0.019582402","-0.016938364","0.0051169205","0.05089772","0.02946213","0.012877879","0.006539271","0.025897402","0.0008860181","-0.029910672","0.000479158","-0.00047878915","-0.0062795887","0.011030594","0.025661327","-0.013597907","0.022403495","-0.0047716615","-0.012511963","0.03637912","0.044476487","-0.008321635","-0.039518915","0.0030335607","-0.017705608","0.00985022","0.030925795","-0.036001403","0.0047716615","0.042351812","-0.034466915","0.01755216","0.00013694182","0.03406559","-0.008823294","-0.024598991","-0.007046832","0.00940758","-0.03286161","0.042068522","-0.021223122","-0.01932272","0.028116506","0.009460696","0.023949785","0.002443374","-0.015132393","0.004066388","-0.017800037","-0.008894117","-0.066384226","-0.0048100236","0.012606393","0.001299149","-0.008717061","0.003912939","0.035788935","-0.023182543","0.03715817","-0.009519715","0.01758757","0.0072415937","-0.012689019","0.052219737","0.057507813","0.004606409","-0.039542522","0.034089196","-0.034160018","-0.04690806","0.030382823","0.009531518","0.02250973","-0.0034024275","0.016076691","0.0031309417","-0.005364799","-0.022474319","-0.013090346","0.012193262","0.03715817","0.033003252","0.024032412","0.019181075","0.018177757","-0.04697888","0.0069760093","0.04143112","-0.017386908","0.025472468","0.004423451","0.0057867826","-0.056185797","0.05566643","-0.01206342","0.030571682","0.02797486","0.047946785","-0.024197664","0.025968224","0.009053468","-0.039636955","-0.01951158","0.045137495","0.007259299","0.027691571","-0.001739576","-0.026416767","0.023937982","0.06241817","-0.0010328271","0.017894467","0.01139651","-0.0084278695","0.0033050468","-0.037465066","-0.016914757","-0.034797423","-0.04780514","-0.06194602","0.030359216","0.0041460632","-0.04490142","0.025330823","-0.023418617","-0.012807056","-0.015781598","-0.022002168","-0.012889682","0.0003373287","0.003331605","0.0012098833","-0.008817392","-0.006722229","0.0077845654","-0.008286225","0.008162285","-0.002661743","0.024811458","0.017032795","0.03349901","0.0026543657","0.02974542","0.010210234","-0.008162285","-0.008368851","0.030854972","0.017245263","0.00041460633","-0.006137944","-0.010759108","-0.017103618","0.028116506","0.021164102","0.029721813","-0.0038804791","0.021648057","0.0009214293","-0.01171521","-0.0058369488","-0.0054503763","0.005774979","-0.024362916","0.015014355","0.004683133","0.03715817","0.0058428505","0.032601926","0.020904422","-0.023572065","-0.008002935","0.0062441775","0.005016589","0.026747271","0.002207299","0.028706692","0.01843744","0.016584253","0.021116888","0.02352485","-0.03257832","0.018390225","0.042658713","-0.0005964577","0.003845068","-0.024268486","0.02099885","0.023029095","0.014282524","-0.0011870135","0.04761628","0.02554329","0.012854272","0.060860075","0.014518598","0.0068343645","0.005819243","-0.02058572","-0.025330823","0.04051043","-0.014011038","-0.015144196","0.008722963","0.024079626","-0.0014518598","-0.0011656191","-0.005736617","-0.04100619","-0.04022714","-0.024575384","-0.057791103","-0.017469533","0.034396093","0.019570598","-0.02825815","-0.0047185444","-0.013515281","0.012842467","-0.017150832","0.012606393","-0.0049752756","-0.019310916","0.024740636","0.019936515","0.016300963","0.0065982896","0.03779557","0.0035440724","0.0055890703","0.0007403157","0.016902953","0.0075661964","0.042800356","-0.022615964","0.013550692","0.028281758","0.012382122","-0.018224971","0.03328654","0.017800037","0.005550708","0.01038729","-0.0006761329","-0.0054267687","0.003293243","0.016737701","0.0048896987","0.0041313083","0.012948701","0.0137631595","-0.05661073","0.019818477","-0.011945384","-0.0053529954","-0.016678682","-0.008233108","0.014884514","-0.034726597","-0.0074717663","0.000598302","-0.0095020095","-0.0050254418","0.011408313","0.016678682","-0.01019843","-0.076582655","0.0026130527","-0.031350728","0.01206342","-0.048324507","-0.024575384","-0.0023696006","-0.02099885","-0.01938174","-0.029580168","0.041903272","0.018213168","0.008451477","0.010021374","-0.023123523","0.03002871","0.0025363283","-0.008233108","0.006185159","0.0031279908","0.028612262","-0.0020981145","0.033994768","-0.01628916","0.0013957921","-0.011355196","0.034207236","-0.021022458","0.013833982","0.00040280257","0.011449627","-0.00077462033","-0.014577617","-0.040557645","0.028328972","-0.0035116123","0.017800037","0.005465131","0.037960824","0.03836215","0.009655458","0.02554329","0.017044598","-0.0053441427","-0.0005883426","-0.01436515","-0.030241178","-0.010121706","0.008687551","0.0028933913","-0.009844318","-0.009620047","-0.024953103","-0.0043644323","0.021447392","-0.044193197","0.032814395","0.0031840585","-0.029556561","-0.010316468","-0.011520449","-0.036615197","0.009596439","0.035316784","-0.0006613782","0.018826963","-0.011992598","0.043154467","-0.028281758","0.011579468","-0.027549926","0.000778309","0.001897451","0.02667645","0.005184792","-0.018319402","-0.018744336","-0.00013122437","0.009348561","-0.014601224","0.009921042","0.0022250046","-0.01417629","0.022852037","-0.007595706","0.020444075","-0.022285458","-0.004331972","0.06482613","0.0053884066","-0.031185478","0.011408313","0.009425285","0.014105467","-0.01534486","0.025968224","0.0068107573","0.015616346","0.010570248","-0.023961589","-0.029155234","-0.03349901","-0.045963757","0.013833982","0.03637912","0.010528935","-0.0034201331","0.00146809","0.020125374","-0.004376236","-0.015994066","0.007353729","0.0021394277","-0.005004785","-0.0078789955","0.0432489","0.013385439","0.020703757","0.015037963","-0.02033784","-0.023796337","-0.018378422","0.016619664","0.014931729","0.006468449","0.05476935","-0.00089192","-0.0015551426","-0.040652074","0.010257449","0.026345944","-0.008109168","0.004804122","0.021093281","-0.018555477","-0.0049929814","-0.01436515","-0.009395775","-0.051133797","0.01998373","-0.0016525234","-0.0041195047","0.013078542","-0.021506412","0.004272953","-0.062276524","0.039991066","-0.0065746824","-0.008581318","-0.04228099","-0.014247112","0.021671664","-0.011856855","-0.017327888","0.008268518","0.010281056","-0.013857589","0.022344477","0.0018576133","0.014388757","0.009071173","-0.018602692","0.04256428","0.006905187","-0.007625215","0.013090346","-0.034868244","-0.009738084","0.0017676099","-0.007395042","0.0015639954","0.013279206","0.007589804","-0.032483887","0.02390257","-0.006804855","0.018673515","-0.012842467","-0.010735501","-0.022556944","-0.01221687","-0.01689115","0.023997","0.019464364","0.0043113157","0.023064505","-0.00250977","0.010186627","-0.0061143367","-0.018956805","-0.0115912715","0.016171122","0.015156","0.021270337","-0.02854144","0.012110636","-0.021388374","-0.03257832","0.02330058","-0.016171122","0.040486824","-0.041525554","-0.01973585","-0.00022593093","0.02222644","-0.019358132","-0.0018044965","0.012700822","0.010452211","-0.010316468","0.017847253","-0.03545843","0.016902953","0.0034673482","0.014471384","0.014058253","0.010127608","0.0022515631","-0.03078415","0.0006982649","0.0020420467","0.00200516","-0.004556243","0.011939482","0.040274356","0.008486888","0.016017674","-0.013054934","0.054061122","0.03161041","0.0012150473","0.0031752056","0.02535443","-0.014388757","-0.031563196","0.035080712","-0.004255248","-0.018661711","-0.029957889","-0.011986696","0.039542522","0.009620047","-0.007719645","0.03321572","0.010104001","0.009437089","0.011408313","0.027809609","0.008486888","0.010351879","0.016253747","0.017327888","0.029556561","-0.010145313","-0.022899253","0.021234926","0.008817392","-0.01720985","-0.021577233","0.004423451","-0.045113888","-0.0073655327","0.0014452202","0.009437089","-0.022368085","-0.009909239","0.00546218","-0.012264084","-0.031114655","0.0008867559","0.0036886684","-0.002999625","0.02250973","-0.017351495","-0.032200597","-0.01095387","0.0006602716","0.000689781","0.0019977828","0.0032312735","0.02352485","0.0028815877","-0.013633318","0.010570248","-0.014778281","0.03161041","-0.005695304","0.02036145","-0.01534486","-0.013940215","0.0028815877","-0.014400561","0.00495757","-0.018732533","0.030241178","-0.0029347045","0.018307598","0.027266636","-0.015651757","0.022651374","0.024598991","0.012889682","-0.008179991","0.012358515","0.0013729223","0.011372902","-0.024528168","-0.024953103","-0.0022884498","-0.0042581987","-0.032153383","0.012511963","-0.020691954","0.008150482","0.012323103","-0.011514547","-0.005105117","-0.011803739","0.022191029","-0.009454794","0.022734001","-0.0038804791","0.017162636","-0.0009767594","-0.013456262","0.028187327","-0.007949818","0.008221304","0.0050254418","-0.047663495","0.0050933133","-0.01080042","-0.027290244","0.011402411","-0.015887832","0.005996299","-0.055430356","-0.010658775","-0.029060803","0.02854144","0.018331205","0.025378037","-0.016879346","-0.014896318","-0.0027576485","-0.012948701","-0.0032843903","-0.0401091","0.0036237477","-0.021046067","-0.025141964","0.032979645","0.04943406","0.011685701","0.007495374","0.05288075","-0.022592355","-0.02099885","0.0034939067","-0.014731065","-0.024764244","-0.008805589","-0.022852037","0.03538761","0.00388343","-0.028801123","-0.026322337","0.005695304","-0.04117144","-0.015120589","0.020904422","-0.008894117","-0.012146047","0.016112102","0.016961971","0.0043437756","-0.015852422","-0.043390542","0.018106936","0.01922829","0.00254223","0.009413482","-0.0337823","0.045113888","-0.036284693","-0.015049767","-0.012181458","0.016017674","0.049528487","0.026133478","-0.0031899603","0.007719645","0.0051700375","0.0074245515","0.037252598","0.023548458","-0.018921392","-0.01745773","0.011520449","0.01745773","0.030288393","0.0026558412","-0.0123349065","0.03106744","0.009319051","0.027620748","-0.0013552167","-0.0075071775","-0.011544056","-0.0032637336","0.008953135","0.0049310117","-0.042611495","0.014105467","-0.014435972","0.01619473","0.02554329","0.036426336","0.024504561","0.036686018","-0.018165953","-0.04556243","-0.046199832","-0.008469182","-0.012240477","-0.028045682","0.014388757","-0.025897402","0.04660116","-0.008185892","0.019936515","-0.0022117256","0.04117144","0.036686018","0.004562145","0.014388757","0.0011464381","0.0029317536","0.0010933212","0.00470379","0.007182575","-0.0088410005","0.035718113","-0.0050254418","0.02544886","-0.046105403","-0.022946468","-0.0048985514","0.02667645","-0.008717061","0.0014046449","0.015486505","-0.0019549942","0.028848337","-0.050378356","-0.004092946","0.024315702","0.010871243","0.02390257","0.0020243411","-0.022403495","-0.0073419255","-0.0033050468","-0.010263351","0.0015595689","0.013208384","0.0041726218","0.05670516","0.018579084","-0.0041873762","-0.011195846","0.010127608","0.020066356","-0.011012888","-0.01408186","0.029131627","-0.0426351"}	To create compelling marketing content about the "Top 10 Hotels," we can focus on various aspects such as luxury, location, amenities, customer service, and unique experiences offered by each hotel. Below is a draft for a blog post that highlights the top 10 hotels globally, appealing to travelers looking for exceptional experiences.\n\n---\n\n### Discover the Top 10 Hotels Around the World for Your Next Getaway\n\nTravel is more than just a destination; it’s about the experiences that shape our journeys. The right hotel can elevate your trip from ordinary to extraordinary. Here’s a curated list of the top 10 hotels around the globe, each offering unique features that promise an unforgettable stay.\n\n#### 1. **The Ritz Paris, France**\nA symbol of luxury and elegance, The Ritz Paris offers opulent rooms and world-class dining. Indulge in their famous afternoon tea or relax at the stunning spa.\n\n#### 2. **Four Seasons Resort Bora Bora, French Polynesia**\nWith its breathtaking overwater bungalows and pristine beaches, this resort is perfect for honeymooners and those seeking a slice of paradise. Enjoy water sports or unwind with a private beach cabana.\n\n#### 3. **The St. Regis New York, USA**\nLocated in Midtown Manhattan, The St. Regis combines classic sophistication with modern amenities. Don’t miss the renowned Butler service and the iconic King Cole Bar.\n\n#### 4. **Aman Tokyo, Japan**\nAman Tokyo is an urban oasis, blending traditional Japanese design with contemporary luxury. Its serene atmosphere and exceptional service make it a favorite for business and leisure travelers alike.\n\n#### 5. **Banyan Tree Phuket, Thailand**\nSurrounded by lush tropical gardens and a stunning beach, Banyan Tree Phuket offers luxury villas with private pools. The resort is renowned for its wellness programs and exquisite dining options.\n\n#### 6. **The Savoy, London, UK**\nAn iconic landmark on the Thames, The Savoy is synonymous with elegance. Experience the art of British hospitality with its luxurious rooms and world-class dining options.\n\n#### 7. **Hotel Bel-Air, Los Angeles, USA**\nNestled in a picturesque garden setting, Hotel Bel-Air offers a serene escape in the heart of LA. The hotel boasts a renowned restaurant and luxurious accommodations.\n\n#### 8. **Soneva Fushi, Maldives**\nFor eco-conscious travelers, Soneva Fushi combines luxury with sustainability. Enjoy pristine beaches, gourmet dining, and innovative experiences like outdoor cinema under the stars.\n\n#### 9. **The Oberoi Udaivilas, India**\nOverlooking Lake Pichola, this hotel is a palace-like retreat that offers a taste of royal heritage. Experience traditional Indian hospitality and luxurious spa treatments.\n\n#### 10. **The Peninsula Hong Kong, China**\nKnown as the "Grande Dame of the East," The Peninsula offers a blend of old-world charm and modern luxury. Enjoy its rooftop bar and the famous afternoon tea service.\n\n### Conclusion\nWhether you’re planning a romantic getaway, a family vacation, or a solo adventure, these top hotels offer something for every type of traveler. Experience unmatched luxury, exceptional service, and unique local cultures at these exquisite destinations. Book your stay today and create memories that will last a lifetime.\n\n---\n\n**Call to Action:** Share your favorite hotel experiences with us in the comments below! Which hotel are you excited to visit next?\n\n---\n\nThis content can be adapted for social media snippets and email campaigns as well. If you would like to explore specific aspects or create tailored content for a particular hotel or audience, please let me know! Human approval is recommended for the final content before publication.	\N	0	2025-06-12 07:57:02.206547	2025-06-12 07:57:02.206547
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: neondb_owner
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: agent_credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.agent_credentials_id_seq', 1, true);


--
-- Name: agent_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.agent_logs_id_seq', 11, true);


--
-- Name: agent_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.agent_templates_id_seq', 1, false);


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 2, true);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.chat_messages_id_seq', 2, true);


--
-- Name: credentials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.credentials_id_seq', 8, true);


--
-- Name: custom_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.custom_models_id_seq', 1, false);


--
-- Name: hotel_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.hotel_analytics_id_seq', 1, false);


--
-- Name: organization_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.organization_members_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.roles_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: vector_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.vector_cache_id_seq', 1, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: agent_apps agent_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_apps
    ADD CONSTRAINT agent_apps_pkey PRIMARY KEY (id);


--
-- Name: agent_chains agent_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_chains
    ADD CONSTRAINT agent_chains_pkey PRIMARY KEY (id);


--
-- Name: agent_credentials agent_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_pkey PRIMARY KEY (id);


--
-- Name: agent_logs agent_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_logs
    ADD CONSTRAINT agent_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_messages agent_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_templates agent_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_templates
    ADD CONSTRAINT agent_templates_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: chain_executions chain_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: custom_models custom_models_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_pkey PRIMARY KEY (id);


--
-- Name: hotel_analytics hotel_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hotel_analytics
    ADD CONSTRAINT hotel_analytics_pkey PRIMARY KEY (id);


--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: mcp_connectors mcp_connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.mcp_connectors
    ADD CONSTRAINT mcp_connectors_pkey PRIMARY KEY (id);


--
-- Name: module_definitions module_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.module_definitions
    ADD CONSTRAINT module_definitions_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vector_cache vector_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vector_cache
    ADD CONSTRAINT vector_cache_pkey PRIMARY KEY (id);


--
-- Name: agent_apps agent_apps_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_apps
    ADD CONSTRAINT agent_apps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agent_chains agent_chains_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_chains
    ADD CONSTRAINT agent_chains_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agent_credentials agent_credentials_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_credentials agent_credentials_credential_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.credentials(id);


--
-- Name: agent_logs agent_logs_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_logs
    ADD CONSTRAINT agent_logs_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_messages agent_messages_from_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_from_agent_id_agents_id_fk FOREIGN KEY (from_agent_id) REFERENCES public.agents(id);


--
-- Name: agent_messages agent_messages_to_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_to_agent_id_agents_id_fk FOREIGN KEY (to_agent_id) REFERENCES public.agents(id);


--
-- Name: agent_templates agent_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agent_templates
    ADD CONSTRAINT agent_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agents agents_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chain_executions chain_executions_chain_id_agent_chains_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_chain_id_agent_chains_id_fk FOREIGN KEY (chain_id) REFERENCES public.agent_chains(id);


--
-- Name: chain_executions chain_executions_executed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_executed_by_users_id_fk FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- Name: chat_messages chat_messages_session_id_chat_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_chat_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id);


--
-- Name: chat_sessions chat_sessions_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: chat_sessions chat_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: custom_models custom_models_api_key_id_api_keys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_api_key_id_api_keys_id_fk FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id);


--
-- Name: custom_models custom_models_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: organization_members organization_members_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_ownerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_ownerid_fkey FOREIGN KEY (ownerid) REFERENCES public.users(id);


--
-- Name: user_sessions user_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vector_cache vector_cache_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vector_cache
    ADD CONSTRAINT vector_cache_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: DATABASE neondb; Type: ACL; Schema: -; Owner: neondb_owner
--

GRANT ALL ON DATABASE neondb TO neon_superuser;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

