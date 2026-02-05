"use client";

import { useState } from "react";
import { DateRangePicker } from "./date-range-picker";
import { Card, CardBody } from "@heroui/card";

export function DateRangePickerExample() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    console.log("Selected range:", { start, end });
  };

  return (
    <Card className="max-w-md">
      <CardBody>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Chọn khoảng thời gian
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              placeholder="Chọn ngày bắt đầu và kết thúc"
            />
          </div>

          {startDate && endDate && (
            <div className="text-sm text-default-500">
              <p>
                <strong>Từ:</strong> {startDate.toLocaleDateString("vi-VN")}
              </p>
              <p>
                <strong>Đến:</strong> {endDate.toLocaleDateString("vi-VN")}
              </p>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

