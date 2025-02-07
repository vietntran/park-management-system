// src/lib/utils/dateUtils.ts
export function calculateConsecutiveDays(dates: number[]): number {
  let consecutiveDays = 1;
  let maxConsecutiveDays = 1;

  const sortedDates = [...new Set(dates)].sort((a, b) => a - b);

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutiveDays++;
      maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
    } else {
      consecutiveDays = 1;
    }
  }

  return maxConsecutiveDays;
}
