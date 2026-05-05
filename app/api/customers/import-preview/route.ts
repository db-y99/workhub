import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { CustomerLeadInput } from "@/lib/actions/customer-leads";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      return NextResponse.json({ error: "File Excel phải có ít nhất 2 dòng (header + data)" }, { status: 400 });
    }

    // Get headers and data
    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    // Map Excel columns to our fields
    const columnMapping: Record<string, keyof CustomerLeadInput> = {
      // Date fields
      "Ngày": "date",
      "Date": "date",
      
      // Time slot
      "Khung giờ": "time_slot", 
      "Time Slot": "time_slot",
      
      // Person in charge
      "Người phụ trách": "person_in_charge",
      "Person in Charge": "person_in_charge",
      
      // Customer names
      "Tên Facebook": "facebook_name",
      "Facebook Name": "facebook_name",
      "Tên thật khách hàng": "customer_name",
      "Tên khách hàng": "customer_name",
      "Customer Name": "customer_name",
      "Họ và tên": "customer_name",
      "Full Name": "customer_name",
      "Name": "customer_name",
      
      // Contact info
      "Link khách hàng": "customer_link",
      "Customer Link": "customer_link",
      "SĐT KH": "phone_number",
      "Phone Number": "phone_number",
      "Phone": "phone_number",
      
      // Branch
      "Chi nhánh": "branch",
      "Branch": "branch",
      
      // Loan info
      "Nhu cầu vay": "loan_amount",
      "Loan Amount": "loan_amount",
      "Tài sản đảm bảo": "collateral_type",
      "Collateral Type": "collateral_type",
      
      // Source and status
      "Nguồn": "source",
      "Source": "source",
      "Từ Ads": "from_ads",
      "From Ads": "from_ads",
      "Trạng thái trao đổi": "engagement_status",
      "Engagement Status": "engagement_status",
      "Tiến độ hồ sơ": "case_status",
      "Case Status": "case_status",
      "Kết quả hồ sơ": "final_outcome",
      "Final Outcome": "final_outcome",
      "Tình trạng": "lead_status",
      "Lead Status": "lead_status",
      
      // Financial
      "Số tiền đã giải ngân": "disbursed_amount",
      "Disbursed Amount": "disbursed_amount",
      
      // Additional info
      "Ghi chú": "remarks",
      "Remarks": "remarks",
      "Liên hệ L2": "contact_l2",
      "Contact L2": "contact_l2",
      "Liên hệ L3": "contact_l3",
      "Contact L3": "contact_l3",
      "Tên người giới thiệu": "referrer_name",
      "Referrer Name": "referrer_name",
      "SĐT người giới thiệu": "referrer_phone",
      "Referrer Phone": "referrer_phone",
    };

    console.log("Excel headers found:", headers);
    console.log("Mapped fields:", headers.map(h => ({ header: h, mapped: columnMapping[h] })));

    // Convert rows to customer objects
    const customers: CustomerLeadInput[] = rows
      .filter(row => row.some(cell => cell != null && cell !== "")) // Skip empty rows
      .map((row, index) => {
        const customer: Partial<CustomerLeadInput> = {};
        
        headers.forEach((header, colIndex) => {
          const fieldName = columnMapping[header];
          if (fieldName && row[colIndex] != null) {
            let value = row[colIndex];
            
            // Skip empty values for time_slot and person_in_charge
            if ((fieldName === "time_slot" || fieldName === "person_in_charge") && 
                (!value || String(value).trim() === "")) {
              return;
            }
            
            // Handle different data types
            if (fieldName === "loan_amount" || fieldName === "disbursed_amount") {
              // Convert to number, remove any formatting
              const numStr = String(value).replace(/[^\d.-]/g, "");
              customer[fieldName] = numStr ? Number(numStr) : null;
            } else if (fieldName === "date") {
              // Handle date conversion
              if (typeof value === "number") {
                // Excel date serial number
                const date = XLSX.SSF.parse_date_code(value);
                customer[fieldName] = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
              } else {
                // String date - try to parse
                const dateStr = String(value);
                if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                  const [day, month, year] = dateStr.split('/');
                  customer[fieldName] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                } else {
                  customer[fieldName] = dateStr;
                }
              }
            } else {
              // For other fields, only set if not empty
              const stringValue = String(value).trim();
              if (stringValue !== "") {
                customer[fieldName] = stringValue;
              }
            }
          }
        });

        // Ensure required fields - check multiple possible name fields
        const hasCustomerName = customer.customer_name || 
                               customer.facebook_name || 
                               headers.some(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('tên'));
        
        if (!customer.customer_name) {
          // Try to use facebook_name as fallback
          if (customer.facebook_name) {
            customer.customer_name = customer.facebook_name;
          } else {
            console.log(`Row ${index + 2} data:`, row);
            console.log(`Row ${index + 2} customer object:`, customer);
            throw new Error(`Dòng ${index + 2}: Thiếu tên khách hàng. Headers: ${headers.join(', ')}`);
          }
        }

        return customer as CustomerLeadInput;
      });

    return NextResponse.json({
      total: customers.length,
      sheet: sheetName,
      customers: customers,
    });

  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi xử lý file Excel" },
      { status: 500 }
    );
  }
}