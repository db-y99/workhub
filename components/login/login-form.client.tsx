"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { GoogleIcon } from "@/components/icons";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  signInWithGoogle,
  signInWithEmailPassword,
} from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Xác thực thất bại. Vui lòng thử lại.",
  profile_creation_failed: "Không thể tạo hồ sơ người dùng.",
  account_inactive: "Tài khoản của bạn đã bị vô hiệu hóa.",
};

const INTERNAL_SUPPORT_TEXT =
  "Hệ thống nội bộ. Có vấn đề vui lòng liên hệ Admin hoặc IT.";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam]);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    startTransition(async () => {
      setError(null);
      const result = await signInWithGoogle();
      if (result?.error) setError(result.error);
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    startTransition(async () => {
      const result = await signInWithEmailPassword(email, password);

      if (result?.error) {
        setError(result.error);
        return;
      }

      await refresh();
      router.replace(ROUTES.APPROVE);
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-50 dark:from-primary-950 dark:via-background dark:to-secondary-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-6">
          <h1 className="text-4xl font-bold text-primary text-center">
            {siteConfig.name}
          </h1>
          <p className="text-sm text-default-500 text-center">
            {siteConfig.description}
          </p>
        </div>

        <Card className="w-full shadow-xl">
          <CardBody className="gap-4 px-6 pt-6 pb-6">
            <div className="text-center mb-2">
              <h2 className="text-xl font-semibold mb-1">Đăng nhập</h2>
              <p className="text-sm text-default-500">
                Nhập email và mật khẩu hoặc đăng nhập với Google
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <Input
                type="email"
                label="Email"
                value={email}
                onValueChange={setEmail}
                isRequired
                autoComplete="email"
                isDisabled={isPending}
              />

              <Input
                type="password"
                label="Mật khẩu"
                value={password}
                onValueChange={setPassword}
                isRequired
                autoComplete="current-password"
                isDisabled={isPending}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                color="primary"
                isLoading={isPending}
                isDisabled={isPending}
              >
                Đăng nhập
              </Button>
            </form>

            <Divider className="my-2" />

            <div className="text-center text-sm text-default-500">hoặc</div>

            <Button
              fullWidth
              size="lg"
              variant="bordered"
              startContent={
                <GoogleIcon className="text-default-700 dark:text-default-300" />
              }
              isLoading={isPending}
              className="border-2 font-medium"
            >
              Đăng nhập với Google
            </Button>

            <Divider className="my-2" />

            <div className="text-center">
              <p className="text-xs text-default-500">
                {INTERNAL_SUPPORT_TEXT}
              </p>
            </div>
          </CardBody>

          <CardFooter className="justify-center pb-6">
            <p className="text-xs text-default-400">
              © 2025 {siteConfig.name}. All rights reserved.
            </p>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-default-500">{INTERNAL_SUPPORT_TEXT}</p>
        </div>
      </div>
    </div>
  );
}
