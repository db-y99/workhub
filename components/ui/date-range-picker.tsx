"use client";

import { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { RangeCalendar } from "@heroui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  CalendarDate,
  parseDate,
  today,
  getLocalTimeZone,
} from "@internationalized/date";
import type { RangeValue, DateValue } from "@heroui/calendar";

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange?: (startDate: Date, endDate: Date) => void;
  placeholder?: string;
}

export function DateRangePicker({
  startDate: initialStartDate,
  endDate: initialEndDate,
  onChange,
  placeholder = "Chọn khoảng thời gian",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert Date to CalendarDate (dùng format local, tránh lệch ngày do UTC)
  const dateToCalendarDate = (date?: Date): CalendarDate | undefined => {
    if (!date) return undefined;
    return parseDate(format(date, "yyyy-MM-dd"));
  };

  // Convert CalendarDate to Date
  const calendarDateToDate = (date: CalendarDate): Date => {
    return date.toDate(getLocalTimeZone());
  };

  // Initialize range value
  const [value, setValue] = useState<RangeValue<DateValue> | null>(() => {
    if (initialStartDate && initialEndDate) {
      return {
        start: dateToCalendarDate(initialStartDate)!,
        end: dateToCalendarDate(initialEndDate)!,
      };
    }
    return null;
  });

  const [tempValue, setTempValue] = useState<RangeValue<DateValue> | null>(
    value
  );
  // Convert DateValue to CalendarDate
  const toCalendarDate = (date: DateValue): CalendarDate => {
    if ("hour" in date) {
      // It's a CalendarDateTime, convert to CalendarDate
      return new CalendarDate(date.year, date.month, date.day);
    }
    return date as CalendarDate;
  };

  const [focusedMonth, setFocusedMonth] = useState<CalendarDate>(() => {
    if (value?.start) {
      return toCalendarDate(value.start);
    }
    return today(getLocalTimeZone());
  });

  // Format date for display
  const formatDate = (date: CalendarDate) => {
    return `${date.day.toString().padStart(2, "0")} / ${date.month.toString().padStart(2, "0")} / ${date.year}`;
  };

  // Display value
  const displayValue = useMemo(() => {
    if (!tempValue) return placeholder;
    return `${formatDate(tempValue.start as CalendarDate)} - ${formatDate(tempValue.end as CalendarDate)}`;
  }, [tempValue, placeholder]);

  // Handle range change
  const handleRangeChange = (newValue: RangeValue<DateValue> | null) => {
    setTempValue(newValue);
    // Update focused month to show the selected range
    if (newValue?.start) {
      setFocusedMonth(toCalendarDate(newValue.start));
    }
  };

  // Quick select handlers
  const handleQuickSelect = (type: string) => {
    const now = today(getLocalTimeZone());
    let start: CalendarDate = now;
    let end: CalendarDate = now;

    switch (type) {
      case "today":
        start = now;
        end = now;
        break;
      case "yesterday":
        start = now.subtract({ days: 1 });
        end = now.subtract({ days: 1 });
        break;
      case "last7days":
        start = now.subtract({ days: 6 });
        end = now;
        break;
      case "last14days":
        start = now.subtract({ days: 13 });
        end = now;
        break;
      case "last30days":
        start = now.subtract({ days: 29 });
        end = now;
        break;
      case "thisWeek":
        // Start from Monday
        const dayOfWeek = now.toDate(getLocalTimeZone()).getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = now.subtract({ days: daysFromMonday });
        end = now;
        break;
      case "lastWeek":
        const currentDayOfWeek = now.toDate(getLocalTimeZone()).getDay();
        const daysToLastSunday = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
        end = now.subtract({ days: daysToLastSunday });
        start = end.subtract({ days: 6 });
        break;
      case "thisMonth":
        start = now.set({ day: 1 });
        end = now;
        break;
      case "lastMonth":
        const lastMonthDate = now.subtract({ months: 1 });
        start = lastMonthDate.set({ day: 1 });
        const lastDayOfLastMonth = now.set({ day: 1 }).subtract({ days: 1 });
        end = lastDayOfLastMonth;
        break;
      default:
        return;
    }

    setTempValue({ start, end });
    setFocusedMonth(start); // Navigate calendar to the start date
  };

  // Handle update
  const handleUpdate = () => {
    if (tempValue?.start && tempValue?.end) {
      setValue(tempValue);
      onChange?.(
        calendarDateToDate(tempValue.start as CalendarDate),
        calendarDateToDate(tempValue.end as CalendarDate)
      );
      setIsOpen(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setTempValue(value);
    setFocusedMonth(
      value?.start ? toCalendarDate(value.start) : today(getLocalTimeZone())
    );
    setIsOpen(false);
  };

  // Handle open change
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempValue(value);
      setFocusedMonth(
        value?.start ? toCalendarDate(value.start) : today(getLocalTimeZone())
      );
    }
    setIsOpen(open);
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="bottom-start"
    >
      <PopoverTrigger>
        <Button
          variant="bordered"
          className="w-full justify-start text-left font-normal"
          startContent={<CalendarIcon size={16} />}
        >
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="flex">
          {/* Calendar Section */}
          <div className="p-4">
            <RangeCalendar
              value={tempValue as React.ComponentProps<typeof RangeCalendar>["value"]}
              onChange={handleRangeChange}
              visibleMonths={2}
              pageBehavior="visible"
              focusedValue={focusedMonth as React.ComponentProps<typeof RangeCalendar>["focusedValue"]}
              onFocusChange={setFocusedMonth as React.ComponentProps<typeof RangeCalendar>["onFocusChange"]}
              classNames={{
                base: "gap-4",
              }}
            />
          </div>

          {/* Quick Select Section */}
          <div className="border-l border-divider p-4 w-48">
            <div className="flex flex-col gap-1">
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("today")}
              >
                Today
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("yesterday")}
              >
                Yesterday
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("last7days")}
              >
                Last 7 days
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("last14days")}
              >
                Last 14 days
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("last30days")}
              >
                Last 30 days
              </Button>
              <Divider className="my-2" />
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("thisWeek")}
              >
                This Week
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("lastWeek")}
              >
                Last Week
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("thisMonth")}
              >
                This Month
              </Button>
              <Button
                variant="light"
                size="sm"
                className="justify-start"
                onPress={() => handleQuickSelect("lastMonth")}
              >
                Last Month
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-divider p-3 flex justify-end gap-2">
          <Button variant="light" size="sm" onPress={handleCancel}>
            Cancel
          </Button>
          <Button
            color="primary"
            size="sm"
            onPress={handleUpdate}
            isDisabled={!tempValue?.start || !tempValue?.end}
          >
            Update
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
