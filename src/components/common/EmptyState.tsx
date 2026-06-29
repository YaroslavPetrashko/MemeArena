import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary px-6 py-14 text-center", className)}>
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-foreground/10 to-white/[0.02]">
        <Icon className="size-7 text-muted" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
