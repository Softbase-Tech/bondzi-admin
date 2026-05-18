"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { api, unwrap } from "@/lib/api";
import { QK } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { formatNumber, truncate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ReviewEditSheet } from "@/components/admin/pm-test/review-edit-sheet";
import type {
  AiGenerationJob,
  ExamType,
  Paginated,
  PmTestQuestion,
  Subject,
} from "@/types/api";

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function PmTestReviewPage() {
  const qc = useQueryClient();
  const { page, limit, setPage } = usePagination(25);

  const [examType, setExamType] = useState<ExamType>("wassce");
  const [formLevel, setFormLevel] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [batch, setBatch] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PmTestQuestion | null>(null);

  const filters = useMemo(
    () => ({
      examType,
      formLevel: formLevel === "all" ? undefined : Number(formLevel),
      subjectId: subjectId === "all" ? undefined : subjectId,
      batch: batch === "all" ? undefined : batch,
      page,
      limit,
    }),
    [examType, formLevel, subjectId, batch, page, limit],
  );

  const { data: subjects } = useQuery({
    queryKey: QK.SUBJECTS_LIST({ examType }),
    queryFn: () =>
      unwrap<Subject[]>(api.get("/subjects", { params: { examType } })),
  });

  const { data: batches } = useQuery({
    queryKey: QK.AI_GENERATION_JOBS({
      jobType: "pm_test_generation",
      limit: 25,
    }),
    queryFn: () =>
      unwrap<AiGenerationJob[]>(
        api.get("/admin/ai-generation/jobs", {
          params: { jobType: "pm_test_generation", limit: 25 },
        }),
      ),
  });

  const { data: stats } = useQuery({
    queryKey: QK.PM_TEST_STATS(),
    queryFn: () => unwrap<Stats>(api.get("/admin/pm-test/review/stats")),
    refetchInterval: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: QK.PM_TEST_REVIEW_LIST(filters),
    queryFn: () =>
      unwrap<Paginated<PmTestQuestion>>(
        api.get("/admin/pm-test/review", { params: filters }),
      ),
  });

  const bulkMut = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      unwrap(
        api.post(`/admin/pm-test/review/bulk-${action}`, {
          ids: Array.from(selected),
        }),
      ),
    onSuccess: (_, action) => {
      toast.success(`${selected.size} ${action}d`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["pm-test"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Bulk action failed"),
  });

  const rowMut = useMutation({
    mutationFn: (args: { id: string; action: "approve" | "reject" }) =>
      unwrap(
        api.post(`/admin/pm-test/review/${args.id}/${args.action}`, {}),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-test"] });
    },
    onError: (e: { message?: string }) =>
      toast.error(e.message ?? "Action failed"),
  });

  const spotCheckMut = useMutation({
    mutationFn: () =>
      unwrap<{ ids: string[] }>(
        api.post("/admin/pm-test/review/spot-check", { examType, percent: 10 }),
      ),
    onSuccess: (data) => {
      setSelected(new Set(data.ids));
      toast.success(`Spot-check: ${data.ids.length} questions selected`);
    },
  });

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((i) => i.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmBulk = (action: "approve" | "reject") => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `${action === "approve" ? "Approve" : "Reject"} ${selected.size} questions?`,
      )
    ) {
      return;
    }
    bulkMut.mutate(action);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PM Test review queue"
        description="AI-generated questions awaiting admin approval before they go live."
        actions={
          <Button variant="outline" onClick={() => spotCheckMut.mutate()}>
            <Sparkles className="h-4 w-4" /> Spot-check 10%
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {stats?.pending === undefined ? (
              <Skeleton className="h-7 w-14" />
            ) : (
              <>
                {formatNumber(stats.pending)}{" "}
                {stats.pending > 0 && (
                  <Badge variant="warning" className="ml-2 align-middle">
                    needs review
                  </Badge>
                )}
              </>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Approved today
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatNumber(stats?.approvedToday ?? 0)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Rejected today
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {formatNumber(stats?.rejectedToday ?? 0)}
          </div>
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Exam type</div>
          <ExamTypeToggle value={examType} onChange={setExamType} />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Form level</div>
          <Select value={formLevel} onValueChange={setFormLevel}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">Form 1</SelectItem>
              <SelectItem value="2">Form 2</SelectItem>
              <SelectItem value="3">Form 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Subject</div>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-48">
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
        <div>
          <div className="text-xs text-slate-500 mb-1">Batch</div>
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {batches?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.createdAt.slice(0, 10)} · {b.id.slice(0, 6)}
                  {b.triggeredByName ? ` · ${b.triggeredByName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmBulk("approve")}
              loading={bulkMut.isPending}
            >
              <Check className="h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => confirmBulk("reject")}
              loading={bulkMut.isPending}
            >
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={
                    (data?.items.length ?? 0) > 0 &&
                    selected.size === data?.items.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Options</TableHead>
              <TableHead>Expl.</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : (data?.items ?? []).map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={() => toggle(q.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-sm text-sm text-slate-800">
                      {truncate(q.body, 80)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {q.subject?.name ?? q.subjectId.slice(0, 6)}
                    </TableCell>
                    <TableCell className="text-sm">F{q.formLevel}</TableCell>
                    <TableCell>
                      <DifficultyBadge value={q.difficulty} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {q.options.length}
                    </TableCell>
                    <TableCell>
                      {q.explanation ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <X className="h-4 w-4 text-slate-300" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {q.generationBatchId
                        ? q.generationBatchId.slice(0, 8)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-emerald-700 hover:bg-emerald-50"
                          onClick={() =>
                            rowMut.mutate({ id: q.id, action: "approve" })
                          }
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            rowMut.mutate({ id: q.id, action: "reject" })
                          }
                          title="Reject"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(q)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                  Queue is empty.
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

      <ReviewEditSheet
        question={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
