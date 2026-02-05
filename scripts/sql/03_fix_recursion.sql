
-- REPAIR SCRIPT: Fix Infinite Recursion (Error 42P17) in RLS Policies
-- Diagnosis: Circular dependency between 'profiles' RLS policies and auth helper functions (is_admin_safe).
-- Solution: Convert auth helpers to SECURITY DEFINER to bypass RLS recursion loops.

-- 1. Refactor is_admin_safe (SECURITY DEFINER)
-- Executes with privileges of the creator (system), bypassing RLS on 'profiles'.
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct query without triggering RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Refactor is_startnext_user_safe (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_startnext_user_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'startnext_user'
  );
END;
$$;

-- 3. Refactor is_user_safe (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_user_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'user'
  );
END;
$$;

-- 4. Create Helper: get_user_role (SECURITY DEFINER)
-- Safe way to get current user's role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'user');
END;
$$;

-- 5. Create Helper: is_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_role(role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_user_role() = role_name;
END;
$$;

-- 6. OPTIMIZE PROFILES POLICIES (Remove Recursion)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially recursive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full update and user self-update" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full read and user self-read" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create Safe Policies
-- SELECT: Users see themselves, Admins see all (via safe function)
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = id 
  OR 
  is_admin_safe()
);

-- UPDATE: Users update themselves, Admins update all
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id 
  OR 
  is_admin_safe()
)
WITH CHECK (
  auth.uid() = id 
  OR 
  is_admin_safe()
);

-- DELETE: Admins only
CREATE POLICY "Only admins can delete profiles" ON public.profiles
FOR DELETE USING (
  is_admin_safe()
);

-- INSERT: System (triggers) usually, but allow implicit for Auth sync if needed
CREATE POLICY "System inserts profiles" ON public.profiles
FOR INSERT WITH CHECK (true);

-- 7. OPTIMIZE OTHER CRITICAL TABLES
-- Ensure they use the new safe functions

-- Impact Credits
ALTER TABLE public.impact_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage impact credits" ON public.impact_credits;
DROP POLICY IF EXISTS "Admin view credits" ON public.impact_credits;
DROP POLICY IF EXISTS "Credits own view" ON public.impact_credits;
DROP POLICY IF EXISTS "Admins can manage all impact credits" ON public.impact_credits;
DROP POLICY IF EXISTS "Users can view their own impact credits" ON public.impact_credits;
DROP POLICY IF EXISTS "Users view own impact credits" ON public.impact_credits;

CREATE POLICY "Users can view their own impact credits" ON public.impact_credits
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  is_admin_safe()
);

CREATE POLICY "Admins manage impact credits" ON public.impact_credits
FOR ALL USING (
  is_admin_safe()
);

-- Land Dollars
ALTER TABLE public.land_dollars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own land dollars" ON public.land_dollars;
DROP POLICY IF EXISTS "Admins can manage all land dollars" ON public.land_dollars;
DROP POLICY IF EXISTS "Users can view their own land dollars" ON public.land_dollars;
DROP POLICY IF EXISTS "Admins manage land dollars" ON public.land_dollars;

CREATE POLICY "Users view own land dollars" ON public.land_dollars
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  is_admin_safe()
);

CREATE POLICY "Admins manage land dollars" ON public.land_dollars
FOR ALL USING (
  is_admin_safe()
);

-- Startnext Contributions
ALTER TABLE public.startnext_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage contributions" ON public.startnext_contributions;
DROP POLICY IF EXISTS "Admins can manage all contributions" ON public.startnext_contributions;
DROP POLICY IF EXISTS "Users can view their own contributions" ON public.startnext_contributions;
DROP POLICY IF EXISTS "Users view own contributions" ON public.startnext_contributions;

CREATE POLICY "Users view own contributions" ON public.startnext_contributions
FOR SELECT USING (
  user_id = auth.uid() 
  OR 
  is_admin_safe()
);

CREATE POLICY "Admins manage contributions" ON public.startnext_contributions
FOR ALL USING (
  is_admin_safe()
);

-- 8. GRANT PERMISSIONS (Safety Check)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
