"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { Tabs, Tab } from "@heroui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  signInWithEmailPassword,
  sendOtpToEmail,
  verifyEmailOtp,
} from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Xác thực thất bại. Vui lòng thử lại.",
  profile_creation_failed: "Không thể tạo hồ sơ người dùng.",
  account_inactive: "Tài khoản của bạn đã bị vô hiệu hóa.",
};

const INTERNAL_SUPPORT_TEXT =
  "Hệ thống nội bộ. Có vấn đề vui lòng liên hệ Admin hoặc IT.";

type LoginMode = "password" | "otp";
type OtpStep = "email" | "verify";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<LoginMode>("password");
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam]);
    }
  }, [searchParams]);

  const handleEmailPasswordSubmit = (e: React.FormEvent) => {
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

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpSentMessage(null);

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    startTransition(async () => {
      const result = await sendOtpToEmail(email);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setOtpStep("verify");
      setOtpCode("");
      setOtpSentMessage("Mã OTP đã gửi đến email. Vui lòng kiểm tra hộp thư.");
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Vui lòng nhập đủ 6 số mã OTP.");
      return;
    }

    startTransition(async () => {
      const result = await verifyEmailOtp(email, otpCode);

      if (result?.error) {
        setError(result.error);
        return;
      }

      await refresh();
      router.replace(ROUTES.APPROVE);
    });
  };

  const handleBackToOtpEmail = () => {
    setOtpStep("email");
    setOtpCode("");
    setOtpSentMessage(null);
    setError(null);
  };

  const handleModeChange = (key: React.Key) => {
    setLoginMode(key as LoginMode);
    setError(null);
    setOtpStep("email");
    setOtpSentMessage(null);
    setOtpCode("");
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
                Email & mật khẩu hoặc email & mã OTP
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-950/20 border border-danger-200 dark:border-danger-800">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            {otpSentMessage && (
              <div className="p-3 rounded-lg bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800">
                <p className="text-sm text-success">{otpSentMessage}</p>
              </div>
            )}

            <Tabs
              selectedKey={loginMode}
              onSelectionChange={handleModeChange}
              fullWidth
              variant="bordered"
            >
              <Tab key="password" title="Email & mật khẩu">
                <form
                  onSubmit={handleEmailPasswordSubmit}
                  className="flex flex-col gap-4 mt-2"
                >
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
              </Tab>

              <Tab key="otp" title="Email & mã OTP">
                <div className="mt-2">
                  {otpStep === "email" ? (
                    <form
                      onSubmit={handleSendOtp}
                      className="flex flex-col gap-4"
                    >
                      <Input
                        type="email"
                        label="Email"
                        value={email}
                        onValueChange={setEmail}
                        isRequired
                        autoComplete="email"
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
                        Gửi mã OTP
                      </Button>
                    </form>
                  ) : (
                    <form
                      onSubmit={handleVerifyOtp}
                      className="flex flex-col gap-4"
                    >
                      <p className="text-sm text-default-500">
                        Mã OTP đã gửi đến <strong>{email}</strong>
                      </p>

                      <Input
                        type="text"
                        label="Mã OTP (6 số)"
                        value={otpCode}
                        onValueChange={(v) =>
                          setOtpCode(v.replace(/\D/g, "").slice(0, 6))
                        }
                        isRequired
                        autoComplete="one-time-code"
                        isDisabled={isPending}
                        placeholder="000000"
                        maxLength={6}
                        inputMode="numeric"
                      />

                      <Button
                        type="submit"
                        fullWidth
                        size="lg"
                        color="primary"
                        isLoading={isPending}
                        isDisabled={isPending || otpCode.length < 6}
                      >
                        Xác thực
                      </Button>

                      <Button
                        type="button"
                        fullWidth
                        variant="flat"
                        size="sm"
                        onPress={handleBackToOtpEmail}
                        isDisabled={isPending}
                      >
                        Đổi email khác
                      </Button>
                    </form>
                  )}
                </div>
              </Tab>
            </Tabs>

            <Divider className="my-2" />

            <div className="text-center">
              <p className="text-xs text-default-500">
                {INTERNAL_SUPPORT_TEXT}
              </p>
            </div>
          </CardBody>

          <CardFooter className="justify-center pb-6">
            <p className="text-xs text-default-400">
              © 2026 {siteConfig.name}. All rights reserved.
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
