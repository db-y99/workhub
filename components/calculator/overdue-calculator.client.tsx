"use client";

import { useState } from "react";
import * as z from "zod";
import {
  Calculator,
  CalendarDays,
  Coins,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";

const formSchema = z.object({
  dueAmount: z
    .string()
    .min(1, { message: "Vui lòng nhập số tiền." })
    .refine((val) => !isNaN(parseInt(val.replace(/,/g, ""), 10)), {
      message: "Số tiền không hợp lệ.",
    })
    .refine((val) => parseInt(val.replace(/,/g, ""), 10) > 0, {
      message: "Số tiền phải lớn hơn 0.",
    }),
  overdueDays: z
    .string()
    .min(1, { message: "Vui lòng nhập số ngày." })
    .refine((val) => /^\d+$/.test(val), {
      message: "Số ngày phải là một số nguyên.",
    })
    .refine((val) => parseInt(val, 10) > 0, {
      message: "Số ngày phải lớn hơn 0.",
    }),
});

type TCalculationResult = {
  averageDailyAmount: number;
  overduePerDay: number;
  totalOverdue: number;
};

type TFormValues = z.infer<typeof formSchema>;

export function OverdueCalculator() {
  const [result, setResult] = useState<TCalculationResult | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [values, setValues] = useState<TFormValues>({
    dueAmount: "",
    overdueDays: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TFormValues, string>>>(
    {}
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parseResult = formSchema.safeParse(values);

    if (!parseResult.success) {
      const fieldErrors: Partial<Record<keyof TFormValues, string>> = {};
      parseResult.error.issues.forEach((err) => {
        const path = err.path[0] as keyof TFormValues;
        if (path) fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const dueAmount = parseInt(parseResult.data.dueAmount.replace(/,/g, ""));
    const overdueDays = parseInt(parseResult.data.overdueDays);

    const AVERAGE_RATE = 1.099 / 100;
    const OVERDUE_MULTIPLIER = 1.5;

    const averageDailyAmount = dueAmount * AVERAGE_RATE;
    const overduePerDay = averageDailyAmount * OVERDUE_MULTIPLIER;
    const totalOverdue = overduePerDay * overdueDays;

    setResult({
      averageDailyAmount: Math.round(averageDailyAmount),
      overduePerDay: Math.round(overduePerDay),
      totalOverdue: Math.round(totalOverdue),
    });
    setAnimationKey((prev) => prev + 1);
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatNumberInput = (value: string) => {
    const numberValue = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numberValue)) return "";
    return new Intl.NumberFormat("en-US").format(numberValue);
  };

  const handleDueAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatNumberInput(e.target.value);
    setValues((prev) => ({ ...prev, dueAmount: formattedValue }));
    if (errors.dueAmount) setErrors((prev) => ({ ...prev, dueAmount: undefined }));
  };

  const handleOverdueDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setValues((prev) => ({ ...prev, overdueDays: value }));
    if (errors.overdueDays)
      setErrors((prev) => ({ ...prev, overdueDays: undefined }));
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="flex flex-col gap-1 pb-0 pt-6 px-6">
          <h3 className="text-2xl font-semibold">Tính Tiền Quá Hạn</h3>
          <p className="text-sm text-default-500">
            Nhập số tiền và ngày quá hạn để xem chi tiết.
          </p>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardBody className="gap-4 px-6 pt-4 pb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Số tiền đến hạn hàng tháng</label>
              <div className="relative">
                <Input
                  startContent={<Coins className="h-5 w-5 text-default-400" />}
                  value={values.dueAmount}
                  onChange={handleDueAmountChange}
                  placeholder="ví dụ: 1,000,000"
                  inputMode="numeric"
                  isInvalid={!!errors.dueAmount}
                  errorMessage={errors.dueAmount}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Số ngày quá hạn</label>
              <div className="relative">
                <Input
                  startContent={<CalendarDays className="h-5 w-5 text-default-400" />}
                  value={values.overdueDays}
                  onChange={handleOverdueDaysChange}
                  placeholder="ví dụ: 5"
                  inputMode="numeric"
                  isInvalid={!!errors.overdueDays}
                  errorMessage={errors.overdueDays}
                />
              </div>
            </div>
            <Button type="submit" color="primary" className="w-full font-semibold">
              <Calculator className="mr-2 h-5 w-5" />
              Tính toán
            </Button>
          </CardBody>
        </form>
      </Card>

      {result && (
        <div
          key={animationKey}
          className="animate-in fade-in-0 slide-in-from-bottom-10 duration-500"
        >
          <Card className="shadow-xl">
            <CardHeader>
              <h3 className="text-xl font-semibold">Chi Tiết Kết Quả</h3>
            </CardHeader>
            <CardBody className="gap-4">
              <div className="flex items-center justify-between rounded-lg bg-default-100 p-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-default-500" />
                  <span className="text-default-700">
                    Số tiền trung bình 1 ngày
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(result.averageDailyAmount)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-default-100 p-3">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-default-500" />
                  <span className="text-default-700">
                    Số tiền quá hạn 1 ngày
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(result.overduePerDay)}</span>
              </div>
              <Divider />
              <div className="text-center">
                <p className="text-sm text-default-500">Số tiền quá hạn</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(result.totalOverdue)}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
