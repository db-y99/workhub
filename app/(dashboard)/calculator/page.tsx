"use client";

import { Tabs, Tab } from "@heroui/tabs";
import { Calculator } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { OverdueCalculator } from "@/components/calculator/overdue-calculator.client";
import { SettlementCalculator } from "@/components/calculator/settlement-calculator.client";
import { title } from "@/components/primitives";
import { ROUTE_PERMISSION_MAP } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

const calculatorTabs = [
  {
    id: "overdue",
    label: "Tính quá hạn",
    content: <OverdueCalculator />,
  },
  {
    id: "settlement",
    label: "Tính thanh toán",
    content: <SettlementCalculator />,
  },
];

export default function CalculatorPage() {
  return (
    <PermissionGuard requiredPermissions={[ROUTE_PERMISSION_MAP[ROUTES.CALCULATOR]]}>
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8">
          <div className="mb-8">
            <h1 className={title()}>Calculator</h1>
            <p className="text-default-600 mt-4">
              Công cụ tính toán quá hạn và thanh toán.
            </p>
          </div>

          <Tabs
            aria-label="Calculator tabs"
            classNames={{
              tabList: "gap-4",
              cursor: "bg-primary",
              tab: "px-4 py-2",
              tabContent: "group-data-[selected=true]:text-primary",
            }}
          >
            {calculatorTabs.map((tab) => (
              <Tab
                key={tab.id}
                id={tab.id}
                title={
                  <div className="flex items-center gap-2">
                    <Calculator size={18} />
                    <span>{tab.label}</span>
                  </div>
                }
              >
                <div className="pt-6">{tab.content}</div>
              </Tab>
            ))}
          </Tabs>
        </div>
      </AppLayout>
    </PermissionGuard>
  );
}
