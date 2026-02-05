import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import {
  RESOURCE_TYPE,
  RESOURCE_TYPE_LABELS,
} from "@/constants/resources";

export const dynamic = "force-dynamic";

const VALID_TYPES = Object.values(RESOURCE_TYPE);

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();

    const { data: resources, error } = await supabase
      .from("company_resources")
      .select("id, type, assigned_to")
      .is("deleted_at", null);

    if (error) {
      console.error("Error fetching company_resources:", error);
      return NextResponse.json(
        { error: "Failed to fetch resources" },
        { status: 500 }
      );
    }

    const list = resources ?? [];
    const total = list.length;

    const byType = list.reduce<Record<string, number>>((acc, r) => {
      const t = r.type ?? RESOURCE_TYPE.OTHER;
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});

    const assigned = list.filter((r) => r.assigned_to != null).length;
    const unassigned = total - assigned;

    const typeBreakdown = VALID_TYPES.map((type) => ({
      type,
      label: RESOURCE_TYPE_LABELS[type],
      count: byType[type] ?? 0,
    }));

    return NextResponse.json({
      overview: {
        total,
        assigned,
        unassigned,
      },
      byType,
      typeBreakdown,
    });
  } catch (error) {
    console.error("Error in statistics/resources API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
