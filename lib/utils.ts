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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const yearMs = 365 * dayMs;

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

  if (diffMs < yearMs) {
    return monthDayFormatter.format(date);
  }

  return monthDayYearFormatter.format(date);
}
