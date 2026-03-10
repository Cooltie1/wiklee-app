import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const twelveHourTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

const monthDayYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortMonthDayTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const longMonthDayYearTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isOlderThanMonths(date: Date, now: Date, months: number) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return date < cutoff;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatRelativeDateTime(dateInput: string | Date, nowInput: Date = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const diffMs = Math.max(0, now.getTime() - date.getTime());

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs < 2 * dayMs) {
    return `Yesterday ${twelveHourTimeFormatter.format(date)}`;
  }

  if (diffMs < weekMs) {
    const days = Math.floor(diffMs / dayMs);
    return `${days} Days Ago`;
  }

  if (!isOlderThanMonths(date, now, 11)) {
    return monthDayFormatter.format(date);
  }

  return monthDayYearFormatter.format(date);
}

export function formatTicketDetailDateTime(dateInput: string | Date, nowInput: Date = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);

  if (isSameCalendarDay(date, now)) {
    return `Today ${twelveHourTimeFormatter.format(date)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameCalendarDay(date, yesterday)) {
    return `Yesterday ${twelveHourTimeFormatter.format(date)}`;
  }

  if (!isOlderThanMonths(date, now, 11)) {
    return shortMonthDayTimeFormatter.format(date);
  }

  return longMonthDayYearTimeFormatter.format(date);
}
