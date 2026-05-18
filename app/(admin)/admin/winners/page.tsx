"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Trophy } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ExamTypeBadge } from "@/components/admin/shared/exam-type-badge";
import { WinnerSelectionModal } from "@/components/admin/winners/winner-selection-modal";
import { PeriodDetailModal } from "@/components/admin/winners/period-detail-modal";
import type {
  DashboardMetrics,
  ExamType,
  HallOfFameRow,
  LeaderboardPeriodType,
  Paginated,
  Winner,
} from "@/types/api";

export default function WinnersPage() {
  const [periodType, setPeriodType] = useState<LeaderboardPeriodType | "all">(
    "all",
  );
  const [examFilter, setExamFilter] = useState<ExamType | "all">("all");

  const [modal, setModal] = useState<{
    examType: ExamType;
    periodType: LeaderboardPeriodType;
    periodStart: string;
  } | null>(null);
  const [periodDetail, setPeriodDetail] = useState<{
    examType: ExamType;
    periodType: LeaderboardPeriodType;
    periodStart: string;
  } | null>(null);

  const { data: metrics } = useQuery({
    queryKey: QK.DASHBOARD_METRICS(),
    queryFn: () => unwrap<DashboardMetrics>(api.get("/admin/dashboard")),
  });

  const filters = {
    periodType: periodType === "all" ? undefined : periodType,
    examType: examFilter === "all" ? undefined : examFilter,
  };

  const { data, isLoading } = useQuery({
    queryKey: QK.WINNERS_LIST(filters),
    queryFn: () =>
      unwrap<Paginated<Winner>>(api.get("/admin/winners", { params: filters })),
  });

  const { data: hall } = useQuery({
    queryKey: QK.WINNERS_HALL_OF_FAME({ examType: examFilter }),
    queryFn: () =>
      unwrap<HallOfFameRow[]>(
        api.get("/admin/winners/hall-of-fame", {
          params: { examType: examFilter === "all" ? undefined : examFilter },
        }),
      ),
  });

  const periodStart = metrics?.winnersPeriodEndedAt
    ? metrics.winnersPeriodEndedAt.slice(0, 10)
    : "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Winners"
        description="Select weekly and monthly winners, issue XP prizes, view hall of fame."
      />

      {(metrics?.winnersPendingWeeklyBece ||
        metrics?.winnersPendingWeeklyWassce) && (
        <Alert variant="warning">
          <Gift className="h-4 w-4" />
          <AlertTitle>Winners pending selection</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Period ended {formatDate(metrics?.winnersPeriodEndedAt ?? null)}.
            </span>
            <div className="flex gap-2">
              {metrics?.winnersPendingWeeklyWassce && (
                <Button
                  size="sm"
                  onClick={() =>
                    setModal({
                      examType: "wassce",
                      periodType: "weekly",
                      periodStart,
                    })
                  }
                >
                  Select WASSCE winners
                </Button>
              )}
              {metrics?.winnersPendingWeeklyBece && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setModal({
                      examType: "bece",
                      periodType: "weekly",
                      periodStart,
                    })
                  }
                >
                  Select BECE winners
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Period</div>
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as typeof periodType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All periods</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <Select value={examFilter} onValueChange={(v) => setExamFilter(v as typeof examFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bece">BECE</SelectItem>
              <SelectItem value="wassce">WASSCE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmed winners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">XP earned</TableHead>
                <TableHead>XP issued</TableHead>
                <TableHead>Selected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setPeriodDetail({
                          examType: w.examType,
                          periodType: w.periodType,
                          periodStart: w.periodStart,
                        })
                      }
                      className="text-left font-medium hover:text-primary"
                    >
                      {w.periodType === "weekly" ? "Week of" : "Month of"}{" "}
                      {formatDate(w.periodStart)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <ExamTypeBadge value={w.examType} />
                  </TableCell>
                  <TableCell>
                    {w.rank <= 3 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Trophy className="h-3.5 w-3.5" /> {w.rank}
                      </span>
                    ) : (
                      w.rank
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{w.userName}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(w.xpEarned)}
                  </TableCell>
                  <TableCell>
                    {w.xpIssued ? (
                      <Badge variant="success">
                        Issued {w.xpIssuedAt ? formatDate(w.xpIssuedAt) : ""}
                      </Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {w.selectedAt ? formatDateTime(w.selectedAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                    No winners recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" /> Hall of fame
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead className="text-right">Total wins</TableHead>
                <TableHead className="text-right">XP from prizes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hall?.map((r, i) => (
                <TableRow key={r.userId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell>
                    <ExamTypeBadge value={r.examType} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(r.totalWins)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(r.totalXpFromPrizes)}
                  </TableCell>
                </TableRow>
              ))}
              {(hall?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                    Hall of fame is empty for now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal && (
        <WinnerSelectionModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          examType={modal.examType}
          periodType={modal.periodType}
          periodStart={modal.periodStart}
        />
      )}
      {periodDetail && (
        <PeriodDetailModal
          open
          onOpenChange={(o) => !o && setPeriodDetail(null)}
          examType={periodDetail.examType}
          periodType={periodDetail.periodType}
          periodStart={periodDetail.periodStart}
        />
      )}
    </div>
  );
}
