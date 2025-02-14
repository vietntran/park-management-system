import {
  calculateConsecutiveDays,
  getTransferDeadline,
} from "@/utils/dateUtils";

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

describe("getTransferDeadline", () => {
  it("should set deadline to 5 PM CT day before reservation", () => {
    // February 15, 2025 noon UTC
    const reservationDate = new Date("2025-02-15T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be February 14, 2025 at 5 PM Central Time
    expect(deadline.toISOString()).toBe("2025-02-14T23:00:00.000Z"); // 5 PM CT = 11 PM UTC
    expect(deadline.getUTCHours()).toBe(23); // 11 PM UTC
    expect(deadline.getUTCMinutes()).toBe(0);
    expect(deadline.getUTCSeconds()).toBe(0);
    expect(deadline.getUTCMilliseconds()).toBe(0);
  });

  it("should handle Central Time DST start (Spring Forward)", () => {
    // Reservation on March 11, 2025 (after DST starts)
    const reservationDate = new Date("2025-03-11T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be March 10, 2025 at 5 PM CT (DST)
    expect(deadline.toISOString()).toBe("2025-03-10T22:00:00.000Z"); // 5 PM CDT = 10 PM UTC
  });

  it("should handle Central Time DST end (Fall Back)", () => {
    // Reservation on November 3, 2025 (after DST ends)
    const reservationDate = new Date("2025-11-03T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be November 2, 2025 at 5 PM CT (non-DST)
    expect(deadline.toISOString()).toBe("2025-11-02T23:00:00.000Z"); // 5 PM CST = 11 PM UTC
  });
});
