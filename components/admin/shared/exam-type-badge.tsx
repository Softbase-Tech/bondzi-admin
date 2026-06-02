import { Badge } from "@/components/ui/badge";
import type { ExamType } from "@/types/api";

const LABEL: Record<ExamType, string> = {
  bece: "BECE",
  wassce: "WASSCE",
  novdec: "NOVDEC",
};

export function ExamTypeBadge({ value }: { value: ExamType }) {
  // NOVDEC shares the WASSCE pool but is its own level for billing /
  // leaderboards — use a distinct accent so it doesn't visually blend
  // with WASSCE rows in admin tables.
  const variant =
    value === "bece" ? "default" : value === "novdec" ? "warning" : "indigo";
  return <Badge variant={variant}>{LABEL[value]}</Badge>;
}
