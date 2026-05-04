"use client";

import { useState } from "react";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody } from "@heroui/card";
import { Building2, Trash2 } from "lucide-react";

import { BranchesContent } from "./branches-content.client";
import { DeletedBranchesContent } from "./deleted-branches-content.client";

export function BranchesManager() {
  const [selectedTab, setSelectedTab] = useState("all");

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="text-primary" size={32} />
            Quản lý chi nhánh
          </h1>
          <p className="text-default-500 mt-2">
            Quản lý thông tin chi nhánh của công ty
          </p>
        </div>

        <Card>
          <CardBody className="p-0">
            <Tabs
              aria-label="Tabs quản lý chi nhánh"
              selectedKey={selectedTab}
              onSelectionChange={(key) => setSelectedTab(key as string)}
              classNames={{
                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                cursor: "w-full bg-primary",
                tab: "max-w-fit px-6 h-12",
                tabContent: "group-data-[selected=true]:text-primary"
              }}
            >
              <Tab
                key="all"
                title={
                  <div className="flex items-center gap-2">
                    <Building2 size={18} />
                    <span>Tất cả chi nhánh</span>
                  </div>
                }
              >
                <div className="p-6">
                  <BranchesContent />
                </div>
              </Tab>
              <Tab
                key="deleted"
                title={
                  <div className="flex items-center gap-2">
                    <Trash2 size={18} />
                    <span>Đã xóa</span>
                  </div>
                }
              >
                <div className="p-6">
                  <DeletedBranchesContent />
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}