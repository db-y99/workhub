-- Thêm role_id vào profiles (FK đến roles)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- Migrate dữ liệu: từ profiles.role (text) → tìm roles.code → lấy roles.id → update profiles.role_id
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE p.role = r.code
  AND p.role_id IS NULL;

-- Set default role_id cho các profile chưa có role_id (fallback về 'user')
UPDATE public.profiles
SET role_id = (SELECT id FROM public.roles WHERE code = 'user' LIMIT 1)
WHERE role_id IS NULL;

-- Comment
COMMENT ON COLUMN public.profiles.role_id IS 'FK đến roles.id.';

-- Xóa field role cũ (không còn dùng nữa, chỉ dùng role_id)
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS role;
