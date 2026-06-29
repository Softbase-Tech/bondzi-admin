"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, XCircle, Eye } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExamTypeBadge } from "@/components/admin/shared/exam-type-badge";
import { formatDateTime, formatNumber } from "@/lib/utils";
import type { AdminUserExamDetail } from "@/types/api";

/**
 * One exam, in full — header summary + per-question answer table.
 * Reached from the Exam history card on the user detail page. The
 * route is nested under `/admin/users/:id/...` so the back-link and
 * the layout chrome stay grouped with the user surface.
 */
export default function UserExamDetailPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: QK.USER_EXAM_DETAIL(id, examId),
    queryFn: () =>
      unwrap<AdminUserExamDetail>(
        api.get(`/admin/users/${id}/exams/${examId}`),
      ),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { exam, answers } = data;
  const scoreLabel =
    exam.score != null && exam.totalQuestions != null
      ? `${exam.score} / ${exam.totalQuestions}`
      : exam.percentScore != null
        ? `${parseFloat(exam.percentScore).toFixed(1)}%`
        : "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Exam · ${exam.mode.replace(/_/g, " ")}`}
        description={`Started ${formatDateTime(exam.startedAt)}${
          exam.completedAt
            ? ` · Completed ${formatDateTime(exam.completedAt)}`
            : " · still in progress"
        }`}
        actions={
          <Link
            href={`/admin/users/${id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to user
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SummaryStat label="Exam">
          <ExamTypeBadge value={exam.examType} />
        </SummaryStat>
        <SummaryStat label="Status">
          <Badge
            variant={
              exam.status === "completed"
                ? "success"
                : exam.status === "in_progress"
                  ? "outline"
                  : "warning"
            }
            className="capitalize"
          >
            {exam.status.replace(/_/g, " ")}
          </Badge>
        </SummaryStat>
        <SummaryStat label="Score">{scoreLabel}</SummaryStat>
        <SummaryStat label="Accuracy">
          {exam.answeredCount > 0 ? `${exam.accuracy}%` : "—"}
        </SummaryStat>
        <SummaryStat label="Wall-clock min">
          {exam.minutesSpent ?? "—"}
        </SummaryStat>
        <SummaryStat label="Active min">
          {exam.activeStudyMinutes}
        </SummaryStat>
        <SummaryStat label="Answered">
          {formatNumber(exam.answeredCount)}
        </SummaryStat>
        <SummaryStat label="Correct">
          {formatNumber(exam.correctCount)}
        </SummaryStat>
        <SummaryStat label="XP earned">
          {formatNumber(exam.xpEarned)}
        </SummaryStat>
        <SummaryStat label="Mode">
          <span className="capitalize">{exam.mode.replace(/_/g, " ")}</span>
        </SummaryStat>
        <SummaryStat label="Question pool">
          <span className="capitalize">
            {exam.questionPool.replace(/_/g, " ")}
          </span>
        </SummaryStat>
        {exam.durationSeconds != null && (
          <SummaryStat label="Time limit">
            {Math.round(exam.durationSeconds / 60)} min
          </SummaryStat>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answer breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Selected</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {answers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-8 text-center text-slate-500"
                  >
                    No answers recorded.
                  </TableCell>
                </TableRow>
              )}
              {answers.map((a, idx) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-slate-500">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {a.stem ?? (
                        <span className="text-slate-400">
                          (question stem unavailable)
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono">
                        {a.questionId.slice(0, 8)}
                      </span>
                      {a.explanationViewed && (
                        <span className="inline-flex items-center gap-0.5">
                          <Eye className="h-3 w-3" /> explanation viewed
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.subjectName ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {a.year ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.selectedOptionLabel ??
                      a.typedAnswer ?? (
                        <span className="text-slate-400">(skipped)</span>
                      )}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {a.correctOptionLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {a.timeSpentMs != null
                      ? `${(a.timeSpentMs / 1000).toFixed(1)}s`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {a.isCorrect === true ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : a.isCorrect === false ? (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
