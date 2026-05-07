# Tính năng Báo cáo Daily/Weekly/Monthly

## Tổng quan
Hệ thống báo cáo linh hoạt cho phép xem dữ liệu khách hàng theo 3 chế độ thời gian khác nhau:
- **📅 Daily (Theo ngày)**: Báo cáo chi tiết từng ngày
- **📊 Weekly (Theo tuần)**: Báo cáo theo tuần (Thứ Hai - Chủ Nhật)
- **📈 Monthly (Theo tháng)**: Báo cáo tổng hợp theo tháng

## Định dạng hiển thị

### Daily (Theo ngày)
- Format: `T2, 30/03/2026` (Thứ trong tuần, ngày/tháng/năm)
- Ví dụ:
  - `T2, 30/03/2026` (Thứ Hai)
  - `T3, 31/03/2026` (Thứ Ba)
  - `CN, 05/04/2026` (Chủ Nhật)

### Weekly (Theo tuần)
- Format: `dd/mm - dd/mm` (Từ Thứ Hai đến Chủ Nhật)
- Ví dụ:
  - `30/03 - 05/04` (Tuần từ 30/3 đến 5/4)
  - `06/04 - 12/04` (Tuần từ 6/4 đến 12/4)

### Monthly (Theo tháng)
- Format: `Tháng X YYYY`
- Ví dụ:
  - `Tháng 3 2026`
  - `Tháng 4 2026`

## Cấu trúc API

### Endpoint
```
GET /api/customers/reports
```

### Query Parameters
- `periodType`: `"daily"` | `"weekly"` | `"monthly"` (mặc định: `"weekly"`)
- `dateFrom`: Ngày bắt đầu (YYYY-MM-DD)
- `dateTo`: Ngày kết thúc (YYYY-MM-DD)
- `branch`: Chi nhánh
- `personInCharge`: Người phụ trách
- `source`: Nguồn khách hàng
- `fromAds`: Từ quảng cáo

### Response Structure
```typescript
{
  period_type: "daily" | "weekly" | "monthly",
  periods: [
    {
      period: string,           // Internal key
      period_display: string,   // Display format
      total_enquiries: number,
      mql: number,
      mql_rate: number,
      sql: number,
      sql_rate: number,
      application: number,
      app_rate: number,
      approved: number,
      disbursed: number,
      disbursed_rate: number,
      avg_loan_size: number | null,
      total_disbursed_amount: number | null
    }
  ],
  periods_by_person: [
    {
      person: string,
      periods: [...]  // Same structure as above
    }
  ]
}
```

## Các chỉ số báo cáo

### 1. Total Enquiries (Tổng đầu vào)
Tổng số khách hàng trong khoảng thời gian

### 2. MQL (Marketing Qualified Lead)
Khách hàng đã cho đủ 3 thông tin
- Bao gồm: MQL, SQL, Application, Approved, Rejected, Disbursed
- **MQL Rate**: Tỷ lệ % so với tổng đầu vào

### 3. SQL (Sales Qualified Lead)
Khách hàng đã xin phỏng
- Bao gồm: SQL, Application, Approved, Rejected, Disbursed
- **SQL Rate**: Tỷ lệ % so với tổng đầu vào

### 4. Application (Lên đơn)
Khách hàng đã lên đơn vay
- Bao gồm: Application, Approved, Rejected, Disbursed
- **App Rate**: Tỷ lệ % so với tổng đầu vào

### 5. Approved (Đã duyệt)
Số hồ sơ được phê duyệt

### 6. Disbursed (Giải ngân)
Số hồ sơ đã giải ngân thành công
- **Disbursed Rate**: Tỷ lệ % so với tổng đầu vào

### 7. Avg Loan Size (Số tiền vay trung bình)
Tổng tiền giải ngân / Số hồ sơ giải ngân

### 8. Total Disbursed Amount (Tổng tiền giải ngân)
Tổng số tiền đã giải ngân (VND)

## Tính năng UI

### 1. Period Type Selector
- 3 nút chuyển đổi nhanh: 📅 Ngày | 📊 Tuần | 📈 Tháng
- Tự động refresh dữ liệu khi chuyển đổi

### 2. Hai tab xem
- **📊 Tổng quan**: Báo cáo tổng hợp cho tất cả
- **👤 Theo người phụ trách**: Báo cáo chi tiết từng nhân viên CS

### 3. Summary Cards
Hiển thị tổng hợp các chỉ số quan trọng:
- Tổng đầu vào
- MQL (với % tổng)
- SQL (với % tổng)
- Lên đơn (với % tổng)
- Giải ngân (với % tổng)
- Tổng tiền giải ngân
- Avg Loan Size

### 4. Progress Bars
Hiển thị trực quan tỷ lệ chuyển đổi:
- 🟢 Xanh (≥30%): Tốt
- 🟡 Vàng (15-29%): Trung bình
- 🔴 Đỏ (<15%): Cần cải thiện

### 5. Bộ lọc
- Khoảng thời gian (Từ ngày - Đến ngày)
- Chi nhánh
- Người phụ trách
- Nguồn khách hàng
- Từ Ads

## Cách sử dụng

### Bước 1: Truy cập báo cáo
1. Vào trang **Quản lý Khách hàng**
2. Click tab **"Báo cáo (Daily/Weekly/Monthly)"**

### Bước 2: Chọn chế độ xem
- Click **📅 Ngày** để xem báo cáo theo ngày
- Click **📊 Tuần** để xem báo cáo theo tuần (mặc định)
- Click **📈 Tháng** để xem báo cáo theo tháng

### Bước 3: Áp dụng bộ lọc (tùy chọn)
1. Click nút **"Bộ lọc báo cáo"**
2. Chọn khoảng thời gian, chi nhánh, người phụ trách, v.v.
3. Click **"Áp dụng bộ lọc"**

### Bước 4: Xem chi tiết
- Tab **"Tổng quan"**: Xem báo cáo tổng hợp
- Tab **"Theo người phụ trách"**: Xem hiệu suất từng nhân viên

### Bước 5: Làm mới dữ liệu
- Click nút **"Làm mới"** để cập nhật báo cáo mới nhất

## Lợi ích

### 1. Linh hoạt
- Xem dữ liệu ở nhiều mức độ chi tiết khác nhau
- Phù hợp với nhiều mục đích phân tích

### 2. Trực quan
- Progress bars màu sắc dễ nhìn
- Summary cards nổi bật các chỉ số quan trọng
- Format ngày tháng dễ đọc

### 3. Hiệu quả
- So sánh hiệu suất giữa các khoảng thời gian
- Đánh giá hiệu suất từng nhân viên
- Phát hiện xu hướng và pattern

### 4. Hỗ trợ quyết định
- Dữ liệu rõ ràng, chính xác
- Nhiều góc nhìn khác nhau
- Dễ dàng xuất báo cáo

## Technical Notes

### Tính toán tuần
- Tuần bắt đầu từ **Thứ Hai** và kết thúc **Chủ Nhật**
- Theo chuẩn ISO 8601

### Tính toán tháng
- Từ ngày 1 đến ngày cuối tháng
- Tự động xử lý tháng có 28, 29, 30, hoặc 31 ngày

### Performance
- API được tối ưu với indexing trên trường `date`
- Sử dụng Map để group dữ liệu hiệu quả
- Lazy loading cho tab "Theo người phụ trách"

## Future Enhancements

### Có thể thêm
1. **Export Excel**: Xuất báo cáo ra file Excel
2. **Chart visualization**: Biểu đồ line/bar chart
3. **Comparison mode**: So sánh 2 khoảng thời gian
4. **Custom date ranges**: Chọn khoảng thời gian tùy ý
5. **Email reports**: Gửi báo cáo tự động qua email
6. **Saved filters**: Lưu bộ lọc thường dùng
7. **Quarter/Year view**: Báo cáo theo quý/năm
