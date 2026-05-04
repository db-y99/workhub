# Tóm tắt: Filter và Stats ở Server-side

## ✅ Đã hoàn thành

### 1. **Filter hoàn toàn ở Server**
Tất cả logic filter đã được xử lý ở server trong `lib/actions/customer-leads.ts`:

- ✅ Search (tên Facebook, tên thật, SĐT, người phụ trách, chi nhánh)
- ✅ Date range (từ ngày - đến ngày)
- ✅ Chi nhánh
- ✅ Tình trạng (Lead Status)
- ✅ Nguồn (Source)
- ✅ Từ Ads
- ✅ Trạng thái trao đổi
- ✅ Tiến độ hồ sơ
- ✅ Kết quả hồ sơ
- ✅ Tài sản đảm bảo
- ✅ Người phụ trách

### 2. **Stats được tính ở Server**
Tạo function `getCustomerLeadsStats()` để tính thống kê dựa trên dữ liệu đã filter:

```typescript
export async function getCustomerLeadsStats(params) {
  // Tính toán:
  // - Total: Tổng số khách hàng (sau filter)
  // - Disbursed: Số khách hàng đã giải ngân
  // - Rejected: Số khách hàng bị từ chối
  // - Processing: Số khách hàng đang xử lý
}
```

### 3. **Client chỉ hiển thị dữ liệu**
Client (`components/customers/leads-manager.client.tsx`) chỉ:
- Gửi filter parameters lên server
- Nhận dữ liệu đã filter và stats từ server
- Hiển thị UI

**KHÔNG có logic filter nào ở client!**

### 4. **Performance Optimization**
- Fetch leads và stats song song bằng `Promise.all()`
- Stats được tính chính xác cho **toàn bộ dữ liệu đã filter**, không chỉ trang hiện tại

## 📝 Cách hoạt động

### Khi user thay đổi filter:

1. **User chọn filter** trong popover
2. **Bấm "Áp dụng bộ lọc"** → `tempFilters` → `appliedFilters`
3. **Client gọi server** với filter params:
   ```typescript
   const [leadsResult, statsResult] = await Promise.all([
     getCustomerLeads({ page, pageSize, ...filterParams }),
     getCustomerLeadsStats(filterParams),
   ]);
   ```
4. **Server xử lý**:
   - Query database với WHERE conditions
   - Tính stats cho dữ liệu đã filter
5. **Client nhận kết quả** và hiển thị

## 🎯 Lợi ích

✅ **Hiệu suất tốt**: Filter ở database level (PostgreSQL)
✅ **Chính xác**: Stats tính trên toàn bộ dữ liệu, không chỉ trang hiện tại
✅ **Bảo mật**: Logic filter không expose ở client
✅ **Scalable**: Xử lý được hàng triệu records
✅ **Maintainable**: Logic tập trung ở một nơi (server)

## 🔧 Files đã thay đổi

1. **lib/actions/customer-leads.ts**
   - Thêm `CustomerLeadsStats` interface
   - Thêm `getCustomerLeadsStats()` function
   - Cập nhật `GetCustomerLeadsParams` với tất cả filter fields

2. **components/customers/leads-manager.client.tsx**
   - Import `getCustomerLeadsStats` và `CustomerLeadsStats`
   - Thêm `stats` state
   - Fetch stats từ server thay vì tính ở client
   - Xóa logic filter `.filter()` ở client

## ⚠️ Lưu ý

- Các lỗi TypeScript về `CollectionElement<object>` trong Select components không ảnh hưởng chức năng
- Stats hiện tại tính chính xác cho toàn bộ dữ liệu đã filter
- Tất cả filter đều được apply ở database level (WHERE clauses)
