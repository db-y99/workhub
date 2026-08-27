-- Thêm permissions cho trang phân quyền / danh sách quyền.
-- sort_order tự động = max hiện tại + 1/+ 2 (không hardcode số nhảy).

WITH max_so AS (
  SELECT COALESCE(MAX(sort_order), 0) AS m
  FROM public.permissions
  WHERE deleted_at IS NULL
)
INSERT INTO public.permissions (code, name, description, sort_order)
SELECT v.code, v.name, v.description, max_so.m + v.sort_offset
FROM max_so
CROSS JOIN (
  VALUES
    ('permissions:view', 'Xem phân quyền', 'Xem và thiết lập phân quyền theo vai trò', 1),
    ('permissions-list:view', 'Xem danh sách quyền', 'Xem và quản lý mã quyền trong hệ thống', 2)
) AS v(code, name, description, sort_offset)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Gán quyền cho role admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code IN ('permissions:view', 'permissions-list:view')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
