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
 * Format an instant as `YYYY-MM-DDTHH:mm` wall-clock in America/Bogota
 * (suitable for HTML datetime-local inputs).
 */
export function formatBogotaDatetimeLocal(value: Date | null | undefined): string | null {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

/**
 * Parse admin scheduling input as America/Bogota wall-clock.
 * Accepts:
 * - `YYYY-MM-DDTHH:mm` / `YYYY-MM-DDTHH:mm:ss` (interpreted as Bogota local)
 * - full ISO with Z or offset (passed through Date)
 */
export function parseBogotaDateTime(value: string): Date {
  const trimmed = value.trim();
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const y = Number(localMatch[1]);
    const m = Number(localMatch[2]);
    const d = Number(localMatch[3]);
    const hh = Number(localMatch[4]);
    const mm = Number(localMatch[5]);
    const ss = Number(localMatch[6] ?? "0");
    // America/Bogota is fixed UTC-5
    return new Date(Date.UTC(y, m - 1, d, hh + 5, mm, ss));
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Bogota datetime: ${value}`);
  }
  return parsed;
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
