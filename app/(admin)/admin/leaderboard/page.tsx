"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/layout/page-header";
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { formatNumber, initials } from "@/lib/utils";
import type {
  ExamType,
  LeaderboardPeriodType,
  LeaderboardRow,
} from "@/types/api";

export default function LeaderboardPage() {
  const [examType, setExamType] = useState<ExamType>("wassce");
  const [periodType, setPeriodType] = useState<LeaderboardPeriodType>("weekly");

  const periodStart =
    periodType === "weekly"
      ? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
      : format(startOfMonth(new Date()), "yyyy-MM-dd");

  const filters = { examType, periodType, periodStart };

  const { data, isLoading } = useQuery({
    queryKey: QK.LEADERBOARD(filters),
    queryFn: () =>
      unwrap<LeaderboardRow[]>(
        api.get("/admin/leaderboard", { params: filters }),
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leaderboard"
        description={`${examType.toUpperCase()} · ${periodType} board starting ${periodStart}.`}
      />

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <ExamTypeToggle value={examType} onChange={setExamType} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Period</div>
          <Select
            value={periodType}
            onValueChange={(v) => setPeriodType(v as LeaderboardPeriodType)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-right">
                {periodType === "monthly" ? "Monthly XP" : "Weekly XP"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data ?? []).map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="font-medium">
                      {r.rank <= 3 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Trophy className="h-3.5 w-3.5" /> {r.rank}
                        </span>
                      ) : (
                        r.rank
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>{initials(r.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-900">
                          {r.fullName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {/* Backend returns `score` regardless of period type.
                          See LeaderboardService.topForPeriod alias. */}
                      {formatNumber(r.score)}
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-slate-500">
                  No leaderboard entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
