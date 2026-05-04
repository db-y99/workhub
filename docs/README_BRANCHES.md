# Hướng dẫn cài đặt tính năng Chi nhánh

## Tổng quan
Đã tạo thành công tính năng quản lý chi nhánh và cập nhật profiles để thêm trường branch_id với đầy đủ phân quyền.

## Các file đã tạo/cập nhật:

### 1. Database Migrations
- `supabase/migrations/20260429010000_create_branches_table.sql` - Tạo bảng branches và thêm branch_id vào profiles
- `supabase/migrations/20260429020000_add_branches_permissions.sql` - Thêm permissions cho branches

### 2. Trang quản lý chi nhánh
- `app/(dashboard)/branches/page.tsx` - Trang chính với PermissionGuard
- `components/branches/branches-manager.client.tsx` - Component quản lý chi nhánh với permission checks
- `lib/actions/branches.ts` - Actions CRUD cho branches với permission validation
- `app/api/branches/route.ts` - API endpoint cho branches với auth

### 3. Cập nhật quản lý người dùng
- `components/users/add-user-modal.tsx` - Thêm trường chi nhánh
- `components/settings/employees/edit-employee-modal.tsx` - Thêm trường chi nhánh
- `components/users/users-content.client.tsx` - Hiển thị cột chi nhánh
- `app/api/profiles/route.ts` - Include branch trong API

### 4. Cập nhật schemas và types
- `lib/actions/profiles.ts` - Hỗ trợ branch_id
- `lib/actions/profiles/create-profile.schema.ts` - Thêm branch_id
- `lib/actions/profiles/update-profile.schema.ts` - Thêm branch_id
- `lib/services/profiles.service.ts` - Hỗ trợ branch_id
- `types/index.ts` - Cập nhật types

### 5. Permissions & Navigation
- `constants/permissions.ts` - Thêm BRANCHES permissions
- `constants/routes.ts` - Thêm ROUTES.BRANCHES
- `config/site.ts` - Thêm branches vào sidebar navigation

## Cách chạy:

1. **Chạy migrations:**
   ```bash
   cd supabase
   npx supabase migration up
   ```

2. **Khởi động ứng dụng:**
   ```bash
   npm run dev
   ```

3. **Truy cập các trang:**
   - Quản lý chi nhánh: `/branches`
   - Quản lý người dùng: `/users` (đã có cột chi nhánh)

## Tính năng:

### Quản lý chi nhánh:
- ✅ Thêm/sửa/xóa chi nhánh với permission checks
- ✅ Tìm kiếm chi nhánh
- ✅ Hiển thị thống kê
- ✅ Validation mã chi nhánh duy nhất
- ✅ Soft delete với kiểm tra ràng buộc
- ✅ Permission-based UI (ẩn/hiện buttons theo quyền)

### Quản lý người dùng:
- ✅ Thêm trường chi nhánh khi tạo user
- ✅ Chỉnh sửa chi nhánh của user
- ✅ Hiển thị chi nhánh trong danh sách user
- ✅ Dropdown chi nhánh hoạt động

### Permissions:
- ✅ `branches:view` - Xem danh sách chi nhánh
- ✅ `branches:create` - Tạo chi nhánh mới
- ✅ `branches:edit` - Chỉnh sửa chi nhánh
- ✅ `branches:delete` - Xóa chi nhánh
- ✅ Auto-assign cho role admin

### Navigation:
- ✅ Thêm vào sidebar với icon MapPin
- ✅ Permission-based visibility
- ✅ Route protection với PermissionGuard

### Dữ liệu mẫu:
Migration đã tạo sẵn 4 chi nhánh mẫu:
- Chi nhánh Hà Nội (HN)
- Chi nhánh Hồ Chí Minh (HCM)  
- Chi nhánh Đà Nẵng (DN)
- Chi nhánh Cần Thơ (CT)

## Lưu ý:
- Trường branch_id là optional, có thể để trống
- Khi xóa chi nhánh sẽ kiểm tra xem có nhân viên nào đang thuộc chi nhánh đó không
- API branches chỉ trả về các chi nhánh đang hoạt động (status = 'active')
- Tất cả actions đều có permission validation
- UI sẽ ẩn/hiện buttons dựa trên quyền của user
- Role admin sẽ tự động có tất cả quyền branches