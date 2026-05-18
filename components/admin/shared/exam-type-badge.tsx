import { Badge } from "@/components/ui/badge";
import type { ExamType } from "@/types/api";

const LABEL: Record<ExamType, string> = { bece: "BECE", wassce: "WASSCE" };

export function ExamTypeBadge({ value }: { value: ExamType }) {
  return (
    <Badge variant={value === "bece" ? "default" : "indigo"}>{LABEL[value]}</Badge>
  );
}
