"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Button } from "@heroui/button";
import { ShieldAlert, Home } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Permission code cần có (VD: users:view). User cần có ít nhất 1 trong số này. */
  requiredPermissions?: string[];
  fallbackPath?: string;
}

export function PermissionGuard({
  children,
  requiredPermissions = [],
  fallbackPath = ROUTES.APPROVE,
}: PermissionGuardProps) {
  const router = useRouter();
  const { currentUser, profile, hasPermission } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        if (!currentUser) {
          router.push(ROUTES.LOGIN);
          setIsChecking(false);
          return;
        }

        if (!profile) return;

        const ok =
          requiredPermissions.length === 0 ||
          requiredPermissions.some((p) => hasPermission(p));

        setAllowed(ok);
        setIsChecking(false);
      } catch (error) {
        console.error("Permission check error:", error);
        setAllowed(false);
        setIsChecking(false);
      }
    };

    check();
  }, [currentUser, profile, requiredPermissions, hasPermission, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardBody className="flex flex-col items-center justify-center p-8 gap-4">
            <Spinner size="lg" color="primary" />
            <p className="text-default-500">Đang kiểm tra quyền truy cập...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardBody className="flex flex-col items-center justify-center p-8 gap-6">
            <div className="p-4 bg-danger-50 rounded-full">
              <ShieldAlert size={48} className="text-danger" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Truy cập bị từ chối</h2>
              <p className="text-default-500">
                Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản
                trị viên nếu bạn cho rằng đây là lỗi.
              </p>
            </div>
            <Button
              color="primary"
              startContent={<Home size={18} />}
              onPress={() => router.push(fallbackPath)}
              size="lg"
            >
              Quay về trang chủ
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
