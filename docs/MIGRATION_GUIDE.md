# Hướng dẫn Migration - Tách trường tên khách hàng

## Thay đổi

Đã tách trường tên khách hàng thành 2 trường riêng biệt:
- **facebook_name**: Tên khách hàng trên Facebook
- **customer_name**: Tên thật của khách hàng

## Các file đã thay đổi

1. **Database Migration**: `supabase/migrations/20260504000000_split_customer_name_fields.sql`
   - Thêm cột `facebook_name` vào bảng `customer_leads`

2. **Backend Types**: `lib/actions/customer-leads.ts`
   - Cập nhật interface `CustomerLeadInput` với trường `facebook_name`
   - Cập nhật search query để tìm kiếm cả tên Facebook và tên thật

3. **Frontend UI**: `components/customers/leads-manager.client.tsx`
   - Thêm input "Tên Facebook" trong form
   - Đổi label "Tên khách hàng" thành "Tên thật khách hàng"
   - Thêm cột "TÊN FACEBOOK" và "TÊN THẬT" trong bảng
   - Cập nhật modal chi tiết để hiển thị cả 2 trường
   - Cập nhật placeholder tìm kiếm

## Cách chạy Migration

### Nếu đang dùng Supabase Local:

```bash
# Reset database và chạy lại tất cả migrations
npx supabase db reset

# Hoặc chỉ chạy migration mới
npx supabase migration up
```

### Nếu đang dùng Supabase Cloud:

```bash
# Push migration lên cloud
npx supabase db push
```

## Lưu ý

- Trường `facebook_name` là **optional** (có thể để trống)
- Trường `customer_name` vẫn là **required** (bắt buộc)
- Dữ liệu cũ sẽ không bị ảnh hưởng, chỉ có thêm cột mới `facebook_name` với giá trị NULL
- Khi tìm kiếm, hệ thống sẽ tìm trong cả 2 trường: tên Facebook và tên thật
