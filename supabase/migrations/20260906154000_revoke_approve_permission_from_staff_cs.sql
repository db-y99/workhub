-- Thu hồi quyền duyệt yêu cầu (approve:approve) khỏi role staff và cs.
-- Seed cũ gán mọi approve:* trừ delete, nên hai role này từng có quyền duyệt.

DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code IN ('staff', 'cs')
  AND p.code = 'approve:approve';
