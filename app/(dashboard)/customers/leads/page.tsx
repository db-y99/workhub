import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { LeadsManagerContent } from "@/components/customers/leads-manager.client";
import { getCustomerLeads } from "@/lib/actions/customer-leads";
import { getBranches } from "@/lib/actions/branches";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export default async function CustomerLeadsPage() {
  const [leadsResult, branchesResult] = await Promise.all([
    getCustomerLeads({ page: 1, pageSize: 10 }),
    getBranches(),
  ]);

  const leads = leadsResult.data ?? [];
  const count = leadsResult.count ?? 0;
  const branches = branchesResult.data ?? [];

  if (leadsResult.error) {
    console.error('Error loading leads:', leadsResult.error);
  }

  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.CUSTOMERS_LEADS]]}>
      <AppLayout>
        <LeadsManagerContent
          initialLeads={leads as any}
          initialTotal={count}
          branches={branches}
        />
      </AppLayout>
    </PermissionGuard>
  );
}