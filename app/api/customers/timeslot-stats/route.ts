import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TimeSlotStats {
  slot: string;
  count: number;
  percentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get filter params from URL
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    
    // Build query
    let query = supabase
      .from("customer_leads")
      .select("time_slot")
      .not("time_slot", "is", null);
    
    // Apply date filters
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date", dateTo);
    }
    
    const { data: customers, error } = await query;
    
    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!customers || customers.length === 0) {
      return NextResponse.json({
        slots: [
          { slot: "00:00 - 08:00", count: 0, percentage: 0 },
          { slot: "08:01 - 17:00", count: 0, percentage: 0 },
          { slot: "17:01 - 23:59", count: 0, percentage: 0 },
        ],
      });
    }
    
    // Categorize by time slot
    const slots = {
      morning: 0,   // 00:00 - 08:00
      daytime: 0,   // 08:01 - 17:00
      evening: 0,   // 17:01 - 23:59
    };
    
    customers.forEach((customer) => {
      const timeSlot = customer.time_slot;
      if (!timeSlot) return;
      
      // Parse time (format: HH:MM)
      const [hours, minutes] = timeSlot.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;
      
      // Categorize
      if (totalMinutes >= 0 && totalMinutes <= 480) {
        // 00:00 - 08:00 (0 - 480 minutes)
        slots.morning++;
      } else if (totalMinutes >= 481 && totalMinutes <= 1020) {
        // 08:01 - 17:00 (481 - 1020 minutes)
        slots.daytime++;
      } else if (totalMinutes >= 1021 && totalMinutes <= 1439) {
        // 17:01 - 23:59 (1021 - 1439 minutes)
        slots.evening++;
      }
    });
    
    const total = customers.length;
    
    const result: TimeSlotStats[] = [
      {
        slot: "00:00 - 08:00",
        count: slots.morning,
        percentage: total > 0 ? (slots.morning / total) * 100 : 0,
      },
      {
        slot: "08:01 - 17:00",
        count: slots.daytime,
        percentage: total > 0 ? (slots.daytime / total) * 100 : 0,
      },
      {
        slot: "17:01 - 23:59",
        count: slots.evening,
        percentage: total > 0 ? (slots.evening / total) * 100 : 0,
      },
    ];
    
    return NextResponse.json({ slots: result });
  } catch (error: any) {
    console.error("Error generating time slot stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
