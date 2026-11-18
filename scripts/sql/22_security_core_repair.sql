BEGIN;

-- 1. Admin helper
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $is_admin$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
    );
$is_admin$;

ALTER FUNCTION public.is_admin_safe() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin_safe() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated, service_role;

-- 2. Harden existing SECURITY DEFINER helpers
ALTER FUNCTION public.check_profile_escalation() SET search_path = public;
ALTER FUNCTION public.spend_points_lifo(uuid, integer) SET search_path = public;
ALTER FUNCTION public.set_google_nickname(text) SET search_path = public;
ALTER FUNCTION public.is_username_available(text) SET search_path = public;

REVOKE ALL ON FUNCTION public.check_profile_escalation() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_google_nickname(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_google_nickname(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.spend_ic(uuid, integer, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.spend_ic(uuid, integer, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.spend_points_lifo(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.spend_points_lifo(uuid, integer) TO authenticated, service_role;

-- 3. Profiles: own/admin only, plus a public id/referral_code directory
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin_safe())
WITH CHECK (id = auth.uid() OR public.is_admin_safe());

REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, DELETE ON public.profiles FROM authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE VIEW public.profile_public_view
WITH (security_invoker = false) AS
SELECT id, referral_code
FROM public.profiles
WHERE referral_code IS NOT NULL
  AND btrim(referral_code) <> '';

ALTER VIEW public.profile_public_view OWNER TO postgres;
REVOKE ALL ON public.profile_public_view FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.profile_public_view TO anon, authenticated;

-- 4. Roles and user roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_public_read ON public.roles;
CREATE POLICY roles_public_read
ON public.roles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS roles_admin_all ON public.roles;
CREATE POLICY roles_admin_all
ON public.roles
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.roles FROM anon;
GRANT SELECT ON public.roles TO anon, authenticated;

ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_roles_select_own_or_admin ON public.users_roles;
CREATE POLICY users_roles_select_own_or_admin
ON public.users_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS users_roles_admin_all ON public.users_roles;
CREATE POLICY users_roles_admin_all
ON public.users_roles
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.users_roles FROM anon;

-- 5. Missions, translations and dynamic links
ALTER TABLE public.genesis_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS genesis_missions_public_active_read ON public.genesis_missions;
CREATE POLICY genesis_missions_public_active_read
ON public.genesis_missions
FOR SELECT
TO anon, authenticated
USING (status = 'active');

DROP POLICY IF EXISTS genesis_missions_admin_all ON public.genesis_missions;
CREATE POLICY genesis_missions_admin_all
ON public.genesis_missions
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.genesis_missions FROM anon;
GRANT SELECT ON public.genesis_missions TO anon, authenticated;

ALTER TABLE public.genesis_mission_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS genesis_mission_translations_public_read ON public.genesis_mission_translations;
CREATE POLICY genesis_mission_translations_public_read
ON public.genesis_mission_translations
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS genesis_mission_translations_admin_all ON public.genesis_mission_translations;
CREATE POLICY genesis_mission_translations_admin_all
ON public.genesis_mission_translations
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.genesis_mission_translations FROM anon;
GRANT SELECT ON public.genesis_mission_translations TO anon, authenticated;

ALTER TABLE public.dynamic_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dynamic_links_public_active_read ON public.dynamic_links;
CREATE POLICY dynamic_links_public_active_read
ON public.dynamic_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS dynamic_links_admin_all ON public.dynamic_links;
CREATE POLICY dynamic_links_admin_all
ON public.dynamic_links
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.dynamic_links FROM anon;
GRANT SELECT ON public.dynamic_links TO anon, authenticated;

-- 6. Support catalog and user tier data
ALTER TABLE public.support_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_levels_public_active_read ON public.support_levels;
CREATE POLICY support_levels_public_active_read
ON public.support_levels
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS support_levels_admin_all ON public.support_levels;
CREATE POLICY support_levels_admin_all
ON public.support_levels
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.support_levels FROM anon;
GRANT SELECT ON public.support_levels TO anon, authenticated;

ALTER TABLE public.support_level_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_level_translations_public_read ON public.support_level_translations;
CREATE POLICY support_level_translations_public_read
ON public.support_level_translations
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS support_level_translations_admin_all ON public.support_level_translations;
CREATE POLICY support_level_translations_admin_all
ON public.support_level_translations
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.support_level_translations FROM anon;
GRANT SELECT ON public.support_level_translations TO anon, authenticated;

ALTER TABLE public.support_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_benefits_public_active_read ON public.support_benefits;
CREATE POLICY support_benefits_public_active_read
ON public.support_benefits
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS support_benefits_admin_all ON public.support_benefits;
CREATE POLICY support_benefits_admin_all
ON public.support_benefits
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.support_benefits FROM anon;
GRANT SELECT ON public.support_benefits TO anon, authenticated;

ALTER TABLE public.support_benefit_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_benefit_translations_public_read ON public.support_benefit_translations;
CREATE POLICY support_benefit_translations_public_read
ON public.support_benefit_translations
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS support_benefit_translations_admin_all ON public.support_benefit_translations;
CREATE POLICY support_benefit_translations_admin_all
ON public.support_benefit_translations
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.support_benefit_translations FROM anon;
GRANT SELECT ON public.support_benefit_translations TO anon, authenticated;

ALTER TABLE public.user_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_benefits_select_own_or_admin ON public.user_benefits;
CREATE POLICY user_benefits_select_own_or_admin
ON public.user_benefits
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS user_benefits_admin_all ON public.user_benefits;
CREATE POLICY user_benefits_admin_all
ON public.user_benefits
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.user_benefits FROM anon;

-- 7. Financial read surface
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contributions_select_own_or_admin ON public.contributions;
CREATE POLICY contributions_select_own_or_admin
ON public.contributions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS contributions_admin_all ON public.contributions;
CREATE POLICY contributions_admin_all
ON public.contributions
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.contributions FROM anon;

ALTER TABLE public.founding_pioneer_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS founding_pioneer_metrics_select_own_or_admin ON public.founding_pioneer_metrics;
CREATE POLICY founding_pioneer_metrics_select_own_or_admin
ON public.founding_pioneer_metrics
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS founding_pioneer_metrics_admin_all ON public.founding_pioneer_metrics;
CREATE POLICY founding_pioneer_metrics_admin_all
ON public.founding_pioneer_metrics
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.founding_pioneer_metrics FROM anon;

ALTER TABLE public.reforestal_credits_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reforestal_credits_ledger_select_own_or_admin ON public.reforestal_credits_ledger;
CREATE POLICY reforestal_credits_ledger_select_own_or_admin
ON public.reforestal_credits_ledger
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS reforestal_credits_ledger_admin_all ON public.reforestal_credits_ledger;
CREATE POLICY reforestal_credits_ledger_admin_all
ON public.reforestal_credits_ledger
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.reforestal_credits_ledger FROM anon;

ALTER TABLE public.ic_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ic_ledger_select_own_or_admin ON public.ic_ledger;
CREATE POLICY ic_ledger_select_own_or_admin
ON public.ic_ledger
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

REVOKE ALL ON public.ic_ledger FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ic_ledger FROM authenticated;
GRANT SELECT ON public.ic_ledger TO authenticated;

ALTER TABLE public.impact_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impact_credits_select_own_or_admin ON public.impact_credits;
CREATE POLICY impact_credits_select_own_or_admin
ON public.impact_credits
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

REVOKE ALL ON public.impact_credits FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.impact_credits FROM authenticated;
GRANT SELECT ON public.impact_credits TO authenticated;

-- 8. Land Dollar tokens: owned reads, guarded self writes
ALTER TABLE public.land_dollar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.land_dollar_tokens ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS land_dollar_tokens_select_own_or_admin ON public.land_dollar_tokens;
CREATE POLICY land_dollar_tokens_select_own_or_admin
ON public.land_dollar_tokens
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR first_claimed_by_user_id = auth.uid()
    OR public.is_admin_safe()
);

DROP POLICY IF EXISTS land_dollar_tokens_insert_self ON public.land_dollar_tokens;
CREATE POLICY land_dollar_tokens_insert_self
ON public.land_dollar_tokens
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND first_claimed_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS land_dollar_tokens_update_self ON public.land_dollar_tokens;
CREATE POLICY land_dollar_tokens_update_self
ON public.land_dollar_tokens
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR first_claimed_by_user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
    OR first_claimed_by_user_id = auth.uid()
);

DROP POLICY IF EXISTS land_dollar_tokens_admin_all ON public.land_dollar_tokens;
CREATE POLICY land_dollar_tokens_admin_all
ON public.land_dollar_tokens
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

CREATE OR REPLACE FUNCTION public.guard_land_dollar_token_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $guard$
BEGIN
    IF public.is_admin_safe() OR COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.user_id := auth.uid();
        NEW.first_claimed_by_user_id := auth.uid();
        NEW.amount := 0;
        NEW.status := 'issued';
        NEW.is_active := true;
        NEW.issued_date := COALESCE(NEW.issued_date, now());
        NEW.assigned_sponsor_id := NULL;
        NEW.related_support_level_id := NULL;
        RETURN NEW;
    END IF;

    NEW.user_id := OLD.user_id;
    NEW.short_code := OLD.short_code;
    NEW.amount := OLD.amount;
    NEW.issued_date := OLD.issued_date;
    NEW.created_at := OLD.created_at;
    NEW.assigned_sponsor_id := OLD.assigned_sponsor_id;
    NEW.related_support_level_id := OLD.related_support_level_id;
    NEW.first_claimed_by_user_id := OLD.first_claimed_by_user_id;
    RETURN NEW;
END;
$guard$;

ALTER FUNCTION public.guard_land_dollar_token_write() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.guard_land_dollar_token_write() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_land_dollar_token_write ON public.land_dollar_tokens;
CREATE TRIGGER trg_guard_land_dollar_token_write
BEFORE INSERT OR UPDATE ON public.land_dollar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.guard_land_dollar_token_write();

REVOKE ALL ON public.land_dollar_tokens FROM anon;
REVOKE DELETE ON public.land_dollar_tokens FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.land_dollar_tokens TO authenticated;

-- 9. Gamification, quests and exchange catalog
ALTER TABLE public.gamification_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gamification_actions_public_active_read ON public.gamification_actions;
CREATE POLICY gamification_actions_public_active_read
ON public.gamification_actions
FOR SELECT
TO anon, authenticated
USING (is_active = true AND is_visible = true);

DROP POLICY IF EXISTS gamification_actions_admin_all ON public.gamification_actions;
CREATE POLICY gamification_actions_admin_all
ON public.gamification_actions
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.gamification_actions FROM anon;
GRANT SELECT ON public.gamification_actions TO anon, authenticated;

ALTER TABLE public.gamification_action_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gamification_action_translations_public_read ON public.gamification_action_translations;
CREATE POLICY gamification_action_translations_public_read
ON public.gamification_action_translations
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS gamification_action_translations_admin_all ON public.gamification_action_translations;
CREATE POLICY gamification_action_translations_admin_all
ON public.gamification_action_translations
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.gamification_action_translations FROM anon;
GRANT SELECT ON public.gamification_action_translations TO anon, authenticated;

ALTER TABLE public.gamification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gamification_history_select_own_or_admin ON public.gamification_history;
CREATE POLICY gamification_history_select_own_or_admin
ON public.gamification_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS gamification_history_admin_all ON public.gamification_history;
CREATE POLICY gamification_history_admin_all
ON public.gamification_history
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.gamification_history FROM anon;

ALTER TABLE public.user_quest_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_quest_responses_select_own_or_admin ON public.user_quest_responses;
CREATE POLICY user_quest_responses_select_own_or_admin
ON public.user_quest_responses
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS user_quest_responses_admin_all ON public.user_quest_responses;
CREATE POLICY user_quest_responses_admin_all
ON public.user_quest_responses
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.user_quest_responses FROM anon;

ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_purchases_select_own_or_admin ON public.user_purchases;
CREATE POLICY user_purchases_select_own_or_admin
ON public.user_purchases
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS user_purchases_admin_all ON public.user_purchases;
CREATE POLICY user_purchases_admin_all
ON public.user_purchases
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.user_purchases FROM anon;

ALTER TABLE public.exchange_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_products_public_active_read ON public.exchange_products;
CREATE POLICY exchange_products_public_active_read
ON public.exchange_products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS exchange_products_admin_all ON public.exchange_products;
CREATE POLICY exchange_products_admin_all
ON public.exchange_products
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.exchange_products FROM anon;
GRANT SELECT ON public.exchange_products TO anon, authenticated;

ALTER TABLE public.exchange_product_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_product_translations_public_read ON public.exchange_product_translations;
CREATE POLICY exchange_product_translations_public_read
ON public.exchange_product_translations
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS exchange_product_translations_admin_all ON public.exchange_product_translations;
CREATE POLICY exchange_product_translations_admin_all
ON public.exchange_product_translations
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.exchange_product_translations FROM anon;
GRANT SELECT ON public.exchange_product_translations TO anon, authenticated;

-- 10. Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own_or_admin ON public.notifications;
CREATE POLICY notifications_select_own_or_admin
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS notifications_update_own_or_admin ON public.notifications;
CREATE POLICY notifications_update_own_or_admin
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_safe())
WITH CHECK (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS notifications_insert_self ON public.notifications;
CREATE POLICY notifications_insert_self
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin_safe());

DROP POLICY IF EXISTS notifications_insert_contact_alert ON public.notifications;
CREATE POLICY notifications_insert_contact_alert
ON public.notifications
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL AND notification_type = 'admin_alert');

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all
ON public.notifications
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

REVOKE ALL ON public.notifications FROM anon;
GRANT INSERT ON public.notifications TO anon;

-- 11. Financial view: enforce caller RLS instead of definer bypass
ALTER VIEW public.financial_context_view SET (security_invoker = true);
REVOKE ALL ON public.financial_context_view FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.financial_context_view TO authenticated, service_role;

-- 12. Remove non-RLS bypass privileges from client roles
DO $cleanup$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.oid::regclass AS rel
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
    LOOP
        EXECUTE format(
            'REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE %s FROM anon, authenticated',
            r.rel
        );
    END LOOP;

    FOR r IN
        SELECT c.oid::regclass AS rel
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'S'
    LOOP
        EXECUTE format(
            'REVOKE ALL ON SEQUENCE %s FROM anon, authenticated',
            r.rel
        );
    END LOOP;
END;
$cleanup$;

COMMIT;
