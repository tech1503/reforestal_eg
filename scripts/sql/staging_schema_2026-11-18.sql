


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."investor_profile" AS ENUM (
    'Lena',
    'Markus',
    'David'
);


ALTER TYPE "public"."investor_profile" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan_type" AS ENUM (
    'Explorador/a',
    'Guardián/a',
    'Campeón/a',
    'Paladín/a'
);


ALTER TYPE "public"."subscription_plan_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan_type_old" AS ENUM (
    'roots',
    'tree',
    'forest',
    'ecosystem'
);


ALTER TYPE "public"."subscription_plan_type_old" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status_type" AS ENUM (
    'active',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."subscription_status_type" OWNER TO "postgres";


CREATE TYPE "public"."vesting_status_type" AS ENUM (
    'in_cliff',
    'vesting_linearly',
    'fully_vested',
    'forfeited',
    'accelerated'
);


ALTER TYPE "public"."vesting_status_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_profile_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Si el rol cambia y el usuario no es admin, abortar.
  IF (NEW.role IS DISTINCT FROM OLD.role) AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Escalada de privilegios bloqueada. No puedes cambiar tu propio rol.';
  END IF;
  
  -- Si intenta asignarse créditos pre-pagados fraudulentamente
  IF (NEW.prepaid_ld_credits IS DISTINCT FROM OLD.prepaid_ld_credits) AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Operación financiera bloqueada.';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_profile_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, referral_code, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    'user',
    new.raw_user_meta_data->>'referral_code', -- Mapeo corregido para guardar el apodo
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();
  
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_username_available"("username_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE referral_code = username_to_check
  );
END;
$$;


ALTER FUNCTION "public"."is_username_available"("username_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_google_nickname"("new_nickname" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET referral_code = new_nickname
  WHERE id = auth.uid() AND (referral_code IS NULL OR referral_code = '');
END;
$$;


ALTER FUNCTION "public"."set_google_nickname"("new_nickname" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spend_ic"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validar Identidad del que ejecuta la función
    IF p_user_id != auth.uid() AND NOT is_admin_safe() THEN
        RAISE EXCEPTION 'Fraude bloqueado: No puedes gastar créditos de otro usuario.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Monto inválido.';
    END IF;

    -- Lock concurrencia
    SELECT balance INTO v_balance FROM public.impact_credits WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Créditos no encontrados.'; END IF;
    IF v_balance < p_amount THEN RAISE EXCEPTION 'Balance insuficiente.'; END IF;

    UPDATE public.impact_credits SET balance = v_balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at) VALUES (p_user_id, -p_amount, 'spend', COALESCE(p_metadata, '{}'::JSONB), NOW());

    RETURN jsonb_build_object('status', 'ok', 'balance', v_balance - p_amount, 'spent', p_amount);
END;
$$;


ALTER FUNCTION "public"."spend_ic"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spend_points_lifo"("p_user_id" "uuid", "p_amount" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_balance INT;
BEGIN
    -- Validar Identidad del que ejecuta
    IF p_user_id != auth.uid() AND NOT is_admin_safe() THEN
        RAISE EXCEPTION 'Fraude bloqueado: No puedes gastar puntos de otro usuario.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Monto inválido.';
    END IF;

    -- Calcular saldo real disponible en el Ledger
    SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
    FROM public.ic_ledger
    WHERE user_id = p_user_id;

    IF v_total_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo de puntos insuficiente. Solicitado: %, Disponible: %', p_amount, v_total_balance;
    END IF;

    -- Registrar el gasto como un asiento negativo (Senke) - NUNCA HACER UPDATE A FILAS ANTERIORES
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at, tax_origin)
    VALUES (p_user_id, -p_amount, 'lifo_digital_spend', '{"type": "cooldown_skip"}'::jsonb, NOW(), 'SELF_REBATE');

    -- Sincronizar la tabla caché impact_credits para mantener consistencia
    UPDATE public.impact_credits 
    SET balance = balance - p_amount, updated_at = NOW() 
    WHERE user_id = p_user_id;

    RETURN p_amount;
END;
$$;


ALTER FUNCTION "public"."spend_points_lifo"("p_user_id" "uuid", "p_amount" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_migration_04_function_backup" (
    "id" bigint NOT NULL,
    "function_schema" "text" NOT NULL,
    "function_name" "text" NOT NULL,
    "original_def" "text" NOT NULL,
    "restored_at" timestamp with time zone
);


ALTER TABLE "public"."_migration_04_function_backup" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."_migration_04_function_backup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."_migration_04_function_backup_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."_migration_04_function_backup_id_seq" OWNED BY "public"."_migration_04_function_backup"."id";



CREATE TABLE IF NOT EXISTS "public"."_migration_06_function_backup" (
    "schema_name" "text" NOT NULL,
    "function_name" "text" NOT NULL,
    "identity_args" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "backed_up_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_migration_06_function_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action_type" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text",
    "title" "text",
    "message" "text",
    "status" "text" DEFAULT 'unread'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_reporting" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric DEFAULT 0,
    "user_id" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "dimensions" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."analytics_reporting" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."anastomosis_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_a_id" "uuid" NOT NULL,
    "user_b_id" "uuid" NOT NULL,
    "last_handshake_at" timestamp with time zone,
    "handshake_count_total" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'PENDING_CONFIRMATION'::"text" NOT NULL,
    "scan_initiated_at" timestamp with time zone,
    "initiated_by_user_id" "uuid",
    CONSTRAINT "anastomosis_log_status_check" CHECK (("status" = ANY (ARRAY['PENDING_CONFIRMATION'::"text", 'COMPLETED'::"text"])))
);


ALTER TABLE "public"."anastomosis_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beneficios_startnext" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level_name" "text" NOT NULL,
    "min_amount" numeric NOT NULL,
    "max_amount" numeric,
    "land_dollars" numeric DEFAULT 0 NOT NULL,
    "impact_credits" numeric DEFAULT 0 NOT NULL,
    "description" "text",
    "benefits_list" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."beneficios_startnext" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns_and_events" (
    "campaign_slug" character varying NOT NULL,
    "custom_headline" character varying,
    "custom_subline" "text",
    "custom_hero_image_url" character varying,
    "show_manual_sponsor_input" boolean DEFAULT false NOT NULL,
    "default_sponsor_user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "campaigns_and_events_campaign_slug_check" CHECK ((("campaign_slug")::"text" = "lower"(("campaign_slug")::"text")))
);


ALTER TABLE "public"."campaigns_and_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "comment_id" "uuid",
    "user_id" "uuid",
    "vote_value" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_votes_vote_value_check" CHECK (("vote_value" = ANY (ARRAY[1, '-1'::integer])))
);


ALTER TABLE "public"."comment_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "contribution_amount" numeric NOT NULL,
    "contribution_date" timestamp with time zone DEFAULT "now"(),
    "benefit_level" "text",
    "benefit_assigned" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "imported_user_id" "uuid",
    "land_dollar_image_url" "text",
    "startnext_benefits" "text"[],
    "tier_id" "uuid",
    "phone" "text",
    "country" "text",
    "city" "text",
    "new_support_level_id" "uuid"
);


ALTER TABLE "public"."contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dynamic_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "action_type" "text" DEFAULT 'internal_page'::"text" NOT NULL,
    "target_url" "text",
    "page_content" "jsonb",
    "is_active" boolean DEFAULT true,
    "visits" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dynamic_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_product_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exchange_product_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "name" "text",
    "description" "text",
    "impact_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exchange_product_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric NOT NULL,
    "category" "text",
    "image_alt" "text",
    "image_description" "text",
    "impact_description" "text",
    "stock" integer DEFAULT '-1'::integer,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "unlocks_quest_id" "uuid"
);


ALTER TABLE "public"."exchange_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."founding_pioneer_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "genesis_quest_completed" boolean DEFAULT false,
    "genesis_quest_completion_date" timestamp with time zone,
    "quests_participated" integer DEFAULT 0,
    "mission_quests_participated" integer DEFAULT 0,
    "profile_updated" boolean DEFAULT false,
    "profile_update_date" timestamp with time zone,
    "contribution_history" "jsonb" DEFAULT '[]'::"jsonb",
    "contribution_improvement_score" numeric DEFAULT 0,
    "total_impact_credits_earned" numeric DEFAULT 0,
    "referrals_count" integer DEFAULT 0,
    "founding_pioneer_access_status" "text" DEFAULT 'pending'::"text",
    "founding_pioneer_access_date" timestamp with time zone,
    "founding_pioneer_revoke_date" timestamp with time zone,
    "admin_notes" "text",
    "evaluation_score" numeric DEFAULT 0,
    "last_activity_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rank" integer,
    "contribution_count" integer DEFAULT 0,
    "monthly_activity_score" numeric DEFAULT 0,
    "reputation_score" numeric DEFAULT 0
);


ALTER TABLE "public"."founding_pioneer_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ic_ledger" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "source" "text" DEFAULT 'contribution'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tax_origin" "text" DEFAULT 'SELF_REBATE'::"text" NOT NULL,
    "verbindlichkeiten_id" "uuid",
    CONSTRAINT "ic_ledger_tax_origin_check" CHECK (("tax_origin" = ANY (ARRAY['SELF_REBATE'::"text", 'NETWORK_BOUNTY'::"text"])))
);


ALTER TABLE "public"."ic_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."land_dollar_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "issued_date" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "related_support_level_id" "uuid",
    "is_active" boolean DEFAULT true,
    "short_code" "text" NOT NULL,
    "assigned_sponsor_id" "uuid",
    "first_claimed_by_user_id" "uuid"
);


ALTER TABLE "public"."land_dollar_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "genesis_profile" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "bio" "text",
    "phone" "text",
    "city" "text",
    "country" "text",
    "referral_code" "text",
    "referrer_id" "uuid",
    "profile_percentages" "jsonb" DEFAULT '{"lena": 0, "david": 0, "markus": 0}'::"jsonb",
    "membership_stage" "text" DEFAULT 'SEEDLING_PROSPECT'::"text" NOT NULL,
    "prepaid_ld_credits" integer DEFAULT 0 NOT NULL,
    "personal_ld_points_cap" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "profiles_membership_stage_check" CHECK (("membership_stage" = ANY (ARRAY['SEEDLING_PROSPECT'::"text", 'VERIFIED_MEMBER_15GENG'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'startnext_user'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reforestal_credits_ledger" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "credits_amount" numeric,
    "source_event" character varying,
    "source_event_id" "text",
    "earning_timestamp" timestamp with time zone DEFAULT "now"(),
    "vesting_status" "public"."vesting_status_type",
    "vested_credits_cache" numeric,
    "last_update_timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reforestal_credits_ledger" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."financial_context_view" AS
 WITH "ledger_stats" AS (
         SELECT "ic_ledger"."user_id",
            COALESCE("sum"("ic_ledger"."amount") FILTER (WHERE (("ic_ledger"."amount" > 0) AND ("ic_ledger"."created_at" > ("now"() - '90 days'::interval)))), (0)::bigint) AS "gross_immature",
            COALESCE("sum"("ic_ledger"."amount") FILTER (WHERE (("ic_ledger"."amount" > 0) AND ("ic_ledger"."created_at" <= ("now"() - '90 days'::interval)))), (0)::bigint) AS "gross_mature",
            (COALESCE("sum"("ic_ledger"."amount") FILTER (WHERE ("ic_ledger"."amount" < 0)), (0)::bigint) * '-1'::integer) AS "total_spent",
            COALESCE("sum"("ic_ledger"."amount"), (0)::bigint) AS "net_total"
           FROM "public"."ic_ledger"
          GROUP BY "ic_ledger"."user_id"
        )
 SELECT "u"."id" AS "user_id",
    "u"."role" AS "saas_role",
    COALESCE("ls"."net_total", (0)::bigint) AS "total_ic_ledger_balance",
    GREATEST((0)::bigint, (COALESCE("ls"."gross_immature", (0)::bigint) - COALESCE("ls"."total_spent", (0)::bigint))) AS "green_basket_points",
    GREATEST((0)::bigint, (COALESCE("ls"."net_total", (0)::bigint) - GREATEST((0)::bigint, (COALESCE("ls"."gross_immature", (0)::bigint) - COALESCE("ls"."total_spent", (0)::bigint))))) AS "gold_basket_points",
    COALESCE(( SELECT "sum"("reforestal_credits_ledger"."credits_amount") AS "sum"
           FROM "public"."reforestal_credits_ledger"
          WHERE (("reforestal_credits_ledger"."user_id" = "u"."id") AND ("reforestal_credits_ledger"."credits_amount" > (0)::numeric))), (0)::numeric) AS "total_reforestal_credits",
    COALESCE(( SELECT "founding_pioneer_metrics"."total_impact_credits_earned"
           FROM "public"."founding_pioneer_metrics"
          WHERE ("founding_pioneer_metrics"."user_id" = "u"."id")), (0)::numeric) AS "lifetime_score",
    COALESCE(( SELECT "land_dollar_tokens"."amount"
           FROM "public"."land_dollar_tokens"
          WHERE ("land_dollar_tokens"."user_id" = "u"."id")), (0)::numeric) AS "land_dollars",
    COALESCE(( SELECT "contributions"."contribution_amount"
           FROM "public"."contributions"
          WHERE ("contributions"."user_id" = "u"."id")
          ORDER BY "contributions"."contribution_date" DESC
         LIMIT 1), (0)::numeric) AS "last_contribution_amount"
   FROM ("public"."profiles" "u"
     LEFT JOIN "ledger_stats" "ls" ON (("ls"."user_id" = "u"."id")));


ALTER VIEW "public"."financial_context_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gamification_action_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gamification_action_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "action_title" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "success_message" "text"
);


ALTER TABLE "public"."gamification_action_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gamification_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_name" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "impact_credits_value" numeric DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "action_title" "text",
    "system_binding" "text",
    "trigger_event" "text",
    "target_role" "text" DEFAULT 'all'::"text",
    "is_visible" boolean DEFAULT true,
    "referee_credits_value" integer DEFAULT 0
);


ALTER TABLE "public"."gamification_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gamification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action_id" "uuid",
    "action_name" "text",
    "action_type" "text",
    "impact_credits_awarded" numeric,
    "action_date" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gamification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genesis_mission_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "genesis_mission_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "title" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "success_message" "text",
    "subtitle" "text",
    "extra_info" "text",
    "response_options" "jsonb" DEFAULT '[]'::"jsonb",
    "steps_translation" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."genesis_mission_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genesis_missions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "response_type" "text" DEFAULT 'single-choice'::"text",
    "impact_credit_reward" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "response_options" "jsonb" DEFAULT '[]'::"jsonb",
    "correct_answers" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "target_role" "text" DEFAULT 'all'::"text",
    "image_url" "text",
    "subtitle" "text",
    "extra_info" "text",
    "steps" "jsonb" DEFAULT '[]'::"jsonb",
    "skill_category" "text" DEFAULT 'general'::"text",
    "reputation_reward" numeric DEFAULT 0,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "allow_skip" boolean DEFAULT false,
    "skip_penalty" numeric DEFAULT 0,
    "version" integer DEFAULT 1,
    "auto_approve" boolean DEFAULT false,
    "referrer_reward" integer DEFAULT 0,
    "global_penalty_percentage" numeric DEFAULT 0,
    "category" "text" DEFAULT 'A'::"text" NOT NULL,
    "level" smallint DEFAULT 0 NOT NULL,
    "grade_unlock" smallint DEFAULT 1 NOT NULL,
    "points_cost" integer DEFAULT 100 NOT NULL,
    CONSTRAINT "genesis_missions_category_check" CHECK (("category" = ANY (ARRAY['A'::"text", 'C'::"text", 'D'::"text"]))),
    CONSTRAINT "genesis_missions_grade_unlock_check" CHECK (("grade_unlock" = ANY (ARRAY[1, 2, 3, 4]))),
    CONSTRAINT "genesis_missions_level_check" CHECK (("level" = ANY (ARRAY[0, 1, 2, 3])))
);


ALTER TABLE "public"."genesis_missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genesis_profiles" (
    "user_id" "uuid" NOT NULL,
    "profile_type" "text" NOT NULL,
    "profile_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."genesis_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genesis_quest_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid",
    "question_id" integer NOT NULL,
    "selected_option" character(1) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."genesis_quest_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genesis_quest_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "profile_result" "public"."investor_profile",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "version" "text" DEFAULT 'v1'::"text"
);


ALTER TABLE "public"."genesis_quest_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ic_ledger_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ic_ledger_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ic_ledger_id_seq" OWNED BY "public"."ic_ledger"."id";



CREATE TABLE IF NOT EXISTS "public"."impact_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric,
    "source" "text",
    "description" "text",
    "issued_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "related_support_level_id" "uuid",
    "contribution_id" "uuid",
    "balance" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."impact_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."impact_credits_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "impact_credits_balance" numeric DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "admin_approved_credits" numeric,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."impact_credits_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."imported_backers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "address" "text",
    "city" "text",
    "country" "text",
    "delivery_address" "text",
    "snx_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_registered" boolean DEFAULT false
);


ALTER TABLE "public"."imported_backers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."languages" (
    "code" character varying NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_verifications" (
    "user_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "street" "text",
    "zip" "text",
    "city" "text",
    "birth_date" "date",
    "declaration_accepted_at" timestamp with time zone,
    "identity_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."member_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mlm_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sender_ic_reward" numeric DEFAULT 0,
    "receiver_ic_reward" numeric DEFAULT 0,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mlm_actions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."mlm_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mlm_referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referred_id" "uuid",
    "action_id" "uuid",
    "ic_assigned_sender" numeric DEFAULT 0,
    "ic_assigned_receiver" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mlm_referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "category" "text" DEFAULT 'Milestone'::"text",
    "publish_date" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."news_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "news_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "title" "text",
    "description" "text"
);


ALTER TABLE "public"."news_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."node_brightness" (
    "node_id" "text" NOT NULL,
    "luminosity" numeric DEFAULT 1.0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."node_brightness" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notification_type" "text" DEFAULT 'system'::"text",
    "related_action_id" "uuid",
    "related_user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pending_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "city" "text",
    "country" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pending_registrations_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "pending_registrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."pending_registrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposal_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "upvotes" integer DEFAULT 0,
    "downvotes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."proposal_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposal_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "title" "text",
    "description" "text",
    "options" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."proposal_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "created_by" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "options" "jsonb" DEFAULT '["Option A", "Option B"]'::"jsonb",
    "vote_type" "text" DEFAULT 'classic'::"text",
    "vote_config" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quest_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "quest_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quest_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "description" "text",
    "credits_reward" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "referred_user_id" "uuid",
    "tier" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reforestal_credits_ledger_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reforestal_credits_ledger_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reforestal_credits_ledger_id_seq" OWNED BY "public"."reforestal_credits_ledger"."id";



CREATE TABLE IF NOT EXISTS "public"."reforestal_user_balances" (
    "user_id" "uuid" NOT NULL,
    "total_vested_balance" numeric DEFAULT 0,
    "total_unvested_balance" numeric DEFAULT 0
);


ALTER TABLE "public"."reforestal_user_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roadmap_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "date_display" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "completion_percentage" integer DEFAULT 0,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roadmap_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roadmap_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roadmap_id" "uuid" NOT NULL,
    "language_code" character varying NOT NULL,
    "title" "text",
    "description" "text",
    "date_display" "text"
);


ALTER TABLE "public"."roadmap_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sponsor_pool_queue" (
    "batch_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sponsor_user_id" "uuid" NOT NULL,
    "shares_total" integer DEFAULT 1 NOT NULL,
    "shares_remaining" integer DEFAULT 1 NOT NULL,
    "source_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    CONSTRAINT "sponsor_pool_queue_source_type_check" CHECK ((("source_type" IS NULL) OR ("source_type" = ANY (ARRAY['EUR_DONATION'::"text", 'LIFO_POINTS'::"text"]))))
);


ALTER TABLE "public"."sponsor_pool_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "plan_type" "public"."subscription_plan_type",
    "status" "public"."subscription_status_type",
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_benefit_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "support_benefit_id" "uuid",
    "language_code" character varying,
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_benefit_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "support_level_id" "uuid",
    "icon_name" "text",
    "benefit_type" "text" DEFAULT 'digital'::"text",
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_level_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "support_level_id" "uuid",
    "language_code" character varying,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_level_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "min_amount" numeric DEFAULT 0 NOT NULL,
    "max_amount" numeric,
    "land_dollars_reward" numeric DEFAULT 0,
    "impact_credits_reward" numeric DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "premium_months_main" integer DEFAULT 0,
    "premium_months_friend" integer DEFAULT 0,
    "premium_months_expert" integer DEFAULT 0,
    "max_friends_allowed" integer DEFAULT 0,
    "max_experts_allowed" integer DEFAULT 0
);


ALTER TABLE "public"."support_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tier_benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tier_level" integer NOT NULL,
    "amount_eur" numeric NOT NULL,
    "digital_benefits" "text"[] DEFAULT '{}'::"text"[],
    "physical_benefits" "text"[] DEFAULT '{}'::"text"[],
    "ic_amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tier_benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_benefits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "benefit_level_id" "uuid",
    "contribution_id" "uuid",
    "assigned_date" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "new_support_level_id" "uuid",
    "expires_at" timestamp with time zone,
    "granted_by" "uuid",
    "access_type" "text" DEFAULT 'main'::"text",
    CONSTRAINT "user_benefits_access_type_check" CHECK (("access_type" = ANY (ARRAY['main'::"text", 'friend'::"text", 'expert'::"text"])))
);


ALTER TABLE "public"."user_benefits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "profile" "text",
    "assigned_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_profile_check" CHECK (("profile" = ANY (ARRAY['Lena'::"text", 'Markus'::"text", 'David'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "credits_spent" numeric NOT NULL,
    "quantity" integer NOT NULL,
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'Completed'::"text"
);


ALTER TABLE "public"."user_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quest_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mission_id" "uuid" NOT NULL,
    "response_data" "jsonb" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "credits_awarded" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "review_status" "text" DEFAULT 'auto_approved'::"text",
    "admin_feedback" "text",
    "earned_reputation" numeric DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_quest_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_support_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "support_level_id" "uuid",
    "contribution_id" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_support_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_xp" (
    "user_id" "uuid" NOT NULL,
    "pillar" "text" NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_xp_pillar_check" CHECK (("pillar" = ANY (ARRAY['environment'::"text", 'data'::"text", 'community'::"text"]))),
    CONSTRAINT "user_xp_xp_check" CHECK (("xp" >= 0))
);


ALTER TABLE "public"."user_xp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verification_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_no" "text" NOT NULL,
    "approved_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."verification_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid",
    "user_id" "uuid",
    "vote" "text" NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "vote_data" "jsonb"
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xp_level_thresholds" (
    "level" integer NOT NULL,
    "xp_required" integer NOT NULL,
    "level_up_bonus_points" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "xp_level_thresholds_level_check" CHECK ((("level" >= 1) AND ("level" <= 10)))
);


ALTER TABLE "public"."xp_level_thresholds" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_migration_04_function_backup" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."_migration_04_function_backup_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ic_ledger" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ic_ledger_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reforestal_credits_ledger" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reforestal_credits_ledger_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."_migration_04_function_backup"
    ADD CONSTRAINT "_migration_04_function_backup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_migration_06_function_backup"
    ADD CONSTRAINT "_migration_06_function_backup_pkey" PRIMARY KEY ("schema_name", "function_name", "identity_args");



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_reporting"
    ADD CONSTRAINT "analytics_reporting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."anastomosis_log"
    ADD CONSTRAINT "anastomosis_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beneficios_startnext"
    ADD CONSTRAINT "beneficios_startnext_level_name_key" UNIQUE ("level_name");



ALTER TABLE ONLY "public"."beneficios_startnext"
    ADD CONSTRAINT "beneficios_startnext_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns_and_events"
    ADD CONSTRAINT "campaigns_and_events_pkey" PRIMARY KEY ("campaign_slug");



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dynamic_links"
    ADD CONSTRAINT "dynamic_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dynamic_links"
    ADD CONSTRAINT "dynamic_links_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."exchange_product_translations"
    ADD CONSTRAINT "exchange_product_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_products"
    ADD CONSTRAINT "exchange_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_pioneer_metrics"
    ADD CONSTRAINT "founding_pioneer_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_pioneer_metrics"
    ADD CONSTRAINT "founding_pioneer_metrics_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."gamification_action_translations"
    ADD CONSTRAINT "gamification_action_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_actions"
    ADD CONSTRAINT "gamification_actions_action_name_key" UNIQUE ("action_name");



ALTER TABLE ONLY "public"."gamification_actions"
    ADD CONSTRAINT "gamification_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_history"
    ADD CONSTRAINT "gamification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genesis_mission_translations"
    ADD CONSTRAINT "genesis_mission_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genesis_missions"
    ADD CONSTRAINT "genesis_missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genesis_profiles"
    ADD CONSTRAINT "genesis_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."genesis_quest_answers"
    ADD CONSTRAINT "genesis_quest_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genesis_quest_attempts"
    ADD CONSTRAINT "genesis_quest_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genesis_quest_attempts"
    ADD CONSTRAINT "genesis_quest_attempts_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."ic_ledger"
    ADD CONSTRAINT "ic_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "impact_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_credits_requests"
    ADD CONSTRAINT "impact_credits_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "impact_credits_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."imported_backers"
    ADD CONSTRAINT "imported_backers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."imported_backers"
    ADD CONSTRAINT "imported_backers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."imported_backers"
    ADD CONSTRAINT "imported_backers_snx_id_key" UNIQUE ("snx_id");



ALTER TABLE ONLY "public"."land_dollar_tokens"
    ADD CONSTRAINT "land_dollar_tokens_pkey" PRIMARY KEY ("short_code");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."member_verifications"
    ADD CONSTRAINT "member_verifications_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."mlm_actions"
    ADD CONSTRAINT "mlm_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mlm_referrals"
    ADD CONSTRAINT "mlm_referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_items"
    ADD CONSTRAINT "news_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_translations"
    ADD CONSTRAINT "news_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."node_brightness"
    ADD CONSTRAINT "node_brightness_pkey" PRIMARY KEY ("node_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_registrations"
    ADD CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."proposal_comments"
    ADD CONSTRAINT "proposal_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposal_translations"
    ADD CONSTRAINT "proposal_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quest_completions"
    ADD CONSTRAINT "quest_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_key" UNIQUE ("referred_user_id");



ALTER TABLE ONLY "public"."reforestal_credits_ledger"
    ADD CONSTRAINT "reforestal_credits_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reforestal_user_balances"
    ADD CONSTRAINT "reforestal_user_balances_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."roadmap_items"
    ADD CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roadmap_translations"
    ADD CONSTRAINT "roadmap_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sponsor_pool_queue"
    ADD CONSTRAINT "sponsor_pool_queue_pkey" PRIMARY KEY ("batch_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_benefit_translations"
    ADD CONSTRAINT "support_benefit_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_benefits"
    ADD CONSTRAINT "support_benefits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_level_translations"
    ADD CONSTRAINT "support_level_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_levels"
    ADD CONSTRAINT "support_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_levels"
    ADD CONSTRAINT "support_levels_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tier_benefits"
    ADD CONSTRAINT "tier_benefits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tier_benefits"
    ADD CONSTRAINT "tier_benefits_tier_level_key" UNIQUE ("tier_level");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_purchases"
    ADD CONSTRAINT "user_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_quest_responses"
    ADD CONSTRAINT "user_quest_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_support_levels"
    ADD CONSTRAINT "user_support_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_xp"
    ADD CONSTRAINT "user_xp_pkey" PRIMARY KEY ("user_id", "pillar");



ALTER TABLE ONLY "public"."users_roles"
    ADD CONSTRAINT "users_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_batches"
    ADD CONSTRAINT "verification_batches_batch_no_key" UNIQUE ("batch_no");



ALTER TABLE ONLY "public"."verification_batches"
    ADD CONSTRAINT "verification_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xp_level_thresholds"
    ADD CONSTRAINT "xp_level_thresholds_pkey" PRIMARY KEY ("level");



CREATE OR REPLACE TRIGGER "trg_prevent_profile_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."check_profile_escalation"();



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."analytics_reporting"
    ADD CONSTRAINT "analytics_reporting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."anastomosis_log"
    ADD CONSTRAINT "anastomosis_log_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."anastomosis_log"
    ADD CONSTRAINT "anastomosis_log_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."anastomosis_log"
    ADD CONSTRAINT "anastomosis_log_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."campaigns_and_events"
    ADD CONSTRAINT "campaigns_and_events_default_sponsor_user_id_fkey" FOREIGN KEY ("default_sponsor_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."proposal_comments"("id");



ALTER TABLE ONLY "public"."comment_votes"
    ADD CONSTRAINT "comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exchange_products"
    ADD CONSTRAINT "exchange_products_unlocks_quest_id_fkey" FOREIGN KEY ("unlocks_quest_id") REFERENCES "public"."gamification_actions"("id");



ALTER TABLE ONLY "public"."gamification_action_translations"
    ADD CONSTRAINT "fk_action" FOREIGN KEY ("gamification_action_id") REFERENCES "public"."gamification_actions"("id");



ALTER TABLE ONLY "public"."gamification_history"
    ADD CONSTRAINT "fk_gamification_history_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "fk_impact_credits_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "fk_notifications_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exchange_product_translations"
    ADD CONSTRAINT "fk_product" FOREIGN KEY ("exchange_product_id") REFERENCES "public"."exchange_products"("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "fk_startnext_contributions_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "fk_votes_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."founding_pioneer_metrics"
    ADD CONSTRAINT "founding_pioneer_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."gamification_history"
    ADD CONSTRAINT "gamification_history_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."gamification_actions"("id");



ALTER TABLE ONLY "public"."genesis_mission_translations"
    ADD CONSTRAINT "genesis_mission_translations_genesis_mission_id_fkey" FOREIGN KEY ("genesis_mission_id") REFERENCES "public"."genesis_missions"("id");



ALTER TABLE ONLY "public"."genesis_missions"
    ADD CONSTRAINT "genesis_missions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."genesis_profiles"
    ADD CONSTRAINT "genesis_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."genesis_quest_answers"
    ADD CONSTRAINT "genesis_quest_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."genesis_quest_attempts"("id");



ALTER TABLE ONLY "public"."genesis_quest_attempts"
    ADD CONSTRAINT "genesis_quest_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ic_ledger"
    ADD CONSTRAINT "ic_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ic_ledger"
    ADD CONSTRAINT "ic_ledger_verbindlichkeiten_id_fkey" FOREIGN KEY ("verbindlichkeiten_id") REFERENCES "public"."verification_batches"("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "impact_credits_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "impact_credits_related_support_level_id_fkey" FOREIGN KEY ("related_support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."impact_credits_requests"
    ADD CONSTRAINT "impact_credits_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."impact_credits"
    ADD CONSTRAINT "impact_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."land_dollar_tokens"
    ADD CONSTRAINT "land_dollars_assigned_sponsor_id_fkey" FOREIGN KEY ("assigned_sponsor_id") REFERENCES "public"."sponsor_pool_queue"("batch_id");



ALTER TABLE ONLY "public"."land_dollar_tokens"
    ADD CONSTRAINT "land_dollars_first_claimed_by_user_id_fkey" FOREIGN KEY ("first_claimed_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."land_dollar_tokens"
    ADD CONSTRAINT "land_dollars_related_support_level_id_fkey" FOREIGN KEY ("related_support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."land_dollar_tokens"
    ADD CONSTRAINT "land_dollars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."member_verifications"
    ADD CONSTRAINT "member_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mlm_referrals"
    ADD CONSTRAINT "mlm_referrals_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."mlm_actions"("id");



ALTER TABLE ONLY "public"."mlm_referrals"
    ADD CONSTRAINT "mlm_referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mlm_referrals"
    ADD CONSTRAINT "mlm_referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."news_translations"
    ADD CONSTRAINT "news_translations_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_action_id_fkey" FOREIGN KEY ("related_action_id") REFERENCES "public"."gamification_actions"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pending_registrations"
    ADD CONSTRAINT "pending_startnext_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."proposal_comments"
    ADD CONSTRAINT "proposal_comments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id");



ALTER TABLE ONLY "public"."proposal_comments"
    ADD CONSTRAINT "proposal_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."proposal_translations"
    ADD CONSTRAINT "proposal_translations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id");



ALTER TABLE ONLY "public"."quest_completions"
    ADD CONSTRAINT "quest_completions_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id");



ALTER TABLE ONLY "public"."quest_completions"
    ADD CONSTRAINT "quest_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reforestal_credits_ledger"
    ADD CONSTRAINT "reforestal_credits_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reforestal_user_balances"
    ADD CONSTRAINT "reforestal_user_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."roadmap_translations"
    ADD CONSTRAINT "roadmap_translations_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmap_items"("id");



ALTER TABLE ONLY "public"."sponsor_pool_queue"
    ADD CONSTRAINT "sponsor_pool_queue_sponsor_user_id_fkey" FOREIGN KEY ("sponsor_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "startnext_contributions_imported_user_id_fkey" FOREIGN KEY ("imported_user_id") REFERENCES "public"."imported_backers"("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "startnext_contributions_new_support_level_id_fkey" FOREIGN KEY ("new_support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "startnext_contributions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tier_benefits"("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "startnext_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_benefit_translations"
    ADD CONSTRAINT "support_benefit_translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code");



ALTER TABLE ONLY "public"."support_benefit_translations"
    ADD CONSTRAINT "support_benefit_translations_support_benefit_id_fkey" FOREIGN KEY ("support_benefit_id") REFERENCES "public"."support_benefits"("id");



ALTER TABLE ONLY "public"."support_benefits"
    ADD CONSTRAINT "support_benefits_support_level_id_fkey" FOREIGN KEY ("support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."support_level_translations"
    ADD CONSTRAINT "support_level_translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code");



ALTER TABLE ONLY "public"."support_level_translations"
    ADD CONSTRAINT "support_level_translations_support_level_id_fkey" FOREIGN KEY ("support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_benefit_level_id_fkey" FOREIGN KEY ("benefit_level_id") REFERENCES "public"."beneficios_startnext"("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_new_support_level_id_fkey" FOREIGN KEY ("new_support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."user_benefits"
    ADD CONSTRAINT "user_benefits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_purchases"
    ADD CONSTRAINT "user_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."exchange_products"("id");



ALTER TABLE ONLY "public"."user_purchases"
    ADD CONSTRAINT "user_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_quest_responses"
    ADD CONSTRAINT "user_quest_responses_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."genesis_missions"("id");



ALTER TABLE ONLY "public"."user_quest_responses"
    ADD CONSTRAINT "user_quest_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_support_levels"
    ADD CONSTRAINT "user_support_levels_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id");



ALTER TABLE ONLY "public"."user_support_levels"
    ADD CONSTRAINT "user_support_levels_support_level_id_fkey" FOREIGN KEY ("support_level_id") REFERENCES "public"."support_levels"("id");



ALTER TABLE ONLY "public"."user_support_levels"
    ADD CONSTRAINT "user_support_levels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_xp"
    ADD CONSTRAINT "user_xp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."users_roles"
    ADD CONSTRAINT "users_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."users_roles"
    ADD CONSTRAINT "users_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id");



ALTER TABLE "public"."_migration_04_function_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_migration_06_function_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_reporting" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."anastomosis_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beneficios_startnext" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns_and_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dynamic_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_product_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_pioneer_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gamification_action_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gamification_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gamification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genesis_mission_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genesis_missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genesis_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genesis_quest_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genesis_quest_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ic_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impact_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."impact_credits_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."imported_backers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."land_dollar_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."languages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mlm_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mlm_referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."node_brightness" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposal_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposal_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quest_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reforestal_credits_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reforestal_user_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roadmap_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roadmap_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sponsor_pool_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_benefit_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_benefits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_level_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_benefits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_benefits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_quest_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_support_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_xp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verification_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."xp_level_thresholds" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."check_profile_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_profile_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_profile_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_username_available"("username_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_username_available"("username_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_username_available"("username_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_google_nickname"("new_nickname" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_google_nickname"("new_nickname" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_google_nickname"("new_nickname" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."spend_ic"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."spend_ic"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."spend_ic"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."spend_points_lifo"("p_user_id" "uuid", "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."spend_points_lifo"("p_user_id" "uuid", "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."spend_points_lifo"("p_user_id" "uuid", "p_amount" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."_migration_04_function_backup" TO "anon";
GRANT ALL ON TABLE "public"."_migration_04_function_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."_migration_04_function_backup" TO "service_role";



GRANT ALL ON SEQUENCE "public"."_migration_04_function_backup_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."_migration_04_function_backup_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."_migration_04_function_backup_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."_migration_06_function_backup" TO "anon";
GRANT ALL ON TABLE "public"."_migration_06_function_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."_migration_06_function_backup" TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_reporting" TO "anon";
GRANT ALL ON TABLE "public"."analytics_reporting" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_reporting" TO "service_role";



GRANT ALL ON TABLE "public"."anastomosis_log" TO "anon";
GRANT ALL ON TABLE "public"."anastomosis_log" TO "authenticated";
GRANT ALL ON TABLE "public"."anastomosis_log" TO "service_role";



GRANT ALL ON TABLE "public"."beneficios_startnext" TO "anon";
GRANT ALL ON TABLE "public"."beneficios_startnext" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficios_startnext" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns_and_events" TO "anon";
GRANT ALL ON TABLE "public"."campaigns_and_events" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns_and_events" TO "service_role";



GRANT ALL ON TABLE "public"."comment_votes" TO "anon";
GRANT ALL ON TABLE "public"."comment_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_votes" TO "service_role";



GRANT ALL ON TABLE "public"."contributions" TO "anon";
GRANT ALL ON TABLE "public"."contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."contributions" TO "service_role";



GRANT ALL ON TABLE "public"."dynamic_links" TO "anon";
GRANT ALL ON TABLE "public"."dynamic_links" TO "authenticated";
GRANT ALL ON TABLE "public"."dynamic_links" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_product_translations" TO "anon";
GRANT ALL ON TABLE "public"."exchange_product_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_product_translations" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_products" TO "anon";
GRANT ALL ON TABLE "public"."exchange_products" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_products" TO "service_role";



GRANT ALL ON TABLE "public"."founding_pioneer_metrics" TO "anon";
GRANT ALL ON TABLE "public"."founding_pioneer_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_pioneer_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."ic_ledger" TO "anon";
GRANT ALL ON TABLE "public"."ic_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."ic_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."land_dollar_tokens" TO "anon";
GRANT ALL ON TABLE "public"."land_dollar_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."land_dollar_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reforestal_credits_ledger" TO "anon";
GRANT ALL ON TABLE "public"."reforestal_credits_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."reforestal_credits_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."financial_context_view" TO "anon";
GRANT ALL ON TABLE "public"."financial_context_view" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_context_view" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_action_translations" TO "anon";
GRANT ALL ON TABLE "public"."gamification_action_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_action_translations" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_actions" TO "anon";
GRANT ALL ON TABLE "public"."gamification_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_actions" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_history" TO "anon";
GRANT ALL ON TABLE "public"."gamification_history" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_history" TO "service_role";



GRANT ALL ON TABLE "public"."genesis_mission_translations" TO "anon";
GRANT ALL ON TABLE "public"."genesis_mission_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."genesis_mission_translations" TO "service_role";



GRANT ALL ON TABLE "public"."genesis_missions" TO "anon";
GRANT ALL ON TABLE "public"."genesis_missions" TO "authenticated";
GRANT ALL ON TABLE "public"."genesis_missions" TO "service_role";



GRANT ALL ON TABLE "public"."genesis_profiles" TO "anon";
GRANT ALL ON TABLE "public"."genesis_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."genesis_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."genesis_quest_answers" TO "anon";
GRANT ALL ON TABLE "public"."genesis_quest_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."genesis_quest_answers" TO "service_role";



GRANT ALL ON TABLE "public"."genesis_quest_attempts" TO "anon";
GRANT ALL ON TABLE "public"."genesis_quest_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."genesis_quest_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ic_ledger_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ic_ledger_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ic_ledger_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."impact_credits" TO "anon";
GRANT ALL ON TABLE "public"."impact_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."impact_credits" TO "service_role";



GRANT ALL ON TABLE "public"."impact_credits_requests" TO "anon";
GRANT ALL ON TABLE "public"."impact_credits_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."impact_credits_requests" TO "service_role";



GRANT ALL ON TABLE "public"."imported_backers" TO "anon";
GRANT ALL ON TABLE "public"."imported_backers" TO "authenticated";
GRANT ALL ON TABLE "public"."imported_backers" TO "service_role";



GRANT ALL ON TABLE "public"."languages" TO "anon";
GRANT ALL ON TABLE "public"."languages" TO "authenticated";
GRANT ALL ON TABLE "public"."languages" TO "service_role";



GRANT ALL ON TABLE "public"."member_verifications" TO "anon";
GRANT ALL ON TABLE "public"."member_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."member_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."mlm_actions" TO "anon";
GRANT ALL ON TABLE "public"."mlm_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."mlm_actions" TO "service_role";



GRANT ALL ON TABLE "public"."mlm_referrals" TO "anon";
GRANT ALL ON TABLE "public"."mlm_referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."mlm_referrals" TO "service_role";



GRANT ALL ON TABLE "public"."news_items" TO "anon";
GRANT ALL ON TABLE "public"."news_items" TO "authenticated";
GRANT ALL ON TABLE "public"."news_items" TO "service_role";



GRANT ALL ON TABLE "public"."news_translations" TO "anon";
GRANT ALL ON TABLE "public"."news_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."news_translations" TO "service_role";



GRANT ALL ON TABLE "public"."node_brightness" TO "anon";
GRANT ALL ON TABLE "public"."node_brightness" TO "authenticated";
GRANT ALL ON TABLE "public"."node_brightness" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."pending_registrations" TO "anon";
GRANT ALL ON TABLE "public"."pending_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."proposal_comments" TO "anon";
GRANT ALL ON TABLE "public"."proposal_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_comments" TO "service_role";



GRANT ALL ON TABLE "public"."proposal_translations" TO "anon";
GRANT ALL ON TABLE "public"."proposal_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_translations" TO "service_role";



GRANT ALL ON TABLE "public"."proposals" TO "anon";
GRANT ALL ON TABLE "public"."proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals" TO "service_role";



GRANT ALL ON TABLE "public"."quest_completions" TO "anon";
GRANT ALL ON TABLE "public"."quest_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."quest_completions" TO "service_role";



GRANT ALL ON TABLE "public"."quests" TO "anon";
GRANT ALL ON TABLE "public"."quests" TO "authenticated";
GRANT ALL ON TABLE "public"."quests" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reforestal_credits_ledger_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reforestal_credits_ledger_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reforestal_credits_ledger_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reforestal_user_balances" TO "anon";
GRANT ALL ON TABLE "public"."reforestal_user_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."reforestal_user_balances" TO "service_role";



GRANT ALL ON TABLE "public"."roadmap_items" TO "anon";
GRANT ALL ON TABLE "public"."roadmap_items" TO "authenticated";
GRANT ALL ON TABLE "public"."roadmap_items" TO "service_role";



GRANT ALL ON TABLE "public"."roadmap_translations" TO "anon";
GRANT ALL ON TABLE "public"."roadmap_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."roadmap_translations" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sponsor_pool_queue" TO "anon";
GRANT ALL ON TABLE "public"."sponsor_pool_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."sponsor_pool_queue" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."support_benefit_translations" TO "anon";
GRANT ALL ON TABLE "public"."support_benefit_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."support_benefit_translations" TO "service_role";



GRANT ALL ON TABLE "public"."support_benefits" TO "anon";
GRANT ALL ON TABLE "public"."support_benefits" TO "authenticated";
GRANT ALL ON TABLE "public"."support_benefits" TO "service_role";



GRANT ALL ON TABLE "public"."support_level_translations" TO "anon";
GRANT ALL ON TABLE "public"."support_level_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."support_level_translations" TO "service_role";



GRANT ALL ON TABLE "public"."support_levels" TO "anon";
GRANT ALL ON TABLE "public"."support_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."support_levels" TO "service_role";



GRANT ALL ON TABLE "public"."tier_benefits" TO "anon";
GRANT ALL ON TABLE "public"."tier_benefits" TO "authenticated";
GRANT ALL ON TABLE "public"."tier_benefits" TO "service_role";



GRANT ALL ON TABLE "public"."user_benefits" TO "anon";
GRANT ALL ON TABLE "public"."user_benefits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_benefits" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_purchases" TO "anon";
GRANT ALL ON TABLE "public"."user_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."user_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."user_quest_responses" TO "anon";
GRANT ALL ON TABLE "public"."user_quest_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_quest_responses" TO "service_role";



GRANT ALL ON TABLE "public"."user_support_levels" TO "anon";
GRANT ALL ON TABLE "public"."user_support_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."user_support_levels" TO "service_role";



GRANT ALL ON TABLE "public"."user_xp" TO "anon";
GRANT ALL ON TABLE "public"."user_xp" TO "authenticated";
GRANT ALL ON TABLE "public"."user_xp" TO "service_role";



GRANT ALL ON TABLE "public"."users_roles" TO "anon";
GRANT ALL ON TABLE "public"."users_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."users_roles" TO "service_role";



GRANT ALL ON TABLE "public"."verification_batches" TO "anon";
GRANT ALL ON TABLE "public"."verification_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_batches" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."xp_level_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."xp_level_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_level_thresholds" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































