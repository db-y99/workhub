"use client";

import { useState, useTransition, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { Tabs, Tab } from "@heroui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/lib/contexts/auth-context";
import { OtpInput, CountdownTimer } from "@/components/auth/otp-input";
import {
  signInWithEmailPassword,
  sendOtpToEmail,
  verifyEmailOtp,
  resendOtp,
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
  const [showResendTimer, setShowResendTimer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      setOtpSentMessage(result.message || "Mã OTP đã gửi đến email.");
      setShowResendTimer(true);
    });
  };

  const handleVerifyOtp = (code?: string) => {
    const codeToVerify = code || otpCode;
    setError(null);

    if (!codeToVerify.trim() || codeToVerify.trim().length < 6) {
      setError("Vui lòng nhập đủ 6 số mã OTP.");
      return;
    }

    startTransition(async () => {
      const result = await verifyEmailOtp(email, codeToVerify);
      if (result?.error) {
        setError(result.error);
        return;
      }
      await refresh();
      router.replace(ROUTES.APPROVE);
    });
  };

  const handleResendOtp = () => {
    setError(null);
    setOtpSentMessage(null);

    startTransition(async () => {
      const result = await resendOtp(email);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }

      setOtpCode("");
      setOtpSentMessage(result?.message || "Mã OTP mới đã được gửi.");
      setShowResendTimer(false);
      setTimeout(() => setShowResendTimer(true), 100);
    });
  };

  const handleBackToOtpEmail = () => {
    setOtpStep("email");
    setOtpCode("");
    setOtpSentMessage(null);
    setError(null);
    setShowResendTimer(false);
  };

  const handleModeChange = (key: React.Key) => {
    setLoginMode(key as LoginMode);
    setError(null);
    setOtpStep("email");
    setOtpSentMessage(null);
    setOtpCode("");
    setShowResendTimer(false);
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
                    type={showPassword ? "text" : "password"}
                    label="Mật khẩu"
                    value={password}
                    onValueChange={setPassword}
                    isRequired
                    autoComplete="current-password"
                    isDisabled={isPending}
                    endContent={
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        onPress={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="min-w-0"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    }
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
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-default-500 text-center">
                        Mã OTP đã gửi đến <strong>{email}</strong>
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Nhập mã OTP (6 số)
                          </label>
                          <OtpInput
                            value={otpCode}
                            onChange={setOtpCode}
                            onComplete={handleVerifyOtp}
                            disabled={isPending}
                          />
                        </div>

                        {showResendTimer && (
                          <div className="space-y-2">
                            <CountdownTimer
                              initialSeconds={60}
                              onResend={handleResendOtp}
                              disabled={isPending}
                            />
                            <div className="text-center">
                              <p className="text-xs text-default-400">
                                Không nhận được email? Kiểm tra thư mục spam hoặc
                                thử gửi lại
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        fullWidth
                        size="lg"
                        color="primary"
                        onPress={() => handleVerifyOtp()}
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
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>

            <Divider className="my-2" />

            <div className="text-center">
              <p className="text-xs text-default-500">{INTERNAL_SUPPORT_TEXT}</p>
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
