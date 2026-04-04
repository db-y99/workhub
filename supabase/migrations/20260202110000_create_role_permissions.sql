-- Bỏ bảng cũ (nếu đã chạy migration trước với role_code, permission_code)
DROP TABLE IF EXISTS public.role_permissions;

-- 1. Bảng roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON public.roles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select"
  ON public.roles FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "roles_insert"
  ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "roles_update"
  ON public.roles FOR UPDATE TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "roles_delete"
  ON public.roles FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.roles IS 'Vai trò trong hệ thống (admin, manager, staff, cs, user).';

INSERT INTO public.roles (code, name, description, sort_order) VALUES
  ('admin', 'Admin', 'Quản trị viên hệ thống', 1),
  ('manager', 'Manager', 'Quản lý', 2),
  ('staff', 'Staff', 'Nhân viên', 3),
  ('cs', 'Chăm sóc khách hàng', 'Chăm sóc khách hàng', 4),
  ('user', 'User', 'Người dùng', 5)
ON CONFLICT (code) DO NOTHING;

-- 2. Bảng permissions (mỗi dòng một quyền: home:view, users:create, ...)
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at ON public.permissions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select"
  ON public.permissions FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "permissions_insert"
  ON public.permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "permissions_update"
  ON public.permissions FOR UPDATE TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "permissions_delete"
  ON public.permissions FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.permissions IS 'Danh sách quyền (code: page:action, VD: home:view, users:create).';

-- 3. Bảng role_permissions (n-n: role có những permission nào)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_insert"
  ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "role_permissions_update"
  ON public.role_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "role_permissions_delete"
  ON public.role_permissions FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.role_permissions IS 'Phân quyền: role_id + permission_id (role nào có quyền nào).';
