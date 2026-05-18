import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; label: string };
  icon?: LucideIcon;
  tone?: "default" | "warning" | "destructive" | "success";
  isLoading?: boolean;
  onClick?: () => void;
}

const TONE_MAP = {
  default: "",
  warning: "text-amber-700",
  destructive: "text-rose-700",
  success: "text-emerald-700",
};

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "default",
  isLoading,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "p-4",
        onClick && "cursor-pointer transition-colors hover:border-primary/40",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className={cn("text-2xl font-semibold text-slate-900", TONE_MAP[tone])}>
            {value}
          </div>
        )}
      </div>
      {delta && !isLoading && (
        <div
          className={cn(
            "mt-1 text-xs",
            delta.value >= 0 ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {delta.value >= 0 ? "+" : ""}
          {delta.value}% {delta.label}
        </div>
      )}
    </Card>
  );
}
