import {
  calculateConsecutiveDays,
  getTransferDeadline,
  isWithinTransferDeadline,
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

describe("isWithinTransferDeadline", () => {
  let mockReservationDate: Date;
  let mockCurrentTime: Date;

  beforeEach(() => {
    // Reset to a known state - February 15, 2025 reservation
    mockReservationDate = new Date("2025-02-15T12:00:00Z");
    mockCurrentTime = new Date("2025-02-14T21:00:00Z"); // 3 PM CT on day before
  });

  it("should return true when current time is before deadline", () => {
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(true);
  });

  it("should return false when current time is after deadline", () => {
    // 5:01 PM CT day before
    mockCurrentTime = new Date("2025-02-14T23:01:00Z");
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(false);
  });

  it("should return false when current time is on reservation day", () => {
    // 8 AM CT on reservation day
    mockCurrentTime = new Date("2025-02-15T14:00:00Z");
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(false);
  });

  it("should use current time when no time provided", () => {
    const now = new Date("2025-02-14T21:00:00Z"); // 3 PM CT day before
    jest.useFakeTimers().setSystemTime(now);

    const result = isWithinTransferDeadline(mockReservationDate);
    expect(result).toBe(true);

    jest.useRealTimers();
  });

  it("should handle DST changes", () => {
    // Reservation during DST (March 11, 2025)
    mockReservationDate = new Date("2025-03-11T12:00:00Z");

    // 4:59 PM CDT day before (should pass)
    mockCurrentTime = new Date("2025-03-10T21:59:00Z");
    expect(isWithinTransferDeadline(mockReservationDate, mockCurrentTime)).toBe(
      true,
    );

    // 5:01 PM CDT day before (should fail)
    mockCurrentTime = new Date("2025-03-10T22:01:00Z");
    expect(isWithinTransferDeadline(mockReservationDate, mockCurrentTime)).toBe(
      false,
    );
  });
});
