import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_TONE } from "@/lib/constants";
import type { Difficulty } from "@/types/api";

export function DifficultyBadge({ value }: { value: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_TONE[value]}`}
    >
      {value}
    </span>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="success">Verified</Badge>
  ) : (
    <Badge variant="outline">Unverified</Badge>
  );
}
