"use client";

import { Card, CardHeader, CardBody } from "@heroui/card";

export function SettingsContent() {
  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <Card className="w-full">
        <CardHeader>
          <div>
            <h1 className="text-2xl font-bold">Cài đặt</h1>
            <p className="text-small text-default-500 mt-1">
              Cài đặt hệ thống
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col items-center justify-center py-16 text-default-500">
            <p>Trang cài đặt đang trống.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
