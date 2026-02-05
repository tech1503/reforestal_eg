
-- ROW LEVEL SECURITY POLICIES
-- Ensures data isolation and secure access control.

-- 1. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;

-- 2. Helper Function for Admin Check
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Policies for PROFILES
-- View: Self or Admin
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT USING (is_admin_safe());

-- Update: Self or Admin
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins update all profiles" ON public.profiles
FOR UPDATE USING (is_admin_safe());

-- Delete: Admin only
CREATE POLICY "Admins delete profiles" ON public.profiles
FOR DELETE USING (is_admin_safe());

-- Insert: Handled by Trigger (System only) or Admin (rare)
CREATE POLICY "System inserts profiles" ON public.profiles
FOR INSERT WITH CHECK (true); -- Usually restricted to triggers, but allows manual admin inserts if needed

-- 4. Policies for USERS_ROLES (Pivot Table)
-- View: Self or Admin
CREATE POLICY "Users view own roles" ON public.users_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins view all roles" ON public.users_roles
FOR SELECT USING (is_admin_safe());

-- Modify: Admin only
CREATE POLICY "Admins manage roles" ON public.users_roles
FOR ALL USING (is_admin_safe());
