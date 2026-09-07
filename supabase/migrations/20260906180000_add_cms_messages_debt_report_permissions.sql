-- Thêm permissions cho CMS Lookup, Tin nhắn, Báo cáo dư nợ.
-- Idempotent: ON CONFLICT cập nhật name; gán cho admin nếu chưa có.

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
    ('cms-lookup:view', 'Xem Tra cứu CMS', 'Tra cứu hồ sơ và kiểm tra hợp đồng từ CMS', 1),
    ('messages:view', 'Xem Tin nhắn', 'Quản lý tin nhắn từ Facebook, WhatsApp, Zalo', 2),
    ('debt-report:view', 'Xem Báo cáo dư nợ', 'Upload và đối chiếu báo cáo dư nợ', 3)
) AS v(code, name, description, sort_offset)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code IN ('cms-lookup:view', 'messages:view', 'debt-report:view')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
