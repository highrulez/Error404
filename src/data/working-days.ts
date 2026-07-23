/**
 * Working-day date helpers (Monday–Friday only).
 * Public holidays are intentionally not modelled in this prototype.
 */

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Add N working days to a date (skips Sat/Sun). N may be 0. */
export function addWorkingDays(from: Date | string, workingDays: number): Date {
  const result = startOfDay(
    typeof from === "string" ? new Date(from) : new Date(from)
  );
  if (workingDays === 0) return result;

  const step = workingDays > 0 ? 1 : -1;
  let remaining = Math.abs(workingDays);
  while (remaining > 0) {
    result.setDate(result.getDate() + step);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

export function addWorkingDaysIso(
  from: Date | string,
  workingDays: number
): string {
  return addWorkingDays(from, workingDays).toISOString();
}

/** True when `asOf` is on or after `due` (comparing by instant). */
export function isOnOrAfter(asOf: Date | string, due: string | null): boolean {
  if (!due) return false;
  return new Date(asOf).getTime() >= new Date(due).getTime();
}

export function todayDateOnlyIso(asOf: Date = new Date()): string {
  return startOfDay(asOf).toISOString().slice(0, 10);
}

/** Calendar due date (YYYY-MM-DD) is before today. */
export function isPastDueDate(
  dueDate: string,
  asOf: Date = new Date()
): boolean {
  return dueDate < todayDateOnlyIso(asOf);
}
