"use client";

import { useState, useCallback } from "react";
import {
  Calculator,
  CalendarDays,
  Landmark,
  Percent,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScheduleRow = {
  period: number;
  days: number;
  paymentDate: Date;
  totalPayment: number;
  principalAtStart: number;
  principal: number;
  interest: number;
  managementFee: number;
  remainingPrincipal: number;
};

type Summary = {
  loanAmount: number;
  actualReceived: number;
  serviceFee: number;
  totalManagementFee: number;
  totalInterest: number;
  totalPayment: number;
  avgMonthlyPayment: number;
  hasManagementFee: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Math.round(value));
}

function formatNumberInput(value: string) {
  const n = parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("en-US").format(n);
}

function parseNumberInput(value: string) {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function parseDate(str: string): Date | null {
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
}

function formatDate(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function todayMidnight() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

function calculate(
  loanAmount: number,
  loanDate: Date,
  loanTerm: number,
  annualRatePct: number,
  serviceFeePercent: number,
  managementFeePct: number
): { schedule: ScheduleRow[]; summary: Summary } {
  const monthlyRate = annualRatePct / 12 / 100;
  const serviceFee = loanAmount * (serviceFeePercent / 100);
  const monthlyManagementFee = loanAmount * (managementFeePct / 100);
  const actualReceived = loanAmount - serviceFee;
  const monthlyPrincipal = loanAmount / loanTerm;

  let remainingPrincipal = loanAmount;
  let totalInterest = 0;
  let totalPayment = 0;
  const schedule: ScheduleRow[] = [];
  const today = todayMidnight();
  let previousDate = loanDate;

  for (let i = 1; i <= loanTerm; i++) {
    const paymentDate = addMonths(loanDate, i);

    let daysInPeriod: number;
    if (i === 1) {
      const startDate = today > loanDate ? today : loanDate;
      daysInPeriod =
        Math.round((paymentDate.getTime() - startDate.getTime()) / 86400000) + 1;
    } else {
      daysInPeriod = Math.round(
        (paymentDate.getTime() - previousDate.getTime()) / 86400000
      );
    }
    previousDate = paymentDate;

    const principalAtStart = remainingPrincipal;
    const monthlyInterest = remainingPrincipal * monthlyRate;
    const totalMonthlyPayment =
      monthlyPrincipal + monthlyInterest + monthlyManagementFee;

    remainingPrincipal -= monthlyPrincipal;
    totalInterest += monthlyInterest;
    totalPayment += totalMonthlyPayment;

    schedule.push({
      period: i,
      days: daysInPeriod,
      paymentDate,
      totalPayment: totalMonthlyPayment,
      principalAtStart,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      managementFee: monthlyManagementFee,
      remainingPrincipal: Math.max(0, remainingPrincipal),
    });
  }

  return {
    schedule,
    summary: {
      loanAmount,
      actualReceived,
      serviceFee,
      totalManagementFee: monthlyManagementFee * loanTerm,
      totalInterest,
      totalPayment,
      avgMonthlyPayment: totalPayment / loanTerm,
      hasManagementFee: monthlyManagementFee > 0,
    },
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoanScheduleCalculator() {
  const today = todayMidnight();

  const [loanAmount, setLoanAmount] = useState("");
  const [loanDate, setLoanDate] = useState(formatDate(today));
  const [loanTerm, setLoanTerm] = useState("6");
  const [annualRate, setAnnualRate] = useState("13.188");
  const [managementFee, setManagementFee] = useState("4.901");
  const [serviceFee, setServiceFee] = useState("10");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    schedule: ScheduleRow[];
    summary: Summary;
  } | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [showTable, setShowTable] = useState(false);

  const monthlyRate = (parseFloat(annualRate) || 0) / 12;

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!parseNumberInput(loanAmount)) errs.loanAmount = "Vui lòng nhập khoản vay.";
    if (!parseDate(loanDate)) errs.loanDate = "Ngày không hợp lệ (dd/mm/yyyy).";
    const term = parseInt(loanTerm, 10);
    if (!term || term < 1) errs.loanTerm = "Thời gian vay phải ≥ 1 tháng.";
    return errs;
  }, [loanAmount, loanDate, loanTerm]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const parsed = calculate(
      parseNumberInput(loanAmount),
      parseDate(loanDate)!,
      parseInt(loanTerm, 10),
      parseFloat(annualRate) || 0,
      parseFloat(serviceFee) || 0,
      parseFloat(managementFee) || 0
    );

    setResult(parsed);
    setAnimationKey((k) => k + 1);
    setShowTable(false);
  }

  return (
    <div className="w-full space-y-6">
      {/* Input card */}
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col gap-1 pb-0 pt-6 px-6">
          <h3 className="text-2xl font-semibold">Lịch Trả Nợ</h3>
          <p className="text-sm text-default-500">
            Nhập thông tin khoản vay để tạo lịch trả nợ tham khảo.
          </p>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardBody className="gap-4 px-6 pt-4 pb-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Khoản vay */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Khoản vay (VNĐ)</label>
                <Input
                  startContent={<Landmark className="h-4 w-4 text-default-400" />}
                  value={loanAmount}
                  onChange={(e) => {
                    setLoanAmount(formatNumberInput(e.target.value));
                    if (errors.loanAmount) setErrors((p) => ({ ...p, loanAmount: "" }));
                  }}
                  placeholder="ví dụ: 10,000,000"
                  inputMode="numeric"
                  isInvalid={!!errors.loanAmount}
                  errorMessage={errors.loanAmount}
                />
              </div>

              {/* Ngày vay */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Ngày vay (dd/mm/yyyy)</label>
                <Input
                  startContent={<CalendarDays className="h-4 w-4 text-default-400" />}
                  value={loanDate}
                  onChange={(e) => {
                    setLoanDate(e.target.value);
                    if (errors.loanDate) setErrors((p) => ({ ...p, loanDate: "" }));
                  }}
                  placeholder="dd/mm/yyyy"
                  isInvalid={!!errors.loanDate}
                  errorMessage={errors.loanDate}
                />
              </div>

              {/* Thời gian vay */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Thời gian vay (tháng)</label>
                <Input
                  value={loanTerm}
                  onChange={(e) => {
                    setLoanTerm(e.target.value.replace(/[^0-9]/g, ""));
                    if (errors.loanTerm) setErrors((p) => ({ ...p, loanTerm: "" }));
                  }}
                  placeholder="6"
                  inputMode="numeric"
                  isInvalid={!!errors.loanTerm}
                  errorMessage={errors.loanTerm}
                />
              </div>

              {/* Lãi suất */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Lãi suất (%/năm)</label>
                <Input
                  startContent={<Percent className="h-4 w-4 text-default-400" />}
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  placeholder="13.188"
                  inputMode="decimal"
                />
                <p className="text-xs text-default-400">
                  Lãi suất tháng:{" "}
                  <span className="font-medium text-default-600">
                    {monthlyRate.toFixed(3)}%
                  </span>
                </p>
              </div>

              {/* Phí quản lý */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Phí quản lý (%)</label>
                <Input
                  startContent={<Percent className="h-4 w-4 text-default-400" />}
                  value={managementFee}
                  onChange={(e) => setManagementFee(e.target.value)}
                  placeholder="4.901"
                  inputMode="decimal"
                />
                <p className="text-xs text-default-400">Thu hàng tháng</p>
              </div>

              {/* Phí ban đầu */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Phí ban đầu (%)</label>
                <Input
                  startContent={<Percent className="h-4 w-4 text-default-400" />}
                  value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)}
                  placeholder="10"
                  inputMode="decimal"
                />
              </div>
            </div>

            <Button type="submit" color="primary" className="w-full font-semibold mt-2">
              <Calculator className="mr-2 h-5 w-5" />
              Tính lịch trả nợ
            </Button>
          </CardBody>
        </form>
      </Card>

      {/* Results */}
      {result && (
        <div
          key={animationKey}
          className="animate-in fade-in-0 slide-in-from-bottom-10 duration-500 space-y-6"
        >
          {/* Summary */}
          <Card className="shadow-xl">
            <CardHeader>
              <h3 className="text-xl font-semibold">Tóm tắt khoản vay</h3>
            </CardHeader>
            <CardBody className="gap-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <SummaryItem label="Khoản vay" value={formatVND(result.summary.loanAmount)} />
                <SummaryItem label="Số tiền thực nhận" value={formatVND(result.summary.actualReceived)} />
                <SummaryItem label="Phí ban đầu (một lần)" value={formatVND(result.summary.serviceFee)} />
                {result.summary.hasManagementFee && (
                  <SummaryItem
                    label="Tổng phí quản lý (hàng tháng)"
                    value={formatVND(result.summary.totalManagementFee)}
                  />
                )}
                <SummaryItem label="Tổng lãi phải trả" value={formatVND(result.summary.totalInterest)} />
                <SummaryItem label="Tổng tiền phải trả" value={formatVND(result.summary.totalPayment)} highlight />
                <SummaryItem label="Thanh toán hàng tháng (TB)" value={formatVND(result.summary.avgMonthlyPayment)} />
              </div>
            </CardBody>
          </Card>

          {/* Schedule table */}
          <Card className="shadow-xl">
            <CardHeader className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold">Lịch trả nợ tham khảo</h3>
                <p className="text-xs text-default-400 mt-0.5">Có giá trị trong ngày</p>
              </div>
              <Button
                variant="flat"
                size="sm"
                onPress={() => setShowTable((v) => !v)}
                endContent={
                  showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                }
              >
                {showTable ? "Ẩn bảng" : "Xem bảng"}
              </Button>
            </CardHeader>

            {showTable && (
              <CardBody className="p-0">
                <Divider />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        {[
                          "STT",
                          "Số ngày",
                          "Ngày đóng tiền",
                          "Tiền TT hàng kỳ",
                          "Nợ gốc đầu kỳ",
                          "Tiền gốc",
                          "Tiền lãi",
                          "Phí quản lý",
                          "Nợ gốc cuối kỳ",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-3 text-center font-semibold whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.schedule.map((row, idx) => (
                        <tr
                          key={row.period}
                          className={
                            idx % 2 === 0
                              ? "bg-default-50 hover:bg-default-100 transition-colors"
                              : "hover:bg-default-100 transition-colors"
                          }
                        >
                          <td className="px-3 py-2.5 text-center font-medium">
                            {row.period}
                          </td>
                          <td className="px-3 py-2.5 text-center">{row.days}</td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {formatDate(row.paymentDate)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                            {formatVND(row.totalPayment)}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {formatVND(row.principalAtStart)}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {formatVND(row.principal)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-primary whitespace-nowrap">
                            {formatVND(row.interest)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-primary whitespace-nowrap">
                            {formatVND(row.managementFee)}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {formatVND(row.remainingPrincipal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-default-100 p-3 gap-2">
      <span className="text-default-600 text-sm">{label}</span>
      {highlight ? (
        <Chip color="primary" variant="flat" size="sm" className="font-bold text-sm">
          {value}
        </Chip>
      ) : (
        <span className="font-semibold text-sm text-right">{value}</span>
      )}
    </div>
  );
}
