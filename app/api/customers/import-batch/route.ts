import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/actions/auth";
import { CustomerLeadInput } from "@/lib/actions/customer-leads";

const BATCH_SIZE = 50; // Insert 50 records at a time

export async function POST(request: NextRequest) {
  try {
    const { customers }: { customers: CustomerLeadInput[] } = await request.json();

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu để import" }, { status: 400 });
    }

    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      
      // Prepare batch data with created_by
      const batchData = batch.map(customer => ({
        ...customer,
        created_by: user.id,
      }));

      try {
        const { data, error } = await supabase
          .from("customer_leads")
          .insert(batchData)
          .select();

        if (error) {
          // Handle individual errors
          batch.forEach((_, index) => {
            failedCount++;
            errors.push(`Dòng ${i + index + 1}: ${error.message}`);
          });
        } else {
          successCount += data?.length || 0;
        }
      } catch (batchError: any) {
        // Handle batch errors
        batch.forEach((_, index) => {
          failedCount++;
          errors.push(`Dòng ${i + index + 1}: ${batchError.message}`);
        });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 100), // Limit errors to first 100
      total: customers.length,
    });

  } catch (error: any) {
    console.error("Import batch error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi khi import dữ liệu" },
      { status: 500 }
    );
  }
}