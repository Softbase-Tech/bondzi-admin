"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatDate, formatNumber, initials } from "@/lib/utils";
import type {
  ExamType,
  LeaderboardPeriodType,
  WinnerCandidate,
} from "@/types/api";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  examType: ExamType;
  periodType: LeaderboardPeriodType;
  periodStart: string;
}

/**
 * Read-only top-20 for a completed period. Same shape as the selection
 * candidates endpoint, powers the "Winners Hall" mobile screen too.
 */
export function PeriodDetailModal({
  open,
  onOpenChange,
  examType,
  periodType,
  periodStart,
}: Props) {
  const filters = { examType, periodType, periodStart };
  const { data, isLoading } = useQuery({
    queryKey: QK.WINNERS_CANDIDATES(filters),
    enabled: open,
    queryFn: () =>
      unwrap<WinnerCandidate[]>(
        api.get("/admin/winners/candidates", { params: filters }),
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {examType.toUpperCase()} · {periodType} · {formatDate(periodStart)}
          </DialogTitle>
          <DialogDescription>
            Top 20 for this period — the same data surfaced in the mobile
            Winners Hall.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right">Answered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {data?.map((c) => (
                <TableRow key={c.userId}>
                  <TableCell>
                    {c.rank <= 3 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Trophy className="h-3.5 w-3.5" /> {c.rank}
                      </span>
                    ) : (
                      c.rank
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarFallback>{initials(c.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(c.weeklyXp)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-600">
                    {formatNumber(c.questionsAnswered)}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                    No entries for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
