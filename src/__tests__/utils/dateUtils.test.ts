import { calculateConsecutiveDays } from "@/utils/dateUtils";

describe("calculateConsecutiveDays", () => {
  it("should return 1 for a single date", () => {
    const dates = [new Date("2025-02-14").getTime()];
    expect(calculateConsecutiveDays(dates)).toBe(1);
  });

  it("should return correct count for consecutive dates", () => {
    const dates = [
      new Date("2025-02-14").getTime(),
      new Date("2025-02-15").getTime(),
      new Date("2025-02-16").getTime(),
    ];
    expect(calculateConsecutiveDays(dates)).toBe(3);
  });

  it("should handle non-consecutive dates", () => {
    const dates = [
      new Date("2025-02-14").getTime(),
      new Date("2025-02-15").getTime(),
      new Date("2025-02-17").getTime(),
    ];
    expect(calculateConsecutiveDays(dates)).toBe(2);
  });

  it("should handle unordered dates", () => {
    const dates = [
      new Date("2025-02-16").getTime(),
      new Date("2025-02-14").getTime(),
      new Date("2025-02-15").getTime(),
    ];
    expect(calculateConsecutiveDays(dates)).toBe(3);
  });

  it("should handle duplicate dates", () => {
    const dates = [
      new Date("2025-02-14").getTime(),
      new Date("2025-02-14").getTime(),
      new Date("2025-02-15").getTime(),
    ];
    expect(calculateConsecutiveDays(dates)).toBe(2);
  });

  it("should return 1 for empty array", () => {
    expect(calculateConsecutiveDays([])).toBe(1);
  });
});
