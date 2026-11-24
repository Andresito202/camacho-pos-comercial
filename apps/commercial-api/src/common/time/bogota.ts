/** America/Bogota calendar helpers for commercial windows (UTC-5, no DST). */

const BOGOTA_TZ = "America/Bogota";

/** Current instant — used for absolute startsAt/endsAt comparisons. */
export function bogotaNow(): Date {
  return new Date();
}

/** Format an instant in America/Bogota for API responses / UI. */
export function formatBogotaIsoDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/**
 * Build a Date for a Bogota local wall-clock (year-month-day hour:minute:second).
 * Used by seed to place campaign windows relative to "today" in Colombia.
 */
export function bogotaLocalDate(
  daysFromToday: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // America/Bogota is fixed UTC-5
  const utcMs = Date.UTC(y, m - 1, d + daysFromToday, hour + 5, minute, second);
  return new Date(utcMs);
}

export function isWithinWindow(
  now: Date,
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
): boolean {
  if (startsAt && startsAt.getTime() > now.getTime()) return false;
  if (endsAt && endsAt.getTime() < now.getTime()) return false;
  return true;
}
