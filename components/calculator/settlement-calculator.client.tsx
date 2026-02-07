"use client";

import { useState } from "react";
import * as z from "zod";
import { Calculator, Landmark, Percent } from "lucide-react";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";

const formSchema = z.object({
  principalAmount: z
    .string()
    .min(1, { message: "Vui lòng nhập số tiền." })
    .refine((val) => !isNaN(parseInt(val.replace(/,/g, ""), 10)), {
      message: "Số tiền không hợp lệ.",
    })
    .refine((val) => parseInt(val.replace(/,/g, ""), 10) > 0, {
      message: "Số tiền phải lớn hơn 0.",
    }),
  settlementPercentage: z
    .string()
    .min(1, { message: "Vui lòng nhập phần trăm." })
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Phần trăm không hợp lệ.",
    })
    .refine((val) => parseFloat(val) > 0 && parseFloat(val) <= 100, {
      message: "Phần trăm phải từ 0 đến 100.",
    }),
});

type TCalculationResult = {
  settlementAmount: number;
};

type TFormValues = z.infer<typeof formSchema>;

export function SettlementCalculator() {
  const [result, setResult] = useState<TCalculationResult | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [values, setValues] = useState<TFormValues>({
    principalAmount: "",
    settlementPercentage: "",
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

    const principalAmount = parseInt(
      parseResult.data.principalAmount.replace(/,/g, "")
    );
    const settlementPercentage = parseFloat(
      parseResult.data.settlementPercentage
    );

    const settlementAmount = Math.round(
      principalAmount * (settlementPercentage / 100)
    );

    setResult({ settlementAmount });
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

  const handlePrincipalAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formattedValue = formatNumberInput(e.target.value);
    setValues((prev) => ({ ...prev, principalAmount: formattedValue }));
    if (errors.principalAmount)
      setErrors((prev) => ({ ...prev, principalAmount: undefined }));
  };

  const handleSettlementPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setValues((prev) => ({ ...prev, settlementPercentage: value }));
    if (errors.settlementPercentage)
      setErrors((prev) => ({ ...prev, settlementPercentage: undefined }));
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="flex flex-col gap-1 pb-0 pt-6 px-6">
          <h3 className="text-2xl font-semibold">Tính Tiền Tất Toán</h3>
          <p className="text-sm text-default-500">
            Nhập số tiền gốc và phần trăm tất toán để xem chi tiết.
          </p>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardBody className="gap-4 px-6 pt-4 pb-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Số tiền gốc</label>
              <div className="relative">
                <Input
                  startContent={<Landmark className="h-5 w-5 text-default-400" />}
                  value={values.principalAmount}
                  onChange={handlePrincipalAmountChange}
                  placeholder="ví dụ: 10,000,000"
                  inputMode="numeric"
                  isInvalid={!!errors.principalAmount}
                  errorMessage={errors.principalAmount}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">% Tất toán</label>
              <div className="relative">
                <Input
                  startContent={<Percent className="h-5 w-5 text-default-400" />}
                  value={values.settlementPercentage}
                  onChange={handleSettlementPercentageChange}
                  placeholder="ví dụ: 30"
                  inputMode="decimal"
                  isInvalid={!!errors.settlementPercentage}
                  errorMessage={errors.settlementPercentage}
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
            <CardBody>
              <Divider className="my-4" />
              <div className="text-center">
                <p className="text-sm text-default-500">
                  Số tiền cần tất toán
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(result.settlementAmount)}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
