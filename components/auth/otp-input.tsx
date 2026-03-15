"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const otpArray = value.split("").slice(0, length);
    while (otpArray.length < length) {
      otpArray.push("");
    }
    setOtp(otpArray);
  }, [value, length]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (disabled) return;

    const val = element.value.replace(/\D/g, "");
    if (val.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    const otpValue = newOtp.join("");
    onChange(otpValue);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (otpValue.length === length && onComplete) {
      onComplete(otpValue);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (disabled) return;

    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    const newOtp = new Array(length).fill("");
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }

    setOtp(newOtp);
    onChange(pasteData);

    if (pasteData.length === length && onComplete) {
      onComplete(pasteData);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <Input
          key={index}
          ref={(el: HTMLInputElement | null) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center"
          classNames={{
            input: "text-center text-lg font-semibold",
            inputWrapper: "h-12",
          }}
          disabled={disabled}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  onResend?: () => void;
  disabled?: boolean;
}

export function CountdownTimer({
  initialSeconds,
  onComplete,
  onResend,
  disabled = false,
}: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      onComplete?.();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, onComplete]);

  const handleResend = () => {
    if (disabled) return;
    setSeconds(initialSeconds);
    setIsActive(true);
    onResend?.();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const remainingSeconds = time % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const isResendDisabled = disabled || seconds > 0;

  return (
    <div className="flex items-center justify-between text-sm">
      {seconds > 0 ? (
        <span className="text-default-500">
          Gửi lại mã sau:{" "}
          <span className="font-mono font-semibold text-primary">
            {formatTime(seconds)}
          </span>
        </span>
      ) : (
        <span className="text-default-500">Chưa nhận được mã?</span>
      )}

      <Button
        size="sm"
        variant="light"
        color="primary"
        onPress={handleResend}
        disabled={isResendDisabled}
        className="min-w-0 px-2"
        isLoading={disabled}
        aria-label={seconds > 0 ? `Gửi lại sau ${formatTime(seconds)}` : "Gửi lại mã OTP"}
      >
        Gửi lại
      </Button>
    </div>
  );
}
