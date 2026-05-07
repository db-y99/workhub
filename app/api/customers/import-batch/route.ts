import { NextRequest, NextResponse } from "next/server";
import { createCustomerLead, CustomerLeadInput } from "@/lib/actions/customer-leads";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customers } = body as { customers: CustomerLeadInput[] };

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu khách hàng để import" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Import từng khách hàng
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      try {
        // Validate required fields
        if (!customer.customer_name) {
          throw new Error(`Thiếu tên khách hàng`);
        }

        const result = await createCustomerLead(customer);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Dòng ${i + 2}: ${error.message || "Lỗi không xác định"}`
        );
      }
    }

    return NextResponse.json({
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error: any) {
    console.error("Import batch error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Lỗi khi import dữ liệu",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
