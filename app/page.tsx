import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/actions/auth";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { CheckCircle2, LogIn, LayoutDashboard } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-50 px-4 py-12 dark:from-primary-950 dark:via-background dark:to-secondary-950">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-primary md:text-5xl">
            {siteConfig.name}
          </h1>
          <p className="mt-3 text-lg text-default-600">
            {siteConfig.description}
          </p>
        </div>

        <Card className="border border-default-200/50 bg-background/80 backdrop-blur">
          <CardBody className="gap-4 p-6">
            <p className="text-default-600">
              {user
                ? "Chào mừng bạn đã đăng nhập. Chọn Vào hệ thống để bắt đầu."
                : "Hệ thống nội bộ hỗ trợ quản lý và duyệt yêu cầu. Đăng nhập để sử dụng các tính năng."}
            </p>
            <ul className="flex flex-col gap-2 text-left text-sm text-default-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                Gửi và theo dõi yêu cầu
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                Duyệt / từ chối yêu cầu (admin)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                Quản lý phòng ban, nhân sự
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {!user && (
                <Button
                  as={Link}
                  href={ROUTES.LOGIN}
                  color="primary"
                  size="lg"
                  startContent={<LogIn className="h-5 w-5" />}
                >
                  Đăng nhập
                </Button>
              )}
              <Button
                as={Link}
                href={ROUTES.APPROVE}
                variant={user ? "solid" : "bordered"}
                color={user ? "primary" : "default"}
                size="lg"
                startContent={<LayoutDashboard className="h-5 w-5" />}
              >
                Vào hệ thống
              </Button>
            </div>
          </CardBody>
        </Card>

        <p className="text-xs text-default-400">
          Hệ thống nội bộ. Có vấn đề vui lòng liên hệ Admin hoặc IT.
        </p>
      </div>
    </div>
  );
}
