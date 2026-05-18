"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate, truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ExamTypeToggle } from "@/components/admin/shared/exam-type-toggle";
import { DifficultyBadge } from "@/components/admin/questions/difficulty-badge";
import type { ExamType, Paginated, Question, Subject } from "@/types/api";

/**
 * v2: explanations live inline on `questions` (explanation, explanation_model,
 * explanation_generated_at). This page lists questions that are missing an
 * explanation — admin can spot-generate per row or jump to bulk generation.
 */
export default function ExplanationsPage() {
  const qc = useQueryClient();
  const { page, limit, setPage } = usePagination(20);
  const [examType, setExamType] = useState<ExamType>("wassce");
  const [subjectId, setSubjectId] = useState<string>("all");

  const filters = useMemo(
    () => ({
      examType,
      subjectId: subjectId === "all" ? undefined : subjectId,
      hasExplanation: false,
      page,
      limit,
    }),
    [examType, subjectId, page, limit],
  );

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(api.get("/subjects", { params: { examType } })),
  });

  const { data, isLoading } = useQuery({
    queryKey: QK.QUESTIONS_LIST(filters),
    queryFn: () =>
      unwrap<Paginated<Question>>(
        api.get("/admin/questions", { params: filters }),
      ),
  });

  const oneShotMut = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.post(`/admin/ai-generation/explanations/${id}`, {})),
    onSuccess: () => {
      toast.success("Explanation queued");
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Failed to queue"),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Explanations"
        description="Questions missing an inline explanation. Spot-generate one at a time, or jump to bulk generation."
        actions={
          <Button asChild>
            <Link href="/admin/ai-generation">
              <Sparkles className="h-4 w-4" /> Bulk generate
            </Link>
          </Button>
        }
      />

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <ExamTypeToggle value={examType} onChange={setExamType} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Subject</div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Has explanation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-md">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="font-medium text-slate-900 hover:text-primary"
                      >
                        {truncate(q.body, 80)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {q.subject?.name ?? q.subjectId.slice(0, 6)}
                    </TableCell>
                    <TableCell>{q.year ?? "—"}</TableCell>
                    <TableCell>
                      <DifficultyBadge value={q.difficulty} />
                    </TableCell>
                    <TableCell>
                      {q.explanation ? (
                        <Badge variant="success">
                          {formatDate(q.explanationGeneratedAt ?? q.updatedAt)}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={
                          oneShotMut.isPending &&
                          oneShotMut.variables === q.id
                        }
                        onClick={() => oneShotMut.mutate(q.id)}
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Generate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-slate-500"
                >
                  All questions in this pool have explanations.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <CardContent className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {data?.items.length ?? 0} of {data?.total ?? 0}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={(data?.items.length ?? 0) < limit}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
