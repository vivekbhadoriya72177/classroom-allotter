const campusTimeZone = "Asia/Kolkata";

function campusDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: campusTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseInterval(startValue, endValue, { futureOnly = false } = {}) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (!startValue || !endValue || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "start and end must be valid date-time values" };
  }

  if (start >= end) {
    return { error: "end must be later than start" };
  }

  if (campusDateKey(start) !== campusDateKey(end)) {
    return { error: "The interval must start and end on the same campus day" };
  }

  if (end.getTime() - start.getTime() > 12 * 60 * 60 * 1000) {
    return { error: "The interval cannot be longer than 12 hours" };
  }

  if (futureOnly && start.getTime() < Date.now() - 5 * 60 * 1000) {
    return { error: "A booking cannot start in the past" };
  }

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function optionalTrimmedString(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
}

export function requiredTrimmedString(value, maxLength) {
  const normalized = optionalTrimmedString(value, maxLength);
  return typeof normalized === "string" ? normalized : null;
}
