-- Seed data cho public schema (không insert auth.users / auth.identities).
--
-- ⚠️ Tài khoản admin PHẢI tạo bằng Auth Admin API (đúng chuẩn GoTrue):
--    npm run seed:admin
--
-- Đăng nhập sau khi seed admin: admin@y99.vn / admin

-- Departments (dùng cho bulletins và requests)
INSERT INTO public.departments (name, code, description, email) VALUES
  ('All', 'All', 'Toàn công ty', 'company@y99.vn'),
  ('CS', 'CS', 'Bộ phận CS', 'cs@y99.vn'),
  ('CA', 'CA', 'Bộ phận CA', 'ca@y99.vn'),
  ('IT', 'IT', 'Bộ phận IT', 'it@y99.vn'),
  ('Accountant', 'Accountant', 'Bộ phận Accountant', 'accountant@y99.vn'),
  ('Marketing', 'Marketing', 'Bộ phận Marketing', 'marketing@y99.vn'),
  ('Manager', 'Manager', 'Bộ phận Manager', 'manager@y99.vn')
ON CONFLICT (code) DO NOTHING;

-- Permissions: seed đầy đủ các trang chính
INSERT INTO public.permissions (code, name, sort_order) VALUES
  ('approve:view', 'Xem Duyệt yêu cầu', 1),
  ('approve:create', 'Tạo Duyệt yêu cầu', 2),
  ('approve:approve', 'Duyệt yêu cầu', 3),
  ('send-email:view', 'Xem Send email', 4),
  ('calculator:view', 'Xem Calculator', 5),
  ('vision:view', 'Xem Vision OCR', 6),
  ('bulletins:view', 'Xem Bảng tin', 7),
  ('bulletins:create', 'Tạo Bảng tin', 8),
  ('bulletins:edit', 'Sửa Bảng tin', 9),
  ('company-resources:view', 'Xem Tài nguyên công ty', 10),
  ('company-resources:create', 'Tạo Tài nguyên công ty', 11),
  ('company-resources:edit', 'Sửa Tài nguyên công ty', 12),
  ('company-resources:delete', 'Xóa Tài nguyên công ty', 13),
  ('statistics:view', 'Xem Thống kê', 14),
  ('users:view', 'Xem Người dùng', 15),
  ('users:create', 'Tạo Người dùng', 16),
  ('users:edit', 'Sửa Người dùng', 17),
  ('users:delete', 'Xóa Người dùng', 18),
  ('departments:view', 'Xem Phòng ban', 19),
  ('departments:create', 'Tạo Phòng ban', 20),
  ('departments:edit', 'Sửa Phòng ban', 21),
  ('departments:delete', 'Xóa Phòng ban', 22),
  ('roles:view', 'Xem Vai trò', 23),
  ('roles:create', 'Tạo Vai trò', 24),
  ('roles:edit', 'Sửa Vai trò', 25),
  ('roles:delete', 'Xóa Vai trò', 26),
  ('settings:view', 'Xem Cài đặt', 27)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- Role Permissions: Phân quyền cho từng role
-- Admin: Toàn quyền (tất cả permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Hầu hết quyền, trừ admin-only (roles, settings)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'manager'
  AND p.code NOT LIKE 'roles:%'
  AND p.code NOT LIKE 'settings:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: Xem và quyền cơ bản (không có delete, không có users/departments/roles/settings)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'staff'
  AND (
    -- Xem (trừ users, departments, roles, settings)
    (p.code LIKE '%:view' 
     AND p.code NOT LIKE 'users:%'
     AND p.code NOT LIKE 'departments:%'
     AND p.code NOT LIKE 'roles:%'
     AND p.code NOT LIKE 'settings:%')
    -- Hoặc create/edit cho approve
    OR (p.code LIKE 'approve:%' AND p.code NOT LIKE '%:delete')
    OR (p.code LIKE 'company-resources:%' AND p.code NOT LIKE '%:delete')
    OR (p.code LIKE 'statistics:%' AND p.code NOT LIKE '%:delete')
    -- Bulletins: view, create, edit (không delete)
    OR (p.code LIKE 'bulletins:%' AND p.code NOT LIKE '%:delete')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CS (Chăm sóc khách hàng): Quyền liên quan đến approve và loans
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'cs'
  AND (
    -- Xem home
    p.code LIKE 'home:%'
    -- Approve: view, create, edit (không delete)
    OR (p.code LIKE 'approve:%' AND p.code NOT LIKE '%:delete')
    -- Xem statistics
    OR p.code LIKE 'statistics:view'
    -- Bulletins: view, create, edit (không delete)
    OR (p.code LIKE 'bulletins:%' AND p.code NOT LIKE '%:delete')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: Chỉ xem cơ bản
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'user'
  AND (
    -- Chỉ xem
    p.code LIKE 'home:view'
    OR p.code LIKE 'approve:view'
    OR p.code LIKE 'company-resources:view'
    OR p.code LIKE 'statistics:view'
    OR p.code LIKE 'bulletins:view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Bulletins: Bảng tin mẫu
-- Chỉ insert nếu chưa có bulletins nào
DO $$
DECLARE
  bulletin_count INTEGER;
  created_by_id UUID;
  cs_dept_id UUID;
  ca_dept_id UUID;
BEGIN
  -- Kiểm tra xem đã có bulletins chưa
  SELECT COUNT(*) INTO bulletin_count
  FROM public.bulletins
  WHERE deleted_at IS NULL;

  IF bulletin_count > 0 THEN
    RETURN; -- Đã có dữ liệu, bỏ qua
  END IF;

  -- Lấy profile đầu tiên làm created_by (thường là admin)
  SELECT id INTO created_by_id
  FROM public.profiles
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  -- Nếu chưa có profile, không thể seed bulletins
  IF created_by_id IS NULL THEN
    RETURN;
  END IF;

  -- Lấy department IDs
  SELECT id INTO cs_dept_id FROM public.departments WHERE code = 'CS' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO ca_dept_id FROM public.departments WHERE code = 'CA' AND deleted_at IS NULL LIMIT 1;

  -- Insert bulletins mẫu
  INSERT INTO public.bulletins (title, description, created_by, department_ids, attachments, gradient) VALUES
    (
      'BÀN GIAO CÔNG VIỆC VÀ THÔNG BÁO KHI NGHỈ',
      'Quy định về bàn giao công việc và thông báo nghỉ nhán',
      created_by_id,
      ARRAY[]::UUID[],
      '[]'::JSONB,
      'from-rose-400/80 to-pink-500/90'
    ),
    (
      'Quy định ngày nghỉ chung',
      'Điều chỉnh lịch làm việc ngày Chủ Nhật và Quy định đăng ...',
      created_by_id,
      ARRAY[]::UUID[],
      '[]'::JSONB,
      'from-sky-300/80 to-blue-500/90'
    ),
    (
      'TIÊU CHUẨN THIẾT BỊ ĐẦU VÀO',
      'THÔNG BÁO CHUẨN HÓA TIÊU CHUẨN THIẾT BỊ...',
      created_by_id,
      CASE 
        WHEN cs_dept_id IS NOT NULL AND ca_dept_id IS NOT NULL 
        THEN ARRAY[cs_dept_id, ca_dept_id]
        ELSE ARRAY[]::UUID[]
      END,
      '[]'::JSONB,
      'from-emerald-400/80 to-teal-500/90'
    ),
    (
      'TĂNG CƯỜNG VÀ CHUẨN HÓA QUY TRÌNH THẦM',
      'TĂNG CƯỜNG VÀ CHUẨN HÓA QUY TRÌNH TUẤM DIN',
      created_by_id,
      CASE 
        WHEN cs_dept_id IS NOT NULL AND ca_dept_id IS NOT NULL 
        THEN ARRAY[cs_dept_id, ca_dept_id]
        ELSE ARRAY[]::UUID[]
      END,
      '[]'::JSONB,
      'from-violet-400/80 to-purple-500/90'
    ),
    (
      'CS NOTE TỪNG ĐƠN KH',
      'TB BỘ PHÂN CS NOTE TỪNG ĐƠN KH',
      created_by_id,
      CASE 
        WHEN cs_dept_id IS NOT NULL 
        THEN ARRAY[cs_dept_id]
        ELSE ARRAY[]::UUID[]
      END,
      '[]'::JSONB,
      'from-indigo-400/80 to-blue-600/90'
    ),
    (
      'NOTE LÝ DO TỪ CHỐI KH',
      'TB BẮT BUỘC NOTE LÝ DO TỪ CHỐI TỪNG KH',
      created_by_id,
      CASE 
        WHEN ca_dept_id IS NOT NULL 
        THEN ARRAY[ca_dept_id]
        ELSE ARRAY[]::UUID[]
      END,
      '[]'::JSONB,
      'from-slate-300/80 to-slate-500/80'
    ),
    (
      'ĐỊNH GIÁ TÀI SẢN CA VẮNG MẶT',
      'Hướng dẫn định giá tài sản khi Chuyên viên Thẩm định (C...',
      created_by_id,
      ARRAY[]::UUID[],
      '[]'::JSONB,
      'from-cyan-300/80 to-blue-500/90'
    );
END $$;
