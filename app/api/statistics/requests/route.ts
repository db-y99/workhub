import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api-auth";
import {
  REQUEST_STATUS,
  REQUEST_STATUS_LABELS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

interface RequestRow {
  id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  department_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("requests")
      .select("id, status, created_at, approved_at, department_id")
      .is("deleted_at", null);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setDate(endDateTime.getDate() + 1);
      query = query.lt("created_at", endDateTime.toISOString());
    }

    const { data: requests, error: requestsError } = await query;

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      );
    }

    const requestList = (requests as RequestRow[]) || [];
    const total = requestList.length;
    const pending = requestList.filter((r) => r.status === REQUEST_STATUS.PENDING).length;
    const approved = requestList.filter((r) => r.status === REQUEST_STATUS.APPROVED).length;
    const rejected = requestList.filter((r) => r.status === REQUEST_STATUS.REJECTED).length;
    const cancelled = requestList.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length;

    const approvalRate =
      approved + rejected > 0
        ? ((approved / (approved + rejected)) * 100).toFixed(1)
        : "0";

    const statusDistribution = [
      { name: REQUEST_STATUS_LABELS[REQUEST_STATUS.APPROVED], value: approved, status: REQUEST_STATUS.APPROVED },
      { name: REQUEST_STATUS_LABELS[REQUEST_STATUS.PENDING], value: pending, status: REQUEST_STATUS.PENDING },
      { name: REQUEST_STATUS_LABELS[REQUEST_STATUS.REJECTED], value: rejected, status: REQUEST_STATUS.REJECTED },
      { name: REQUEST_STATUS_LABELS[REQUEST_STATUS.CANCELLED], value: cancelled, status: REQUEST_STATUS.CANCELLED },
    ].filter((item) => item.value > 0);

    const departmentStats = requestList.reduce<
      Record<
        string,
        {
          total: number;
          approved: number;
          pending: number;
          rejected: number;
          cancelled: number;
        }
      >
    >((acc, req) => {
      const deptId = req.department_id;
      if (!acc[deptId]) {
        acc[deptId] = {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
        };
      }
      acc[deptId].total++;
      if (req.status === REQUEST_STATUS.APPROVED) acc[deptId].approved++;
      if (req.status === REQUEST_STATUS.PENDING) acc[deptId].pending++;
      if (req.status === REQUEST_STATUS.REJECTED) acc[deptId].rejected++;
      if (req.status === REQUEST_STATUS.CANCELLED) acc[deptId].cancelled++;
      return acc;
    }, {});

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = requestList.filter(
      (r) => new Date(r.created_at) >= thirtyDaysAgo
    );

    return NextResponse.json({
      overview: {
        total,
        pending,
        approved,
        rejected,
        cancelled,
        approvalRate,
      },
      statusDistribution,
      departmentStats,
      recentActivity: {
        total: recentRequests.length,
        approved: recentRequests.filter((r) => r.status === REQUEST_STATUS.APPROVED).length,
        rejected: recentRequests.filter((r) => r.status === REQUEST_STATUS.REJECTED).length,
      },
    });
  } catch (error) {
    console.error("Error in statistics/requests API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
