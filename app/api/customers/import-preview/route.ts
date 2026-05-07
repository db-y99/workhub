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
    // Function to normalize header by removing extra spaces and checking for matches
    const normalizeHeader = (header: string): keyof CustomerLeadInput | null => {
      const normalized = header.trim();
      
      // Direct mappings
      const directMapping: Record<string, keyof CustomerLeadInput> = {
        // Date fields
        "Ngày": "date",
        "Date": "date",
        
        // Time slot
        "Khung giờ": "time_slot",
        "Khung Giờ Khách Nhắn": "time_slot",
        "Time Slot": "time_slot",
        
        // Person in charge
        "Người phụ trách": "person_in_charge",
        "Quản trị viên phụ trách": "person_in_charge",
        "Person in Charge": "person_in_charge",
        
        // Customer names - map to customer_name (will also copy to facebook_name later)
        "Tên Facebook": "customer_name",
        "Facebook Name": "customer_name",
        "Tên thật khách hàng": "customer_name",
        "Tên khách hàng": "customer_name",
        "Customer Name": "customer_name",
        "Customer Name Tên khách hàng": "customer_name",
        "Họ và tên": "customer_name",
        "Full Name": "customer_name",
        "Name": "customer_name",
        
        // Contact info
        "Link khách hàng": "customer_link",
        "Customer Link": "customer_link",
        "SĐT KH": "phone_number",
        "Phone Number": "phone_number",
        "Phone Number SĐT KH": "phone_number",
        "Phone": "phone_number",
        
        // Branch
        "Chi nhánh": "branch",
        "Branch": "branch",
        "Branch Chi nhánh": "branch",
        
        // Loan info
        "Nhu cầu vay": "loan_amount",
        "Loan Amount": "loan_amount",
        "Loan Amount Requested": "loan_amount",
        "Loan Amount Requested Nhu cầu vay (VND)": "loan_amount",
        "Tài sản đảm bảo": "collateral_type",
        "Collateral Type": "collateral_type",
        "Collateral Type Tài sản đảm bảo": "collateral_type",
        
        // Source and status
        "Nguồn": "source",
        "Source": "source",
        "Source Nguồn (FB/Zalo/Tiktok/Giới thiệu/Khách đến cửa hàng)": "source",
        "Từ Ads": "from_ads",
        "From Ads": "from_ads",
        "From Ads TỪ ADS": "from_ads",
        "Trạng thái trao đổi": "engagement_status",
        "Engagement Status": "engagement_status",
        "Engagement Status Trạng thái trao đổi với KH": "engagement_status",
        "Tiến độ hồ sơ": "case_status",
        "Case Status": "case_status",
        "Case Status Tiến độ hồ sơ": "case_status",
        "Kết quả hồ sơ": "final_outcome",
        "Final Outcome": "final_outcome",
        "Final Application Outcomes": "final_outcome",
        "Final Application Outcomes Kết quả hồ sơ": "final_outcome",
        "Tình trạng": "lead_status",
        "Lead Status": "lead_status",
        "Lead Status (Enquiry/MQL/SQL/Application/Approved/Rejected/Disbursed) Tình trạng (đang tiếp nhận/MQL/SQL/lên đơn/duyệt đơn/từ chối/giải ngân": "lead_status",
        
        // Financial
        "Số tiền đã giải ngân": "disbursed_amount",
        "Disbursed Amount": "disbursed_amount",
        "Disbursed Amount Số tiền Đã giải ngân (VNĐ)": "disbursed_amount",
        
        // Additional info
        "Ghi chú": "remarks",
        "Remarks": "remarks",
        "Remarks Ghi chú": "remarks",
        "Liên hệ L2": "contact_l2",
        "Contact L2": "contact_l2",
        "Liên hệ L3": "contact_l3",
        "Contact L3": "contact_l3",
        "Tên người giới thiệu": "referrer_name",
        "Referrer Name": "referrer_name",
        "Referrer Name Tên người giới thiệu": "referrer_name",
        "SĐT người giới thiệu": "referrer_phone",
        "Referrer Phone": "referrer_phone",
        "Referrer Phone Sđt người giới thiệu Sđt người giới thiệu": "referrer_phone",
      };
      
      // Check direct mapping first
      if (directMapping[normalized]) {
        return directMapping[normalized];
      }
      
      // Fallback: check if header contains key phrases
      const lowerHeader = normalized.toLowerCase();
      
      if (lowerHeader.includes("customer name") || lowerHeader.includes("tên khách hàng")) {
        return "customer_name";
      }
      if (lowerHeader.includes("branch") && lowerHeader.includes("chi nhánh")) {
        return "branch";
      }
      if (lowerHeader.includes("loan amount") && lowerHeader.includes("nhu cầu vay")) {
        return "loan_amount";
      }
      if (lowerHeader.includes("collateral") && lowerHeader.includes("tài sản")) {
        return "collateral_type";
      }
      if (lowerHeader.includes("source") && lowerHeader.includes("nguồn")) {
        return "source";
      }
      if (lowerHeader.includes("from ads") || lowerHeader.includes("từ ads")) {
        return "from_ads";
      }
      if (lowerHeader.includes("engagement") && lowerHeader.includes("trạng thái trao đổi")) {
        return "engagement_status";
      }
      if (lowerHeader.includes("case status") && lowerHeader.includes("tiến độ")) {
        return "case_status";
      }
      if (lowerHeader.includes("final") && (lowerHeader.includes("outcome") || lowerHeader.includes("kết quả"))) {
        return "final_outcome";
      }
      if (lowerHeader.includes("lead status") && lowerHeader.includes("tình trạng")) {
        return "lead_status";
      }
      if (lowerHeader.includes("disbursed") && lowerHeader.includes("giải ngân")) {
        return "disbursed_amount";
      }
      if (lowerHeader.includes("remarks") && lowerHeader.includes("ghi chú")) {
        return "remarks";
      }
      if (lowerHeader.includes("referrer name") && lowerHeader.includes("người giới thiệu")) {
        return "referrer_name";
      }
      if (lowerHeader.includes("referrer phone") || (lowerHeader.includes("sđt") && lowerHeader.includes("giới thiệu"))) {
        return "referrer_phone";
      }
      if (lowerHeader.includes("khung giờ") || lowerHeader.includes("time slot")) {
        return "time_slot";
      }
      if ((lowerHeader.includes("quản trị") || lowerHeader.includes("person in charge")) && lowerHeader.includes("phụ trách")) {
        return "person_in_charge";
      }
      
      return null;
    };

    console.log("Excel headers found:", headers);
    console.log("Mapped fields:", headers.map(h => ({ header: h, mapped: normalizeHeader(h) })));

    // Convert rows to customer objects
    const customers: CustomerLeadInput[] = rows
      .map((row, index) => {
        // Skip completely empty rows
        const hasAnyData = row.some(cell => cell != null && String(cell).trim() !== "");
        if (!hasAnyData) {
          console.log(`Skipping empty row ${index + 2}`);
          return null;
        }
        
        const customer: Partial<CustomerLeadInput> = {};
        
        headers.forEach((header, colIndex) => {
          const fieldName = normalizeHeader(header);
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

        // Validation: Skip rows without required fields
        // 1. Must have customer_name
        // 2. Must have person_in_charge
        
        const hasCustomerName = customer.customer_name && customer.customer_name.trim() !== "";
        const hasPersonInCharge = customer.person_in_charge && customer.person_in_charge.trim() !== "";
        
        if (!hasCustomerName) {
          console.log(`Skipping row ${index + 2}: No customer name found`);
          console.log(`Row ${index + 2} data:`, row);
          return null;
        }
        
        if (!hasPersonInCharge) {
          console.log(`Skipping row ${index + 2}: No person in charge found`);
          console.log(`Row ${index + 2} data:`, row);
          return null;
        }
        
        // Copy customer_name to facebook_name for display
        if (!customer.facebook_name || customer.facebook_name.trim() === "") {
          customer.facebook_name = customer.customer_name;
        }

        return customer as CustomerLeadInput;
      })
      .filter((customer): customer is CustomerLeadInput => customer !== null); // Remove null entries

    const skippedRows = rows.length - customers.length;
    console.log(`Total rows: ${rows.length}, Valid customers: ${customers.length}, Skipped: ${skippedRows}`);

    return NextResponse.json({
      total: customers.length,
      sheet: sheetName,
      customers: customers,
      skipped: skippedRows,
      message: skippedRows > 0 ? `Đã bỏ qua ${skippedRows} dòng không có tên khách hàng hoặc dòng trống` : undefined,
    });

  } catch (error: any) {
    console.error("Import preview error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi xử lý file Excel" },
      { status: 500 }
    );
  }
}