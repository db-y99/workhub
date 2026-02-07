"use client";

import { Tabs, Tab } from "@heroui/tabs";
import { Calculator } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { OverdueCalculator } from "@/components/calculator/overdue-calculator.client";
import { SettlementCalculator } from "@/components/calculator/settlement-calculator.client";
import { title } from "@/components/primitives";

const calculatorTabs = [
  {
    id: "overdue",
    label: "Overdue Calculator",
    content: <OverdueCalculator />,
  },
  {
    id: "settlement",
    label: "Settlement Calculator",
    content: <SettlementCalculator />,
  },
];

export default function CalculatorPage() {
  return (
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
  );
}
