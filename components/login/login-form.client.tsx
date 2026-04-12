"use client";

import { useState, useTransition, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { Tabs, Tab } from "@heroui/tabs";
import { addToast } from "@heroui/toast";
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
  signInWithGoogle,
} from "@/lib/actions/auth";

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Xác thực thất bại. Vui lòng thử lại.",
  profile_creation_failed: "Không thể tạo hồ sơ người dùng.",
};

// Lỗi từ OAuth redirect → show toast thay vì inline
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_inactive: "Email này chưa được cấp quyền truy cập hệ thống. Vui lòng liên hệ Admin.",
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
    if (!errorParam) return;

    if (OAUTH_ERROR_MESSAGES[errorParam]) {
      addToast({
        title: "Không thể đăng nhập",
        description: OAUTH_ERROR_MESSAGES[errorParam],
        color: "danger",
        timeout: 6000,
      });
    } else if (ERROR_MESSAGES[errorParam]) {
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

            <Button
              fullWidth
              size="lg"
              variant="bordered"
              onPress={() => startTransition(async () => { await signInWithGoogle(); })}
              isDisabled={isPending}
              startContent={
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              }
            >
              Đăng nhập với Google
            </Button>

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
