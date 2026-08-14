import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";

/** เลื่อนทั้งช่วงวันโดยคงความยาวของช่วงเดิมไว้ */
export function shiftDateRange(range: DateRange, offsetDays: number, fallbackDate = new Date()): DateRange {
  const from = new Date(range.from ?? fallbackDate);
  const to = new Date(range.to ?? range.from ?? fallbackDate);
  from.setDate(from.getDate() + offsetDays);
  to.setDate(to.getDate() + offsetDays);
  return { from, to };
}

/** คืนจำนวนวันแบบ inclusive เพื่อสื่อสารช่วงที่ผู้ใช้เลือก */
export function getDateRangeLength(range: DateRange, fallbackDate = new Date()) {
  const from = startOfDay(range.from ?? fallbackDate);
  const to = startOfDay(range.to ?? range.from ?? fallbackDate);
  return Math.abs(differenceInCalendarDays(to, from)) + 1;
}
