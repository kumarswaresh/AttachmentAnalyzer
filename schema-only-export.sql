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
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: agent_apps; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: agent_chains; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: agent_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_credentials (
    id integer NOT NULL,
    agent_id uuid NOT NULL,
    credential_id integer NOT NULL,
    purpose text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_credentials_id_seq OWNED BY public.agent_credentials.id;


--
-- Name: agent_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: agent_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_logs_id_seq OWNED BY public.agent_logs.id;


--
-- Name: agent_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: agent_templates; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: agent_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_templates_id_seq OWNED BY public.agent_templates.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: chain_executions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    user_id integer,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: credentials; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: credentials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credentials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credentials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credentials_id_seq OWNED BY public.credentials.id;


--
-- Name: custom_models; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: custom_models_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_models_id_seq OWNED BY public.custom_models.id;


--
-- Name: hotel_analytics; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: hotel_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hotel_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hotel_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hotel_analytics_id_seq OWNED BY public.hotel_analytics.id;


--
-- Name: hotel_bookings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: mcp_connectors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: module_definitions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: organization_members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organization_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organization_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organization_members_id_seq OWNED BY public.organization_members.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vector_cache; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: vector_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vector_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vector_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vector_cache_id_seq OWNED BY public.vector_cache.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: agent_credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_credentials ALTER COLUMN id SET DEFAULT nextval('public.agent_credentials_id_seq'::regclass);


--
-- Name: agent_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_logs ALTER COLUMN id SET DEFAULT nextval('public.agent_logs_id_seq'::regclass);


--
-- Name: agent_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_templates ALTER COLUMN id SET DEFAULT nextval('public.agent_templates_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);


--
-- Name: credentials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials ALTER COLUMN id SET DEFAULT nextval('public.credentials_id_seq'::regclass);


--
-- Name: custom_models id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models ALTER COLUMN id SET DEFAULT nextval('public.custom_models_id_seq'::regclass);


--
-- Name: hotel_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_analytics ALTER COLUMN id SET DEFAULT nextval('public.hotel_analytics_id_seq'::regclass);


--
-- Name: organization_members id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members ALTER COLUMN id SET DEFAULT nextval('public.organization_members_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vector_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_cache ALTER COLUMN id SET DEFAULT nextval('public.vector_cache_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: agent_apps agent_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_apps
    ADD CONSTRAINT agent_apps_pkey PRIMARY KEY (id);


--
-- Name: agent_chains agent_chains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_chains
    ADD CONSTRAINT agent_chains_pkey PRIMARY KEY (id);


--
-- Name: agent_credentials agent_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_pkey PRIMARY KEY (id);


--
-- Name: agent_logs agent_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_logs
    ADD CONSTRAINT agent_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_messages agent_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_pkey PRIMARY KEY (id);


--
-- Name: agent_templates agent_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_templates
    ADD CONSTRAINT agent_templates_pkey PRIMARY KEY (id);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: chain_executions chain_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: custom_models custom_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_pkey PRIMARY KEY (id);


--
-- Name: hotel_analytics hotel_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_analytics
    ADD CONSTRAINT hotel_analytics_pkey PRIMARY KEY (id);


--
-- Name: hotel_bookings hotel_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_bookings
    ADD CONSTRAINT hotel_bookings_pkey PRIMARY KEY (id);


--
-- Name: mcp_connectors mcp_connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_connectors
    ADD CONSTRAINT mcp_connectors_pkey PRIMARY KEY (id);


--
-- Name: module_definitions module_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_definitions
    ADD CONSTRAINT module_definitions_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vector_cache vector_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_cache
    ADD CONSTRAINT vector_cache_pkey PRIMARY KEY (id);


--
-- Name: agent_apps agent_apps_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_apps
    ADD CONSTRAINT agent_apps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agent_chains agent_chains_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_chains
    ADD CONSTRAINT agent_chains_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agent_credentials agent_credentials_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_credentials agent_credentials_credential_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_credentials
    ADD CONSTRAINT agent_credentials_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES public.credentials(id);


--
-- Name: agent_logs agent_logs_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_logs
    ADD CONSTRAINT agent_logs_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: agent_messages agent_messages_from_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_from_agent_id_agents_id_fk FOREIGN KEY (from_agent_id) REFERENCES public.agents(id);


--
-- Name: agent_messages agent_messages_to_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_messages
    ADD CONSTRAINT agent_messages_to_agent_id_agents_id_fk FOREIGN KEY (to_agent_id) REFERENCES public.agents(id);


--
-- Name: agent_templates agent_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_templates
    ADD CONSTRAINT agent_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: agents agents_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: chain_executions chain_executions_chain_id_agent_chains_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_chain_id_agent_chains_id_fk FOREIGN KEY (chain_id) REFERENCES public.agent_chains(id);


--
-- Name: chain_executions chain_executions_executed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chain_executions
    ADD CONSTRAINT chain_executions_executed_by_users_id_fk FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- Name: chat_messages chat_messages_session_id_chat_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_chat_sessions_id_fk FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id);


--
-- Name: chat_sessions chat_sessions_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: chat_sessions chat_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: custom_models custom_models_api_key_id_api_keys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_api_key_id_api_keys_id_fk FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id);


--
-- Name: custom_models custom_models_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_models
    ADD CONSTRAINT custom_models_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: organization_members organization_members_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_ownerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_ownerid_fkey FOREIGN KEY (ownerid) REFERENCES public.users(id);


--
-- Name: user_sessions user_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vector_cache vector_cache_agent_id_agents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_cache
    ADD CONSTRAINT vector_cache_agent_id_agents_id_fk FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- PostgreSQL database dump complete
--

