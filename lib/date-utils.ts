/**
 * Adds calendar months while preserving end-of-month semantics.
 * e.g. Jan 31 + 1 month → Feb 28/29 (not Mar 2/3).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();

  // Move to the 1st to avoid JS setMonth day-overflow (Jan 31 → Mar).
  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}
