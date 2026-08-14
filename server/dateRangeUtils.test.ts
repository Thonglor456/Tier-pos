import { describe, expect, it } from "vitest";
import { getDateRangeLength, shiftDateRange } from "@/lib/dateRangeUtils";

describe("date range utilities", () => {
  it("keeps the selected range length when moving backward or forward", () => {
    const original = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 7) };
    const shifted = shiftDateRange(original, -7);

    expect(shifted.from).toEqual(new Date(2026, 6, 25));
    expect(shifted.to).toEqual(new Date(2026, 6, 31));
    expect(getDateRangeLength(shifted)).toBe(7);
  });

  it("treats a one-day selection as one day", () => {
    const date = new Date(2026, 7, 14);
    expect(getDateRangeLength({ from: date, to: date })).toBe(1);
  });
});
