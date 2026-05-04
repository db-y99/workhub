-- Thêm permissions cho branches
INSERT INTO public.permissions (code, name, description, sort_order) VALUES
('branches:view', 'Xem chi nhánh', 'Xem danh sách và thông tin chi nhánh', 100),
('branches:create', 'Tạo chi nhánh', 'Tạo chi nhánh mới', 101),
('branches:edit', 'Sửa chi nhánh', 'Chỉnh sửa thông tin chi nhánh', 102),
('branches:delete', 'Xóa chi nhánh', 'Xóa chi nhánh', 103);

-- Gán quyền branches cho role admin (nếu tồn tại)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin' 
  AND p.code IN ('branches:view', 'branches:create', 'branches:edit', 'branches:delete')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );