-- Enable RLS trên các bảng public đang bị advisory "RLS Disabled in Public".
--
-- Chiến lược AN TOÀN (không khóa user đã login):
-- 1. Bật RLS → mặc định chặn mọi role không có policy (đặc biệt là anon).
-- 2. Policy cho authenticated: cho phép SELECT/INSERT/UPDATE/DELETE (USING true)
--    → giữ hành vi hiện tại của app (đã login vẫn đọc/ghi như cũ).
-- 3. service_role (createAdminClient) BYPASS RLS mặc định → seed/admin không bị ảnh hưởng.
-- 4. KHÔNG tạo policy cho anon → client chưa login không truy cập được.
--
-- Lưu ý: SELECT dùng USING (true) vì một số API (VD: branches/deleted) đọc soft-deleted
-- bằng user JWT, không dùng service_role. Nếu dùng deleted_at IS NULL sẽ gãy trang "Đã xóa".

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. departments
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select" ON public.departments;
DROP POLICY IF EXISTS "departments_insert" ON public.departments;
DROP POLICY IF EXISTS "departments_update" ON public.departments;
DROP POLICY IF EXISTS "departments_delete" ON public.departments;

CREATE POLICY "departments_select"
  ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert"
  ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "departments_update"
  ON public.departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "departments_delete"
  ON public.departments FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.departments TO authenticated;
GRANT ALL ON TABLE public.departments TO service_role;
REVOKE ALL ON TABLE public.departments FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. branches
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_select" ON public.branches;
DROP POLICY IF EXISTS "branches_insert" ON public.branches;
DROP POLICY IF EXISTS "branches_update" ON public.branches;
DROP POLICY IF EXISTS "branches_delete" ON public.branches;

CREATE POLICY "branches_select"
  ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "branches_insert"
  ON public.branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "branches_update"
  ON public.branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "branches_delete"
  ON public.branches FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branches TO authenticated;
GRANT ALL ON TABLE public.branches TO service_role;
REVOKE ALL ON TABLE public.branches FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. bulletins
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulletins_select" ON public.bulletins;
DROP POLICY IF EXISTS "bulletins_insert" ON public.bulletins;
DROP POLICY IF EXISTS "bulletins_update" ON public.bulletins;
DROP POLICY IF EXISTS "bulletins_delete" ON public.bulletins;

CREATE POLICY "bulletins_select"
  ON public.bulletins FOR SELECT TO authenticated USING (true);
CREATE POLICY "bulletins_insert"
  ON public.bulletins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bulletins_update"
  ON public.bulletins FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bulletins_delete"
  ON public.bulletins FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bulletins TO authenticated;
GRANT ALL ON TABLE public.bulletins TO service_role;
REVOKE ALL ON TABLE public.bulletins FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. profiles
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
REVOKE ALL ON TABLE public.profiles FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. requests
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requests_select" ON public.requests;
DROP POLICY IF EXISTS "requests_insert" ON public.requests;
DROP POLICY IF EXISTS "requests_update" ON public.requests;
DROP POLICY IF EXISTS "requests_delete" ON public.requests;

CREATE POLICY "requests_select"
  ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "requests_insert"
  ON public.requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "requests_update"
  ON public.requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "requests_delete"
  ON public.requests FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.requests TO authenticated;
GRANT ALL ON TABLE public.requests TO service_role;
REVOKE ALL ON TABLE public.requests FROM anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. request_comments (có Realtime → cần SELECT policy cho authenticated)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_comments_select" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_insert" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_update" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete" ON public.request_comments;

CREATE POLICY "request_comments_select"
  ON public.request_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "request_comments_insert"
  ON public.request_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "request_comments_update"
  ON public.request_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "request_comments_delete"
  ON public.request_comments FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.request_comments TO authenticated;
GRANT ALL ON TABLE public.request_comments TO service_role;
REVOKE ALL ON TABLE public.request_comments FROM anon;
