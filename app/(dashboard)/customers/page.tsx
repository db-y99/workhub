"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { ImportExcelContent } from "@/components/customers/import-excel.client";
import { LeadsManagerContent } from "@/components/customers/leads-manager.client";
import { getCustomerLeads } from "@/lib/actions/customer-leads";
import { getBranches } from "@/lib/actions/branches";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { Tabs, Tab } from "@heroui/tabs";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";

export default function CustomersPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canImport = hasPermission(ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_IMPORT]);
  const canViewLeads = hasPermission(ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_LEADS]);

  useEffect(() => {
    if (!canViewLeads) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [{ data: leadsData, count }, { data: branchesData }] = await Promise.all([
        getCustomerLeads({ page: 1, pageSize: 10 }),
        getBranches(),
      ]);
      setLeads(leadsData || []);
      setTotal(count ?? 0);
      setBranches(branchesData || []);
      setLoading(false);
    };
    fetchData();
  }, [canViewLeads]);

  const getActiveTab = () => {
    const tab = searchParams.get("tab");
    if (tab === "leads" && canViewLeads) return "leads";
    if (canImport) return "import";
    if (canViewLeads) return "leads";
    return "import";
  };

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "import") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <PermissionGuard
      requiredPermissions={[
        ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_IMPORT],
        ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_LEADS],
      ]}
    >
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Khách hàng</h1>
            <p className="text-default-500 mt-1">
              Import và quản lý thông tin khách hàng vay vốn
            </p>
          </div>

          <Tabs
            aria-label="Customer tabs"
            color="primary"
            variant="underlined"
            selectedKey={getActiveTab()}
            onSelectionChange={(key) => handleTabChange(key as string)}
          >
            {canImport ? (
              <Tab key="import" title="Import Excel">
                <div className="pt-4">
                  <ImportExcelContent />
                </div>
              </Tab>
            ) : null}
            {canViewLeads ? (
              <Tab key="leads" title="Danh sách Khách hàng">
                <div className="pt-4">
                  {loading ? (
                    <div className="text-center py-8 text-default-500">Đang tải...</div>
                  ) : (
                    <LeadsManagerContent
                      initialLeads={leads}
                      initialTotal={total}
                      branches={branches}
                    />
                  )}
                </div>
              </Tab>
            ) : null}
          </Tabs>
        </div>
      </AppLayout>
    </PermissionGuard>
  );
}
