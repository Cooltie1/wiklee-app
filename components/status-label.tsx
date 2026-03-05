import { TicketStatusRow } from "@/lib/useModal";
import { cn } from "@/lib/utils";

type StatusLabelProps = {
  label: string;
  color: TicketStatusRow["color"];
  className?: string;
};

const STATUS_COLOR_CLASSES: Record<TicketStatusRow["color"], { badge: string; dot: string }> = {
  green: {
    badge: "bg-green-100 text-green-800",
    dot: "bg-green-600",
  },
  amber: {
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-600",
  },
  red: {
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-600",
  },
  blue: {
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-600",
  },
  purple: {
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-600",
  },
  zinc: {
    badge: "bg-zinc-200 text-zinc-800",
    dot: "bg-zinc-600",
  },
};

export function StatusLabel({ label, color, className }: StatusLabelProps) {
  const colors = STATUS_COLOR_CLASSES[color];

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        colors.badge,
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", colors.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
